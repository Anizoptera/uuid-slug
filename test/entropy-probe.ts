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
  ["uuidV4Slug", () => codec.uuidV4Slug()],
  ["uuidV7MaskedSlug", () => codec.uuidV7MaskedSlug()],
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
  new Set(Array.from({ length: calls }, () => String(generate()))).size;

export const insecureAmong = (sources: readonly string[]): string[] =>
  sources.filter((source) => INSECURE_SOURCES.includes(source));
