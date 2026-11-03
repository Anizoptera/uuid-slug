// Execute one fresh host without changing the timed worker or its protocol.
import { randomBytes, randomInt } from "node:crypto";
import { browserEngines } from "../scripts/browser-engines";
import { command } from "../scripts/command";
import { runWorkerdConsumer } from "../scripts/check-workerd-consumer";
import type { Lane } from "./implementation-build";
import type { UnvalidatedMeasurement } from "./implementation-report";
import type { Settings } from "./implementation-worker";

const root = process.cwd();

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
export async function acquire(
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
        if (path === "/transport.mjs" && lane.transportModule)
          return new Response(Bun.file(lane.transportModule), {
            headers: { "content-type": "text/javascript", ...isolation },
          });
        if (path === "/bootstrap.mjs")
          return new Response(
            lane.transportModule
              ? 'import init,{plain} from "/worker.mjs"; import {measureUuidStringToPlainSlug} from "/transport.mjs"; await init(); onmessage=e=>postMessage({rows:measureUuidStringToPlainSlug(e.data,plain)}); postMessage("ready");'
              : `import init,{benchmark,entropy_probe} from "/worker.mjs"; import {qualifyEntropy} from "/entropy.mjs"; await init(); onmessage=e=>{const q=qualifyEntropy(()=>JSON.parse(entropy_probe()),()=>undefined,${lane.requiresEntropy});postMessage({rows:JSON.parse(benchmark(e.data.samples,e.data.duration,e.data.warmup,e.data.filter,e.data.batchTicks)),entropy:q.entropy});}; postMessage("ready");`,
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
