// SPDX-License-Identifier: Apache-2.0

/** Describe instrumented call timings without treating correlated calls as confidence samples. */
export function describeCallLatency(ns: readonly number[]) {
  if (ns.length === 0)
    throw new Error("Call latency requires nonempty, finite, nonnegative nanosecond observations");
  const sorted = new Float64Array(ns.length);
  let zeroCount = 0;
  // Validate and count zeros while copying; raw order is evidence, so never sort the input.
  for (let index = 0; index < ns.length; index += 1) {
    const value = ns[index]!;
    if (!Number.isFinite(value) || value < 0) throw new Error("Invalid call-latency observation");
    sorted[index] = value;
    if (value === 0) zeroCount += 1;
  }
  // The compiler floor lacks `toSorted`; the mutable array belongs only to this summary.
  // eslint-disable-next-line unicorn/no-array-sort -- Sort only the copied typed array.
  sorted.sort();
  const p99Ns = sorted[Math.ceil(ns.length * 0.99) - 1]!;
  return {
    sampleCount: ns.length,
    zeroCount,
    p50Ns: sorted[Math.ceil(ns.length * 0.5) - 1]!,
    p99Ns,
    p99Interpretation: p99Ns === 0 ? "below-clock-resolution" : "includes-clock-overhead",
    maxNs: sorted[sorted.length - 1]!,
  };
}

/** Retain acquisition order and timer controls; neither percentile subtraction nor IID inference is valid. */
export async function sampleCallLatency<Value>(
  operation: (index: number) => Value,
  consume: (value: Value, index: number) => void,
  count: number,
  yieldToLoop: () => Promise<void>,
) {
  if (!Number.isSafeInteger(count) || count < 1)
    throw new Error("Latency sample count must be a positive safe integer");
  const ns: number[] = [];
  const timerNs: number[] = [];
  let lastYieldMs = performance.now();
  const control = () => {
    const start = performance.now();
    timerNs.push((performance.now() - start) * 1e6);
  };
  for (let index = 0; index < count; index += 1) {
    // Rotate the control around the call to expose drift without subtracting unlike distributions.
    if (index % 2 === 0) control();
    const start = performance.now();
    const value = operation(index);
    const end = performance.now();
    ns.push((end - start) * 1e6);
    consume(value, index);
    if (index % 2 !== 0) control();
    // Reuse the measured clock to bound cooperative chunks without adding a per-call clock read.
    if ((index & 127) === 127 || end - lastYieldMs >= 1) {
      await yieldToLoop();
      lastYieldMs = performance.now();
    }
  }
  return { ns, timerNs, calls: describeCallLatency(ns), timer: describeCallLatency(timerNs) };
}
