// Promise completion is a distinct caller job; never add await overhead to synchronous rows.
import { deriveUuidV7MaskAsync } from "../src/index";
import type { Settings, Observation } from "./implementation-worker";

export const ASYNC_JOBS = [
  { name: "async.mask.derive", iterations: 1, cancelled: false },
  { name: "async.mask.derive.iterated", iterations: 64, cancelled: false },
  { name: "invalid.async.mask.cancelled", iterations: 64, cancelled: true },
] as const;

export async function measureAsync(
  settings: Settings,
  quantum: number,
  selected: ReadonlySet<string>,
): Promise<Observation[]> {
  const aborted = new AbortController();
  aborted.abort("benchmark cancellation");
  const rows: Observation[] = [];
  for (const job of ASYNC_JOBS) {
    if (!selected.has(job.name)) continue;
    let witness = 0;
    const batch = async (count: number) => {
      for (let i = 0; i < count; i++) {
        const value = await deriveUuidV7MaskAsync({
          seed: "benchmark-seed-not-for-production",
          keyDerivationIterations: job.iterations,
          ...(job.cancelled ? { signal: aborted.signal } : {}),
        });
        if (value instanceof Error !== job.cancelled)
          throw new Error(`Wrong async outcome: ${job.name}`);
        witness ^= value instanceof Error ? value.message.length : value.diagnosticLabel.length;
      }
    };
    let count = 1;
    const calibration: NonNullable<Observation["calibration"]> = [];
    let resolved = 0;
    const warmup = performance.now();
    while (performance.now() - warmup < settings.warmup || resolved < 2) {
      const start = performance.now();
      await batch(count);
      const elapsedMs = performance.now() - start;
      calibration.push({ count, elapsedMs });
      if (elapsedMs < settings.duration) {
        count *= 2;
        resolved = 0;
      } else resolved++;
      if (!Number.isSafeInteger(count)) throw new Error("Async calibration overflow");
    }
    const ns: number[] = [];
    let operations = 0;
    for (let sample = 0; sample < settings.samples; sample++) {
      const start = performance.now();
      await batch(count);
      const elapsed = performance.now() - start;
      if (!(elapsed > 0)) throw new Error("Async timer did not resolve");
      ns.push((elapsed * 1e6) / count);
      operations += count;
    }
    if (!Number.isInteger(witness)) throw new Error("Missing async result witness");
    rows.push({
      name: job.name,
      ns,
      operations,
      calibration,
      clockQuantumMs: quantum,
      targetBatchMs: settings.duration,
    });
  }
  return rows;
}
