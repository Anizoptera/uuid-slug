// SPDX-License-Identifier: Apache-2.0

import { runtime } from "#runtime";
import { BASE64URL_NAME } from "./base64url-name.ts";
import { checkRange, INVALID_BASE32HEX, INVALID_BASE64URL, UuidSlugError } from "./errors.ts";
import type { UuidSlugErrorCode } from "./errors.ts";
import type { Latin1Scratch } from "./runtime/types.ts";

/** Select lowercase base32hex slug output. */
export const BASE32HEX_NAME = "base32hex";
export { BASE64URL_NAME } from "./base64url-name.ts";

/**
 * A power-of-two alphabet plus its reverse lookup. Encoding is pure bit packing, so the only
 * character set and bits per character define the wire format.
 *
 * Every slug holds exactly one 16-byte UUID, plus an optional 4-bit masked check tail, so the
 * writers and readers below handle only that shape, with no any-length bit accumulator or native
 * `toBase64` delegation behind them: nothing calls another shape. A new payload length needs its
 * own fixed path, because the generic loop measured slower on every engine (bench/decisions.md
 * §Fixed-size portable base64url encoding and its siblings).
 */
export interface Alphabet {
  readonly bitsPerChar: number;
  readonly chars: string;
  readonly code: UuidSlugErrorCode;
  /** Character code -> value, `-1` for anything outside the alphabet. */
  readonly decode: Int16Array;
  readonly name: string;
  readonly invalidChars: RegExp;
  readonly invalidInputChars: RegExp;
}

/*#__NO_SIDE_EFFECTS__*/
function alphabet(
  name: string,
  chars: string,
  code: UuidSlugErrorCode,
  acceptUppercase = false,
): Alphabet {
  const bitsPerChar = Math.log2(chars.length);
  const decode = new Int16Array(128).fill(-1);
  for (let i = 0; i < chars.length; i += 1) {
    const charCode = chars.charCodeAt(i);
    decode[charCode] = i;
    if (acceptUppercase && charCode >= 97 && charCode <= 122) decode[charCode - 32] = i;
  }
  const invalidCharacterPattern = `[^${chars.replaceAll("-", "\\-")}]`;
  return {
    bitsPerChar,
    chars,
    code,
    decode,
    name,
    invalidChars: new RegExp(invalidCharacterPattern),
    invalidInputChars: new RegExp(invalidCharacterPattern, acceptUppercase ? "i" : ""),
  };
}

export const BASE64URL: Alphabet = /*#__PURE__*/ alphabet(
  BASE64URL_NAME,
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
  INVALID_BASE64URL,
);

/**
 * The RFC 4648 §7 extended-hex digit values, not the §6 alphabet and not Crockford. Chosen because
 * its characters are in ASCII order, so encoded values sort the same way the underlying bytes do —
 * the one property base64url cannot offer, and the reason a second alphabet exists at all.
 *
 * Writers use lowercase to match UUID text. Decoders also accept the RFC uppercase spelling, while
 * canonical guards accept only lowercase so callers can enforce one stored form.
 */
export const BASE32HEX: Alphabet = /*#__PURE__*/ alphabet(
  BASE32HEX_NAME,
  "0123456789abcdefghijklmnopqrstuv",
  INVALID_BASE32HEX,
  true,
);

const createLatin1Scratch = runtime.latin1Scratch;
let base64urlScratch: Latin1Scratch | undefined;
let base32hexScratch: Latin1Scratch | undefined;
let maskedBase32hexScratch: Latin1Scratch | undefined;
let base64urlCodes: Uint8Array | undefined;
let base32hexCodes: Uint8Array | undefined;

/*#__NO_SIDE_EFFECTS__*/
function characterCodes(alpha: Alphabet): Uint8Array {
  return Uint8Array.from(alpha.chars, (character) => character.charCodeAt(0));
}

/** Boolean validation needs no output buffer or diagnostic allocation. */
/*#__NO_SIDE_EFFECTS__*/
export function isEncoded(
  value: string,
  alpha: Alphabet,
  byteLength: number,
  acceptsMixedCase = false,
  tailBits = 0,
): boolean {
  if (
    value.length !== Math.ceil((byteLength * 8 + tailBits) / alpha.bitsPerChar) ||
    (acceptsMixedCase ? alpha.invalidInputChars : alpha.invalidChars).test(value)
  )
    return false;
  const spare =
    (alpha.bitsPerChar - ((byteLength * 8 + tailBits) % alpha.bitsPerChar)) % alpha.bitsPerChar;
  return (
    spare === 0 ||
    ((alpha.decode[value.charCodeAt(value.length - 1)] as number) & ((1 << spare) - 1)) === 0
  );
}

function invalidCharacter(alpha: Alphabet, value: string, offset: number): UuidSlugError {
  return new UuidSlugError(
    alpha.code,
    `Invalid ${alpha.name} character ${JSON.stringify(value[offset])} at offset ${offset}.`,
  );
}

/** Report the first character of a fixed-length value that a single-check decode rejected. */
function firstInvalidCharacter(alpha: Alphabet, value: string): UuidSlugError {
  let offset = 0;
  while (offset < value.length - 1) {
    const charCode = value.charCodeAt(offset);
    if (charCode > 127 || (alpha.decode[charCode] as number) < 0) break;
    offset += 1;
  }
  return invalidCharacter(alpha, value, offset);
}

/**
 * Pack one 16-byte UUID payload, optionally followed by the 4-bit masked check `tail`, into `alpha`:
 * 22 base64url characters either way (the tail fills the final character's spare bits), or 26
 * base32hex characters plain and 27 masked. With `tailBits = 0`, `tail` must be 0: that keeps a
 * plain encoding byte for byte equal to the identifiers issued before the tail existed.
 */
/*#__NO_SIDE_EFFECTS__*/
export function encode(bytes: Uint8Array, alpha: Alphabet, tail = 0, tailBits: 0 | 4 = 0): string {
  if (createLatin1Scratch)
    return alpha === BASE64URL
      ? encodeBase64urlLatin1(createLatin1Scratch, bytes, tail)
      : encodeBase32hexLatin1(createLatin1Scratch, bytes, tail, tailBits);
  return alpha === BASE64URL
    ? writeBase64url(bytes, (base64urlCodes ??= characterCodes(BASE64URL)), tail)
    : writeBase32hex(bytes, (base32hexCodes ??= characterCodes(BASE32HEX)), tail, tailBits);
}

/**
 * Write a UUID payload's character codes into reused scratch and read them back with one native
 * Latin-1 conversion. The result is flat text, where native base64url output needs a slice and a
 * concatenation for the check tail and portable output concatenates characters. The scratch is safe
 * to share because nothing between these writes and the read can re-enter encoding.
 */
function encodeBase64urlLatin1(
  create: NonNullable<typeof createLatin1Scratch>,
  bytes: Uint8Array,
  tail: number,
): string {
  const scratch = (base64urlScratch ??= create(22));
  const codes = (base64urlCodes ??= characterCodes(BASE64URL));
  const text = scratch.bytes;
  for (let offset = 0, written = 0; offset < 15; offset += 3, written += 4) {
    const block =
      ((bytes[offset] as number) << 16) |
      ((bytes[offset + 1] as number) << 8) |
      (bytes[offset + 2] as number);
    text[written] = codes[block >>> 18] as number;
    text[written + 1] = codes[(block >>> 12) & 63] as number;
    text[written + 2] = codes[(block >>> 6) & 63] as number;
    text[written + 3] = codes[block & 63] as number;
  }
  const last = bytes[15] as number;
  text[20] = codes[last >>> 2] as number;
  text[21] = codes[((last & 3) << 4) | (tail & 15)] as number;
  return scratch.text();
}

/**
 * The base32hex counterpart of `encodeBase64urlLatin1`. A 4-bit tail needs a 27th character, which
 * holds the tail's low two bits followed by three zero bits.
 */
function encodeBase32hexLatin1(
  create: NonNullable<typeof createLatin1Scratch>,
  bytes: Uint8Array,
  tail: number,
  tailBits: 0 | 4,
): string {
  const scratch =
    tailBits === 4 ? (maskedBase32hexScratch ??= create(27)) : (base32hexScratch ??= create(26));
  const codes = (base32hexCodes ??= characterCodes(BASE32HEX));
  const text = scratch.bytes;
  for (let offset = 0, written = 0; offset < 15; offset += 5, written += 8) {
    const a = bytes[offset] as number;
    const b = bytes[offset + 1] as number;
    const c = bytes[offset + 2] as number;
    const d = bytes[offset + 3] as number;
    const e = bytes[offset + 4] as number;
    text[written] = codes[a >>> 3] as number;
    text[written + 1] = codes[((a & 7) << 2) | (b >>> 6)] as number;
    text[written + 2] = codes[(b >>> 1) & 31] as number;
    text[written + 3] = codes[((b & 1) << 4) | (c >>> 4)] as number;
    text[written + 4] = codes[((c & 15) << 1) | (d >>> 7)] as number;
    text[written + 5] = codes[(d >>> 2) & 31] as number;
    text[written + 6] = codes[((d & 3) << 3) | (e >>> 5)] as number;
    text[written + 7] = codes[e & 31] as number;
  }
  const last = bytes[15] as number;
  text[24] = codes[last >>> 3] as number;
  if (tailBits === 4) {
    text[25] = codes[((last & 7) << 2) | ((tail >>> 2) & 3)] as number;
    text[26] = codes[(tail & 3) << 3] as number;
  } else text[25] = codes[((last & 7) << 2) | (tail & 3)] as number;
  return scratch.text();
}

/**
 * Inverse of `encode`: write one 16-byte UUID payload into a caller-owned buffer so the slug paths
 * need no intermediate allocation. Returns the trailing value (0 when `tailBits` is 0), or an Error.
 *
 * Rejects any character outside the alphabet, and any padding bit that is not zero. Without that
 * last check one identifier would have several valid spellings, so a corrupted slug could decode
 * successfully instead of being refused. Platform base64 decoders are not used for the same reason:
 * they may accept whitespace, padding or nonzero trailing bits.
 */
export function decodeInto(
  value: string,
  alpha: Alphabet,
  out: Uint8Array,
  offset: number,
  tailBits: 0 | 4 = 0,
): number | UuidSlugError {
  const { bitsPerChar, decode: table, code, name } = alpha;
  const expected = Math.ceil((128 + tailBits) / bitsPerChar);
  if (value.length !== expected)
    return new UuidSlugError(code, `Expected ${expected} ${name} characters, got ${value.length}.`);
  const badRange = checkRange(out.length, offset, 16);
  if (badRange) return badRange;

  // Base64url: five complete four-character groups and one byte.
  // Both paths check every character once after the loop: ORing the codes exposes any code
  // above 127, whose low bits the table read would alias, and ORing the digits turns any -1
  // negative. A branch per character was slower on Node and Bun (bench/decisions.md).
  if (alpha === BASE64URL) {
    let codes = 0;
    let digits = 0;
    let written = offset;
    for (let start = 0; start < 20; start += 4) {
      const a = value.charCodeAt(start);
      const b = value.charCodeAt(start + 1);
      const c = value.charCodeAt(start + 2);
      const d = value.charCodeAt(start + 3);
      const block =
        ((table[a & 127] as number) << 18) |
        ((table[b & 127] as number) << 12) |
        ((table[c & 127] as number) << 6) |
        (table[d & 127] as number);
      codes |= a | b | c | d;
      digits |= block;
      out[written] = block >>> 16;
      out[written + 1] = block >>> 8;
      out[written + 2] = block;
      written += 3;
    }
    const firstCode = value.charCodeAt(20);
    const lastCode = value.charCodeAt(21);
    const first = table[firstCode & 127] as number;
    const last = table[lastCode & 127] as number;
    if ((codes | firstCode | lastCode) > 127 || (digits | first | last) < 0)
      return firstInvalidCharacter(alpha, value);
    out[written] = (first << 2) | (last >>> 4);
    if (tailBits === 4) return last & 15;
    // A masked base64url slug has the same length and carries check bits here, so this is the
    // error a caller sees after feeding a masked slug to the plain decoder. Say so.
    if ((last & 15) !== 0)
      return new UuidSlugError(
        code,
        `${name} value has non-canonical trailing bits; a masked slug of this length decodes only through its codec.`,
      );
    return 0;
  }

  // Base32hex: three complete eight-character groups and one byte; a 4-bit masked tail adds a
  // 27th character.
  let codes = 0;
  let digits = 0;
  let written = offset;
  for (let start = 0; start < 24; start += 8) {
    // Eight 5-bit digits exceed int32, so each byte is assembled from the digits it spans.
    const d0 = value.charCodeAt(start);
    const d1 = value.charCodeAt(start + 1);
    const d2 = value.charCodeAt(start + 2);
    const d3 = value.charCodeAt(start + 3);
    const d4 = value.charCodeAt(start + 4);
    const d5 = value.charCodeAt(start + 5);
    const d6 = value.charCodeAt(start + 6);
    const d7 = value.charCodeAt(start + 7);
    codes |= d0 | d1 | d2 | d3 | d4 | d5 | d6 | d7;
    const v0 = table[d0 & 127] as number;
    const v1 = table[d1 & 127] as number;
    const v2 = table[d2 & 127] as number;
    const v3 = table[d3 & 127] as number;
    const v4 = table[d4 & 127] as number;
    const v5 = table[d5 & 127] as number;
    const v6 = table[d6 & 127] as number;
    const v7 = table[d7 & 127] as number;
    digits |= v0 | v1 | v2 | v3 | v4 | v5 | v6 | v7;
    out[written] = (v0 << 3) | (v1 >>> 2);
    out[written + 1] = (v1 << 6) | (v2 << 1) | (v3 >>> 4);
    out[written + 2] = (v3 << 4) | (v4 >>> 1);
    out[written + 3] = (v4 << 7) | (v5 << 2) | (v6 >>> 3);
    out[written + 4] = (v6 << 5) | v7;
    written += 5;
  }
  const firstCode = value.charCodeAt(24);
  const lastCode = value.charCodeAt(25);
  // Only a 27-character value has this code; reading past a 26-character value would return NaN.
  const paddingCode = tailBits === 4 ? value.charCodeAt(26) : 48;
  const first = table[firstCode & 127] as number;
  const last = table[lastCode & 127] as number;
  const padding = table[paddingCode & 127] as number;
  if ((codes | firstCode | lastCode | paddingCode) > 127 || (digits | first | last | padding) < 0)
    return firstInvalidCharacter(alpha, value);
  out[written] = (first << 3) | (last >>> 2);
  if (tailBits === 4) {
    if ((padding & 7) !== 0)
      return new UuidSlugError(code, `${name} value has non-canonical trailing bits.`);
    return ((last & 3) << 2) | (padding >>> 3);
  }
  if ((last & 3) !== 0)
    return new UuidSlugError(code, `${name} value has non-canonical trailing bits.`);
  return 0;
}

// Fixed 16-byte groups avoid per-character concatenation and temporary text buffers on V8.
// Bun keeps its Latin-1 writer; remeasure after engine changes (bench/decisions.md).
// Character tables belong to the alphabet owner; callers select only supported tail widths.
/*#__NO_SIDE_EFFECTS__*/
function writeBase64url(bytes: Uint8Array, codes: Uint8Array, tail: number): string {
  const a = ((bytes[0] as number) << 16) | ((bytes[1] as number) << 8) | (bytes[2] as number);
  const b = ((bytes[3] as number) << 16) | ((bytes[4] as number) << 8) | (bytes[5] as number);
  const c = ((bytes[6] as number) << 16) | ((bytes[7] as number) << 8) | (bytes[8] as number);
  const d = ((bytes[9] as number) << 16) | ((bytes[10] as number) << 8) | (bytes[11] as number);
  const e = ((bytes[12] as number) << 16) | ((bytes[13] as number) << 8) | (bytes[14] as number);
  const f = bytes[15] as number;
  return String.fromCharCode(
    codes[a >>> 18] as number,
    codes[(a >>> 12) & 63] as number,
    codes[(a >>> 6) & 63] as number,
    codes[a & 63] as number,
    codes[b >>> 18] as number,
    codes[(b >>> 12) & 63] as number,
    codes[(b >>> 6) & 63] as number,
    codes[b & 63] as number,
    codes[c >>> 18] as number,
    codes[(c >>> 12) & 63] as number,
    codes[(c >>> 6) & 63] as number,
    codes[c & 63] as number,
    codes[d >>> 18] as number,
    codes[(d >>> 12) & 63] as number,
    codes[(d >>> 6) & 63] as number,
    codes[d & 63] as number,
    codes[e >>> 18] as number,
    codes[(e >>> 12) & 63] as number,
    codes[(e >>> 6) & 63] as number,
    codes[e & 63] as number,
    codes[f >>> 2] as number,
    codes[((f & 3) << 4) | (tail & 15)] as number,
  );
}

/*#__NO_SIDE_EFFECTS__*/
function writeBase32hex(
  bytes: Uint8Array,
  codes: Uint8Array,
  tail: number,
  tailBits: 0 | 4,
): string {
  const a = bytes[0] as number,
    b = bytes[1] as number,
    c = bytes[2] as number;
  const d = bytes[3] as number,
    e = bytes[4] as number,
    f = bytes[5] as number;
  const g = bytes[6] as number,
    h = bytes[7] as number,
    i = bytes[8] as number;
  const j = bytes[9] as number,
    k = bytes[10] as number,
    l = bytes[11] as number;
  const m = bytes[12] as number,
    n = bytes[13] as number,
    o = bytes[14] as number;
  const p = bytes[15] as number;
  // A four-bit check extends the payload to 27 digits. Keep three padding bits zero;
  // a plain payload has only two spare bits and must remain 26 digits.
  const last = codes[((p & 7) << 2) | (tailBits === 4 ? (tail >>> 2) & 3 : tail & 3)] as number;
  // Keep masked output flat too: a concatenated check character changes the string shape seen
  // by decoders. The two fixed arities avoid an argument array or a substring on plain output.
  if (tailBits === 4)
    return String.fromCharCode(
      codes[a >>> 3] as number,
      codes[((a & 7) << 2) | (b >>> 6)] as number,
      codes[(b >>> 1) & 31] as number,
      codes[((b & 1) << 4) | (c >>> 4)] as number,
      codes[((c & 15) << 1) | (d >>> 7)] as number,
      codes[(d >>> 2) & 31] as number,
      codes[((d & 3) << 3) | (e >>> 5)] as number,
      codes[e & 31] as number,
      codes[f >>> 3] as number,
      codes[((f & 7) << 2) | (g >>> 6)] as number,
      codes[(g >>> 1) & 31] as number,
      codes[((g & 1) << 4) | (h >>> 4)] as number,
      codes[((h & 15) << 1) | (i >>> 7)] as number,
      codes[(i >>> 2) & 31] as number,
      codes[((i & 3) << 3) | (j >>> 5)] as number,
      codes[j & 31] as number,
      codes[k >>> 3] as number,
      codes[((k & 7) << 2) | (l >>> 6)] as number,
      codes[(l >>> 1) & 31] as number,
      codes[((l & 1) << 4) | (m >>> 4)] as number,
      codes[((m & 15) << 1) | (n >>> 7)] as number,
      codes[(n >>> 2) & 31] as number,
      codes[((n & 3) << 3) | (o >>> 5)] as number,
      codes[o & 31] as number,
      codes[p >>> 3] as number,
      last,
      codes[(tail & 3) << 3] as number,
    );
  return String.fromCharCode(
    codes[a >>> 3] as number,
    codes[((a & 7) << 2) | (b >>> 6)] as number,
    codes[(b >>> 1) & 31] as number,
    codes[((b & 1) << 4) | (c >>> 4)] as number,
    codes[((c & 15) << 1) | (d >>> 7)] as number,
    codes[(d >>> 2) & 31] as number,
    codes[((d & 3) << 3) | (e >>> 5)] as number,
    codes[e & 31] as number,
    codes[f >>> 3] as number,
    codes[((f & 7) << 2) | (g >>> 6)] as number,
    codes[(g >>> 1) & 31] as number,
    codes[((g & 1) << 4) | (h >>> 4)] as number,
    codes[((h & 15) << 1) | (i >>> 7)] as number,
    codes[(i >>> 2) & 31] as number,
    codes[((i & 3) << 3) | (j >>> 5)] as number,
    codes[j & 31] as number,
    codes[k >>> 3] as number,
    codes[((k & 7) << 2) | (l >>> 6)] as number,
    codes[(l >>> 1) & 31] as number,
    codes[((l & 1) << 4) | (m >>> 4)] as number,
    codes[((m & 15) << 1) | (n >>> 7)] as number,
    codes[(n >>> 2) & 31] as number,
    codes[((n & 3) << 3) | (o >>> 5)] as number,
    codes[o & 31] as number,
    codes[p >>> 3] as number,
    last,
  );
}
