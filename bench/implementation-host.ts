// Keep host version receipts and browser message framing independent of the timed corpus.
import type { Settings } from "./implementation-timing";

export function processRuntimeVersion(): string {
  // Registry versions are numeric; Node's display-only `v` must not look like another executable.
  return process.versions.bun ?? process.versions.deno ?? process.versions.node;
}

function postBenchmarkResult(message: object | string): void {
  // eslint-disable-next-line unicorn/require-post-message-target-origin -- Dedicated workers post to their owner, not a Window origin.
  globalThis.postMessage(message);
}

export function exposeBenchmark<Result extends object>(
  run: (settings: Settings) => Promise<Result>,
): void {
  // Workerd calls the method directly; browser pages send work to a dedicated worker instead.
  const host = globalThis as typeof globalThis & { uuidSlugBenchmark?: typeof run };
  host.uuidSlugBenchmark = run;
  if (
    typeof document === "undefined" &&
    typeof process === "undefined" &&
    typeof globalThis.postMessage === "function"
  ) {
    globalThis.addEventListener("message", (event: MessageEvent<Settings>) => {
      run(event.data)
        .then(postBenchmarkResult)
        .catch((cause: unknown) => postBenchmarkResult({ failure: String(cause) }));
    });
    postBenchmarkResult("ready");
  }
}
