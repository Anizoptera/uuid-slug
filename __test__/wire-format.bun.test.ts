// SPDX-License-Identifier: Apache-2.0

/**
 * The wire format must be byte-identical on every runtime, and nothing else proves it. Vitest
 * runs on Node; these same vectors are asserted there by `__test__/alphabet.test.ts`, so the two
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
import {
  BASE32HEX,
  BASE64URL,
  decodeInto,
  encode,
  encodePortable,
  spareBits,
} from "../src/alphabet";
import { uuidStringToSlug } from "../src/index";
import golden from "../rust/uuid-slug/tests/fixtures/fixtures-wire-format.json";
import { WIRE_FORMAT_CODECS as codecs } from "./wire-format-codecs";

describe("wire format is identical across runtimes", () => {
  for (const vector of golden) {
    test(`${vector.mask} ${vector.uuid}`, () => {
      const codec = codecs[vector.mask as keyof typeof codecs];
      expect(String(uuidStringToSlug(vector.uuid))).toBe(vector.direct);
      expect(String(codec.uuidToSlug(vector.uuid))).toBe(vector.masked);
      expect(String(codec.uuidSlugToString(vector.masked))).toBe(vector.uuid);
      expect(vector.masked).toHaveLength(22);
    });
  }

  // The spare bits carry the outer half of the wrong-key check, so every value one can hold must
  // survive the trip. A tail that round-trips for some values and not others would narrow the
  // check silently: the slug still decodes, and only the rate of wrong-key acceptance moves.
  test("both alphabets round-trip 16 bytes plus every value of their spare bits", () => {
    const bytes = Uint8Array.from({ length: 16 }, (_, index) => index * 17);
    for (const [alpha, length] of [
      [BASE64URL, 22],
      [BASE32HEX, 26],
    ] as const) {
      const width = spareBits(alpha, 16);
      for (let tail = 0; tail < 1 << width; tail += 1) {
        const encoded = encode(bytes, alpha, tail, width);
        expect(encodePortable(bytes, alpha, tail, width)).toBe(encoded);
        expect(encoded).toHaveLength(length);
        const out = new Uint8Array(16);
        expect(decodeInto(encoded, alpha, out, 0, 16, width)).toBe(tail);
        expect([...out]).toEqual([...bytes]);
      }
    }
  });
});

import { verifyHashContinuations } from "./siphash-probe";
test("interleaved hash continuations preserve every reference vector", verifyHashContinuations);
