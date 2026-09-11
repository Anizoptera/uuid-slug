// SPDX-License-Identifier: Apache-2.0

/**
 * Measure each UUID implementation and consumer operation under the same runtime, allocator
 * and clock. Generation, conversion and byte-returning paths have separate loops so the
 * benchmark does not charge unrelated work to an operation. Randomness measurements live
 * in entropy.ts and impose no performance thresholds.
 */
import { performance } from "node:perf_hooks";

import { unwrap } from "../dev/unwrap";
import { candidates, nativeVariants, runtimeName } from "./candidates";
import {
  createUuidSlugCodec,
  PUBLIC_MASK_SCHEMA,
  slugToUuid,
  uuidToSlug,
  uuidToBytes,
  uuidV7Bytes,
  uuidV7Slug,
  validateUuidV7Fresh,
} from "../src/index";

const smoke = process.argv.includes("--smoke");
const iterations = Number(process.env.UUID_SLUG_BENCH_ITERATIONS ?? (smoke ? 10_000 : 1_000_000));
if (!Number.isSafeInteger(iterations) || iterations <= 0)
  throw new Error("UUID_SLUG_BENCH_ITERATIONS must be a positive safe integer");

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

const publicCodec = unwrap(createUuidSlugCodec({ mask: PUBLIC_MASK_SCHEMA }));
measure("package.v7.slug", () => unwrap(uuidV7Slug()));
measure("package.v7.maskedSlug", () => unwrap(publicCodec.uuidV7MaskedSlug()));

// Fixed inputs exclude generation and key derivation from conversion costs. Error discrimination
// stays inside the timed call because callers of these APIs must handle the returned error.
const input = "0191c2bb-6d00-7123-8123-123456789abc";
for (const alphabet of ["base64url", "base32hex"] as const) {
  const slug = unwrap(uuidToSlug(input, alphabet));
  measure(`package.${alphabet}.encode`, () => unwrap(uuidToSlug(input, alphabet)));
  measure(`package.${alphabet}.decode`, () => unwrap(slugToUuid(slug)));
}
const timestamp = Number.parseInt(input.slice(0, 13).replace("-", ""), 16);
const freshness = { now: () => timestamp };
measure("package.v7.fresh", () => unwrap(validateUuidV7Fresh(input, freshness)));
const current = { id: "current", seed: "benchmark-current-key" };
const previous = { id: "previous", seed: "benchmark-previous-key" };
const masked = unwrap(createUuidSlugCodec({ mask: current }));
const rotated = unwrap(createUuidSlugCodec({ mask: current, previousMasks: [previous] }));
const inputBytes = unwrap(uuidToBytes(input));
const maskedSlug = unwrap(masked.uuidV7ToMaskedSlug(input));
const previousSlug = unwrap(
  unwrap(createUuidSlugCodec({ mask: previous })).uuidV7ToMaskedSlug(input),
);
// A short mask check can accept another key's output; prove this fixture reaches the older key.
if (
  !(masked.maskedSlugToUuidV7(previousSlug) instanceof Error) ||
  unwrap(rotated.maskedSlugToUuidV7(previousSlug)) !== input
)
  throw new Error(
    "Rotation benchmark fixture must reject the current key and resolve through the previous key",
  );
measure("package.masked.encode", () => unwrap(masked.uuidV7ToMaskedSlug(input)));
measure("package.masked.encode.bytes", () => unwrap(masked.uuidV7ToMaskedSlug(inputBytes)));
measure("package.masked.decode", () => unwrap(masked.maskedSlugToUuidV7(maskedSlug)));
measure("package.rotation.current", () => unwrap(rotated.maskedSlugToUuidV7(maskedSlug)));
measure("package.rotation.previous", () => unwrap(rotated.maskedSlugToUuidV7(previousSlug)));
measure("package.masked.invalid", () => {
  const result = masked.maskedSlugToUuidV7("invalid");
  if (!(result instanceof Error)) throw new Error("invalid input was accepted");
  return result.code;
});
// Timed by the byte loop, so it stands beside `bun.v7.buffer` on equal terms. The result check
// is inside the timed section on purpose: `uuidV7Bytes` reports failure by returning an Error
// rather than throwing, so every real caller pays this branch and a row that skipped it would be
// measuring an API nobody can actually use.
measureBytes(
  "package.v7.bytes",
  () => {
    const bytes = uuidV7Bytes();
    if (bytes instanceof Error) throw bytes;
    return bytes;
  },
  "raw 16 bytes",
);

for (const variant of nativeVariants) {
  if (variant.text) measure(`native.${variant.name}`, variant.text, variant.note);
  if (variant.bytes) measureBytes(`native.${variant.name}`, variant.bytes, variant.note);
}
