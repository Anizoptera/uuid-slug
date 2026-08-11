// SPDX-License-Identifier: Apache-2.0

/**
 * Throughput of each UUID implementation, in one process so every candidate meets the same
 * JIT, allocator and clock.
 *
 * Speed only. The uniqueness stress that used to live here counted collisions over 100,000
 * values and was removed rather than kept "just in case": a v7 carries 74 random bits, so a
 * repeat cannot occur at that sample size even from an implementation seeded with a constant,
 * and a check that cannot fail is time spent to learn nothing. What it was reaching for —
 * whether those bits are actually unpredictable — is measured properly in `entropy.ts`, which
 * finds the counters a collision count never could.
 */
import { performance } from "node:perf_hooks";

import { candidates, codec } from "./candidates";

const smoke = process.argv.includes("--smoke");
const iterations = Number(process.env.UUID_SLUG_BENCH_ITERATIONS ?? (smoke ? 10_000 : 1_000_000));

function measure(name: string, fn: () => string) {
  // Warm up so the figure reflects optimised code rather than the climb to it.
  for (let i = 0; i < 1_000; i += 1) fn();
  let blackhole = 0;
  const start = performance.now();
  // Consuming a byte of each result keeps a JIT from eliminating the call as dead.
  for (let i = 0; i < iterations; i += 1) blackhole ^= fn().charCodeAt(0);
  const elapsed = performance.now() - start;
  console.log(
    JSON.stringify({
      blackhole,
      elapsedMs: elapsed,
      iterations,
      name,
      opsPerSecond: Math.round((iterations / elapsed) * 1000),
    }),
  );
}

for (const candidate of candidates) {
  if (candidate.uuidV4) measure(`${candidate.name}.v4.string`, candidate.uuidV4);
  if (candidate.uuidV7) measure(`${candidate.name}.v7.string`, candidate.uuidV7);
}

measure("package.v7.slug", () => codec.uuidV7Slug());
measure("package.v7.maskedSlug", () => codec.uuidV7MaskedSlug());
