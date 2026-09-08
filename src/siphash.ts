// SPDX-License-Identifier: Apache-2.0

/**
 * HalfSipHash-2-4 with 64-bit output — the 32-bit-word member of the SipHash family (Aumasson and
 * Bernstein), transcribed from the reference implementation. It is a KEYED pseudorandom function:
 * without the key its output on a chosen input is not computable, which is exactly what `mix32` — a
 * fixed, public, unkeyed bijection — could never be, and the reason it replaced it.
 *
 * One primitive serves both callers that need one: the Feistel round function (`feistel.ts`) and the
 * key derivation (`schema.ts`). Neither justifies its own.
 *
 * Chosen over full SipHash-2-4 because that is defined over 64-bit words, which JavaScript has only
 * as `BigInt` or as hand-emulated 32-bit pairs — the first far too slow for a hot path, the second a
 * re-implementation whose errors nothing would catch. HalfSipHash is 32-bit BY SPECIFICATION, so
 * this is a transcription, and `test/siphash.test.ts` holds it to all 64 published vectors. That
 * external check is the whole reason a standard primitive beat anything tuned here: nothing in this
 * repository can grade a mixing function (see `feistel.ts` — every instrument here passes a
 * two-round network), so agreement with a specification somebody else wrote is the only evidence
 * available that can actually fail.
 *
 * Its key is 64 bits. `schema.ts` runs two independently keyed instances and XORs them, the standard
 * cascade for widening a PRF's key; see there.
 */

/** Message-absorption rounds per block — the `2` of HalfSipHash-**2**-4. */
const C_ROUNDS = 2;
/** Finalisation rounds per output word — the `4` of HalfSipHash-2-**4**. */
const D_ROUNDS = 4;

/** Private continuation: resume only with the same message, keys, byte length and output. */
export interface HashContinuation {
  readonly block: number;
  readonly v0: number;
  readonly v1: number;
  readonly v2: number;
  readonly v3: number;
}

/**
 * HalfSipHash-2-4 over a message supplied as 32-bit LITTLE-ENDIAN words, writing the two output
 * words into `out`.
 *
 * Words rather than bytes because both callers already hold words, and the specification absorbs the
 * message in 32-bit little-endian blocks regardless — so this is the same function with the byte
 * reassembly left to whoever actually has bytes. Taking a `Uint8Array` would make the hot path pack
 * bytes it had just unpacked.
 *
 * `byteLength` is the message length the specification hashes and stamps into the final block.
 * `words` must therefore hold `ceil(byteLength / 4)` entries, with any trailing 1-3 bytes packed
 * little-endian into the low bytes of the last one. Internal cooperative callers may pass a
 * positive block limit and resume the returned continuation with exactly the same inputs.
 */
export function halfSipHash(
  key0: number,
  key1: number,
  words: Int32Array,
  byteLength: number,
  out: Int32Array,
  continuation?: HashContinuation,
  blockLimit = Infinity,
): HashContinuation | undefined {
  let v0 = key0 | 0;
  let v1 = (key1 ^ 0xee) | 0;
  let v2 = (key0 ^ 0x6c796765) | 0;
  let v3 = (key1 ^ 0x74656462) | 0;
  if (continuation) ({ v0, v1, v2, v3 } = continuation);

  // The length-stamped final block is absorbed exactly like a message block, so it rides the same
  // loop rather than a second copy of it. Seeds may end mid-word; mask blocks use whole words.
  // The reference vectors exercise every tail length, including an empty message.
  const fullWords = byteLength >>> 2;
  const spare = byteLength & 3;
  const tail = spare === 0 ? 0 : (words[fullWords] as number) & ((1 << (spare * 8)) - 1);
  const lengthBlock = (byteLength << 24) | tail | 0;
  const start = continuation?.block ?? 0;
  const end = blockLimit === Infinity ? fullWords : Math.min(fullWords, start + blockLimit - 1);
  for (let block = start; block <= end; block += 1) {
    const m = block === fullWords ? lengthBlock : (words[block] as number);
    v3 ^= m;
    for (let round = 0; round < C_ROUNDS; round += 1) {
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

  // No output is published until absorption and finalisation are complete. The synchronous
  // hot path has an unlimited block budget and never allocates a continuation.
  if (end < fullWords) return { block: end + 1, v0, v1, v2, v3 };

  // Two squeezes, and the `0xdd` between them is what makes the second output word something other
  // than a rerun of the first.
  v2 ^= 0xee;
  for (let half = 0; half < 2; half += 1) {
    for (let round = 0; round < D_ROUNDS; round += 1) {
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
    out[half] = v1 ^ v3;
    v1 ^= 0xdd;
  }
  return undefined;
}
