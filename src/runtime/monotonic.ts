// SPDX-License-Identifier: Apache-2.0

/**
 * Whether a native UUIDv7 generator returns values that sort in the order they were created.
 *
 * RFC 9562 §6.2 leaves intra-millisecond ordering to the implementation, and runtimes disagree:
 * Bun advances a 12-bit counter inside the tick, while Node's `crypto.randomUUIDv7`, added in
 * v26.6.0, re-randomises all 74 bits every call. Measured 2026-08-11 on Node 26.7.0, consecutive
 * values inside one millisecond sort in creation order almost exactly half the time — a coin
 * flip — so a generator that merely EXISTS cannot be assumed to be ordered.
 *
 * This is why the capability probe cannot ask whether the method is present. Presence was never
 * the property this package needs; delegating on presence alone silently swapped a sortable
 * identifier for an unsortable one on a runtime upgrade, with no change to any consumer's code.
 *
 * 128 draws, and what that buys: a generator with no counter fails the first comparison with
 * probability one half, so a false pass takes 127 consecutive coin flips. A tick rolling over
 * mid-probe cannot cause a false FAILURE — the timestamp occupies the leading bits, so a later
 * millisecond always sorts after an earlier one. At native speeds the whole probe is a handful
 * of microseconds, paid once when the module loads.
 *
 * What a pass does NOT license: it says the generator has SOME counter, never that the counter
 * cannot run out. Bun's holds 4096 values per millisecond and wraps beyond that, which no probe
 * of this size can reach and which stays a documented limit of the native path.
 */
export function producesOrderedValues(generate: () => string, samples = 128): boolean {
  let previous = generate();
  for (let i = 1; i < samples; i += 1) {
    const next = generate();
    if (next <= previous) return false;
    previous = next;
  }
  return true;
}
