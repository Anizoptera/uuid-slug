// SPDX-License-Identifier: Apache-2.0

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
 * Luby-Rackoff MUST NOT be cited for this construction, though an earlier version of this comment
 * did. The theorem makes a four-round Feistel a strong pseudorandom permutation only when the
 * round functions are independent pseudorandom functions; `mix32` is a bit-mixer, not a PRF, so
 * the theorem says nothing about what is written here. Using a keyed SHA-256 in the rounds would
 * earn the citation, at roughly 3.2 us per call against 95 ns (measured 2026-08-12).
 *
 * Nor does any measurement in this repository grade the round count. Strict avalanche across all
 * input/output bit pairs, a same-millisecond burst where only a 12-bit counter varies, and a
 * single-difference differential all PASS a TWO-round network, so none of them can separate a
 * weak setting from a strong one. Their agreement is evidence about the instruments.
 *
 * So: this raises the bar and is NOT encryption, and that is a deliberate choice (Art's ruling,
 * 2026-08-12 — obscurity is the requirement here, cryptographic security is not). A single known
 * UUID/slug pair exposed most of the substitution mask this replaced and reveals nothing here,
 * but do not read that as resistance to an attacker holding many pairs: nothing here establishes
 * it. Callers who need that guarantee need a different mixing step, not a larger round count.
 */

/**
 * Round count. Unproven margin, not a measured optimum — see the note above for why nothing here
 * can grade it. It is wire-format-bearing: changing it changes every masked slug this package has
 * ever issued, so it moves only alongside a deliberate format change.
 */
const ROUNDS = 4;

/** Two 32-bit round keys per round, consumed as one flat array to keep the hot loop indexed. */
export const FEISTEL_KEY_WORDS = ROUNDS * 2;

/**
 * The `lowbias32` finalizer: an integer hash with near-ideal avalanche for its size, and the
 * cheapest function that gives the network its diffusion. Bijective, which a Feistel round
 * function need not be but may be.
 */
function mix32(value: number): number {
  let x = (value ^ (value >>> 16)) >>> 0;
  x = Math.imul(x, 0x7feb352d);
  x = (x ^ (x >>> 15)) >>> 0;
  x = Math.imul(x, 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}

/** Big-endian on purpose: the wire format must not depend on the host's byte order. */
function read32(bytes: Uint8Array, offset: number): number {
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
    // Chained so both output words depend on both input words; a per-word round function would
    // leave the two halves of each 64-bit side diffusing independently.
    const a = mix32(right0 ^ (keys[key] as number));
    const b = mix32(right1 ^ (keys[key + 1] as number) ^ a);
    const next0 = left0 ^ mix32(a ^ b);
    const next1 = left1 ^ b;
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
