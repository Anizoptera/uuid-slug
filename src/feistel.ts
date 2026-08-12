// SPDX-License-Identifier: Apache-2.0

import { halfSipHash } from "./siphash";

/**
 * A 4-round Feistel network over the 16 UUID bytes, used as the mask's mixing step.
 *
 * Why a Feistel rather than the byte permutation plus XOR it replaces: that construction is a
 * monoalphabetic substitution — one output byte per input byte — so bytes the inputs share, the
 * outputs share too. Measured over 3000 ids, masked slugs of UUIDv7s created in the same second
 * held 4 of 16 bytes constant, the same hour 3, the same day 2. The timestamp the mask exists to
 * hide was still legible in the output. A Feistel diffuses every input bit across the whole
 * block, so no output byte is a function of one input byte: the same measurement yields 0 of 16.
 *
 * The bijection is the property being bought, and it holds whatever the round function does: 16
 * bytes map to 16 bytes and the inverse is the same routine with the round keys reversed, so
 * `mask` and `unmask` cannot drift apart.
 *
 * The round function is HalfSipHash-2-4 keyed per round. What that fixes: the previous round
 * function was `mix32(word ^ roundKey)` — a FIXED, PUBLIC, UNKEYED bijection with the key merely
 * XORed in front, so an attacker inverts it and reads `word ^ roundKey` directly. Luby-Rackoff
 * makes a four-round Feistel a strong pseudorandom permutation only when the round functions are
 * pseudorandom functions, which `mix32` is not, so the theorem said nothing about what shipped and
 * an earlier version of this comment cited it wrongly. A keyed PRF meets that hypothesis in kind,
 * which is what makes ROUNDS = 4 a justified number rather than an unexamined margin. It is still
 * NOT a proof about what ships: the theorem wants four INDEPENDENTLY sampled round functions, and
 * `schema.ts` derives all four key pairs from one 128-bit key. Read it as the design rationale it
 * is, and see `docs/design.md` for what masking does and does not promise.
 *
 * Measured 2026-08-12 on Bun, both directions, medians of 9: the swap costs 2.5x on the mixing step
 * alone (30.85M -> 12.43M mixes/s) and about a quarter of end-to-end masking throughput, because
 * mixing is roughly a fifth of a mask. HalfSipHash is FASTER per round than `mix32` — pure
 * add/xor/rotate against two `Math.imul` calls — and loses only by doing 14 rounds where the old
 * function did the equivalent of 4.
 *
 * Nor does any measurement in this repository grade the round count or the round function. Strict
 * avalanche across all input/output bit pairs, a same-millisecond burst where only a 12-bit counter
 * varies, and a single-difference differential all PASS a TWO-round network, so none of them can
 * separate a weak setting from a strong one. Their agreement is evidence about the instruments.
 * `test/siphash.test.ts` is the exception and the reason a published primitive was worth taking:
 * it checks the round function against 64 vectors somebody else computed, and that CAN fail.
 */

/**
 * Round count. Wire-format-bearing: changing it changes every masked slug this package has ever
 * issued, so it moves only alongside a deliberate format change. Four is Luby-Rackoff's number,
 * which the round function now makes relevant — see the note above for why that is a rationale
 * rather than a proof.
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
