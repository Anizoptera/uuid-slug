// SPDX-License-Identifier: Apache-2.0

import {
  BASE32HEX,
  BASE64URL,
  decodeInto,
  encode,
  hasNativeBase64urlEncoder,
  isEncoded,
} from "./alphabet";
import type { Alphabet } from "./alphabet";
import { checkByteRange, checkRange, isUint8Array, UuidSlugError } from "./errors";
import type {
  DirectUuidSlugInput,
  UuidSlug,
  UuidBytes,
  UuidV4Bytes,
  UuidV7Bytes,
  UuidString,
  UuidStringInput,
  UuidV4Slug,
  UuidV4String,
  UuidV7Slug,
  UuidV7String,
  UuidV7BytesInput,
} from "./types";

/** Carry a validated UUID version through lossless representation changes. */
type PreserveUuidVersion<Input, UnknownVersion, Version4, Version7> = Input extends
  | UuidV4String
  | UuidV4Slug
  ? Version4
  : Input extends UuidV7String | UuidV7Slug
    ? Version7
    : UnknownVersion;

const HEX = "0123456789abcdef";
// Probe once and allocate the byte-pair fallback only on engines that need it.
const nativeToHex = (Uint8Array.prototype as { toHex?: () => string }).toHex;
const HEX_BYTES = nativeToHex
  ? []
  : /*#__PURE__*/ Array.from(
      { length: 256 },
      (_, byte) => (HEX[byte >>> 4] as string) + (HEX[byte & 15] as string),
    );
const HEX_DECODE = new Int8Array(128).fill(-1);
for (let i = 0; i < 10; i += 1) HEX_DECODE[48 + i] = i;
for (let i = 0; i < 6; i += 1) HEX_DECODE[97 + i] = 10 + i;

const UUID_LENGTH = 36;
const UUID_BYTE_OFFSETS = [0, 2, 4, 6, 9, 11, 14, 16, 19, 21, 24, 26, 28, 30, 32, 34] as const;

/**
 * The alphabets a plain slug may be written in. base64url is the default and the shortest;
 * base32hex costs four more characters and buys the one property base64url cannot offer: its
 * characters are in ASCII order, so base32hex slugs of UUIDv7s sort chronologically as plain
 * strings. Only the lowercase spelling decodes — the table is built from `chars` — so slugs have
 * no second spelling, as everywhere else in this format.
 *
 * Masked output selects its alphabet independently: base32hex preserves case-insensitive filenames,
 * but sorting masked ciphertext does not recover chronological order.
 */
/** Stable runtime vocabulary for slug alphabet selection. */
const ALPHABETS = ["base64url", "base32hex"] as const;

export const UUID_SLUG_ALPHABETS: typeof ALPHABETS = Object.freeze(ALPHABETS);

/**
 * Select 22-character base64url or 26-character lowercase base32hex direct slugs. A closed choice
 * preserves canonical spelling and lets decoding infer the alphabet from the encoded length.
 */
export type SlugAlphabet = (typeof UUID_SLUG_ALPHABETS)[number];

const SLUG_ALPHABET_CODECS = {
  base32hex: BASE32HEX,
  base64url: BASE64URL,
} as const satisfies Record<SlugAlphabet, Alphabet>;

/** Reject values outside the public alphabet union when untyped JavaScript bypasses TypeScript. */
export function resolveSlugAlphabet(alphabet: SlugAlphabet): Alphabet | UuidSlugError {
  if (
    typeof alphabet === "string" &&
    Object.prototype.hasOwnProperty.call(SLUG_ALPHABET_CODECS, alphabet)
  )
    return SLUG_ALPHABET_CODECS[alphabet];
  return new UuidSlugError(
    "invalid_uuid_slug",
    `Unknown slug alphabet; expected ${UUID_SLUG_ALPHABETS.join(" or ")}.`,
  );
}

/** Characters needed for 16 bytes: 22 in base64url, 26 in base32hex. */
function slugLength(alpha: Alphabet) {
  return Math.ceil(128 / alpha.bitsPerChar);
}

/**
 * Length -> alphabet, which is why decoding takes no alphabet argument: the two lengths are
 * disjoint, so a slug names its own encoding and a caller cannot pick the wrong one. Indexed
 * rather than searched because every decode and every type guard pays this lookup.
 */
const SLUG_ALPHABET_BY_LENGTH: readonly (Alphabet | undefined)[] = Object.values(
  SLUG_ALPHABET_CODECS,
).reduce<(Alphabet | undefined)[]>((table, alpha) => {
  table[slugLength(alpha)] = alpha;
  return table;
}, []);

const SLUG_LENGTHS = Object.values(SLUG_ALPHABET_CODECS)
  .map((alpha) => `${slugLength(alpha)} (${alpha.name})`)
  .join(" or ");

function hexValue(code: number) {
  return HEX_DECODE[code] ?? -1;
}

function uuidByteAt(uuid: string, byteIndex: number): number {
  const offset = UUID_BYTE_OFFSETS[byteIndex] as number;
  return (hexValue(uuid.charCodeAt(offset)) << 4) | hexValue(uuid.charCodeAt(offset + 1));
}

/**
 * Convert one canonical lowercase UUID to 16 bytes; failure leaves caller storage unchanged.
 * Generic capture rejects known slug brands, while bare strings stay open to runtime validation
 * because widening has erased their provenance.
 */
export function uuidToBytes<Input extends string>(
  uuid: UuidStringInput<Input>,
): PreserveUuidVersion<Input, UuidBytes, UuidV4Bytes, UuidV7Bytes> | UuidSlugError;
export function uuidToBytes<Input extends string, Output extends Uint8Array>(
  uuid: UuidStringInput<Input>,
  output: Output,
  outputOffset?: number,
): Output | UuidSlugError;
export function uuidToBytes(
  uuid: string,
  out?: Uint8Array,
  offset = 0,
): Uint8Array | UuidSlugError {
  if (typeof uuid !== "string" || uuid.length !== UUID_LENGTH)
    return new UuidSlugError("invalid_uuid", "UUID must be 36 characters.");
  if (uuid[8] !== "-" || uuid[13] !== "-" || uuid[18] !== "-" || uuid[23] !== "-") {
    return new UuidSlugError("invalid_uuid", "UUID hyphen positions are invalid.");
  }

  const badRange = out === undefined ? checkRange(16, offset, 16) : checkByteRange(out, offset, 16);
  if (badRange) return badRange;

  for (const textOffset of UUID_BYTE_OFFSETS) {
    if (hexValue(uuid.charCodeAt(textOffset)) < 0 || hexValue(uuid.charCodeAt(textOffset + 1)) < 0)
      return new UuidSlugError("invalid_uuid", `Invalid UUID hex at offset ${textOffset}.`);
  }
  const target = out ?? new Uint8Array(16);
  for (let byteIndex = 0; byteIndex < UUID_BYTE_OFFSETS.length; byteIndex += 1) {
    target[offset + byteIndex] = uuidByteAt(uuid, byteIndex);
  }
  return target;
}

/** Return canonical lowercase UUID text for 16 bytes starting at `byteOffset`. */
export function bytesToUuid(bytes: Uint8Array, byteOffset = 0): UuidString | UuidSlugError {
  const badRange = checkByteRange(bytes, byteOffset, 16);
  if (badRange) return badRange;
  if (nativeToHex) {
    const hex = nativeToHex.call(
      bytes.length === 16 ? bytes : bytes.subarray(byteOffset, byteOffset + 16),
    );
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}` as UuidString;
  }
  let out = "";
  for (let i = 0; i < 16; i += 1) {
    if (i === 4 || i === 6 || i === 8 || i === 10) out += "-";
    const byte = bytes[byteOffset + i] ?? 0;
    out += HEX_BYTES[byte];
  }
  return out as UuidString;
}

export function uuidVersion(bytes: Uint8Array, offset = 0): number {
  return (bytes[offset + 6] ?? 0) >>> 4;
}

export function isRfcVariant(bytes: Uint8Array, offset = 0): boolean {
  return (bytes[offset + 8] ?? 0) >>> 6 === 0b10;
}

// Predicates inspect the same hex table as parsing without allocating output bytes or Errors.
/** Check canonical lowercase UUID syntax without checking version or RFC variant. */
export function isUuidString(value: unknown): value is UuidString {
  if (typeof value !== "string" || value.length !== UUID_LENGTH) return false;
  if (value[8] !== "-" || value[13] !== "-" || value[18] !== "-" || value[23] !== "-") return false;
  for (let i = 0; i < UUID_BYTE_OFFSETS.length; i += 1) {
    const offset = UUID_BYTE_OFFSETS[i] as number;
    if (hexValue(value.charCodeAt(offset)) < 0 || hexValue(value.charCodeAt(offset + 1)) < 0)
      return false;
  }
  return true;
}

function hasUuidVersionAndVariant(value: unknown, version: "4" | "7"): value is string {
  return (
    typeof value === "string" && value[14] === version && hexValue(value.charCodeAt(19)) >>> 2 === 2
  );
}

/** Encode validated canonical UUID text directly into its fixed 22-character base64url shape. */
function uuidStringToBase64url(uuid: string): UuidSlug {
  let encoded = "";
  for (let byteIndex = 0; byteIndex < 15; byteIndex += 3) {
    const block =
      (uuidByteAt(uuid, byteIndex) << 16) |
      (uuidByteAt(uuid, byteIndex + 1) << 8) |
      uuidByteAt(uuid, byteIndex + 2);
    encoded +=
      (BASE64URL.chars[(block >>> 18) & 63] as string) +
      (BASE64URL.chars[(block >>> 12) & 63] as string) +
      (BASE64URL.chars[(block >>> 6) & 63] as string) +
      (BASE64URL.chars[block & 63] as string);
  }
  const last = uuidByteAt(uuid, 15);
  return (encoded + BASE64URL.chars[last >>> 2] + BASE64URL.chars[(last & 3) << 4]) as UuidSlug;
}

/** Encode validated canonical UUID text directly into its fixed 26-character base32hex shape. */
function uuidStringToBase32hex(uuid: string): UuidSlug {
  let encoded = "";
  const chars = BASE32HEX.chars;
  for (let byteIndex = 0; byteIndex < 15; byteIndex += 5) {
    const a = uuidByteAt(uuid, byteIndex);
    const b = uuidByteAt(uuid, byteIndex + 1);
    const c = uuidByteAt(uuid, byteIndex + 2);
    const d = uuidByteAt(uuid, byteIndex + 3);
    const e = uuidByteAt(uuid, byteIndex + 4);
    encoded +=
      (chars[a >>> 3] as string) +
      (chars[((a & 7) << 2) | (b >>> 6)] as string) +
      (chars[(b >>> 1) & 31] as string) +
      (chars[((b & 1) << 4) | (c >>> 4)] as string) +
      (chars[((c & 15) << 1) | (d >>> 7)] as string) +
      (chars[(d >>> 2) & 31] as string) +
      (chars[((d & 3) << 3) | (e >>> 5)] as string) +
      (chars[e & 31] as string);
  }
  const last = uuidByteAt(uuid, 15);
  return (encoded + chars[last >>> 3] + chars[(last & 7) << 2]) as UuidSlug;
}

/** Check canonical UUID text with version 4 and RFC variant bits. */
export function isUuidV4String(value: unknown): value is UuidV4String {
  return hasUuidVersionAndVariant(value, "4") && isUuidString(value);
}

/** Check canonical UUID text with version 7 and RFC variant bits. */
export function isUuidV7String(value: unknown): value is UuidV7String {
  return hasUuidVersionAndVariant(value, "7") && isUuidString(value);
}

/** Check for exactly 16 UUID bytes without assigning a version. */
export function isUuidBytes(value: unknown): value is UuidBytes {
  return isUint8Array(value) && value.length === 16;
}

/** Check for exactly 16 UUIDv4 bytes with the RFC variant required by generation. */
export function isUuidV4Bytes(value: unknown): value is UuidV4Bytes {
  return isUuidBytes(value) && uuidVersion(value) === 4 && isRfcVariant(value);
}

/**
 * Check for exactly 16 UUIDv7 bytes with the RFC variant required by masking and timestamps.
 * General byte input can use `bytesToUuid`; this narrower predicate proves the version those
 * v7-only operations require.
 */
export function isUuidV7Bytes(value: unknown): value is UuidV7Bytes {
  return isUuidBytes(value) && uuidVersion(value) === 7 && isRfcVariant(value);
}

/** Encode exactly 16 bytes as a direct UUID slug; base64url is the default. */
export function bytesToSlug(bytes: Uint8Array, alphabet?: SlugAlphabet): UuidSlug | UuidSlugError;
export function bytesToSlug(
  bytes: Uint8Array,
  byteOffset: number,
  alphabet?: SlugAlphabet,
): UuidSlug | UuidSlugError;
export function bytesToSlug(
  bytes: Uint8Array,
  offsetOrAlphabet: number | SlugAlphabet = 0,
  alphabet?: SlugAlphabet,
): UuidSlug | UuidSlugError {
  const alphabetIsSecond = typeof offsetOrAlphabet !== "number";
  const offset = alphabetIsSecond ? 0 : offsetOrAlphabet;
  const badRange = checkByteRange(bytes, offset, 16);
  if (badRange) return badRange;
  if (alphabetIsSecond && alphabet !== undefined)
    return new UuidSlugError(
      "invalid_uuid_slug",
      "Pass the alphabet once: second for a whole UUID, or third after a numeric offset.",
    );
  // Unreachable from TypeScript, where the name is a two-member union. Reached from JavaScript,
  // which is why it answers rather than indexing into `undefined`.
  const alpha = resolveSlugAlphabet(
    alphabetIsSecond ? offsetOrAlphabet : (alphabet ?? "base64url"),
  );
  if (alpha instanceof Error) return alpha;
  return encode(
    bytes.length === 16 ? bytes : bytes.subarray(offset, offset + 16),
    alpha,
  ) as UuidSlug;
}

/**
 * Parse either direct-slug length into 16 bytes; failure leaves caller storage unchanged. Generic
 * capture rejects known UUID and masked brands; bare strings still need runtime validation.
 */
export function slugToBytes<Input extends string>(
  slug: DirectUuidSlugInput<Input>,
): PreserveUuidVersion<Input, UuidBytes, UuidV4Bytes, UuidV7Bytes> | UuidSlugError;
export function slugToBytes<Input extends string, Output extends Uint8Array>(
  slug: DirectUuidSlugInput<Input>,
  output: Output,
  outputOffset?: number,
): Output | UuidSlugError;
export function slugToBytes(
  slug: string,
  out?: Uint8Array,
  offset = 0,
): Uint8Array | UuidSlugError {
  if (typeof slug !== "string")
    return new UuidSlugError("invalid_uuid_slug", `UUID slug must be ${SLUG_LENGTHS} characters.`);
  const alpha = SLUG_ALPHABET_BY_LENGTH[slug.length];
  if (!alpha)
    return new UuidSlugError(
      "invalid_uuid_slug",
      `UUID slug must be ${SLUG_LENGTHS} characters, got ${slug.length}.`,
    );
  const target = out ?? new Uint8Array(16);
  const badRange = out === undefined ? checkRange(16, offset, 16) : checkByteRange(out, offset, 16);
  if (badRange) return badRange;
  if (out && !isEncoded(slug, alpha, 16)) {
    for (let i = 0; i < slug.length; i += 1) {
      const code = slug.charCodeAt(i);
      if (code >= 128 || (alpha.decode[code] as number) < 0)
        return new UuidSlugError(alpha.code, `Invalid ${alpha.name} character at offset ${i}.`);
    }
    return new UuidSlugError(alpha.code, `${alpha.name} value has non-canonical trailing bits.`);
  }
  const result = decodeInto(slug, alpha, target, offset, 16);
  return result instanceof Error ? result : target;
}

/**
 * Validate UUID text and encode the same 128-bit value as a direct slug. Generic capture rejects a
 * known slug brand but accepts bare strings whose provenance only runtime parsing can establish.
 */
export function uuidToSlug<Input extends string>(
  uuid: UuidStringInput<Input>,
  alphabet?: SlugAlphabet,
): PreserveUuidVersion<Input, UuidSlug, UuidV4Slug, UuidV7Slug> | UuidSlugError;
export function uuidToSlug(
  uuid: string,
  alphabet: SlugAlphabet = "base64url",
): UuidSlug | UuidSlugError {
  if (!hasNativeBase64urlEncoder && alphabet === "base64url" && isUuidString(uuid))
    return uuidStringToBase64url(uuid);
  if (alphabet === "base32hex" && isUuidString(uuid)) return uuidStringToBase32hex(uuid);
  const bytes = uuidToBytes(uuid);
  if (bytes instanceof Error) return bytes;
  return bytesToSlug(bytes, alphabet);
}

/**
 * Validate a direct slug, infer its alphabet from length, and return canonical UUID text. Generic
 * capture rejects known UUID and masked brands but accepts external strings whose origin is unknown.
 */
export function slugToUuid<Input extends string>(
  slug: DirectUuidSlugInput<Input>,
): PreserveUuidVersion<Input, UuidString, UuidV4String, UuidV7String> | UuidSlugError;
export function slugToUuid(slug: string): UuidString | UuidSlugError {
  const bytes = slugToBytes(slug);
  if (bytes instanceof Error) return bytes;
  return bytesToUuid(bytes);
}

/** Check a canonical 22-character base64url or 26-character lowercase base32hex direct slug. */
export function isUuidSlug(value: unknown): value is UuidSlug {
  if (typeof value !== "string" || !value) return false;
  const alpha = SLUG_ALPHABET_BY_LENGTH[value.length];
  return alpha !== undefined && isEncoded(value, alpha, 16);
}

/** Read only the version/variant bytes after canonical validation, without decoding a whole UUID. */
function slugByte(slug: string, alpha: Alphabet, offset: number): number {
  const start = Math.floor((offset * 8) / alpha.bitsPerChar);
  const end = Math.floor((offset * 8 + 7) / alpha.bitsPerChar);
  let value = 0;
  for (let i = start; i <= end; i += 1)
    value = (value << alpha.bitsPerChar) | (alpha.decode[slug.charCodeAt(i)] as number);
  return (value >>> ((end + 1) * alpha.bitsPerChar - (offset + 1) * 8)) & 255;
}

function isVersionedSlug(slug: unknown, version: number): slug is UuidSlug {
  if (!isUuidSlug(slug)) return false;
  const alpha = SLUG_ALPHABET_BY_LENGTH[slug.length] as Alphabet;
  return slugByte(slug, alpha, 6) >>> 4 === version && slugByte(slug, alpha, 8) >>> 6 === 2;
}

/** Check a canonical direct slug whose payload is an RFC-variant UUIDv4. */
export function isUuidV4Slug(value: unknown): value is UuidV4Slug {
  return isVersionedSlug(value, 4);
}

/** Check a canonical direct slug whose payload is an RFC-variant UUIDv7. */
export function isUuidV7Slug(value: unknown): value is UuidV7Slug {
  return isVersionedSlug(value, 7);
}

/**
 * Read the 48-bit Unix millisecond from UUIDv7 bytes at `byteOffset`.
 * Other versions are rejected because their first six bytes are not a timestamp.
 * Generic capture rejects known UUIDv4 bytes; unbranded bytes still require the runtime check.
 * The range check runs first so truncated storage reports `invalid_buffer`, not a fictitious UUID
 * version read from a missing byte.
 */
export function extractUuidV7Timestamp<Input extends Uint8Array>(
  bytes: UuidV7BytesInput<Input>,
  byteOffset = 0,
): number | UuidSlugError {
  const badRange = checkByteRange(bytes, byteOffset, 16);
  if (badRange) return badRange;
  if (uuidVersion(bytes, byteOffset) !== 7 || !isRfcVariant(bytes, byteOffset))
    return new UuidSlugError("invalid_uuid_version", "Timestamp is only defined for UUIDv7.");
  let timestamp = 0;
  for (let i = 0; i < 6; i += 1) timestamp = timestamp * 256 + (bytes[byteOffset + i] ?? 0);
  return timestamp;
}
