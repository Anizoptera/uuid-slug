// SPDX-License-Identifier: Apache-2.0

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
