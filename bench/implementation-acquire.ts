// One serial scheduler owns process blocks, progress, retained observations and report regeneration.
import { mkdtemp, open, rm } from "node:fs/promises";
import { tmpdir, cpus, platform, arch } from "node:os";
import { join, resolve } from "node:path";
import { randomBytes, randomInt } from "node:crypto";
import { browserEngines } from "../scripts/browser-engines";
import { command } from "../scripts/command";
import { runWorkerdConsumer } from "../scripts/check-workerd-consumer";
import { prepareImplementations } from "./implementation-build";
import type { Lane } from "./implementation-build";
import { comparisonWindow, createImplementationReporter } from "./implementation-report";
import type { ImplementationReport, UnvalidatedMeasurement } from "./implementation-report";
import type { Settings } from "./implementation-worker";
import {
  openImplementationOutput,
  resolveImplementationEvidence,
  writeImplementationReport,
} from "./implementation-output";

const root = process.cwd();
// Bun's implicit development condition otherwise outranks the published Node adapter.
process.env.NODE_ENV = "production";

function decodeOutput(output: string, receiptPreamble = false): unknown {
  try {
    if (!receiptPreamble) return JSON.parse(output);
    const separator = output.indexOf("\n");
    if (separator < 0) throw new Error("Missing runtime receipt line");
    const receipt: unknown = JSON.parse(output.slice(0, separator));
    if (!receipt || typeof receipt !== "object" || !("runtimeVersion" in receipt))
      throw new Error("Malformed runtime receipt line");
    return { ...receipt, rows: JSON.parse(output.slice(separator + 1)) };
  } catch (cause) {
    // Rejected output still belongs to the incomplete capture; diagnosis must not need another run.
    return { failure: `Malformed process output: ${String(cause)}`, output };
  }
}
async function acquire(
  lane: Lane,
  settings: Settings,
): Promise<Pick<UnvalidatedMeasurement, "rows" | "entropy" | "runtimeVersion" | "transport">> {
  let input: unknown;
  let browserVersion: string | undefined;
  if (lane.edge !== undefined) {
    if (!lane.script) throw new Error(`Missing edge script for ${lane.id}`);
    input = decodeOutput(
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
      browserVersion = browser.version();
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
    input = decodeOutput(output, lane.receiptPreamble);
  }
  if (input && typeof input === "object" && "rows" in input) {
    return {
      rows: input.rows,
      ...("entropy" in input ? { entropy: input.entropy } : {}),
      ...("runtimeVersion" in input ? { runtimeVersion: input.runtimeVersion } : {}),
      ...("transport" in input ? { transport: input.transport } : {}),
      ...(browserVersion ? { runtimeVersion: browserVersion } : {}),
    };
  }
  return { rows: input, ...(browserVersion ? { runtimeVersion: browserVersion } : {}) };
}
const args = process.argv.slice(2);
const reportIndex = args.indexOf("--report");
const baselineIndex = args.indexOf("--baseline");
const destination = resolve(
  process.env.UUID_SLUG_IMPLEMENTATION_REPORT ?? "bench/results/implementations.md",
);
if (reportIndex >= 0) {
  const source = args[reportIndex + 1];
  if (!source) throw new Error("--report requires the Markdown report or its retained .jsonl file");
  const evidence = await resolveImplementationEvidence(source);
  let reporter: ReturnType<typeof createImplementationReporter> | undefined;
  let complete = false;
  await using input = await open(evidence, "r");
  for await (const line of input.readLines()) {
    if (complete) throw new Error("Unexpected data after acquisition completion");
    if (!reporter) reporter = createImplementationReporter(JSON.parse(line));
    else if (line === '{"complete":true}') complete = true;
    else reporter.append(JSON.parse(line));
  }
  if (!reporter || !complete)
    throw new Error(
      "Incomplete acquisition; rerun the comparison before publishing a final report.",
    );
  await writeImplementationReport(
    destination,
    reporter.render(baselineIndex >= 0 ? args[baselineIndex + 1] : undefined),
    evidence,
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
  const report: Omit<ImplementationReport, "measurements"> = {
    revision: (await command("git", ["rev-parse", "HEAD"], root)).trim(),
    captured: new Date().toISOString(),
    host: `${platform()}/${arch()}; ${cpus()[0]?.model ?? "CPU unreported"}`,
    smoke,
    exposure: "randomized",
    runtimeReceipts: true,
    settings,
    blocks,
    lanes: [],
  };
  let output: Awaited<ReturnType<typeof openImplementationOutput>> | undefined;
  try {
    console.log("Preparing every implementation before timing...");
    const lanes = await prepareImplementations(directory, settings);
    report.lanes = lanes.map(({ environment: _environment, ...lane }) => lane);
    const reporter = createImplementationReporter(report);
    // Fix the small randomized schedule before timing; growing results cannot change exposure.
    const schedule = Array.from({ length: blocks }, () => {
      const order = [...lanes];
      for (const [index, lane] of order.entries()) {
        const swap = randomInt(index + 1);
        const previous = order[swap];
        if (!previous) throw new Error("Missing lane during exposure randomization");
        order[index] = previous;
        order[swap] = lane;
      }
      return order.map((lane) => ({ lane, steps: comparisonWindow(randomInt(2)) }));
    });
    // Append each capture once; rewriting the growing history makes checkpoint I/O quadratic.
    output = await openImplementationOutput(destination, report);
    let sequence = 0;
    for (const [block, windows] of schedule.entries()) {
      for (const { lane, steps } of windows) {
        const referenceId =
          lane.reference ??
          (lane.id.startsWith("ts/") ? "ts/node" : "rust/native/release/fast-rng");
        const reference = lanes.find((item) => item.id === referenceId);
        if (!reference) throw new Error(`Missing comparison reference: ${referenceId}`);
        for (const step of steps) {
          const selected = step.role === "candidate" ? lane : reference;
          console.log(`Block ${block + 1}/${blocks}: ${lane.id}; ${step.role} ${step.repeat + 1}`);
          const capture = await acquire(selected, settings);
          const record: UnvalidatedMeasurement = {
            lane: selected.id,
            subject: lane.id,
            block,
            repeat: step.repeat,
            role: step.role,
            sequence: sequence++,
            ...capture,
          };
          // Persist once before admission so malformed output survives without becoming a completed report.
          await output.append(record);
          reporter.append(record);
        }
      }
    }
    const raw = await output.publish(reporter.render());
    console.log(`Report: ${destination}\nRaw observations: ${raw}`);
  } finally {
    // Successful observations keep hashes, counts and versions; disposable binaries do not need indefinite retention.
    await rm(directory, { recursive: true, force: true });
    await output?.close();
  }
}
