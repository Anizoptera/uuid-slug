// SPDX-License-Identifier: Apache-2.0

// Keep selection identical in direct comparisons and automatic gates so a requested runtime
// cannot disappear before measurement. Resource instruments still need their own host support.
export const COMPARISON_RUNTIMES = [
  "node",
  "bun",
  "chromium",
  "firefox",
  "webkit",
  "deno",
  "node-jitless",
] as const;
export type ComparisonRuntime = (typeof COMPARISON_RUNTIMES)[number];
export type BrowserComparisonRuntime = Extract<
  ComparisonRuntime,
  "chromium" | "firefox" | "webkit"
>;

export function selectComparisonRuntimes(input: string): ComparisonRuntime[] {
  const selected = input.split(":");
  const isRuntime = (value: string): value is ComparisonRuntime =>
    COMPARISON_RUNTIMES.some((runtime) => runtime === value);
  if (!selected.every(isRuntime) || new Set(selected).size !== selected.length)
    throw new Error(
      `UUID_SLUG_COMPARE_RUNTIMES must list distinct values from ${COMPARISON_RUNTIMES.join(":")}`,
    );
  return selected;
}
