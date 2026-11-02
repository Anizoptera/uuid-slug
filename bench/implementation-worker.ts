// One portable timed loop serves every JS engine; imports and corpus validation precede timing.
import { implementationCases } from "./implementation-cases";
import * as api from "../src/index";
import { qualifyEntropy } from "./implementation-entropy";
import type { EntropyEvidence } from "./implementation-entropy";
import { ASYNC_JOBS, measureAsync } from "./implementation-async";
import { assertProfileOutcome, uuidObjectChecksum, selectProfileCases } from "./profile-case";
import type { ProfileCase } from "./profile-case";

export interface Settings {
  samples: number;
  duration: number;
  warmup: number;
  filter: string;
  batchTicks: number;
}
export interface Observation {
  name: string;
  ns: number[];
  operations: number;
  clockQuantumMs?: number;
  targetBatchMs?: number;
  calibration?: { count: number; elapsedMs: number }[];
}

function clockQuantum(settings: Settings): number {
  let previous = performance.now();
  const probeStart = previous;
  let quantum = Infinity;
  do {
    const now = performance.now();
    if (now > previous) quantum = Math.min(quantum, now - previous);
    previous = now;
  } while (previous - probeStart < settings.warmup);
  if (!Number.isFinite(quantum)) throw new Error("Performance clock never advanced");
  return quantum;
}

function measure(
  settings: Settings,
  quantum: number,
  cases: readonly [string, ProfileCase][],
): Observation[] {
  const duration = settings.duration;
  let sink = 0;
  const rows: Observation[] = [];
  for (const [name, operation] of cases) {
    const expectedFailure = name.startsWith("invalid.");
    if (name.includes("/")) {
      if (operation(0) instanceof Error) throw new Error(`Shared job failed: ${name}`);
    } else assertProfileOutcome(name, operation(0));
    const batch = (fn: ProfileCase, count: number) => {
      for (let i = 0; i < count; i++) {
        const value = fn(i);
        if (expectedFailure !== value instanceof Error) throw new Error(`Outcome changed: ${name}`);
        if (typeof value === "string") sink ^= value.charCodeAt(i % value.length);
        else if (typeof value === "number") sink ^= value;
        else if (typeof value === "boolean") sink ^= Number(value);
        else if (value instanceof Uint8Array) sink ^= value[i % value.length] as number;
        else if (value instanceof Error) sink ^= value.message.length;
        else sink ^= uuidObjectChecksum(value, i) ?? Object.keys(value).length;
      }
    };
    let count = 64;
    const calibration: { count: number; elapsedMs: number }[] = [];
    let resolved = 0;
    const warmup = performance.now();
    while (performance.now() - warmup < settings.warmup || resolved < 2) {
      const start = performance.now();
      batch(operation, count);
      const elapsedMs = performance.now() - start;
      calibration.push({ count, elapsedMs });
      if (elapsedMs < duration) {
        count *= 2;
        resolved = 0;
      } else resolved++;
      if (!Number.isSafeInteger(count)) throw new Error("Benchmark batch count overflow");
    }
    const ns: number[] = [];
    let operations = 0;
    for (let sample = 0; sample < settings.samples; sample++) {
      const start = performance.now();
      batch(operation, count);
      const elapsed = performance.now() - start;
      if (!(elapsed > 0)) throw new Error(`Unresolved clock for ${name}`);
      ns.push((elapsed * 1e6) / count);
      operations += count;
    }
    rows.push({
      name,
      ns,
      operations,
      calibration,
      clockQuantumMs: quantum,
      targetBatchMs: duration,
    });
  }
  // Observable output keeps result reads live without serializing inside timed work.
  if (!Number.isInteger(sink)) throw new Error("Missing benchmark result witness");
  return rows;
}

export async function run(
  settings: Settings,
): Promise<{ rows: Observation[]; entropy: EntropyEvidence }> {
  const probeOutput = new Uint8Array(16);
  const qualified = qualifyEntropy(() => {
    const v4 = api.generateUuidV4Bytes(probeOutput);
    const v7 = api.generateUuidV7Bytes(probeOutput);
    return { uuidV4: !(v4 instanceof Error), uuidV7: !(v7 instanceof Error) };
  }, implementationCases);
  const cases = qualified.value;
  const names = [...Object.keys(cases), ...ASYNC_JOBS.map((job) => job.name)];
  const selected = new Set(
    selectProfileCases(Object.fromEntries(names.map((name) => [name, true])), settings.filter).map(
      ([name]) => name,
    ),
  );
  const quantum = clockQuantum(settings);
  // Reuse one observed timer floor for sync and async work in this host.
  const calibrated = {
    ...settings,
    duration: Math.max(settings.duration, quantum * settings.batchTicks),
  };
  return {
    entropy: qualified.entropy,
    rows: [
      ...measure(
        calibrated,
        quantum,
        Object.entries(cases).filter(([name]) => selected.has(name)),
      ),
      ...(await measureAsync(calibrated, quantum, selected)),
    ],
  };
}
const host = globalThis as typeof globalThis & { uuidSlugBenchmark?: typeof run };
host.uuidSlugBenchmark = run;
function postWorkerResult(
  message: Awaited<ReturnType<typeof run>> | string | { failure: string },
): void {
  // eslint-disable-next-line unicorn/require-post-message-target-origin -- Dedicated workers post to their owner, not a Window origin.
  globalThis.postMessage(message);
}
if (
  typeof document === "undefined" &&
  typeof process === "undefined" &&
  typeof globalThis.postMessage === "function"
) {
  globalThis.addEventListener("message", (event: MessageEvent<Settings>) => {
    run(event.data)
      .then(postWorkerResult)
      .catch((cause: unknown) => postWorkerResult({ failure: String(cause) }));
  });
  postWorkerResult("ready");
}
