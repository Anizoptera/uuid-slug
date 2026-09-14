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
  invalidUuidSlugInput,
  invalidUuidStringInput,
  isUuidSlugError,
  isUint8Array,
  UuidSlugError,
} from "./errors.ts";
import type {
  PlainUuidSlugInput,
  PreserveUuidVersion,
  PlainUuidSlug,
  UuidBytes,
  UuidByteInput,
  UuidV4Bytes,
  UuidV7Bytes,
  UuidStringInput,
  PlainUuidV4Slug,
  PlainUuidV7Slug,
  MaskedUuidV7Slug,
  PlainUuidV7SlugInput,
  UuidV7BytesInput,
  UuidV7TimestampInput,
  UuidV7TimestampWindow,
  UuidStringFor,
  UuidInput,
  UuidStringResult,
  UuidBytesResult,
  PlainUuidSlugResult,
  UuidTextCase,
  UuidV4StringFor,
  UuidV7StringFor,
  UuidVersion,
} from "./types.ts";
import { UUID_TEXT_LOWERCASE } from "./types.ts";

import { validateTimestampBytes } from "./timestamp.ts";
import {
  bytesToUuidString,
  exactUuidByteView,
  invalidUuidTextCase,
  isUuidText,
  isUuidTextCase,
  isUuidV7Text,
  isRfcVariant,
  uuidByteAtUnchecked,
  uuidTimestampFromBytesUnchecked,
  uuidStringToBytes,
  uuidVersion,
} from "./uuid.ts";

export { isUuidSlugError } from "./errors.ts";
export { UuidSlugError };
export type { UuidSlugErrorCode } from "./errors.ts";
export type { PlainUuidSlug, PlainUuidV4Slug, PlainUuidV7Slug } from "./types.ts";

const UUID_V7_TIMESTAMP_ONLY = "Timestamp is only defined for UUIDv7.";
type KeylessUuidInput<Input> = [Extract<Exclude<Input, UuidSlugError>, MaskedUuidV7Slug>] extends [
  never,
]
  ? Input
  : never;

/*
 * The alphabets a plain slug may be written in. base64url is the default and the shortest;
 * base32hex costs four more characters and buys the one property base64url cannot offer: its
 * characters are in ASCII order, so base32hex slugs of UUIDv7s sort chronologically as plain
 * strings. Writers and guards use lowercase; decoders also accept the RFC uppercase spelling.
 *
 * Masked output selects its alphabet independently: base32hex preserves case-insensitive filenames,
 * but sorting masked ciphertext does not recover chronological order.
 */
const ALTERNATIVE_SEPARATOR = " or ";

/**
 * Select plain-slug output: 22-character base64url, or 26-character lowercase base32hex.
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
function uuidStringToBase64url(uuid: string): PlainUuidSlug {
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
  return (encoded +
    BASE64URL.chars[last >>> 2] +
    BASE64URL.chars[(last & 3) << 4]) as PlainUuidSlug;
}

/** Encode validated canonical UUID text directly into its fixed 26-character base32hex shape. */
/*#__NO_SIDE_EFFECTS__*/
function uuidStringToBase32hex(uuid: string): PlainUuidSlug {
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
  return (encoded + chars[last >>> 3] + chars[(last & 7) << 2]) as PlainUuidSlug;
}

/**
 * Encode a standalone 16-byte UUID as a plain slug, using base64url by default. An `ArrayBuffer`
 * uses its whole contents; a `DataView` uses its declared range. Invalid input or alphabet returns
 * `UuidSlugError`. A preceding `UuidSlugError` is returned unchanged.
 *
 * @param bytes - One exact 16-byte UUID source.
 * @param alphabet - Output spelling. Omit for the shorter 22-character base64url form.
 */
export function uuidBytesToPlainSlug(
  bytes: UuidByteInput | UuidSlugError,
  alphabet?: SlugAlphabet,
): PlainUuidSlug | UuidSlugError;
/**
 * Encode 16 bytes within a larger array as a plain slug. A preceding `UuidSlugError` is returned
 * unchanged.
 *
 * @param bytes - Array containing at least one complete 16-byte UUID.
 * @param byteOffset - Zero-based index where the UUID starts.
 * @param alphabet - Output spelling. Omit for the shorter 22-character base64url form.
 */
export function uuidBytesToPlainSlug(
  bytes: Uint8Array | UuidSlugError,
  byteOffset: number,
  alphabet?: SlugAlphabet,
): PlainUuidSlug | UuidSlugError;
/*#__NO_SIDE_EFFECTS__*/
export function uuidBytesToPlainSlug(
  bytes: UuidByteInput | UuidSlugError,
  offsetOrAlphabet: number | SlugAlphabet = 0,
  alphabet?: SlugAlphabet,
): PlainUuidSlug | UuidSlugError {
  const alphabetIsSecond = typeof offsetOrAlphabet !== "number";
  const offset = alphabetIsSecond ? 0 : offsetOrAlphabet;
  const view = isUint8Array(bytes) ? bytes : exactUuidByteView(bytes);
  if (view instanceof Error) return view;
  const badRange = checkRange(view.length, offset, 16);
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
    view.length === 16 ? view : view.subarray(offset, offset + 16),
    alpha,
  ) as PlainUuidSlug;
}

/**
 * Decode a canonical plain slug into a new plain 16-byte `Uint8Array`. Its length selects
 * base64url or base32hex. Known UUID and masked values are rejected by TypeScript; invalid input
 * returns `UuidSlugError`. A preceding `UuidSlugError` is returned unchanged.
 *
 * @param plainUuidSlug - Canonical 22-character base64url or 26-character base32hex plain UUID slug.
 */
export function plainSlugToUuidBytes<Input extends string | UuidSlugError>(
  plainUuidSlug: PlainUuidSlugInput<Input>,
): PreserveUuidVersion<Input, UuidBytes, UuidV4Bytes, UuidV7Bytes> | UuidSlugError;
/**
 * Decode a canonical plain slug into caller-owned storage after validating the full input. A
 * preceding `UuidSlugError` is returned unchanged without writing.
 *
 * @param plainUuidSlug - Canonical 22-character base64url or 26-character base32hex plain UUID slug.
 * @param output - Caller-owned array that receives the 16 UUID bytes.
 * @param outputOffset - Zero-based index where writing starts. Omit to start at index 0. Bytes
 * outside the written range stay unchanged.
 */
export function plainSlugToUuidBytes<
  Input extends string | UuidSlugError,
  Output extends Uint8Array,
>(
  plainUuidSlug: PlainUuidSlugInput<Input>,
  output: Output,
  outputOffset?: number,
): Output | UuidSlugError;
export function plainSlugToUuidBytes(
  plainUuidSlug: string | UuidSlugError,
  output?: Uint8Array,
  outputOffset = 0,
): Uint8Array | UuidSlugError {
  if (typeof plainUuidSlug !== "string") return invalidUuidSlugInput(plainUuidSlug);
  const alpha = SLUG_ALPHABET_BY_LENGTH[plainUuidSlug.length];
  if (!alpha)
    return new UuidSlugError(
      INVALID_UUID_SLUG,
      plainUuidSlug.length === 27
        ? "27 characters is a masked base32hex slug; decode it with the codec that issued it."
        : `UUID slug must be ${SLUG_LENGTHS} characters, got ${plainUuidSlug.length}.`,
    );
  const target = output ?? new Uint8Array(16);
  const badRange =
    output === undefined
      ? checkRange(16, outputOffset, 16)
      : checkByteRange(output, outputOffset, 16);
  if (badRange) return badRange;
  if (output && !isEncoded(plainUuidSlug, alpha, 16)) {
    for (let i = 0; i < plainUuidSlug.length; i += 1) {
      const code = plainUuidSlug.charCodeAt(i);
      if (code >= 128 || (alpha.decode[code] as number) < 0)
        return new UuidSlugError(
          alpha.code,
          `Invalid ${alpha.name} character ${JSON.stringify(plainUuidSlug[i])} at offset ${i}.`,
        );
    }
    return new UuidSlugError(alpha.code, `${alpha.name} value has non-canonical trailing bits.`);
  }
  const result = decodeInto(plainUuidSlug, alpha, target, outputOffset, 16);
  return result instanceof Error ? result : target;
}

/**
 * Encode accepted mixed-case UUID text as a reversible plain slug, using base64url by default.
 * A known UUID version is preserved in the result type. TypeScript rejects known slug
 * values; invalid text or alphabet returns `UuidSlugError`. A preceding `UuidSlugError` is returned
 * unchanged.
 *
 * @param uuid - UUID text in an accepted spelling.
 * @param alphabet - Output spelling. Omit for the shorter 22-character base64url form.
 */
export function uuidStringToPlainSlug<Input extends string | UuidSlugError>(
  uuid: UuidStringInput<Input>,
  alphabet?: SlugAlphabet,
): PreserveUuidVersion<Input, PlainUuidSlug, PlainUuidV4Slug, PlainUuidV7Slug> | UuidSlugError;
/*#__NO_SIDE_EFFECTS__*/
export function uuidStringToPlainSlug(
  uuid: string | UuidSlugError,
  alphabet: SlugAlphabet = BASE64URL_NAME,
): PlainUuidSlug | UuidSlugError {
  if (typeof uuid !== "string") return invalidUuidStringInput(uuid);
  if (
    !hasNativeBase64urlEncoder &&
    alphabet === BASE64URL_NAME &&
    isUuidText(uuid) &&
    uuid.length === 36
  )
    return uuidStringToBase64url(uuid);
  if (alphabet === BASE32HEX_NAME && isUuidText(uuid) && uuid.length === 36)
    return uuidStringToBase32hex(uuid);
  const bytes = uuidStringToBytes(uuid);
  if (bytes instanceof Error) return bytes;
  return uuidBytesToPlainSlug(bytes, alphabet);
}

/**
 * Decode a plain slug to hyphenated UUID text; its length selects base64url or base32hex.
 * Base32hex input accepts uppercase or lowercase. Base64url remains case-sensitive.
 * A known UUID version is preserved in the result type. TypeScript rejects known UUID and masked
 * values; invalid input returns `UuidSlugError`. A preceding `UuidSlugError` is returned unchanged.
 *
 * @param plainUuidSlug - Canonical 22-character base64url or 26-character base32hex plain UUID slug.
 * @param textCase - Built-in output spelling. Omit for lowercase.
 */
export function plainSlugToUuidString<
  Input extends string | UuidSlugError,
  Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE,
>(
  plainUuidSlug: PlainUuidSlugInput<Input>,
  textCase?: Case,
):
  | PreserveUuidVersion<Input, UuidStringFor<Case>, UuidV4StringFor<Case>, UuidV7StringFor<Case>>
  | UuidSlugError;
/*#__NO_SIDE_EFFECTS__*/
export function plainSlugToUuidString(
  plainUuidSlug: string | UuidSlugError,
  textCase: UuidTextCase = UUID_TEXT_LOWERCASE,
): string | UuidSlugError {
  if (!isUuidTextCase(textCase)) return invalidUuidTextCase();
  const bytes = plainSlugToUuidBytes(plainUuidSlug);
  if (bytes instanceof Error) return bytes;
  return bytesToUuidString(bytes, textCase);
}

function decodeKeylessUuid(uuid: unknown): Uint8Array | UuidSlugError {
  if (typeof uuid !== "string") return exactUuidByteView(uuid);
  return uuid.length === 22 || uuid.length === 26
    ? plainSlugToUuidBytes(uuid)
    : uuidStringToBytes(uuid);
}

/**
 * Return the four-bit UUID version field from UUID text, exact bytes, or a plain slug after full
 * input validation. This reports the stored field, including zero for nil and 15 for max; it does
 * not prove that the UUID has the RFC variant or that the version is assigned.
 *
 * @param uuid - Any unmasked UUID representation supported by the package.
 */
export function extractUuidVersion<Input extends UuidInput>(
  uuid: KeylessUuidInput<Input>,
): UuidVersion | UuidSlugError {
  const bytes = decodeKeylessUuid(uuid);
  return bytes instanceof Error ? bytes : uuidVersion(bytes, 0);
}

/** Convert UUID text, bytes, or a plain UUID slug to new or caller-owned UUID bytes. */
export function uuidToBytes<Input extends UuidInput>(
  uuid: KeylessUuidInput<Input>,
): UuidBytesResult<Input>;
export function uuidToBytes<Input extends UuidInput, Output extends Uint8Array>(
  uuid: KeylessUuidInput<Input>,
  output: Output,
  outputOffset?: number,
): Output | UuidSlugError;
export function uuidToBytes(
  uuid: unknown,
  output?: unknown,
  outputOffset = 0,
): Uint8Array | UuidSlugError {
  const badRange = output === undefined ? undefined : checkByteRange(output, outputOffset, 16);
  if (badRange) return badRange;
  const destination = output as Uint8Array | undefined;
  const bytes = decodeKeylessUuid(uuid);
  if (bytes instanceof Error) return bytes;
  if (!destination) return new Uint8Array(bytes);
  destination.set(bytes, outputOffset);
  return destination;
}

/** Convert UUID text, bytes, or a plain UUID slug to normalized UUID text. */
export function uuidToString<
  Input extends UuidInput,
  Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE,
>(uuid: KeylessUuidInput<Input>, textCase?: Case): UuidStringResult<Input, Case>;
export function uuidToString(
  uuid: unknown,
  textCase: UuidTextCase = UUID_TEXT_LOWERCASE,
): string | UuidSlugError {
  const bytes = decodeKeylessUuid(uuid);
  return bytes instanceof Error ? bytes : bytesToUuidString(bytes, textCase);
}

/** Convert UUID text, bytes, or a plain UUID slug to a plain slug. */
export function uuidToPlainSlug<Input extends UuidInput>(
  uuid: KeylessUuidInput<Input>,
  alphabet?: SlugAlphabet,
): PlainUuidSlugResult<Input>;
export function uuidToPlainSlug(
  uuid: unknown,
  alphabet: SlugAlphabet = BASE64URL_NAME,
): PlainUuidSlug | UuidSlugError {
  const bytes = decodeKeylessUuid(uuid);
  return bytes instanceof Error ? bytes : uuidBytesToPlainSlug(bytes, alphabet);
}

/** Check a canonical 22-character base64url or 26-character lowercase base32hex plain slug. */
/*#__NO_SIDE_EFFECTS__*/
export function isPlainUuidSlug(value: unknown): value is PlainUuidSlug {
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
function isVersionedSlug(slug: unknown, version: number): slug is PlainUuidSlug {
  if (!isPlainUuidSlug(slug)) return false;
  const alpha = SLUG_ALPHABET_BY_LENGTH[slug.length] as Alphabet;
  return slugByte(slug, alpha, 6) >>> 4 === version && slugByte(slug, alpha, 8) >>> 6 === 2;
}

/** Check a canonical plain slug whose payload is an RFC-variant UUIDv4. */
/*#__NO_SIDE_EFFECTS__*/
export function isPlainUuidV4Slug(value: unknown): value is PlainUuidV4Slug {
  return isVersionedSlug(value, 4);
}

/** Check a canonical plain slug whose payload is an RFC-variant UUIDv7. */
/*#__NO_SIDE_EFFECTS__*/
export function isPlainUuidV7Slug(value: unknown): value is PlainUuidV7Slug {
  return isVersionedSlug(value, 7);
}

/*#__NO_SIDE_EFFECTS__*/
function extractStringTimestamp(value: string): number | UuidSlugError {
  let timestamp = 0;
  if (isUuidV7Text(value) && (value.length === 32 || value.length === 36))
    return parseInt(
      value.length === 36 ? value.slice(0, 8) + value.slice(9, 13) : value.slice(0, 12),
      16,
    );
  if (isPlainUuidV7Slug(value)) {
    const alpha = SLUG_ALPHABET_BY_LENGTH[value.length] as Alphabet;
    for (let index = 0; index < 6; index += 1)
      timestamp = timestamp * 256 + slugByte(value, alpha, index);
    return timestamp;
  }
  const bytes = uuidStringToBytes(value);
  if (!(bytes instanceof Error)) {
    if (uuidVersion(bytes) !== 7 || !isRfcVariant(bytes))
      return new UuidSlugError(INVALID_UUID_VERSION, UUID_V7_TIMESTAMP_ONLY);
    return uuidTimestampFromBytesUnchecked(bytes, 0);
  }
  if (isPlainUuidSlug(value))
    return new UuidSlugError(INVALID_UUID_VERSION, UUID_V7_TIMESTAMP_ONLY);
  return new UuidSlugError(INVALID_UUID, "Expected UUIDv7 text or a plain UUIDv7 slug.");
}

/**
 * Return the 48-bit Unix millisecond encoded by accepted UUIDv7 text, a plain UUIDv7 slug, or
 * UUIDv7 bytes. Compact and canonical text and both plain slug alphabets avoid a byte allocation.
 * Use `codec.extractMaskedUuidV7UnixMs` for masked or sentinel slugs. Other UUID versions and malformed
 * values return `UuidSlugError`. A preceding `UuidSlugError` is returned unchanged.
 *
 * @param value - UUIDv7 text in an accepted spelling, or a plain UUIDv7 slug in either alphabet.
 */
export function extractUuidV7UnixMs<Input extends string | UuidSlugError>(
  value: UuidV7TimestampInput<Input>,
): number | UuidSlugError;
/**
 * Return the 48-bit Unix millisecond encoded by UUIDv7 bytes. An `ArrayBuffer` uses its whole
 * contents; a `DataView` uses its declared range. Only `Uint8Array` input accepts an offset.
 *
 * @param value - One supported UUIDv7 byte source.
 * @param byteOffset - Zero-based index where the UUID starts. Omit for a standalone UUID.
 */
export function extractUuidV7UnixMs<Input extends UuidByteInput | UuidSlugError>(
  value: UuidV7BytesInput<Input>,
  byteOffset?: number,
): number | UuidSlugError;
/*#__NO_SIDE_EFFECTS__*/
export function extractUuidV7UnixMs(
  value: string | UuidByteInput | UuidSlugError,
  byteOffset = 0,
): number | UuidSlugError {
  if (typeof value === "string") return extractStringTimestamp(value);
  if (isUuidSlugError(value)) return value;
  const bytes = isUint8Array(value) ? value : exactUuidByteView(value);
  if (bytes instanceof Error) return bytes;
  const badRange = checkRange(bytes.length, byteOffset, 16);
  if (badRange) return badRange;
  if (uuidVersion(bytes, byteOffset) !== 7 || !isRfcVariant(bytes, byteOffset))
    return new UuidSlugError(INVALID_UUID_VERSION, UUID_V7_TIMESTAMP_ONLY);
  return uuidTimestampFromBytesUnchecked(bytes, byteOffset);
}

/**
 * Return the same plain UUIDv7 slug when its timestamp is inside the inclusive symmetric window.
 * Return `timestamp_outside_window` when it is not. Use a codec method for masked or sentinel
 * input. TypeScript rejects known UUID text, masked slugs, and UUIDv4 slugs. A preceding
 * `UuidSlugError` is returned unchanged.
 *
 * @param slug - Canonical plain UUIDv7 slug to validate and return.
 * @param window - Inclusive maximum distance from an explicit or current reference time.
 */
export function validatePlainUuidV7SlugUnixMs<Input extends string | UuidSlugError>(
  slug: PlainUuidV7SlugInput<Input>,
  window: UuidV7TimestampWindow,
): (Input & PlainUuidV7Slug) | UuidSlugError {
  if (typeof slug !== "string") return invalidUuidSlugInput(slug);
  const plainSlug: string = slug;
  const bytes = plainSlugToUuidBytes(plainSlug);
  if (bytes instanceof Error) return bytes;
  const valid = validateTimestampBytes(bytes, window);
  return valid instanceof Error ? valid : (plainSlug as Input & PlainUuidV7Slug);
}
