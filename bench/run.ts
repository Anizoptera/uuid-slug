// SPDX-License-Identifier: Apache-2.0

/**
 * Throughput of each UUID implementation, in one process so every candidate meets the same
 * JIT, allocator and clock.
 *
 * Speed only. The uniqueness stress that used to live here was deleted on the argument that a
 * 74-bit field cannot repeat at that sample size, so the check could never fail. The argument
 * was wrong, and it was wrong in the way that matters: it reasoned about a HEALTHY generator's
 * birthday bound, which says nothing about a broken one. Measured over 200,000 values, a
 * constant seed yields ONE distinct field, a pool of pre-drawn values yields the pool, and a
 * textbook LCG yields 5,596 — the gross failures a collision count catches instantly and every
 * per-value conformance check passes straight through. It lives in `entropy.ts` as `distinct`,
 * beside the counter measurement, so both run over one sample set instead of two.
 */
import { performance } from "node:perf_hooks";

import { candidates, codec, nativeVariants, runtimeName } from "./candidates";

const smoke = process.argv.includes("--smoke");
const iterations = Number(process.env.UUID_SLUG_BENCH_ITERATIONS ?? (smoke ? 10_000 : 1_000_000));

const report = (name: string, note: string, elapsed: number, blackhole: number) =>
  console.log(
    JSON.stringify({
      blackhole,
      elapsedMs: elapsed,
      iterations,
      name,
      note,
      opsPerSecond: Math.round((iterations / elapsed) * 1000),
      runtime: runtimeName,
    }),
  );

function measure(name: string, fn: () => string, note = "") {
  // Warm up so the figure reflects optimised code rather than the climb to it.
  for (let i = 0; i < 1_000; i += 1) fn();
  let blackhole = 0;
  const start = performance.now();
  // Consuming a byte of each result keeps a JIT from eliminating the call as dead.
  for (let i = 0; i < iterations; i += 1) blackhole ^= fn().charCodeAt(0);
  report(name, note, performance.now() - start, blackhole);
}

/**
 * Deliberately a separate loop rather than a branch inside `measure`. A byte-returning generator
 * is measured precisely to see the cost WITHOUT string work, so paying a per-iteration type test
 * to share one function would tax the row whose whole claim is that it avoids that tax.
 */
function measureBytes(name: string, fn: () => Uint8Array, note = "") {
  for (let i = 0; i < 1_000; i += 1) fn();
  let blackhole = 0;
  const start = performance.now();
  for (let i = 0; i < iterations; i += 1) blackhole ^= fn()[0] ?? 0;
  report(name, note, performance.now() - start, blackhole);
}

for (const candidate of candidates) {
  if (candidate.uuidV4) measure(`${candidate.name}.v4.string`, candidate.uuidV4);
  if (candidate.uuidV7) measure(`${candidate.name}.v7.string`, candidate.uuidV7);
}

measure("package.v7.slug", () => codec.uuidV7Slug());
measure("package.v7.maskedSlug", () => codec.uuidV7MaskedSlug());
// Timed by the byte loop, so it stands beside `bun.v7.buffer` on equal terms. The result check
// is inside the timed section on purpose: `uuidV7Bytes` reports failure by returning an Error
// rather than throwing, so every real caller pays this branch and a row that skipped it would be
// measuring an API nobody can actually use.
measureBytes(
  "package.v7.bytes",
  () => {
    const bytes = codec.uuidV7Bytes();
    if (bytes instanceof Error) throw bytes;
    return bytes;
  },
  "raw 16 bytes",
);

for (const variant of nativeVariants) {
  if (variant.text) measure(`native.${variant.name}`, variant.text, variant.note);
  if (variant.bytes) measureBytes(`native.${variant.name}`, variant.bytes, variant.note);
}
