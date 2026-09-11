// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { FEISTEL_KEY_WORDS, feistel16 } from "../src/feistel";

const keysFrom = (seed: number) => {
  const keys = new Int32Array(FEISTEL_KEY_WORDS);
  let state = seed >>> 0;
  for (let i = 0; i < keys.length; i += 1) {
    state = (state + 0x9e3779b9) >>> 0;
    state = Math.imul(state ^ (state >>> 16), 0x7feb352d) >>> 0;
    keys[i] = state | 0;
  }
  return keys;
};

const KEYS = keysFrom(0xc0ffee);

const apply = (bytes: Uint8Array, forward: boolean, keys = KEYS) => {
  const out = new Uint8Array(16);
  feistel16(bytes, 0, keys, forward, out, 0);
  return out;
};

const blockFrom = (seed: number) => {
  const bytes = new Uint8Array(16);
  let state = seed >>> 0;
  for (let i = 0; i < bytes.length; i += 1) {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    bytes[i] = state >>> 24;
  }
  return bytes;
};

/** v7 layout with a caller-chosen millisecond, so timestamp-driven structure is controllable. */
const uuidV7BytesAt = (ms: number) => {
  const bytes = blockFrom(ms);
  let value = ms;
  for (let i = 5; i >= 0; i -= 1) {
    bytes[i] = value & 0xff;
    value = Math.floor(value / 256);
  }
  bytes[6] = 0x70 | ((bytes[6] as number) & 0x0f);
  bytes[8] = 0x80 | ((bytes[8] as number) & 0x3f);
  return bytes;
};

describe("feistel mixing", () => {
  it("reverses varied deterministic blocks", () => {
    for (let i = 0; i < 512; i += 1) {
      const source = blockFrom(i);
      const mixed = apply(source, true);
      expect(mixed).toHaveLength(16);
      expect([...apply(mixed, false)]).toEqual([...source]);
    }
  });

  // Safe in place because every round reads all four words into locals before writing any back.
  // The schema contract still forbids aliasing, since a permuting scheme has no such property.
  it("works in place", () => {
    const source = blockFrom(0x1234);
    const scratch = new Uint8Array(source);
    feistel16(scratch, 0, KEYS, true, scratch, 0);
    expect([...scratch]).toEqual([...apply(source, true)]);
    feistel16(scratch, 0, KEYS, false, scratch, 0);
    expect([...scratch]).toEqual([...source]);
  });

  it("honours an offset, so it can mix inside a larger buffer", () => {
    const source = blockFrom(0x5678);
    const framed = new Uint8Array(24);
    framed.set(source, 5);
    const out = new Uint8Array(24).fill(0xaa);
    feistel16(framed, 5, KEYS, true, out, 3);
    expect([...out.subarray(3, 19)]).toEqual([...apply(source, true)]);
    expect([...out.subarray(0, 3)]).toEqual([0xaa, 0xaa, 0xaa]);
  });

  // The whole reason this replaces permute+XOR. A construction that mixed poorly would still be
  // a reversible bijection and still pass every test above, so this is what actually pins it.
  it("leaves no byte constant across ids from the same second, unlike a substitution", () => {
    const substitution = (() => {
      const permute = Uint8Array.from([9, 13, 3, 8, 14, 0, 11, 7, 6, 1, 15, 4, 2, 5, 10, 12]);
      const xor = blockFrom(0x9abc);
      return (bytes: Uint8Array) =>
        Uint8Array.from(
          { length: 16 },
          (_, i) => (bytes[permute[i] as number] as number) ^ (xor[i] as number),
        );
    })();

    const base = 1_760_000_000_000;
    const constantBytes = (mask: (bytes: Uint8Array) => Uint8Array) => {
      const masked = Array.from({ length: 1000 }, (_, i) => mask(uuidV7BytesAt(base + (i % 1000))));
      let constant = 0;
      for (let i = 0; i < 16; i += 1)
        if (masked.every((m) => m[i] === (masked[0] as Uint8Array)[i])) constant += 1;
      return constant;
    };

    expect(constantBytes(substitution)).toBeGreaterThan(0);
    expect(constantBytes((bytes) => apply(bytes, true))).toBe(0);
  });

  // A round function with weak diffusion would still round-trip. This is what catches it.
  it("changes about half the output bits for a single flipped input bit", () => {
    let total = 0;
    const samples = 2000;
    for (let i = 0; i < samples; i += 1) {
      const source = blockFrom(i);
      const before = apply(source, true);
      const bit = i % 128;
      source[bit >> 3] = (source[bit >> 3] as number) ^ (1 << (bit & 7));
      const after = apply(source, true);
      for (let byte = 0; byte < 16; byte += 1) {
        let diff = (before[byte] as number) ^ (after[byte] as number);
        while (diff) {
          total += diff & 1;
          diff >>= 1;
        }
      }
    }
    const mean = total / samples;
    expect(mean).toBeGreaterThan(60);
    expect(mean).toBeLessThan(68);
  });

  it("produces unrelated output under a different key, and cannot be inverted with one", () => {
    const other = keysFrom(0xc0ffef);
    const source = blockFrom(0xdef0);
    const mixed = apply(source, true);
    expect([...apply(source, true, other)]).not.toEqual([...mixed]);
    expect([...apply(mixed, false, other)]).not.toEqual([...source]);
  });

  // Locks the construction to a wire format: byte order, round count, key schedule and the
  // undone final swap all feed this. Any accidental change to them shows up here rather than in
  // production as identifiers that no longer decode.
  it("is deterministic across platforms", () => {
    const block = Uint8Array.from([
      0x01, 0x9f, 0xf1, 0x9b, 0x58, 0xb8, 0x70, 0x00, 0x9b, 0x1b, 0xdf, 0x71, 0x3b, 0xd5, 0x56,
      0x2c,
    ]);
    // Deliberately not a snapshot: `vitest -u` would rewrite a snapshot without anyone reading
    // the diff, which is precisely the mistake this guards against.
    expect(Buffer.from(apply(block, true)).toString("hex")).toBe(
      "621e8b47229ec52e58686c204581903e",
    );
  });
});
