// SPDX-License-Identifier: Apache-2.0

import { checkRange, UuidSlugError } from "./errors";
import type { UuidSlugErrorCode } from "./errors";

/**
 * A power-of-two alphabet plus its reverse lookup. Encoding is pure bit packing, so the only
 * thing that varies between base64url and base32 is the character set and how many bits each
 * character carries — one routine serves both rather than two hand-unrolled loops.
 */
export interface Alphabet {
  readonly bitsPerChar: number;
  readonly chars: string;
  readonly code: UuidSlugErrorCode;
  /** Character code -> value, `-1` for anything outside the alphabet. */
  readonly decode: Int16Array;
  readonly name: string;
}

function alphabet(name: string, chars: string, code: UuidSlugErrorCode): Alphabet {
  const bitsPerChar = Math.log2(chars.length);
  if (!Number.isInteger(bitsPerChar)) throw new Error(`${name} alphabet must be a power of two.`);
  const decode = new Int16Array(128).fill(-1);
  for (let i = 0; i < chars.length; i += 1) decode[chars.charCodeAt(i)] = i;
  return { bitsPerChar, chars, code, decode, name };
}

export const BASE64URL = alphabet(
  "base64url",
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
  "invalid_base64url",
);

/**
 * The RFC 4648 §7 extended-hex digit values, not the §6 alphabet and not Crockford. Chosen because
 * its characters are in ASCII order, so encoded values sort the same way the underlying bytes do —
 * the one property base64url cannot offer, and the reason a second alphabet exists at all.
 *
 * Spelled LOWERCASE where the RFC writes `0-9A-V`, matching how this package renders UUIDs, and
 * decoding accepts only that spelling so an id has exactly one form. The cost is interop: verified
 * 2026-08-12 against CPython, `base64.b32hexdecode` rejects these slugs unless called with
 * `casefold=True`. Upper-case them at the boundary if a strict RFC decoder has to read them.
 */
export const BASE32HEX = alphabet(
  "base32hex",
  "0123456789abcdefghijklmnopqrstuv",
  "invalid_base32",
);

/**
 * Bits left over when `byteLength` bytes are written in this alphabet. A slug rounds up to whole
 * characters, so the final character has spare low bits that carry no data: 4 for 16 bytes in
 * base64url (22 chars = 132 bits), 2 in base32hex (26 chars = 130 bits). Callers may spend them
 * on a trailing value at zero cost in length — see `encode`.
 */
export function spareBits(alpha: Alphabet, byteLength: number): number {
  const bits = byteLength * 8;
  return (alpha.bitsPerChar - (bits % alpha.bitsPerChar)) % alpha.bitsPerChar;
}

/**
 * Pack bytes, optionally followed by `tailBits` low bits of `tail`, into `alpha`.
 *
 * `tailBits` MUST NOT exceed `spareBits`, otherwise the result grows a character. Passing
 * `tail = 0` reproduces a plain encoding byte for byte, which is what keeps identifiers issued
 * before the tail existed valid afterwards.
 */
export function encode(bytes: Uint8Array, alpha: Alphabet, tail = 0, tailBits = 0): string {
  const { bitsPerChar, chars } = alpha;
  const mask = (1 << bitsPerChar) - 1;
  let out = "";
  let acc = 0;
  let bits = 0;
  for (let i = 0; i < bytes.length; i += 1) {
    // At most bitsPerChar-1 bits are held over, so `acc` peaks at 13 bits and stays in int32.
    acc = (acc << 8) | (bytes[i] as number);
    bits += 8;
    while (bits >= bitsPerChar) {
      bits -= bitsPerChar;
      out += chars[(acc >>> bits) & mask];
    }
  }
  if (tailBits > 0) {
    acc = (acc << tailBits) | (tail & ((1 << tailBits) - 1));
    bits += tailBits;
    while (bits >= bitsPerChar) {
      bits -= bitsPerChar;
      out += chars[(acc >>> bits) & mask];
    }
  }
  if (bits > 0) out += chars[(acc << (bitsPerChar - bits)) & mask];
  return out;
}

/**
 * Inverse of `encode`, writing into a caller-owned buffer so the slug paths need no intermediate
 * allocation. Returns the trailing value (0 when `tailBits` is 0), or an Error.
 *
 * Rejects any character outside the alphabet, and any padding bit that is not zero. Without that
 * last check one identifier would have several valid spellings, so a corrupted slug could decode
 * successfully instead of being refused.
 */
export function decodeInto(
  value: string,
  alpha: Alphabet,
  out: Uint8Array,
  offset: number,
  byteLength: number,
  tailBits = 0,
): UuidSlugError | number {
  const { bitsPerChar, decode: table, code, name } = alpha;
  const expected = Math.ceil((byteLength * 8 + tailBits) / bitsPerChar);
  if (value.length !== expected)
    return new UuidSlugError(code, `Expected ${expected} ${name} characters, got ${value.length}.`);
  const badRange = checkRange(out, offset, byteLength);
  if (badRange) return badRange;

  let acc = 0;
  let bits = 0;
  let written = 0;
  for (let i = 0; i < value.length; i += 1) {
    const charCode = value.charCodeAt(i);
    const digit = charCode < 128 ? (table[charCode] as number) : -1;
    if (digit < 0) return new UuidSlugError(code, `Invalid ${name} character at offset ${i}.`);
    acc = (acc << bitsPerChar) | digit;
    bits += bitsPerChar;
    while (bits >= 8 && written < byteLength) {
      bits -= 8;
      out[offset + written] = (acc >>> bits) & 0xff;
      written += 1;
    }
  }
  let tail = 0;
  if (tailBits > 0) {
    bits -= tailBits;
    tail = (acc >>> bits) & ((1 << tailBits) - 1);
  }
  if (bits > 0 && (acc & ((1 << bits) - 1)) !== 0)
    return new UuidSlugError(code, `${name} value has non-canonical trailing bits.`);
  return tail;
}
