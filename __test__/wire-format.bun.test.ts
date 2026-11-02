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
import { equal } from "node:assert/strict";
import { BASE32HEX, BASE64URL, decodeInto, encode } from "../src/alphabet";
import { uuidStringToPlainSlug } from "../src/index";
import golden from "../rust/uuid-slug/tests/fixtures/fixtures-wire-format.json";
import { WIRE_FORMAT_CODECS as codecs } from "./wire-format-codecs";

describe("wire format is identical across runtimes", () => {
  for (const vector of golden) {
    test(`${vector.mask} ${vector.uuid}`, () => {
      const codec = codecs[vector.mask as keyof typeof codecs];
      equal(uuidStringToPlainSlug(vector.uuid), vector.plain);
      equal(codec.uuidToMaskedSlug(vector.uuid), vector.masked);
      equal(codec.uuidToString(vector.masked), vector.uuid);
      const binary = codec.uuidToMaskedBytes(vector.uuid);
      if (binary instanceof Error) throw binary;
      equal(Buffer.from(binary).toString("hex"), vector.maskedBytes);
      equal(codec.maskedBytesToUuidString(binary), vector.uuid);
    });
  }

  // The spare bits carry the outer half of the wrong-key check, so every value one can hold must
  // survive the trip. A tail that round-trips for some values and not others would narrow the
  // check silently: the slug still decodes, and only the rate of wrong-key acceptance moves.
  test("both masked spellings round-trip 16 bytes plus every 4-bit check tail", () => {
    const bytes = Uint8Array.from({ length: 16 }, (_, index) => index * 17);
    for (const [alpha, length] of [
      [BASE64URL, 22],
      [BASE32HEX, 27],
    ] as const) {
      for (let tail = 0; tail < 16; tail += 1) {
        const encoded = encode(bytes, alpha, tail, 4);
        expect(encoded).toHaveLength(length);
        const out = new Uint8Array(16);
        expect(decodeInto(encoded, alpha, out, 0, 4)).toBe(tail);
        expect([...out]).toEqual([...bytes]);
      }
    }
  });
});

import { verifyHashContinuations } from "./siphash-probe";
test("interleaved hash continuations preserve every reference vector", verifyHashContinuations);
