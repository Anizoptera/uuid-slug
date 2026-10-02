// SPDX-License-Identifier: Apache-2.0

export const FRESH_PROCESS_SAMPLE_UNIT = "fresh-process";
export const WITHIN_PROCESS_BATCH_SAMPLE_UNIT = "within-process-batch";
export type BenchmarkObservationUnit =
  | typeof FRESH_PROCESS_SAMPLE_UNIT
  | typeof WITHIN_PROCESS_BATCH_SAMPLE_UNIT;

/** Select a numeric median without changing the acquisition order. */
export function sampleMedian(values: readonly number[]): number {
  if (values.length === 0) throw new Error("Cannot select a median from an empty sample");
  // eslint-disable-next-line unicorn/no-array-sort -- Sort a private copy under the compiler floor.
  const sorted = Float64Array.from(values).sort();
  return sorted[Math.floor(sorted.length / 2)]!;
}

/** Keep each process as one statistical unit, regardless of the number of batches it contains. */
export function aggregateForkSamples<
  Row extends {
    readonly name: string;
    readonly ns: readonly number[];
    readonly operations: number;
  },
>(forks: readonly (readonly Row[])[]) {
  const first = forks[0];
  if (!first?.length) throw new Error("Fresh-process comparison requires nonempty measurements");
  const names = new Set(first.map(({ name }) => name));
  const indexed = forks.map((rows) => {
    const index = new Map(rows.map((row) => [row.name, row]));
    if (
      index.size !== names.size ||
      index.size !== rows.length ||
      [...names].some((name) => !index.has(name))
    )
      throw new Error("Benchmark case inventory changed between fresh processes");
    return index;
  });
  // Keep raw fork records reusable; overwriting their batches would change the evidence unit.
  // eslint-disable-next-line oxc/no-map-spread -- Aggregate into new records; inputs remain raw evidence.
  return first.map((row) => {
    const observations = indexed.map((index) => index.get(row.name)!);
    return {
      ...row,
      ns: observations.map(({ ns }) => sampleMedian(ns)),
      withinProcessNs: observations.map(({ ns }) => ns),
      operations: observations.reduce((sum, value) => sum + value.operations, 0),
      sampleUnit: FRESH_PROCESS_SAMPLE_UNIT,
    };
  });
}

/** Describe observations; standard error assumes independent samples, not calls within a batch. */
export function describeSamples(values: readonly number[]) {
  if (values.length === 0) return undefined;
  let mean = 0;
  let squaredDeviations = 0;
  let sampleCount = 0;
  // Center each update to avoid subtracting two large squared totals for nearly equal timings.
  for (const value of values) {
    sampleCount += 1;
    const difference = value - mean;
    mean += difference / sampleCount;
    squaredDeviations += difference * (value - mean);
  }
  const sampleStandardDeviation =
    sampleCount > 1 ? Math.sqrt(squaredDeviations / (sampleCount - 1)) : undefined;
  return {
    sampleCount,
    mean,
    sampleStandardDeviation,
    meanStandardError:
      sampleStandardDeviation === undefined
        ? undefined
        : sampleStandardDeviation / Math.sqrt(sampleCount),
  };
}

/** Return a distribution-free 95% median interval, assuming independent, identically distributed observations. */
export function medianConfidence95(
  values: readonly number[],
): readonly [number, number] | undefined {
  // A copied typed array supplies numeric sort without mutating input or requiring newer `toSorted`.
  // eslint-disable-next-line unicorn/no-array-sort -- The configured target excludes `toSorted`.
  const sorted = Float64Array.from(values).sort();
  const combinations = 2 ** sorted.length;
  let coefficient = 1;
  let tail = 1;
  let excluded = -1;
  for (let index = 0; index < sorted.length / 2; index += 1) {
    if (index > 0) coefficient = (coefficient * (sorted.length - index + 1)) / index;
    if ((2 * tail) / combinations > 0.05) break;
    excluded = index;
    tail += (coefficient * (sorted.length - index)) / (index + 1);
  }
  if (excluded < 0) return undefined;
  return [sorted[excluded] as number, sorted[sorted.length - excluded - 1] as number];
}
