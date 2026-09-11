// SPDX-License-Identifier: Apache-2.0

/** Return the exact distribution-free 95% interval for a population median. */
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
