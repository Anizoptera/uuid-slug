// SPDX-License-Identifier: Apache-2.0

import { halfSipHash } from "./siphash";

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
export function mix32(value: number): number {
  let x = (value ^ (value >>> 16)) >>> 0;
  x = Math.imul(x, 0x7feb352d);
  x = (x ^ (x >>> 15)) >>> 0;
  x = Math.imul(x, 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}

/** Big-endian on purpose: the wire format must not depend on the host's byte order. */
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

// Scratch for the round function, at module scope because allocating two 2-word arrays per call
// dominated the mix. Safe because nothing here is reentrant: `feistel16` is synchronous, calls only
// `halfSipHash`, and that calls nothing.
const roundInput = new Int32Array(2);
const roundOutput = new Int32Array(2);

/**
 * Transform 16 bytes from `input` into `output`, which may be the same array.
 *
 * `forward: false` is the exact inverse — the rounds are identical and only the key order
 * differs, which is why the final swap below is undone rather than performed.
 */
export function feistel16(
  input: Uint8Array,
  inputOffset: number,
  keys: Int32Array,
  forward: boolean,
  output: Uint8Array,
  outputOffset: number,
) {
  let left0 = read32(input, inputOffset);
  let left1 = read32(input, inputOffset + 4);
  let right0 = read32(input, inputOffset + 8);
  let right1 = read32(input, inputOffset + 12);
  for (let round = 0; round < ROUNDS; round += 1) {
    const key = (forward ? round : ROUNDS - 1 - round) * 2;
    roundInput[0] = right0;
    roundInput[1] = right1;
    halfSipHash(keys[key] as number, keys[key + 1] as number, roundInput, 8, roundOutput);
    const next0 = left0 ^ (roundOutput[0] as number);
    const next1 = left1 ^ (roundOutput[1] as number);
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
