// SPDX-License-Identifier: Apache-2.0

/**
 * Bun's adapter, which is the one most consumers of this package actually run: the `bun` export
 * condition resolves to `src/index.ts`, so Bun executes this TypeScript directly.
 *
 * The entropy cases here mirror `test/entropy.test.ts` deliberately. Vitest runs on Node and
 * resolves `#runtime` to `runtime/node.ts`, so nothing it asserts constrains `runtime/bun.ts`
 * or the `runtime/web.ts` it draws `fillRandom` from — measured 2026-08-11, a `Math.random`
 * rewritten into `runtime/web.ts` left the entire vitest suite green.
 */
import { describe, expect, test } from "bun:test";

import {
  attributedSourcesFor,
  byteGenerators,
  codec,
  constantBitCount,
  distinctValuesFrom,
  generators,
  insecureAmong,
  sourcesUsedBy,
} from "./entropy-probe";
import { cases as bufferContractCases } from "./buffer-contract-probe";
import { createUuidSlugCodec, isUuidV7String, slugToUuid } from "../src/index";

describe("bun runtime", () => {
  // The same list `test/buffer-contract.test.ts` runs on Node, against Bun's native byte writers.
  // It is the case where the split lanes earn their cost: `uuidV7Bytes` here is
  // `Bun.randomUUIDv7("buffer")` plus `TypedArray.set`, which coerces a NaN offset to 0 and throws
  // on a fractional one — neither of which the portable generator Node runs would ever do.
  for (const entry of bufferContractCases) {
    test(entry.name, () => {
      expect(entry.run()).toBeUndefined();
    });
  }

  test("imports the source condition and generates UUIDv7", () => {
    const local = createUuidSlugCodec();
    expect(isUuidV7String(local.uuidV7())).toBe(true);
    // DECODED, not just measured. Bun is the only runtime that defines `runtime.uuidV7Slug`, so
    // this is the default path for most consumers of this package and the only lane that reaches
    // it -- and a length assertion is nearly free here: unpadded base64url of 16 bytes is ALWAYS
    // 22 characters, so `toHaveLength(22)` alone passed for any 22-character string whatsoever.
    // The base32hex case below always decoded; the native default did not.
    const slug = local.uuidV7Slug();
    expect(slug).toHaveLength(22);
    expect(isUuidV7String(slugToUuid(slug) as string)).toBe(true);
  });

  test("honours a base32hex slugAlphabet instead of the native base64url generator", () => {
    // Bun is the ONLY runtime that defines `runtime.uuidV7Slug`, and it emits base64url. A codec
    // configured for another alphabet must therefore stop using it. Vitest runs on Node, where
    // that method does not exist, so this hazard is invisible there — the same asymmetry recorded
    // for the entropy cases above, and the reason this assertion lives here rather than only in
    // the shared suite.
    const local = createUuidSlugCodec({ slugAlphabet: "base32hex" });
    const slug = local.uuidV7Slug();
    expect(slug).toHaveLength(26);
    expect(isUuidV7String(slugToUuid(slug) as string)).toBe(true);
  });

  test("never reaches for Math.random on any generation path", () => {
    for (const [name, generate] of generators) {
      expect([name, insecureAmong(sourcesUsedBy(generate))]).toEqual([name, []]);
    }
  });

  test("returns plain Uint8Array bytes, never a node Buffer", () => {
    // Bun's native v7 hands back a Buffer; this is the gate that keeps it from reaching a
    // consumer, where it would make `toString("hex")` and `JSON.stringify` runtime-dependent.
    for (const [name, generate] of byteGenerators) {
      const bytes = generate();
      expect([name, (bytes as Uint8Array).constructor.name]).toEqual([name, "Uint8Array"]);
    }
  });

  test("never repeats a value on any generation path", () => {
    for (const [name, generate] of generators) {
      expect([name, distinctValuesFrom(generate)]).toEqual([name, 5_000]);
    }
  });

  test("leaves every v4 bit random except the six the RFC fixes", () => {
    // Bun draws `fillRandom` from `runtime/web.ts`, which vitest never loads, so a bit pinned
    // there is invisible on the Node lane — the same asymmetry as the cases above.
    expect(constantBitCount(() => codec.uuidV4Bytes())).toBe(6);
  });

  test("draws its own randomness from a source that can be shown to be cryptographic", () => {
    const used = attributedSourcesFor(() => codec.uuidV4Bytes());
    expect(used).not.toEqual([]);
    expect(insecureAmong(used)).toEqual([]);
  });
});
