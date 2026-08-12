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
import { BASE32HEX, BASE64URL, decodeInto, encode, spareBits } from "../src/alphabet";
import { uuidToSlug } from "../src/index";
import golden from "./fixtures-wire-format.json";
import { WIRE_FORMAT_CODECS as codecs } from "./wire-format-codecs";

describe("wire format is identical across runtimes", () => {
  for (const vector of golden) {
    test(`${vector.schema} ${vector.uuid}`, () => {
      const codec = codecs[vector.schema as keyof typeof codecs];
      expect(uuidToSlug(vector.uuid)).toBe(vector.direct);
      expect(codec.uuidV7ToMaskedSlug(vector.uuid)).toBe(vector.masked);
      expect(codec.maskedSlugToUuidV7(vector.masked)).toBe(vector.uuid);
      expect(vector.masked).toHaveLength(22);
    });
  }

  // The spare bits carry the outer half of the wrong-key check, so every value one can hold must
  // survive the trip. A tail that round-trips for some values and not others would narrow the
  // check silently: the slug still decodes, and only the rate of wrong-key acceptance moves.
  test("both alphabets round-trip 16 bytes plus every value of their spare bits", () => {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    for (const [alpha, length] of [
      [BASE64URL, 22],
      [BASE32HEX, 26],
    ] as const) {
      const width = spareBits(alpha, 16);
      for (let tail = 0; tail < 1 << width; tail += 1) {
        const encoded = encode(bytes, alpha, tail, width);
        expect(encoded).toHaveLength(length);
        const out = new Uint8Array(16);
        expect(decodeInto(encoded, alpha, out, 0, 16, width)).toBe(tail);
        expect([...out]).toEqual([...bytes]);
      }
    }
  });
});
