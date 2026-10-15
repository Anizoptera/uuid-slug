// SPDX-License-Identifier: Apache-2.0

/**
 * A four-round Feistel network gives masking an exact inverse while spreading each UUID change
 * across the block. HalfSipHash-2-4 supplies the keyed round function. This is reversible
 * obfuscation, not authenticated encryption; `docs/design.md` defines the security boundary.
 */

/**
 * Round count. Wire-format-bearing: changing it changes every masked slug this package has ever
 * issued, so it moves only alongside a deliberate format change.
 */
const ROUNDS = 4;

/** Two 32-bit round keys per round, consumed as one flat array to keep the hot loop indexed. */
export const FEISTEL_KEY_WORDS = ROUNDS * 2;

/**
 * The `lowbias32` finalizer: an integer hash with near-ideal avalanche for its size. No longer the
 * round function — see above — but still what `mask.ts` derives its check tag with, where the input
 * is public and an unkeyed mixer is the right tool.
 */
/*#__NO_SIDE_EFFECTS__*/
export function mix32(value: number): number {
  let x = (value ^ (value >>> 16)) >>> 0;
  x = Math.imul(x, 0x7feb352d);
  x = (x ^ (x >>> 15)) >>> 0;
  x = Math.imul(x, 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}

/** Big-endian on purpose: the wire format must not depend on the host's byte order. */
/*#__NO_SIDE_EFFECTS__*/
export function read32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] as number) << 24) |
    ((bytes[offset + 1] as number) << 16) |
    ((bytes[offset + 2] as number) << 8) |
    (bytes[offset + 3] as number) |
    0
  );
}

function write32(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = value >>> 24;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}

/**
 * Transform 16 bytes from `input` into `output`, which may be the same array.
 *
 * Unmasking is the exact inverse: the rounds are identical and only the key order differs, which
 * is why the final swap below is undone rather than performed.
 */
export function feistel16(
  input: Uint8Array,
  inputOffset: number,
  keys: Int32Array,
  direction: "mask" | "unmask",
  output: Uint8Array,
  outputOffset: number,
) {
  let left0 = read32(input, inputOffset);
  let left1 = read32(input, inputOffset + 4);
  let right0 = read32(input, inputOffset + 8);
  let right1 = read32(input, inputOffset + 12);
  for (let round = 0; round < ROUNDS; round += 1) {
    const key = (direction === "mask" ? round : ROUNDS - 1 - round) * 2;
    // The round function is `halfSipHash(keys[key], keys[key + 1], [right0, right1], 8)`, written
    // out for its fixed two-word message: the call through word arrays cost about a fifth more of
    // the network on Node and Bun (bench/decisions.md). The fixed vector in `feistel.test.ts`
    // and the wire-format vectors hold it to issued slugs.
    const key0 = keys[key] as number;
    const key1 = keys[key + 1] as number;
    let v0 = key0 | 0;
    let v1 = (key1 ^ 0xee) | 0;
    let v2 = (key0 ^ 0x6c796765) | 0;
    let v3 = (key1 ^ 0x74656462) | 0;
    // Absorb both message words, then the length block for 8 bytes, with two rounds each.
    for (let block = 0; block < 3; block += 1) {
      const m = block === 0 ? right0 : block === 1 ? right1 : 8 << 24;
      v3 ^= m;
      for (let sipRound = 0; sipRound < 2; sipRound += 1) {
        v0 = (v0 + v1) | 0;
        v1 = (v1 << 5) | (v1 >>> 27);
        v1 ^= v0;
        v0 = (v0 << 16) | (v0 >>> 16);
        v2 = (v2 + v3) | 0;
        v3 = (v3 << 8) | (v3 >>> 24);
        v3 ^= v2;
        v0 = (v0 + v3) | 0;
        v3 = (v3 << 7) | (v3 >>> 25);
        v3 ^= v0;
        v2 = (v2 + v1) | 0;
        v1 = (v1 << 13) | (v1 >>> 19);
        v1 ^= v2;
        v2 = (v2 << 16) | (v2 >>> 16);
      }
      v0 ^= m;
    }
    // Two four-round squeezes yield the two output words.
    v2 ^= 0xee;
    let hash0 = 0;
    for (let half = 0; half < 2; half += 1) {
      for (let sipRound = 0; sipRound < 4; sipRound += 1) {
        v0 = (v0 + v1) | 0;
        v1 = (v1 << 5) | (v1 >>> 27);
        v1 ^= v0;
        v0 = (v0 << 16) | (v0 >>> 16);
        v2 = (v2 + v3) | 0;
        v3 = (v3 << 8) | (v3 >>> 24);
        v3 ^= v2;
        v0 = (v0 + v3) | 0;
        v3 = (v3 << 7) | (v3 >>> 25);
        v3 ^= v0;
        v2 = (v2 + v1) | 0;
        v1 = (v1 << 13) | (v1 >>> 19);
        v1 ^= v2;
        v2 = (v2 << 16) | (v2 >>> 16);
      }
      if (half === 0) {
        hash0 = v1 ^ v3;
        v1 ^= 0xdd;
      }
    }
    const next0 = left0 ^ hash0;
    const next1 = left1 ^ v1 ^ v3;
    left0 = right0;
    left1 = right1;
    right0 = next0;
    right1 = next1;
  }
  // Undoing the last round's swap is what collapses encode and decode into one routine. Perform
  // it, and decoding would need its own mirrored loop that can silently disagree with this one.
  write32(output, outputOffset, right0);
  write32(output, outputOffset + 4, right1);
  write32(output, outputOffset + 8, left0);
  write32(output, outputOffset + 12, left1);
}
