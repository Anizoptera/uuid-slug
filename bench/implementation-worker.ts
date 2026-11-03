// One portable timed loop serves every JS engine; imports and corpus validation precede timing.
import { implementationCases } from "./implementation-cases";
import * as api from "../src/index";
import { qualifyEntropy } from "./implementation-entropy";
import type { EntropyEvidence } from "./implementation-entropy";
import { ASYNC_JOBS, measureAsync } from "./implementation-async";
import { assertProfileOutcome, uuidObjectChecksum, selectProfileCases } from "./profile-case";
import type { ProfileCase } from "./profile-case";
import { retainImplementationResult } from "./implementation-result";

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
  threadCpuNs?: number[];
  resultWitness?: number;
}

function threadClock() {
  // Some browser-compatible process shims expose a method that rejects execution.
  if (typeof process === "undefined") return undefined;
  const read = (
    process as { threadCpuUsage?: (previous?: NodeJS.CpuUsage) => NodeJS.CpuUsage }
  ).threadCpuUsage?.bind(process);
  try {
    read?.();
    return read;
  } catch {
    return undefined;
  }
}
const threadCpuUsage = threadClock();

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
  const rows: Observation[] = [];
  for (const [name, operation] of cases) {
    let sink = 0;
    const expectedFailure = name.startsWith("invalid.");
    if (name.includes("/")) {
      if (operation(0) instanceof Error) throw new Error(`Shared job failed: ${name}`);
    } else assertProfileOutcome(name, operation(0));
    const batch = (fn: ProfileCase, count: number) => {
      for (let i = 0; i < count; i++) {
        const value = fn(i);
        retainImplementationResult(value);
        if (expectedFailure !== value instanceof Error) throw new Error(`Outcome changed: ${name}`);
        if (typeof value === "string") sink ^= value.charCodeAt(i % value.length);
        else if (typeof value === "number") sink ^= value;
        else if (typeof value === "boolean") sink ^= Number(value);
        else if (value instanceof Uint8Array) sink ^= value[i % value.length] as number;
        else if (value instanceof Error) sink ^= value.message.length;
        else sink ^= uuidObjectChecksum(value, i) ?? 0;
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
    const ns = Array.from({ length: settings.samples }, () => 0);
    const threadCpuNs = threadCpuUsage
      ? Array.from({ length: settings.samples }, () => 0)
      : undefined;
    let operations = 0;
    for (let sample = 0; sample < settings.samples; sample++) {
      // Counter reads stay outside elapsed timing; CPU still includes the clock and witness work.
      const cpuStart = threadCpuUsage?.();
      const start = performance.now();
      batch(operation, count);
      const elapsed = performance.now() - start;
      const cpu = cpuStart && threadCpuUsage?.(cpuStart);
      if (!(elapsed > 0)) throw new Error(`Unresolved clock for ${name}`);
      ns[sample] = (elapsed * 1e6) / count;
      if (threadCpuNs) {
        if (!cpu) throw new Error(`Missing caller-thread CPU sample for ${name}`);
        threadCpuNs[sample] = ((cpu.user + cpu.system) * 1e3) / count;
      }
      operations += count;
    }
    rows.push({
      name,
      ns,
      operations,
      calibration,
      clockQuantumMs: quantum,
      targetBatchMs: duration,
      // The checksum must escape through host serialization; an integer assertion alone is tautological.
      resultWitness: sink,
      ...(threadCpuNs ? { threadCpuNs } : {}),
    });
  }
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
