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
import { instrument, INSECURE_SOURCES } from "./instrument";
import {
  createUuidV7SlugCodec,
  UUID_V7_TEST_MASK,
  generateUuidV4,
  generateUuidV4Bytes,
  generateUuidV4Slug,
  generateUuidV7,
  generateUuidV7At,
  generateUuidV7Bytes,
  generateUuidV7BytesAt,
  generateUuidV7Slug,
} from "../src/index";
import { unwrap } from "../dev/unwrap";

const codec = unwrap(createUuidV7SlugCodec({ mask: UUID_V7_TEST_MASK }));

/**
 * A fixed instant for the timestamped entry points. It is a constant rather than `Date.now()` so
 * the draws below differ ONLY in their random payload: at one millisecond the 42-bit sequence and
 * the 32-bit tail are the entire difference between two values, which is what makes the distinct-
 * count check able to see a backfill path that reuses one draw and collides every row.
 */
const INSTANT = 1_700_000_000_000;

/**
 * Every entry point that produces randomness. `generateUuidV4`, `generateUuidV7` and `generateUuidV7Slug` hand off to
 * a native generator whenever the runtime has one, so only the byte and slug forms reach this
 * package's own `fillRandom` unconditionally — a probe through the string forms alone observes
 * nothing of our code. Every public generation route belongs here.
 */
export const generators: readonly (readonly [string, () => unknown])[] = [
  ["generateUuidV4", generateUuidV4],
  ["generateUuidV7", generateUuidV7],
  ["generateUuidV7Slug", generateUuidV7Slug],
  ["generateUuidV4Bytes", generateUuidV4Bytes],
  ["generateUuidV7Bytes", generateUuidV7Bytes],
  ["generateUuidV7At", () => generateUuidV7At(INSTANT)],
  ["generateUuidV7BytesAt", () => generateUuidV7BytesAt(INSTANT)],
  ["generateUuidV4Slug", generateUuidV4Slug],
  ["generate", () => codec.generateSlug()],
];

/**
 * Every byte-returning entry point, checked in both runners for the exact type it hands back.
 * A `Buffer` satisfies `Uint8Array` structurally, so only a constructor identity check separates
 * them — and the difference is not cosmetic: `toString("hex")` returns hex from one and
 * "1,159,242,…" from the other, and `JSON.stringify` produces two different documents.
 */
export const byteGenerators: readonly (readonly [string, () => Uint8Array | Error])[] = [
  ["generateUuidV4Bytes", generateUuidV4Bytes],
  ["generateUuidV7Bytes", generateUuidV7Bytes],
  ["generateUuidV7BytesAt", () => generateUuidV7BytesAt(INSTANT)],
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
 * Sources attributed to `generate`, retrying until at least one appears.
 *
 * Randomness is drawn a pool at a time, so most windows attribute no source at all and one has to
 * span a refill. Retrying keeps this independent of the pool size AND of how many draws the cases
 * before it happened to make — a single fixed window passes or fails on pool PHASE, so it fails on
 * changes that have nothing to do with it. Measured 2026-08-12: adding 256 draws to an earlier
 * case in the same file turned the Bun lane's single-window version red, and it had only ever
 * been passing because the draw count ahead of it landed right.
 *
 * Retrying costs a `Math.random` implementation nothing in detection: that attributes an insecure
 * source on the very first call rather than never attributing one.
 */
export function attributedSourcesFor(generate: () => unknown, attempts = 20_000): string[] {
  for (let i = 0; i < attempts; i += 1) {
    const used = sourcesUsedBy(generate);
    if (used.length > 0) return used;
  }
  return [];
}

/**
 * How many of the 128 bit positions never change across `calls` draws.
 *
 * A v4 has exactly six structural ones — four version bits and two variant bits — so any further
 * constant bit is a random bit that is not random. Nothing else here can see that: the distinct
 * count above, the source attribution, and the conformance cases all pass unchanged when a single
 * bit is pinned. Measured 2026-08-12 by mutation, forcing one bit of byte 6 or byte 8 either way
 * left the whole suite green.
 *
 * A COUNT rather than a list of positions on purpose: naming the positions would restate the
 * layout the conformance cases already own, and would only catch a pinned bit where it was
 * expected. Under independent unbiased draws, one bit stays constant over 256 draws with
 * probability 2^-255; this bound does not apply to correlated or biased sources.
 */
export function constantBitCount(generate: () => Error | Uint8Array, calls = 256): number {
  const ones = new Uint32Array(128);
  for (let draw = 0; draw < calls; draw += 1) {
    const bytes = generate();
    if (bytes instanceof Error) throw bytes;
    for (let bit = 0; bit < 128; bit += 1)
      ones[bit] = (ones[bit] as number) + (((bytes[bit >> 3] as number) >>> (7 - (bit & 7))) & 1);
  }
  return ones.reduce((total, count) => total + (count === 0 || count === calls ? 1 : 0), 0);
}

export const insecureAmong = (sources: readonly string[]): string[] =>
  sources.filter((source) => INSECURE_SOURCES.includes(source));
