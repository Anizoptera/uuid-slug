// SPDX-License-Identifier: Apache-2.0

/**
 * The wire format must be byte-identical on every runtime, and nothing else proves it. Vitest
 * runs on Node; these same vectors are asserted there by `test/alphabet.test.ts`, so the two
 * suites agreeing on one shared fixture file is what makes cross-runtime identity checkable
 * rather than assumed.
 *
 * The risk is real rather than theoretical: masking is 32-bit integer arithmetic (`Math.imul`,
 * shifts, typed arrays) whose results a JIT is free to reach by different routes, and an
 * identifier that encodes differently under Bun than under Node is a silent data-corruption bug
 * — the same record gets two public ids, and ids issued by one runtime fail to decode on the
 * other.
 */
import { describe, expect, test } from "bun:test";
import { BASE32HEX, BASE64URL, decodeInto, encode } from "../src/alphabet";
import { createUuidSlugCodec, uuidToSlug } from "../src/index";
import { LEGACY_MASK_SCHEMA_V1 } from "../src/schema";
import golden from "./fixtures-wire-format.json";

const codecs = {
  default: createUuidSlugCodec({}),
  "legacy-v1": createUuidSlugCodec({ mask: LEGACY_MASK_SCHEMA_V1 }),
  "seeded-v2": createUuidSlugCodec({ mask: { seed: "golden-vector-seed", tagBits: 6 } }),
};

describe("wire format is identical across runtimes", () => {
  for (const vector of golden) {
    test(`${vector.schema} ${vector.uuid}`, () => {
      const codec = codecs[vector.schema as keyof typeof codecs];
      expect(uuidToSlug(vector.uuid)).toBe(vector.direct);
      expect(codec.uuidV7ToMaskedSlug(vector.uuid)).toBe(vector.masked);
      expect(codec.maskedSlugToUuidV7(vector.masked)).toBe(vector.uuid);
      expect(codec.maskedSlugToUuidV7(vector.maskedLegacy)).toBe(vector.uuid);
    });
  }

  test("both alphabets round-trip 16 bytes with a scheme marker", () => {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    for (const [alpha, length] of [
      [BASE64URL, 22],
      [BASE32HEX, 26],
    ] as const)
      for (let marker = 0; marker < 4; marker += 1) {
        const encoded = encode(bytes, alpha, marker, 2);
        expect(encoded).toHaveLength(length);
        const out = new Uint8Array(16);
        expect(decodeInto(encoded, alpha, out, 0, 16, 2)).toBe(marker);
        expect([...out]).toEqual([...bytes]);
      }
  });
});
