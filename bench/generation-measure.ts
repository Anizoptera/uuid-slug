// SPDX-License-Identifier: Apache-2.0

import type { GenerationCase, GenerationValue } from "./generation-cases";
import { verifyGenerationCase } from "./generation-cases";

export interface GenerationMeasureOptions {
  readonly durationMs: number;
  readonly samples: number;
  readonly warmupMs: number;
  readonly yieldControl: () => Promise<void>;
}

export interface GenerationMeasurement {
  readonly comparable: string;
  readonly implementation: string;
  readonly name: string;
  readonly note?: string;
  readonly ns: readonly number[];
  readonly operations: number;
  readonly qualification: GenerationCase["qualification"];
  readonly rejectionReason?: string;
  readonly secure?: boolean;
  readonly sink: number;
  readonly version: 4 | 7;
}

let sink = 0;

function consume(value: GenerationValue, index: number): void {
  sink ^=
    typeof value === "number"
      ? value & 0xff
      : typeof value === "string"
        ? value.charCodeAt(index % value.length)
        : (value[index % value.length] ?? 0);
}

function batch(candidate: GenerationCase, count: number): void {
  for (let index = 0; index < count; index += 1) consume(candidate.operation(), index);
}

function validateOptions(options: GenerationMeasureOptions): void {
  if (
    !Number.isFinite(options.durationMs) ||
    options.durationMs <= 0 ||
    !Number.isSafeInteger(options.samples) ||
    options.samples < 1 ||
    !Number.isFinite(options.warmupMs) ||
    options.warmupMs <= 0
  )
    throw new Error("Benchmark duration, sample count, and warm-up must be positive");
}

/** Measure every candidate in rotating order so early heat and late throttling are shared. */
export async function measureGenerationCases(
  candidates: readonly GenerationCase[],
  options: GenerationMeasureOptions,
): Promise<readonly GenerationMeasurement[]> {
  validateOptions(options);
  if (new Set(candidates.map(({ name }) => name)).size !== candidates.length)
    throw new Error("Benchmark case names must be unique");
  for (const candidate of candidates) {
    if (candidate.qualification === "rejected" && !candidate.rejectionReason)
      throw new Error(`${candidate.name} needs a concrete rejection reason`);
    if (candidate.qualification === "qualified" && candidate.rejectionReason)
      throw new Error(`${candidate.name} cannot be qualified and rejected`);
    verifyGenerationCase(candidate);
    const started = performance.now();
    do batch(candidate, 64);
    while (performance.now() - started < options.warmupMs);
  }

  const observations = new Map<string, number[]>();
  const operations = new Map<string, number>();
  for (let sample = 0; sample < options.samples; sample += 1) {
    const offset = sample % candidates.length;
    for (let step = 0; step < candidates.length; step += 1) {
      const candidate = candidates[(offset + step) % candidates.length];
      if (!candidate) throw new Error("Benchmark order selected no candidate");
      let count = 0;
      const started = performance.now();
      let elapsed = 0;
      do {
        batch(candidate, 64);
        count += 64;
        elapsed = performance.now() - started;
      } while (elapsed < options.durationMs);
      const values = observations.get(candidate.name) ?? [];
      values.push((elapsed * 1e6) / count);
      observations.set(candidate.name, values);
      operations.set(candidate.name, (operations.get(candidate.name) ?? 0) + count);
      await options.yieldControl();
    }
  }

  return candidates.map(({ operation: _, expectedTimestamps: __, ...candidate }) => {
    const ns = observations.get(candidate.name);
    const count = operations.get(candidate.name);
    if (!ns || ns.length !== options.samples || !count)
      throw new Error(`${candidate.name} did not produce every requested benchmark sample`);
    return { ...candidate, ns, operations: count, sink };
  });
}
