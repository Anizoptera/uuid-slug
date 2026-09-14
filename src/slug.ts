// SPDX-License-Identifier: Apache-2.0

import {
  BASE32HEX,
  BASE32HEX_NAME,
  BASE64URL,
  BASE64URL_NAME,
  decodeInto,
  encode,
  hasNativeBase64urlEncoder,
  isEncoded,
} from "./alphabet.ts";
import type { Alphabet } from "./alphabet.ts";
import {
  checkByteRange,
  checkRange,
  INVALID_OPTIONS,
  INVALID_UUID,
  INVALID_UUID_SLUG,
  INVALID_UUID_VERSION,
  invalidByteInput,
  invalidUuidSlugInput,
  invalidUuidStringInput,
  isUuidSlugError,
  isUint8Array,
  UuidSlugError,
} from "./errors.ts";
import type {
  DirectUuidSlugInput,
  PreserveUuidVersion,
  UuidSlug,
  UuidBytes,
  UuidV4Bytes,
  UuidV7Bytes,
  UuidString,
  UuidStringInput,
  UuidV4Slug,
  UuidV4String,
  UuidV7Slug,
  UuidV7SlugInput,
  UuidV7String,
  UuidV7BytesInput,
  UuidV7TimestampInput,
  UuidV7TimestampWindow,
} from "./types.ts";

import { validateTimestampBytes } from "./timestamp.ts";
import {
  bytesToUuidString,
  isRfcVariant,
  isUuidString,
  isUuidV7String,
  uuidByteAtUnchecked,
  uuidTimestampFromBytesUnchecked,
  uuidStringToBytes,
  uuidVersion,
} from "./uuid.ts";

export { isUuidSlugError } from "./errors.ts";
export { UuidSlugError };
export type { UuidSlugErrorCode } from "./errors.ts";
export type { UuidSlug, UuidV4Slug, UuidV7Slug } from "./types.ts";

/*
 * The alphabets a direct slug may be written in. base64url is the default and the shortest;
 * base32hex costs four more characters and buys the one property base64url cannot offer: its
 * characters are in ASCII order, so base32hex slugs of UUIDv7s sort chronologically as plain
 * strings. Only the lowercase spelling decodes, so every value has one canonical spelling.
 *
 * Masked output selects its alphabet independently: base32hex preserves case-insensitive filenames,
 * but sorting masked ciphertext does not recover chronological order.
 */
const ALTERNATIVE_SEPARATOR = " or ";

/**
 * Select direct-slug output: 22-character base64url, or 26-character lowercase base32hex.
 * Base64url is shorter. Base32hex UUIDv7 slugs sort by timestamp as plain strings and are safe on
 * case-insensitive filesystems. Decoders infer the alphabet from length.
 */
export type SlugAlphabet = typeof BASE64URL_NAME | typeof BASE32HEX_NAME;

const SLUG_ALPHABET_CODECS = {
  base32hex: BASE32HEX,
  base64url: BASE64URL,
} as const satisfies Record<SlugAlphabet, Alphabet>;

/** Reject values outside the public alphabet union when untyped JavaScript bypasses TypeScript. */
/*#__NO_SIDE_EFFECTS__*/
export function resolveSlugAlphabet(alphabet: SlugAlphabet): Alphabet | UuidSlugError {
  if (
    typeof alphabet === "string" &&
    Object.prototype.hasOwnProperty.call(SLUG_ALPHABET_CODECS, alphabet)
  )
    return SLUG_ALPHABET_CODECS[alphabet];
  return new UuidSlugError(
    INVALID_OPTIONS,
    `Unknown slug alphabet; expected ${BASE64URL_NAME}${ALTERNATIVE_SEPARATOR}${BASE32HEX_NAME}.`,
  );
}

/** Characters needed for 16 bytes: 22 in base64url, 26 in base32hex. */
/*#__NO_SIDE_EFFECTS__*/
function slugLength(alpha: Alphabet) {
  return Math.ceil(128 / alpha.bitsPerChar);
}

/**
 * Length -> alphabet, which is why decoding takes no alphabet argument: the two lengths are
 * disjoint, so a slug names its own encoding and a caller cannot pick the wrong one. Indexed
 * rather than searched because every decode and every type guard pays this lookup.
 */
const SLUG_ALPHABET_BY_LENGTH: readonly (Alphabet | undefined)[] = /*#__PURE__*/ Object.values(
  SLUG_ALPHABET_CODECS,
).reduce<(Alphabet | undefined)[]>((table, alpha) => {
  table[slugLength(alpha)] = alpha;
  return table;
}, []);

const SLUG_LENGTHS = /*#__PURE__*/ Object.values(SLUG_ALPHABET_CODECS)
  .map((alpha) => `${slugLength(alpha)} (${alpha.name})`)
  .join(ALTERNATIVE_SEPARATOR);

/** Encode validated canonical UUID text directly into its fixed 22-character base64url shape. */
/*#__NO_SIDE_EFFECTS__*/
function uuidStringToBase64url(uuid: string): UuidSlug {
  let encoded = "";
  for (let byteIndex = 0; byteIndex < 15; byteIndex += 3) {
    const block =
      (uuidByteAtUnchecked(uuid, byteIndex) << 16) |
      (uuidByteAtUnchecked(uuid, byteIndex + 1) << 8) |
      uuidByteAtUnchecked(uuid, byteIndex + 2);
    encoded +=
      (BASE64URL.chars[(block >>> 18) & 63] as string) +
      (BASE64URL.chars[(block >>> 12) & 63] as string) +
      (BASE64URL.chars[(block >>> 6) & 63] as string) +
      (BASE64URL.chars[block & 63] as string);
  }
  const last = uuidByteAtUnchecked(uuid, 15);
  return (encoded + BASE64URL.chars[last >>> 2] + BASE64URL.chars[(last & 3) << 4]) as UuidSlug;
}

/** Encode validated canonical UUID text directly into its fixed 26-character base32hex shape. */
/*#__NO_SIDE_EFFECTS__*/
function uuidStringToBase32hex(uuid: string): UuidSlug {
  let encoded = "";
  const chars = BASE32HEX.chars;
  for (let byteIndex = 0; byteIndex < 15; byteIndex += 5) {
    const a = uuidByteAtUnchecked(uuid, byteIndex);
    const b = uuidByteAtUnchecked(uuid, byteIndex + 1);
    const c = uuidByteAtUnchecked(uuid, byteIndex + 2);
    const d = uuidByteAtUnchecked(uuid, byteIndex + 3);
    const e = uuidByteAtUnchecked(uuid, byteIndex + 4);
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
  const last = uuidByteAtUnchecked(uuid, 15);
  return (encoded + chars[last >>> 3] + chars[(last & 7) << 2]) as UuidSlug;
}

/**
 * Encode a standalone 16-byte UUID as a direct slug, using base64url by default. An invalid array
 * or alphabet returns `UuidSlugError`. A preceding `UuidSlugError` is returned unchanged.
 *
 * @param bytes - Exactly 16 UUID bytes.
 * @param alphabet - Output spelling. Omit for the shorter 22-character base64url form.
 */
export function bytesToUuidSlug(
  bytes: Uint8Array | UuidSlugError,
  alphabet?: SlugAlphabet,
): UuidSlug | UuidSlugError;
/**
 * Encode 16 bytes within a larger array as a direct slug. A preceding `UuidSlugError` is returned
 * unchanged.
 *
 * @param bytes - Array containing at least one complete 16-byte UUID.
 * @param byteOffset - Zero-based index where the UUID starts.
 * @param alphabet - Output spelling. Omit for the shorter 22-character base64url form.
 */
export function bytesToUuidSlug(
  bytes: Uint8Array | UuidSlugError,
  byteOffset: number,
  alphabet?: SlugAlphabet,
): UuidSlug | UuidSlugError;
/*#__NO_SIDE_EFFECTS__*/
export function bytesToUuidSlug(
  bytes: Uint8Array | UuidSlugError,
  offsetOrAlphabet: number | SlugAlphabet = 0,
  alphabet?: SlugAlphabet,
): UuidSlug | UuidSlugError {
  const alphabetIsSecond = typeof offsetOrAlphabet !== "number";
  const offset = alphabetIsSecond ? 0 : offsetOrAlphabet;
  if (!isUint8Array(bytes)) return invalidByteInput(bytes);
  const badRange = checkRange(bytes.length, offset, 16);
  if (badRange) return badRange;
  if (alphabetIsSecond && alphabet !== undefined)
    return new UuidSlugError(
      INVALID_OPTIONS,
      "Pass the alphabet once: second for a whole UUID, or third after a numeric offset.",
    );
  // Unreachable from TypeScript, where the name is a two-member union. Reached from JavaScript,
  // which is why it answers rather than indexing into `undefined`.
  const alpha = resolveSlugAlphabet(
    alphabetIsSecond ? offsetOrAlphabet : (alphabet ?? BASE64URL_NAME),
  );
  if (alpha instanceof Error) return alpha;
  return encode(
    bytes.length === 16 ? bytes : bytes.subarray(offset, offset + 16),
    alpha,
  ) as UuidSlug;
}

/**
 * Decode a canonical direct slug into a new plain 16-byte `Uint8Array`. Its length selects
 * base64url or base32hex. Known UUID and masked values are rejected by TypeScript; invalid input
 * returns `UuidSlugError`. A preceding `UuidSlugError` is returned unchanged.
 *
 * @param slug - Canonical 22-character base64url or 26-character base32hex direct slug.
 */
export function uuidSlugToBytes<Input extends string | UuidSlugError>(
  slug: DirectUuidSlugInput<Input>,
): PreserveUuidVersion<Input, UuidBytes, UuidV4Bytes, UuidV7Bytes> | UuidSlugError;
/**
 * Decode a canonical direct slug into caller-owned storage after validating the full input. A
 * preceding `UuidSlugError` is returned unchanged without writing.
 *
 * @param slug - Canonical 22-character base64url or 26-character base32hex direct slug.
 * @param output - Caller-owned array that receives the 16 UUID bytes.
 * @param outputOffset - Zero-based index where writing starts. Omit to start at index 0. Bytes
 * outside the written range stay unchanged.
 */
export function uuidSlugToBytes<Input extends string | UuidSlugError, Output extends Uint8Array>(
  slug: DirectUuidSlugInput<Input>,
  output: Output,
  outputOffset?: number,
): Output | UuidSlugError;
export function uuidSlugToBytes(
  slug: string | UuidSlugError,
  out?: Uint8Array,
  offset = 0,
): Uint8Array | UuidSlugError {
  if (typeof slug !== "string") return invalidUuidSlugInput(slug);
  const alpha = SLUG_ALPHABET_BY_LENGTH[slug.length];
  if (!alpha)
    return new UuidSlugError(
      INVALID_UUID_SLUG,
      slug.length === 27
        ? "27 characters is a masked base32hex slug; decode it with the codec that issued it."
        : `UUID slug must be ${SLUG_LENGTHS} characters, got ${slug.length}.`,
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
 * Encode canonical UUID text as a reversible direct slug, using base64url by default. A known UUID
 * version is preserved in the result type. TypeScript rejects known slug values; invalid text or
 * alphabet returns `UuidSlugError`. A preceding `UuidSlugError` is returned unchanged.
 *
 * @param uuid - Canonical lowercase UUID text.
 * @param alphabet - Output spelling. Omit for the shorter 22-character base64url form.
 */
export function uuidStringToSlug<Input extends string | UuidSlugError>(
  uuid: UuidStringInput<Input>,
  alphabet?: SlugAlphabet,
): PreserveUuidVersion<Input, UuidSlug, UuidV4Slug, UuidV7Slug> | UuidSlugError;
/*#__NO_SIDE_EFFECTS__*/
export function uuidStringToSlug(
  uuid: string | UuidSlugError,
  alphabet: SlugAlphabet = BASE64URL_NAME,
): UuidSlug | UuidSlugError {
  if (typeof uuid !== "string") return invalidUuidStringInput(uuid);
  if (!hasNativeBase64urlEncoder && alphabet === BASE64URL_NAME && isUuidString(uuid))
    return uuidStringToBase64url(uuid);
  if (alphabet === BASE32HEX_NAME && isUuidString(uuid)) return uuidStringToBase32hex(uuid);
  const bytes = uuidStringToBytes(uuid);
  if (bytes instanceof Error) return bytes;
  return bytesToUuidSlug(bytes, alphabet);
}

/**
 * Decode a canonical direct slug to lowercase UUID text; its length selects base64url or base32hex.
 * A known UUID version is preserved in the result type. TypeScript rejects known UUID and masked
 * values; invalid input returns `UuidSlugError`. A preceding `UuidSlugError` is returned unchanged.
 *
 * @param slug - Canonical 22-character base64url or 26-character base32hex direct slug.
 */
export function uuidSlugToString<Input extends string | UuidSlugError>(
  slug: DirectUuidSlugInput<Input>,
): PreserveUuidVersion<Input, UuidString, UuidV4String, UuidV7String> | UuidSlugError;
/*#__NO_SIDE_EFFECTS__*/
export function uuidSlugToString(slug: string | UuidSlugError): UuidString | UuidSlugError {
  const bytes = uuidSlugToBytes(slug);
  if (bytes instanceof Error) return bytes;
  return bytesToUuidString(bytes);
}

/** Check a canonical 22-character base64url or 26-character lowercase base32hex direct slug. */
/*#__NO_SIDE_EFFECTS__*/
export function isUuidSlug(value: unknown): value is UuidSlug {
  if (typeof value !== "string" || !value) return false;
  const alpha = SLUG_ALPHABET_BY_LENGTH[value.length];
  return alpha !== undefined && isEncoded(value, alpha, 16);
}

/** Read only the version/variant bytes after canonical validation, without decoding a whole UUID. */
/*#__NO_SIDE_EFFECTS__*/
function slugByte(slug: string, alpha: Alphabet, offset: number): number {
  const start = Math.floor((offset * 8) / alpha.bitsPerChar);
  const end = Math.floor((offset * 8 + 7) / alpha.bitsPerChar);
  let value = 0;
  for (let i = start; i <= end; i += 1)
    value = (value << alpha.bitsPerChar) | (alpha.decode[slug.charCodeAt(i)] as number);
  return (value >>> ((end + 1) * alpha.bitsPerChar - (offset + 1) * 8)) & 255;
}

/*#__NO_SIDE_EFFECTS__*/
function isVersionedSlug(slug: unknown, version: number): slug is UuidSlug {
  if (!isUuidSlug(slug)) return false;
  const alpha = SLUG_ALPHABET_BY_LENGTH[slug.length] as Alphabet;
  return slugByte(slug, alpha, 6) >>> 4 === version && slugByte(slug, alpha, 8) >>> 6 === 2;
}

/** Check a canonical direct slug whose payload is an RFC-variant UUIDv4. */
/*#__NO_SIDE_EFFECTS__*/
export function isUuidV4Slug(value: unknown): value is UuidV4Slug {
  return isVersionedSlug(value, 4);
}

/** Check a canonical direct slug whose payload is an RFC-variant UUIDv7. */
/*#__NO_SIDE_EFFECTS__*/
export function isUuidV7Slug(value: unknown): value is UuidV7Slug {
  return isVersionedSlug(value, 7);
}

/*#__NO_SIDE_EFFECTS__*/
function extractStringTimestamp(value: string): number | UuidSlugError {
  let timestamp = 0;
  if (isUuidV7String(value)) {
    return parseInt(value.slice(0, 8) + value.slice(9, 13), 16);
  }
  if (isUuidV7Slug(value)) {
    const alpha = SLUG_ALPHABET_BY_LENGTH[value.length] as Alphabet;
    for (let index = 0; index < 6; index += 1)
      timestamp = timestamp * 256 + slugByte(value, alpha, index);
    return timestamp;
  }
  return new UuidSlugError(
    isUuidString(value) || isUuidSlug(value) ? INVALID_UUID_VERSION : INVALID_UUID,
    "Expected canonical UUIDv7 text or a direct UUIDv7 slug.",
  );
}

/**
 * Return the 48-bit Unix millisecond encoded by canonical UUIDv7 text, a direct UUIDv7 slug, or
 * UUIDv7 bytes. String forms accept both direct slug alphabets without allocating a byte array.
 * Use `codec.extractUuidSlugTimestamp` for masked or sentinel slugs. Other UUID versions and malformed
 * values return `UuidSlugError`. A preceding `UuidSlugError` is returned unchanged.
 *
 * @param value - Canonical UUIDv7 text or a direct UUIDv7 slug in either supported alphabet.
 */
export function extractUuidV7Timestamp<Input extends string | UuidSlugError>(
  value: UuidV7TimestampInput<Input>,
): number | UuidSlugError;
/**
 * Return the 48-bit Unix millisecond encoded by UUIDv7 bytes within an array.
 *
 * @param value - Array containing at least one complete 16-byte UUIDv7.
 * @param byteOffset - Zero-based index where the UUID starts. Omit for a standalone UUID.
 */
export function extractUuidV7Timestamp<Input extends Uint8Array | UuidSlugError>(
  value: UuidV7BytesInput<Input>,
  byteOffset?: number,
): number | UuidSlugError;
/*#__NO_SIDE_EFFECTS__*/
export function extractUuidV7Timestamp(
  value: string | Uint8Array | UuidSlugError,
  byteOffset = 0,
): number | UuidSlugError {
  if (typeof value === "string") return extractStringTimestamp(value);
  if (isUuidSlugError(value)) return value;
  const badRange = checkByteRange(value, byteOffset, 16);
  if (badRange) return badRange;
  if (uuidVersion(value, byteOffset) !== 7 || !isRfcVariant(value, byteOffset))
    return new UuidSlugError(INVALID_UUID_VERSION, "Timestamp is only defined for UUIDv7.");
  return uuidTimestampFromBytesUnchecked(value, byteOffset);
}

/**
 * Return the same direct UUIDv7 slug when its timestamp is inside the inclusive symmetric window.
 * Return `timestamp_outside_window` when it is not. Use a codec method for masked or sentinel
 * input. TypeScript rejects known UUID text, masked slugs, and UUIDv4 slugs. A preceding
 * `UuidSlugError` is returned unchanged.
 *
 * @param slug - Canonical direct UUIDv7 slug to validate and return.
 * @param window - Inclusive maximum distance from an explicit or current reference time.
 */
export function validateUuidV7SlugTimestamp<Input extends string | UuidSlugError>(
  slug: UuidV7SlugInput<Input>,
  window: UuidV7TimestampWindow,
): (Input & UuidV7Slug) | UuidSlugError {
  if (typeof slug !== "string") return invalidUuidSlugInput(slug);
  const directSlug: string = slug;
  const bytes = uuidSlugToBytes(directSlug);
  if (bytes instanceof Error) return bytes;
  const valid = validateTimestampBytes(bytes, window);
  return valid instanceof Error ? valid : (directSlug as Input & UuidV7Slug);
}
