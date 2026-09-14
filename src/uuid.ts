// SPDX-License-Identifier: Apache-2.0

import {
  checkByteRange,
  checkRange,
  invalidUuidStringInput,
  INVALID_BUFFER,
  INVALID_OPTIONS,
  INVALID_UUID,
  isUuidSlugError,
  isUint8Array,
  uuidByteView,
  UuidSlugError,
} from "./errors.ts";
import { UUID_TEXT_LOWERCASE, UUID_TEXT_UPPERCASE } from "./types.ts";
import type {
  PreserveUuidVersion,
  UuidBytes,
  UuidByteInput,
  UuidV4Bytes,
  UuidV7Bytes,
  UuidString,
  UuidStringFor,
  UuidText,
  UuidTextCase,
  UuidStringInput,
  UuidV4String,
  UuidV4Text,
  UuidV7String,
  UuidV7Text,
  UuidVersion,
} from "./types.ts";

export { isUuidSlugError } from "./errors.ts";
export { UuidSlugError };
export type { UuidSlugErrorCode } from "./errors.ts";
export type { UuidBytes, UuidString } from "./types.ts";

/** Borrow one exact UUID payload from any supported byte source. */
/*#__NO_SIDE_EFFECTS__*/
export function exactUuidByteView(value: unknown): Uint8Array | UuidSlugError {
  if (isUuidSlugError(value)) return value;
  const bytes = uuidByteView(value);
  return bytes?.length === 16
    ? bytes
    : new UuidSlugError(INVALID_BUFFER, "UUID byte input must contain exactly 16 bytes.");
}

/** The canonical all-zero UUID value, without a version or issuance claim. */
export const NIL_UUID = "00000000-0000-0000-0000-000000000000" as UuidString;
/** The canonical all-one UUID value, without a version or issuance claim. */
export const MAX_UUID = "ffffffff-ffff-ffff-ffff-ffffffffffff" as UuidString;

const HEX = "0123456789abcdef";
const UPPERCASE_HEX = "0123456789ABCDEF";
const UUID_SEPARATOR = "-";

/** Keep case-option validation identical across every UUID-text writer. */
export const isUuidTextCase = (value: unknown): value is UuidTextCase =>
  value === UUID_TEXT_LOWERCASE || value === UUID_TEXT_UPPERCASE;
export function invalidUuidTextCase(): UuidSlugError {
  return new UuidSlugError(INVALID_OPTIONS, "UUID text case must be lowercase or uppercase.");
}
// Probe once and allocate the byte-pair fallback only on engines that need it.
const nativeToHex = (Uint8Array.prototype as { toHex?: () => string }).toHex;
const HEX_BYTES = nativeToHex
  ? []
  : /*#__PURE__*/ Array.from(
      { length: 256 },
      (_, byte) => (HEX[byte >>> 4] as string) + (HEX[byte & 15] as string),
    );
const hexByte = /* @__NO_SIDE_EFFECTS__ */ (byte: number) => HEX_BYTES[byte] ?? "";
let uppercaseHexBytes: string[] | undefined;
const uppercaseHexByte = (byte: number) =>
  (uppercaseHexBytes ??= Array.from(
    { length: 256 },
    (_, value) => (UPPERCASE_HEX[value >>> 4] as string) + (UPPERCASE_HEX[value & 15] as string),
  ))[byte] ?? "";
const HEX_DECODE = new Int8Array(128).fill(-1);
for (let i = 0; i < 10; i += 1) HEX_DECODE[48 + i] = i;
for (let i = 0; i < 6; i += 1) HEX_DECODE[97 + i] = 10 + i;

const UUID_LENGTH = 36;
const COMPACT_UUID_LENGTH = 32;
const UUID_URN_LENGTH = 45;
const BRACED_UUID_LENGTH = 38;
const UUID_URN_PREFIX = "urn:uuid:";
const INVALID_UUID_TEXT_START = -2;
const COMPACT_UUID_TEXT_START = -1;
const UUID_BYTE_OFFSETS = [0, 2, 4, 6, 9, 11, 14, 16, 19, 21, 24, 26, 28, 30, 32, 34] as const;

/** Return the first canonical UUID character, or the compact/invalid sentinel. */
/*#__NO_SIDE_EFFECTS__*/
function uuidTextStart(value: string): number {
  if (value.length === COMPACT_UUID_LENGTH) return COMPACT_UUID_TEXT_START;
  if (value.length === UUID_LENGTH) return 0;
  if (value.length === BRACED_UUID_LENGTH && value[0] === "{" && value[37] === "}") return 1;
  if (value.length === UUID_URN_LENGTH) {
    for (let index = 0; index < UUID_URN_PREFIX.length; index += 1)
      if ((value.charCodeAt(index) | 32) !== UUID_URN_PREFIX.charCodeAt(index))
        return INVALID_UUID_TEXT_START;
    return UUID_URN_PREFIX.length;
  }
  return INVALID_UUID_TEXT_START;
}

const hyphenateHex = /* @__NO_SIDE_EFFECTS__ */ (hex: string, offset: number): UuidString =>
  `${hex.slice(offset, offset + 8)}-${hex.slice(offset + 8, offset + 12)}-${hex.slice(offset + 12, offset + 16)}-${hex.slice(offset + 16, offset + 20)}-${hex.slice(offset + 20, offset + 32)}` as UuidString;

/*#__NO_SIDE_EFFECTS__*/
function lowercaseHexValue(code: number) {
  return HEX_DECODE[code] ?? -1;
}

/*#__NO_SIDE_EFFECTS__*/
function parsedHexValue(code: number) {
  return code >= 65 && code <= 70 ? code - 55 : lowercaseHexValue(code);
}

/** Read one byte from canonical UUID text already validated by the caller. */
/*#__NO_SIDE_EFFECTS__*/
export function uuidByteAtUnchecked(uuid: string, byteIndex: number): number {
  const offset = UUID_BYTE_OFFSETS[byteIndex] as number;
  return (
    (parsedHexValue(uuid.charCodeAt(offset)) << 4) | parsedHexValue(uuid.charCodeAt(offset + 1))
  );
}

/**
 * Parse accepted mixed-case UUID text into a new plain 16-byte `Uint8Array`. Accept canonical or
 * compact text, a UUID URN, or brace-wrapped canonical text. Known slug values are rejected by
 * TypeScript; invalid text returns `UuidSlugError`. A preceding `UuidSlugError` is returned unchanged.
 *
 * @param uuid - UUID text in an accepted spelling.
 */
export function uuidStringToBytes<Input extends string | UuidSlugError>(
  uuid: UuidStringInput<Input>,
): PreserveUuidVersion<Input, UuidBytes, UuidV4Bytes, UuidV7Bytes> | UuidSlugError;
/**
 * Parse accepted mixed-case UUID text into caller-owned storage after validating the full input.
 * A preceding `UuidSlugError` is returned unchanged without writing.
 *
 * @param uuid - UUID text in an accepted spelling.
 * @param output - Caller-owned array that receives the 16 UUID bytes.
 * @param outputOffset - Zero-based index where writing starts. Omit to start at index 0. Bytes
 * outside the written range stay unchanged.
 */
export function uuidStringToBytes<Input extends string | UuidSlugError, Output extends Uint8Array>(
  uuid: UuidStringInput<Input>,
  output: Output,
  outputOffset?: number,
): Output | UuidSlugError;
export function uuidStringToBytes(
  uuid: string | UuidSlugError,
  out?: Uint8Array,
  offset = 0,
): Uint8Array | UuidSlugError {
  if (typeof uuid !== "string") return invalidUuidStringInput(uuid);
  const textStart = uuidTextStart(uuid);
  if (textStart === INVALID_UUID_TEXT_START)
    return new UuidSlugError(
      INVALID_UUID,
      "UUID must be canonical, compact, a UUID URN, or brace-wrapped canonical text.",
    );
  const hyphenated = textStart !== COMPACT_UUID_TEXT_START;
  if (
    hyphenated &&
    (uuid[textStart + 8] !== UUID_SEPARATOR ||
      uuid[textStart + 13] !== UUID_SEPARATOR ||
      uuid[textStart + 18] !== UUID_SEPARATOR ||
      uuid[textStart + 23] !== UUID_SEPARATOR)
  )
    return new UuidSlugError(INVALID_UUID, "UUID hyphen positions are invalid.");

  const badRange = out === undefined ? checkRange(16, offset, 16) : checkByteRange(out, offset, 16);
  if (badRange) return badRange;

  for (let byteIndex = 0; byteIndex < 16; byteIndex += 1) {
    const textOffset = hyphenated
      ? textStart + (UUID_BYTE_OFFSETS[byteIndex] as number)
      : byteIndex * 2;
    if (
      parsedHexValue(uuid.charCodeAt(textOffset)) < 0 ||
      parsedHexValue(uuid.charCodeAt(textOffset + 1)) < 0
    )
      return new UuidSlugError(
        INVALID_UUID,
        `Invalid UUID hex at offset ${textOffset}; use 0-9, a-f, or A-F.`,
      );
  }
  const target = out ?? new Uint8Array(16);
  for (let byteIndex = 0; byteIndex < 16; byteIndex += 1) {
    const textOffset = hyphenated
      ? textStart + (UUID_BYTE_OFFSETS[byteIndex] as number)
      : byteIndex * 2;
    target[offset + byteIndex] =
      (parsedHexValue(uuid.charCodeAt(textOffset)) << 4) |
      parsedHexValue(uuid.charCodeAt(textOffset + 1));
  }
  return target;
}

/**
 * Format 16 bytes as standard hyphenated UUID text without assigning a version. A standalone
 * `ArrayBuffer` uses its whole contents; a `DataView` uses its declared range. Only `Uint8Array`
 * input accepts an explicit offset. Invalid input returns `invalid_buffer`, and a preceding
 * `UuidSlugError` is returned unchanged.
 *
 * @param bytes - One supported UUID byte source.
 * @param textCase - Built-in output spelling. Omit for lowercase.
 * @defaultValue `UUID_TEXT_LOWERCASE`
 * @param byteOffset - Zero-based index where the UUID starts. Omit for a standalone UUID.
 */
export function bytesToUuidString<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
  bytes: UuidByteInput | UuidSlugError,
  textCase?: Case,
): UuidStringFor<Case> | UuidSlugError;
export function bytesToUuidString<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
  bytes: Uint8Array | UuidSlugError,
  byteOffset: number,
  textCase?: Case,
): UuidStringFor<Case> | UuidSlugError;
/*#__NO_SIDE_EFFECTS__*/
export function bytesToUuidString(
  bytes: UuidByteInput | UuidSlugError,
  offsetOrCase: number | UuidTextCase = 0,
  textCase: UuidTextCase = UUID_TEXT_LOWERCASE,
): UuidString | string | UuidSlugError {
  const view = isUint8Array(bytes) ? bytes : exactUuidByteView(bytes);
  if (view instanceof Error) return view;
  const caseIsSecond =
    typeof offsetOrCase === "string"
      ? Number.isNaN(Number(offsetOrCase))
      : typeof offsetOrCase !== "number";
  const byteOffset = (caseIsSecond ? 0 : offsetOrCase) as number;
  const selectedCase = caseIsSecond ? offsetOrCase : textCase;
  if (!isUuidTextCase(selectedCase)) return invalidUuidTextCase();
  const badRange = checkRange(view.length, byteOffset, 16);
  if (badRange) return badRange;
  if (nativeToHex && selectedCase === UUID_TEXT_LOWERCASE) {
    let offset = 0;
    let hex: string;
    if (view.length <= 32) {
      hex = nativeToHex.call(view);
      offset = byteOffset * 2;
    } else {
      hex = nativeToHex.call(view.subarray(byteOffset, byteOffset + 16));
    }
    return hyphenateHex(hex, offset);
  }
  return formatUuidBytesUnchecked(view, byteOffset, selectedCase);
}

/** Format a UUID range already proved writable by its caller. */
/*#__NO_SIDE_EFFECTS__*/
export function formatUuidBytesUnchecked<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
  bytes: Uint8Array,
  offset = 0,
  textCase: Case = UUID_TEXT_LOWERCASE as Case,
): UuidStringFor<Case> {
  if (nativeToHex && textCase === UUID_TEXT_LOWERCASE)
    return hyphenateHex(nativeToHex.call(bytes), offset * 2) as UuidStringFor<Case>;
  const byte = textCase === UUID_TEXT_UPPERCASE ? uppercaseHexByte : hexByte;
  return (byte(bytes[offset] as number) +
    byte(bytes[offset + 1] as number) +
    byte(bytes[offset + 2] as number) +
    byte(bytes[offset + 3] as number) +
    UUID_SEPARATOR +
    byte(bytes[offset + 4] as number) +
    byte(bytes[offset + 5] as number) +
    UUID_SEPARATOR +
    byte(bytes[offset + 6] as number) +
    byte(bytes[offset + 7] as number) +
    UUID_SEPARATOR +
    byte(bytes[offset + 8] as number) +
    byte(bytes[offset + 9] as number) +
    UUID_SEPARATOR +
    byte(bytes[offset + 10] as number) +
    byte(bytes[offset + 11] as number) +
    byte(bytes[offset + 12] as number) +
    byte(bytes[offset + 13] as number) +
    byte(bytes[offset + 14] as number) +
    byte(bytes[offset + 15] as number)) as UuidStringFor<Case>;
}

/*#__NO_SIDE_EFFECTS__*/
export function uuidVersion(bytes: Uint8Array, offset = 0): UuidVersion {
  return ((bytes[offset + 6] ?? 0) >>> 4) as UuidVersion;
}

/*#__NO_SIDE_EFFECTS__*/
export function isRfcVariant(bytes: Uint8Array, offset = 0): boolean {
  return (bytes[offset + 8] ?? 0) >>> 6 === 0b10;
}

// Predicates inspect the same hex table as parsing without allocating output bytes or Errors.
/** Check accepted UUID text without claiming a version, variant, or issuance. */
/*#__NO_SIDE_EFFECTS__*/
export function isUuidText(value: unknown): value is UuidText {
  if (typeof value !== "string") return false;
  const textStart = uuidTextStart(value);
  if (textStart === INVALID_UUID_TEXT_START) return false;
  const hyphenated = textStart !== COMPACT_UUID_TEXT_START;
  if (
    hyphenated &&
    (value[textStart + 8] !== UUID_SEPARATOR ||
      value[textStart + 13] !== UUID_SEPARATOR ||
      value[textStart + 18] !== UUID_SEPARATOR ||
      value[textStart + 23] !== UUID_SEPARATOR)
  )
    return false;
  for (let i = 0; i < UUID_BYTE_OFFSETS.length; i += 1) {
    const offset = hyphenated ? textStart + (UUID_BYTE_OFFSETS[i] as number) : i * 2;
    if (
      parsedHexValue(value.charCodeAt(offset)) < 0 ||
      parsedHexValue(value.charCodeAt(offset + 1)) < 0
    )
      return false;
  }
  return true;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UUID_V7_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Check accepted UUID text with version 4 and RFC variant bits. */
/*#__NO_SIDE_EFFECTS__*/
export function isUuidV4Text(value: unknown): value is UuidV4Text {
  if (!isUuidText(value)) return false;
  const textStart = uuidTextStart(value);
  const variant = parsedHexValue(
    value.charCodeAt(textStart === COMPACT_UUID_TEXT_START ? 16 : textStart + 19),
  );
  return (
    parsedHexValue(
      value.charCodeAt(textStart === COMPACT_UUID_TEXT_START ? 12 : textStart + 14),
    ) === 4 &&
    variant >= 8 &&
    variant <= 11
  );
}

/** Check accepted UUID text with version 7 and RFC variant bits. */
/*#__NO_SIDE_EFFECTS__*/
export function isUuidV7Text(value: unknown): value is UuidV7Text {
  if (!isUuidText(value)) return false;
  const textStart = uuidTextStart(value);
  const variant = parsedHexValue(
    value.charCodeAt(textStart === COMPACT_UUID_TEXT_START ? 16 : textStart + 19),
  );
  return (
    parsedHexValue(
      value.charCodeAt(textStart === COMPACT_UUID_TEXT_START ? 12 : textStart + 14),
    ) === 7 &&
    variant >= 8 &&
    variant <= 11
  );
}

/** Check canonical lowercase UUID text without claiming a version, variant, or issuance. */
export function isUuidString(value: unknown): value is UuidString {
  return typeof value === "string" && UUID_RE.test(value);
}
/** Check canonical lowercase UUIDv4 text with RFC variant bits. */
export function isUuidV4String(value: unknown): value is UuidV4String {
  return typeof value === "string" && UUID_V4_RE.test(value);
}
/** Check canonical lowercase UUIDv7 text with RFC variant bits. */
export function isUuidV7String(value: unknown): value is UuidV7String {
  return typeof value === "string" && UUID_V7_RE.test(value);
}

/** Check for a 16-byte `Uint8Array` without claiming a UUID version or issuance. */
/*#__NO_SIDE_EFFECTS__*/
export function isUuidBytes(value: unknown): value is UuidBytes {
  return isUint8Array(value) && value.length === 16;
}

/** Check for exactly 16 UUIDv4 bytes with the RFC variant required by generation. */
/*#__NO_SIDE_EFFECTS__*/
export function isUuidV4Bytes(value: unknown): value is UuidV4Bytes {
  return isUuidBytes(value) && uuidVersion(value) === 4 && isRfcVariant(value);
}

/**
 * Check for exactly 16 UUIDv7 bytes with the RFC variant required by masking and timestamps.
 * General byte input can use `bytesToUuidString`; this narrower predicate proves the version those
 * v7-only operations require.
 */
/*#__NO_SIDE_EFFECTS__*/
export function isUuidV7Bytes(value: unknown): value is UuidV7Bytes {
  return isUuidBytes(value) && uuidVersion(value) === 7 && isRfcVariant(value);
}

/** Read one 48-bit big-endian timestamp without allocating an intermediate representation. */
/*#__NO_SIDE_EFFECTS__*/
export function uuidTimestampFromBytesUnchecked(bytes: Uint8Array, byteOffset: number): number {
  let timestamp = 0;
  for (let i = 0; i < 6; i += 1) timestamp = timestamp * 256 + (bytes[byteOffset + i] ?? 0);
  return timestamp;
}
