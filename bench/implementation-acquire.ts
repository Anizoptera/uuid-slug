// One serial scheduler owns process blocks, progress, retained observations and report regeneration.
import { mkdir, mkdtemp, readFile, writeFile, appendFile, rm } from "node:fs/promises";
import { tmpdir, cpus, platform, arch } from "node:os";
import { join, resolve, dirname } from "node:path";
import { randomBytes, randomInt } from "node:crypto";
import { browserEngines } from "../scripts/browser-engines";
import { command } from "../scripts/command";
import { runWorkerdConsumer } from "../scripts/check-workerd-consumer";
import { prepareImplementations } from "./implementation-build";
import type { Lane } from "./implementation-build";
import {
  comparisonWindow,
  renderImplementationReport,
  validateRows,
  validateEntropyEvidence,
} from "./implementation-report";
import type { ImplementationReport, Measurement } from "./implementation-report";
import type { Settings } from "./implementation-worker";

const root = process.cwd();
// Bun's implicit development condition otherwise outranks the published Node adapter.
process.env.NODE_ENV = "production";
async function acquire(
  lane: Lane,
  configuration: Settings,
): Promise<Pick<Measurement, "rows" | "entropy">> {
  const settings =
    lane.filter === undefined ? configuration : { ...configuration, filter: lane.filter };
  let input: unknown;
  if (lane.edge !== undefined) {
    if (!lane.script) throw new Error(`Missing edge script for ${lane.id}`);
    input = JSON.parse(
      await runWorkerdConsumer(lane.script, {
        compatible: lane.edge,
        timeoutMs: 600_000,
        ...(lane.command?.[0] ? { executable: lane.command[0] } : {}),
        responseCode: `return Response.json(await globalThis.uuidSlugBenchmark(${JSON.stringify(settings)}));`,
        ...(lane.wasm ? { wasm: lane.wasm } : {}),
      }),
    );
  } else if (lane.browser) {
    const isolation = {
      "cross-origin-opener-policy": "same-origin",
      "cross-origin-embedder-policy": "require-corp",
      "cross-origin-resource-policy": "same-origin",
    };
    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch(request) {
        const path = new URL(request.url).pathname;
        if (path === "/worker.mjs")
          return new Response(Bun.file(lane.script as string), {
            headers: { "content-type": "text/javascript", ...isolation },
          });
        if (path === "/module_bg.wasm" && lane.wasm)
          return new Response(Bun.file(lane.wasm), {
            headers: { "content-type": "application/wasm", ...isolation },
          });
        if (path === "/entropy.mjs" && lane.entropyModule)
          return new Response(Bun.file(lane.entropyModule), {
            headers: { "content-type": "text/javascript", ...isolation },
          });
        if (path === "/bootstrap.mjs")
          return new Response(
            `import init,{benchmark,entropy_probe} from "/worker.mjs"; import {qualifyEntropy} from "/entropy.mjs"; await init(); onmessage=e=>{const q=qualifyEntropy(()=>JSON.parse(entropy_probe()),()=>undefined,${lane.requiresEntropy});postMessage({rows:JSON.parse(benchmark(e.data.samples,e.data.duration,e.data.warmup,e.data.filter,e.data.batchTicks)),entropy:q.entropy});}; postMessage("ready");`,
            { headers: { "content-type": "text/javascript", ...isolation } },
          );
        const script = `const worker=new Worker(${JSON.stringify(lane.wasm ? "/bootstrap.mjs" : "/worker.mjs")},{type:"module"}); const ready=new Promise((resolve,reject)=>{worker.onmessage=e=>{if(e.data==="ready")resolve();};worker.onerror=e=>reject(Error(e.message));}); globalThis.uuidSlugBenchmark=async s=>{await ready;return new Promise((resolve,reject)=>{worker.onmessage=e=>resolve(e.data);worker.onerror=e=>reject(Error(e.message));worker.postMessage(s);});};`;
        return new Response(`<!doctype html><script type="module">${script}</script>`, {
          headers: {
            "content-type": "text/html",
            ...isolation,
          },
        });
      },
    });
    const browser = await browserEngines[lane.browser]
      .launch({ headless: true })
      .catch(async (cause: unknown) => {
        await server.stop(true);
        throw cause;
      });
    try {
      const page = await browser.newPage();
      await page.goto(server.url.href);
      await page.waitForFunction(
        () =>
          typeof (globalThis as typeof globalThis & { uuidSlugBenchmark?: object })
            .uuidSlugBenchmark === "function",
      );
      input = await page.evaluate(async (selected) => {
        const run = (
          globalThis as typeof globalThis & {
            uuidSlugBenchmark?: (options: Settings) => Promise<unknown>;
          }
        ).uuidSlugBenchmark;
        if (!run) throw new Error("Benchmark module did not initialize");
        // The page stays responsive while its worker runs; this timer only rejects a hang.
        return await new Promise((complete, reject) => {
          const deadline = setTimeout(
            () => reject(new Error("Benchmark worker exceeded its hang deadline")),
            600_000,
          );
          run(selected).then(
            (rows) => {
              clearTimeout(deadline);
              return complete(rows);
            },
            (cause: unknown) => {
              clearTimeout(deadline);
              return reject(cause);
            },
          );
        });
      }, settings);
    } finally {
      await browser.close();
      await server.stop(true);
    }
  } else {
    if (!lane.command) throw new Error(`No command for ${lane.id}`);
    const [executable, ...argv] = lane.command;
    if (!executable) throw new Error(`Empty command for ${lane.id}`);
    const output = await command(
      executable,
      [
        ...argv,
        ...(lane.argumentStyle === "json"
          ? [JSON.stringify(settings)]
          : lane.argumentStyle === "positional"
            ? [
                String(settings.samples),
                String(settings.duration),
                String(settings.warmup),
                settings.filter,
                String(settings.batchTicks),
              ]
            : []),
      ],
      root,
      {
        ...lane.environment,
        UUID_SLUG_TIMING_PADDING: randomBytes(randomInt(1, 2049)).toString("hex"),
      },
      { timeoutMs: 300_000 },
    );
    const decoded: unknown = JSON.parse(output);
    if (
      lane.argumentStyle === "json" &&
      (!decoded ||
        typeof decoded !== "object" ||
        !("runtimeVersion" in decoded) ||
        typeof decoded.runtimeVersion !== "string" ||
        !lane.version.includes(decoded.runtimeVersion))
    )
      throw new Error(`Timing worker ran an unexpected runtime: ${lane.id}`);
    input = decoded;
  }
  if (input && typeof input === "object" && "failure" in input && typeof input.failure === "string")
    throw new Error(`${lane.id}: ${input.failure}`);
  if (input && typeof input === "object" && "rows" in input) {
    const entropy =
      lane.requiresEntropy === undefined
        ? undefined
        : validateEntropyEvidence(
            "entropy" in input ? input.entropy : undefined,
            lane.requiresEntropy,
          );
    return { rows: validateRows(input.rows, settings.samples), ...(entropy ? { entropy } : {}) };
  }
  if (lane.requiresEntropy !== undefined)
    throw new Error(`Missing entropy qualification for ${lane.id}`);
  return { rows: validateRows(input, settings.samples) };
}
const args = process.argv.slice(2);
const reportIndex = args.indexOf("--report");
const baselineIndex = args.indexOf("--baseline");
const destination = resolve(
  process.env.UUID_SLUG_IMPLEMENTATION_REPORT ?? "bench/results/implementations.md",
);
if (reportIndex >= 0) {
  const source = args[reportIndex + 1];
  if (!source) throw new Error("--report requires the retained JSON Lines file");
  const [header, ...records] = (await readFile(source, "utf8")).trimEnd().split("\n");
  if (!header || records.pop() !== '{"complete":true}')
    throw new Error(
      "Incomplete acquisition; rerun the comparison before publishing a final report.",
    );
  const report: ImplementationReport = {
    ...JSON.parse(header),
    measurements: records.map((record) => JSON.parse(record)),
  };
  await writeFile(
    destination,
    renderImplementationReport(report, baselineIndex >= 0 ? args[baselineIndex + 1] : undefined),
  );
  console.log(destination);
} else {
  if (args.some((arg) => arg !== "--smoke"))
    throw new Error("Use --smoke or --report file [--baseline lane]");
  const smoke = args.includes("--smoke");
  // Inherit the established comparison windows; smoke changes only acquisition depth.
  const settings: Settings = {
    samples: Number(process.env.UUID_SLUG_PROFILE_SAMPLES ?? (smoke ? 1 : 7)),
    duration: Number(process.env.UUID_SLUG_PROFILE_MS ?? (smoke ? 1 : 5)),
    warmup: Number(process.env.UUID_SLUG_PROFILE_WARMUP_MS ?? (smoke ? 2 : 16)),
    filter: process.env.UUID_SLUG_IMPLEMENTATION_FILTER ?? "",
    // Forty measured ticks put clock granularity below the report's coarse comparison precision.
    batchTicks: 40,
  };
  const blocks = Number(process.env.UUID_SLUG_COMPARE_ROUNDS ?? (smoke ? 1 : 6));
  if (
    !Number.isSafeInteger(blocks) ||
    blocks < 1 ||
    !Number.isSafeInteger(settings.samples) ||
    settings.samples < 1 ||
    !Number.isFinite(settings.duration) ||
    settings.duration <= 0 ||
    !Number.isFinite(settings.warmup) ||
    settings.warmup <= 0
  )
    throw new Error(
      "Blocks and batches must be positive integers; timing windows must be finite positive milliseconds",
    );
  const directory = await mkdtemp(join(tmpdir(), "uuid-slug-implementations-"));
  await mkdir(dirname(destination), { recursive: true });
  const raw = destination.replace(/\.md$/, ".jsonl");
  if (raw === destination) throw new Error("Report destination must end with .md");
  const report: ImplementationReport = {
    revision: (await command("git", ["rev-parse", "HEAD"], root)).trim(),
    captured: new Date().toISOString(),
    host: `${platform()}/${arch()}; ${cpus()[0]?.model ?? "CPU unreported"}`,
    smoke,
    settings,
    blocks,
    lanes: [],
    measurements: [],
  };
  let complete = false;
  try {
    console.log("Preparing every implementation before timing...");
    const lanes = await prepareImplementations(directory, settings);
    report.lanes = lanes.map(({ environment: _environment, ...lane }) => lane);
    // Append each capture once; rewriting the growing history makes checkpoint I/O quadratic.
    const { measurements: _measurements, ...metadata } = report;
    await writeFile(raw, `${JSON.stringify(metadata)}\n`);
    let sequence = 0;
    for (let block = 0; block < blocks; block++) {
      const rotated = lanes.map((_, index) => lanes[(index + block) % lanes.length] as Lane);
      for (const lane of rotated) {
        const referenceId =
          lane.reference ??
          (lane.id.startsWith("ts/") ? "ts/node" : "rust/native/release/fast-rng");
        const reference = lanes.find((item) => item.id === referenceId);
        if (!reference) throw new Error(`Missing comparison reference: ${referenceId}`);
        for (const step of comparisonWindow(block)) {
          const selected =
            step.role === "candidate"
              ? lane
              : { ...reference, ...(lane.filter === undefined ? {} : { filter: lane.filter }) };
          console.log(`Block ${block + 1}/${blocks}: ${lane.id}; ${step.role} ${step.repeat + 1}`);
          const capture = await acquire(selected, settings);
          const record: Measurement = {
            lane: selected.id,
            subject: lane.id,
            block,
            repeat: step.repeat,
            role: step.role,
            sequence: sequence++,
            ...capture,
          };
          report.measurements.push(record);
          await appendFile(raw, `${JSON.stringify(record)}\n`);
        }
      }
      await writeFile(
        destination.replace(/\.md$/, ".partial.md"),
        `**IN PROGRESS: ${block + 1}/${blocks} blocks.**\n\n${renderImplementationReport({ ...report, blocks: block + 1 })}`,
      );
    }
    await appendFile(raw, '{"complete":true}\n');
    await writeFile(destination, renderImplementationReport(report));
    await rm(destination.replace(/\.md$/, ".partial.md"), { force: true });
    complete = true;
    console.log(`Report: ${destination}\nRaw observations: ${raw}`);
  } finally {
    // Successful observations keep hashes, counts and versions; disposable binaries do not need indefinite retention.
    await rm(directory, { recursive: true, force: true });
    if (!complete) console.error(`Incomplete comparison; retained observations: ${raw}`);
  }
}
