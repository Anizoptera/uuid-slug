// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { BASE32HEX, BASE64URL, decodeInto, encode, spareBits } from "../src/alphabet";
import {
  uuidBytesToPlainSlug,
  isPlainUuidSlug,
  plainSlugToUuidBytes,
  uuidStringToPlainSlug,
} from "../src/index";
import { WIRE_FORMAT_CODECS as codecs } from "./wire-format-codecs";
import golden from "../rust/uuid-slug/tests/fixtures/fixtures-wire-format.json";

const bytesFrom = (length: number) =>
  Uint8Array.from({ length }, (_, index) => (Math.imul(length + 1, 131) + index * 197) & 0xff);

function encodeBase32Reference(bytes: Uint8Array): string {
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  const chars = Math.ceil((bytes.length * 8) / 5);
  value <<= BigInt(chars * 5 - bytes.length * 8);
  let expected = "";
  for (let i = chars - 1; i >= 0; i -= 1)
    expected += BASE32HEX.chars[Number((value >> BigInt(i * 5)) & 31n)];
  return expected;
}

describe("bit-packing codec", () => {
  // An oracle only has value when it can fail independently of the code under test. Comparing
  // against this package's own previous output would agree by construction; `Buffer` is a
  // separate implementation of the same RFC 4648 alphabet.
  it("encodes a UUID payload identically to node Buffer", () => {
    const bytes = bytesFrom(16);
    expect(uuidBytesToPlainSlug(bytes)).toBe(Buffer.from(bytes).toString("base64url"));
  });

  // No platform ships base32, so the independent channel is the definition itself: the bytes as
  // one big integer, left-aligned to a whole number of characters, read five bits at a time.
  it("encodes base32hex identically to a bit-level reference", () => {
    for (let length = 1; length <= 33; length += 1) {
      const bytes = bytesFrom(length);
      expect(encode(bytes, BASE32HEX)).toBe(encodeBase32Reference(bytes));
    }
  });

  it("round-trips both alphabets through the shared decoder", () => {
    for (const alpha of [BASE64URL, BASE32HEX])
      for (let length = 1; length <= 33; length += 1) {
        const bytes = bytesFrom(length);
        const out = new Uint8Array(length);
        expect(decodeInto(encode(bytes, alpha), alpha, out, 0, length)).toBe(0);
        expect([...out]).toEqual([...bytes]);
      }
  });

  it("decodes varied 16-byte base64url payloads from an independent encoder", () => {
    for (let seed = 0; seed < 256; seed += 1) {
      const bytes = Uint8Array.from({ length: 16 }, (_, index) =>
        Math.imul(seed + 1, index * 197 + 131),
      );
      const encoded = Buffer.from(bytes).toString("base64url");
      const out = new Uint8Array(16);
      expect(decodeInto(encoded, BASE64URL, out, 0, 16)).toBe(0);
      expect(out).toEqual(bytes);
    }
  });

  it("reports every invalid base64url character position on the fixed UUID path", () => {
    const encoded = Buffer.alloc(16).toString("base64url");
    // U+0141 shares its low seven bits with "A", so a table read that drops the high bits accepts it.
    for (const character of ["!", "\u0141"])
      for (let index = 0; index < encoded.length; index += 1) {
        const invalid = `${encoded.slice(0, index)}${character}${encoded.slice(index + 1)}`;
        expect(decodeInto(invalid, BASE64URL, new Uint8Array(16), 0, 16)).toMatchObject({
          code: "invalid_base64url",
          message: `Invalid base64url character ${JSON.stringify(character)} at offset ${index}.`,
        });
      }
  });

  it("preserves every base64url UUID tail and rejects non-canonical plain tails", () => {
    const bytes = bytesFrom(16);
    for (let tail = 0; tail < 16; tail += 1) {
      const out = new Uint8Array(16);
      expect(decodeInto(encode(bytes, BASE64URL, tail, 4), BASE64URL, out, 0, 16, 4)).toBe(tail);
      expect(out).toEqual(bytes);
    }
    expect(decodeInto(`${"A".repeat(21)}B`, BASE64URL, new Uint8Array(16), 0, 16)).toMatchObject({
      code: "invalid_base64url",
      message:
        "base64url value has non-canonical trailing bits; a masked slug of this length decodes only through its codec.",
    });
  });

  it("decodes varied 16-byte base32hex payloads from a bit-level reference", () => {
    for (let seed = 0; seed < 256; seed += 1) {
      const bytes = Uint8Array.from({ length: 16 }, (_, index) =>
        Math.imul(seed + 1, index * 197 + 131),
      );
      const out = new Uint8Array(16);
      expect(decodeInto(encodeBase32Reference(bytes), BASE32HEX, out, 0, 16)).toBe(0);
      expect(out).toEqual(bytes);
    }
  });

  it("reports every invalid base32hex character position on the fixed UUID path", () => {
    const encoded = "0".repeat(26);
    // U+0130 shares its low seven bits with "0", so a table read that drops the high bits accepts it.
    for (const character of ["w", "\u0130"])
      for (let index = 0; index < encoded.length; index += 1) {
        const invalid = `${encoded.slice(0, index)}${character}${encoded.slice(index + 1)}`;
        expect(decodeInto(invalid, BASE32HEX, new Uint8Array(16), 0, 16)).toMatchObject({
          code: "invalid_base32hex",
          message: `Invalid base32hex character ${JSON.stringify(character)} at offset ${index}.`,
        });
      }
  });

  it("preserves every base32hex UUID tail and rejects non-canonical plain tails", () => {
    const bytes = bytesFrom(16);
    for (let tail = 0; tail < 4; tail += 1) {
      const out = new Uint8Array(16);
      expect(decodeInto(encode(bytes, BASE32HEX, tail, 2), BASE32HEX, out, 0, 16, 2)).toBe(tail);
      expect(out).toEqual(bytes);
    }
    expect(decodeInto(`${"0".repeat(25)}1`, BASE32HEX, new Uint8Array(16), 0, 16)).toMatchObject({
      code: "invalid_base32hex",
      message: "base32hex value has non-canonical trailing bits.",
    });
  });

  // The spare bits are what let a mask label ride along at no cost in length. If this ever stops
  // holding, the masked slug silently grows a character.
  it("leaves exactly 4 spare bits in base64url and 2 in base32hex for 16 bytes", () => {
    expect(spareBits(BASE64URL, 16)).toBe(4);
    expect(spareBits(BASE32HEX, 16)).toBe(2);
  });

  it("carries a trailing value in the spare bits without changing the length", () => {
    const bytes = bytesFrom(16);
    for (const [alpha, length] of [
      [BASE64URL, 22],
      [BASE32HEX, 26],
    ] as const) {
      const plain = encode(bytes, alpha);
      const seen = new Set<string>();
      for (let tail = 0; tail < 4; tail += 1) {
        const encoded = encode(bytes, alpha, tail, 2);
        expect(encoded).toHaveLength(length);
        seen.add(encoded);
        const out = new Uint8Array(16);
        expect(decodeInto(encoded, alpha, out, 0, 16, 2)).toBe(tail);
        expect([...out]).toEqual([...bytes]);
      }
      // Tail 0 must reproduce the plain encoding byte for byte, or identifiers issued before the
      // tail existed stop validating.
      expect(encode(bytes, alpha, 0, 2)).toBe(plain);
      expect(seen.size).toBe(4);
    }
  });

  it.each([
    ["padded", "AAAA===="],
    ["a character outside the alphabet", "AAAAAAAAAAAAAAAAAAAAA!"],
    ["a length no byte count can produce", "AAAAA"],
    ["non-zero padding bits", "AAAAAAAAAAAAAAAAAAAAAB"],
    ["a non-ascii character", "AAÿA"],
  ])("rejects %s", (_what, value) => {
    expect(plainSlugToUuidBytes(value)).toBeInstanceOf(Error);
  });

  it.each([
    ["rejects an empty string", "", false],
    ["rejects null", null, false],
    ["rejects undefined", undefined, false],
    ["rejects the wrong length", "AAAA", false],
    ["accepts a canonical slug", "AAAAAAAAcACAAAAAAAAAAA", true],
  ])("base64url UUID slug predicate %s", (_case, value, expected) => {
    expect(isPlainUuidSlug(value)).toBe(expected);
  });
});

// Slugs already issued in production must survive every future change to the encoder or the mask
// layer. The vectors were generated from the shipped implementation, so this fails loudly the
// moment the wire format moves, whether or not the move was intentional.
describe("wire format compatibility", () => {
  it.each(golden)("$mask $uuid encodes and decodes unchanged", (vector) => {
    const codec = codecs[vector.mask as keyof typeof codecs];
    expect(uuidStringToPlainSlug(vector.uuid)).toBe(vector.plain);
    expect(codec.uuidToMaskedSlug(vector.uuid)).toBe(vector.masked);
    expect(codec.uuidToString(vector.masked)).toBe(vector.uuid);
    // Length is part of the wire format, not a by-product of it: 22 characters is what makes the
    // check exactly 16 bits, so a slug that round-trips at some other length has changed format.
    expect(vector.masked).toHaveLength(22);
  });
});

/**
 * The sort claim, gated. README offers base32hex specifically because its slugs sort
 * chronologically as plain strings, and says base64url's cannot — a property of the ALPHABETS, not
 * of any generator: base32hex runs `0-9a-v`, which is ASCII order, while base64url runs
 * `A-Za-z0-9-_`, which is not. Nothing asserted either half, so a reader could store a base64url
 * slug expecting an ordered index and find out in production.
 */
describe("slug sort order", () => {
  // Strictly increasing 16-byte values, so any inversion below is the encoding's and not the input's.
  const rising = Array.from({ length: 2000 }, (_, i) => {
    const bytes = new Uint8Array(16);
    for (let byte = 0; byte < 16; byte += 1) bytes[byte] = (i >>> ((15 - byte) * 8)) & 0xff;
    return bytes;
  });
  const inversions = (spell: (bytes: Uint8Array) => string) => {
    let count = 0;
    for (let i = 1; i < rising.length; i += 1)
      if (spell(rising[i] as Uint8Array) <= spell(rising[i - 1] as Uint8Array)) count += 1;
    return count;
  };

  it("preserves byte order in base32hex and does NOT in base64url", () => {
    expect(inversions((bytes) => encode(bytes, BASE32HEX, 0, spareBits(BASE32HEX, 16)))).toBe(0);
    expect(
      inversions((bytes) => encode(bytes, BASE64URL, 0, spareBits(BASE64URL, 16))),
    ).toBeGreaterThan(0);
  });
});
