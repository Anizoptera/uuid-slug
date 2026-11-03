// A host can inspect the complete result, so hidden constructor state must escape the timed loop.
import type { ProfileValue } from "./profile-case";

const host = globalThis as typeof globalThis & { uuidSlugBenchmarkResult?: ProfileValue };

export function retainImplementationResult(value: ProfileValue): void {
  // One replacement bounds retention independently of calibration and sample counts.
  host.uuidSlugBenchmarkResult = value;
}
