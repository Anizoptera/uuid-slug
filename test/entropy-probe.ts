// SPDX-License-Identifier: Apache-2.0

/**
 * Shared by the vitest and the bun:test entropy gates, because the two runners exercise
 * DIFFERENT runtime adapters and each needs the same guarantee proved separately.
 *
 * Vitest runs on Node, so `#runtime` resolves to `runtime/node.ts`; `bun test` resolves the
 * `bun` condition to `runtime/bun.ts`. Neither run says anything about the other's adapter —
 * measured 2026-08-11, a `Math.random` rewritten into `runtime/web.ts` (Bun's `fillRandom`)
 * left the whole vitest suite green. One list, called from both, is what keeps a rule from
 * holding on the runtime that happens to be checked and not on the one consumers use.
 */
import { instrument, INSECURE_SOURCES } from "../bench/instrument";
import { createUuidSlugCodec } from "../src/index";

export const codec = createUuidSlugCodec();

/**
 * A fixed instant for the timestamped entry points. It is a constant rather than `Date.now()` so
 * the draws below differ ONLY in their random payload: at one millisecond the 42-bit sequence and
 * the 32-bit tail are the entire difference between two values, which is what makes the distinct-
 * count check able to see a backfill path that reuses one draw and collides every row.
 */
const INSTANT = 1_700_000_000_000;

/**
 * Every entry point that produces randomness. `uuidV4`, `uuidV7` and `uuidV7Slug` hand off to
 * a native generator whenever the runtime has one, so only the byte and slug forms reach this
 * package's own `fillRandom` unconditionally — a probe through the string forms alone observes
 * nothing of our code. Any generator added to the codec belongs here.
 */
export const generators: readonly (readonly [string, () => unknown])[] = [
  ["uuidV4", () => codec.uuidV4()],
  ["uuidV7", () => codec.uuidV7()],
  ["uuidV7Slug", () => codec.uuidV7Slug()],
  ["uuidV4Bytes", () => codec.uuidV4Bytes()],
  ["uuidV7Bytes", () => codec.uuidV7Bytes()],
  ["uuidV7At", () => codec.uuidV7At(INSTANT)],
  ["uuidV7BytesAt", () => codec.uuidV7BytesAt(INSTANT)],
  ["uuidV4Slug", () => codec.uuidV4Slug()],
  ["uuidV7MaskedSlug", () => codec.uuidV7MaskedSlug()],
];

/**
 * Every byte-returning entry point, checked in both runners for the exact type it hands back.
 * A `Buffer` satisfies `Uint8Array` structurally, so only a constructor identity check separates
 * them — and the difference is not cosmetic: `toString("hex")` returns hex from one and
 * "1,159,242,…" from the other, and `JSON.stringify` produces two different documents.
 */
export const byteGenerators: readonly (readonly [string, () => Uint8Array | Error])[] = [
  ["uuidV4Bytes", () => codec.uuidV4Bytes()],
  ["uuidV7Bytes", () => codec.uuidV7Bytes()],
  ["uuidV7BytesAt", () => codec.uuidV7BytesAt(INSTANT)],
];

/** The instrument patches globals, so it is always removed, including on a failing assertion. */
export function sourcesUsedBy(generate: () => unknown, calls = 100): string[] {
  const sources = instrument();
  try {
    sources.reset();
    for (let i = 0; i < calls; i += 1) generate();
    return sources.used();
  } finally {
    sources.restore();
  }
}

/**
 * Distinct outputs over `calls` draws, which is the only check here that catches a randomness
 * source failing GROSSLY rather than subtly. A constant seed, a pool of pre-drawn values or a
 * weak LCG each satisfies every per-value assertion in this suite — correct version, correct
 * variant, correct length, ascending timestamps — and each collapses this number immediately.
 */
export const distinctValuesFrom = (generate: () => unknown, calls = 5_000): number =>
  new Set(Array.from({ length: calls }, () => distinctKey(generate()))).size;

/**
 * `String()` is NOT usable here and the reason is a trap worth keeping: on a byte generator it
 * decodes the bytes as text, and every invalid UTF-8 sequence becomes U+FFFD, so distinct
 * identifiers collapse to one key. Measured 2026-08-11 that cost 11 false duplicates in 200,000
 * draws whose bytes were all unique — a red gate accusing the package of repeating identifiers.
 * Joining the elements is lossless for any typed array, including a node `Buffer`, which does not
 * override `join`.
 */
const distinctKey = (value: unknown): string =>
  value instanceof Uint8Array ? value.join(",") : String(value);

export const insecureAmong = (sources: readonly string[]): string[] =>
  sources.filter((source) => INSECURE_SOURCES.includes(source));
