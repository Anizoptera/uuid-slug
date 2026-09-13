// SPDX-License-Identifier: Apache-2.0

import { checkByteRange, checkRange, isUint8Array, UuidSlugError } from "./errors";
import type {
  PreserveUuidVersion,
  UuidBytes,
  UuidV4Bytes,
  UuidV7Bytes,
  UuidString,
  UuidStringInput,
  UuidV4String,
  UuidV7String,
} from "./types";

export { UUID_SLUG_ERROR_CODES, isUuidSlugError } from "./errors";
export { UuidSlugError };
export type { UuidSlugErrorCode } from "./errors";
export type { UuidBytes, UuidString } from "./types";

const HEX = "0123456789abcdef";
// Probe once and allocate the byte-pair fallback only on engines that need it.
const nativeToHex = (Uint8Array.prototype as { toHex?: () => string }).toHex;
const HEX_BYTES = nativeToHex
  ? []
  : /*#__PURE__*/ Array.from(
      { length: 256 },
      (_, byte) => (HEX[byte >>> 4] as string) + (HEX[byte & 15] as string),
    );
const hexByte = (byte: number) => HEX_BYTES[byte] ?? "";
const HEX_DECODE = new Int8Array(128).fill(-1);
for (let i = 0; i < 10; i += 1) HEX_DECODE[48 + i] = i;
for (let i = 0; i < 6; i += 1) HEX_DECODE[97 + i] = 10 + i;

const UUID_LENGTH = 36;
const UUID_BYTE_OFFSETS = [0, 2, 4, 6, 9, 11, 14, 16, 19, 21, 24, 26, 28, 30, 32, 34] as const;

const hyphenateHex = (hex: string, offset: number): UuidString =>
  `${hex.slice(offset, offset + 8)}-${hex.slice(offset + 8, offset + 12)}-${hex.slice(offset + 12, offset + 16)}-${hex.slice(offset + 16, offset + 20)}-${hex.slice(offset + 20, offset + 32)}` as UuidString;

function hexValue(code: number) {
  return HEX_DECODE[code] ?? -1;
}

/** Read one byte from canonical UUID text already validated by the caller. */
export function uuidByteAtUnchecked(uuid: string, byteIndex: number): number {
  const offset = UUID_BYTE_OFFSETS[byteIndex] as number;
  return (hexValue(uuid.charCodeAt(offset)) << 4) | hexValue(uuid.charCodeAt(offset + 1));
}

/**
 * Parse canonical lowercase UUID text into a new plain 16-byte `Uint8Array`. Known slug values are
 * rejected by TypeScript; invalid text returns `UuidSlugError`.
 *
 * @param uuid - Canonical lowercase UUID text.
 */
export function uuidToBytes<Input extends string>(
  uuid: UuidStringInput<Input>,
): PreserveUuidVersion<Input, UuidBytes, UuidV4Bytes, UuidV7Bytes> | UuidSlugError;
/**
 * Parse canonical lowercase UUID text into caller-owned storage after validating the full input.
 *
 * @param uuid - Canonical lowercase UUID text.
 * @param output - Caller-owned array that receives the 16 UUID bytes.
 * @param outputOffset - Zero-based index where writing starts. Omit to start at index 0. Bytes
 * outside the written range stay unchanged.
 */
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
    target[offset + byteIndex] = uuidByteAtUnchecked(uuid, byteIndex);
  }
  return target;
}

/**
 * Format 16 bytes at `byteOffset` as canonical lowercase UUID text without assigning a version.
 * An invalid array or range returns `invalid_buffer`.
 *
 * @param bytes - An array containing at least one complete 16-byte UUID.
 * @param byteOffset - Zero-based index where the UUID starts. Omit for a standalone UUID.
 */
export function bytesToUuid(bytes: Uint8Array, byteOffset = 0): UuidString | UuidSlugError {
  const badRange = checkByteRange(bytes, byteOffset, 16);
  if (badRange) return badRange;
  if (nativeToHex) {
    let offset = 0;
    let hex: string;
    if (bytes.length <= 32) {
      hex = nativeToHex.call(bytes);
      offset = byteOffset * 2;
    } else {
      hex = nativeToHex.call(bytes.subarray(byteOffset, byteOffset + 16));
    }
    return hyphenateHex(hex, offset);
  }
  return formatUuidBytesUnchecked(bytes, byteOffset);
}

/** Format a UUID range already proved writable by its caller. */
export function formatUuidBytesUnchecked(bytes: Uint8Array, offset = 0): UuidString {
  if (nativeToHex) return hyphenateHex(nativeToHex.call(bytes), offset * 2);
  return (hexByte(bytes[offset] as number) +
    hexByte(bytes[offset + 1] as number) +
    hexByte(bytes[offset + 2] as number) +
    hexByte(bytes[offset + 3] as number) +
    "-" +
    hexByte(bytes[offset + 4] as number) +
    hexByte(bytes[offset + 5] as number) +
    "-" +
    hexByte(bytes[offset + 6] as number) +
    hexByte(bytes[offset + 7] as number) +
    "-" +
    hexByte(bytes[offset + 8] as number) +
    hexByte(bytes[offset + 9] as number) +
    "-" +
    hexByte(bytes[offset + 10] as number) +
    hexByte(bytes[offset + 11] as number) +
    hexByte(bytes[offset + 12] as number) +
    hexByte(bytes[offset + 13] as number) +
    hexByte(bytes[offset + 14] as number) +
    hexByte(bytes[offset + 15] as number)) as UuidString;
}

export function uuidVersion(bytes: Uint8Array, offset = 0): number {
  return (bytes[offset + 6] ?? 0) >>> 4;
}

export function isRfcVariant(bytes: Uint8Array, offset = 0): boolean {
  return (bytes[offset + 8] ?? 0) >>> 6 === 0b10;
}

// Predicates inspect the same hex table as parsing without allocating output bytes or Errors.
/** Check canonical lowercase UUID syntax without claiming a version, variant, or issuance. */
/*#__NO_SIDE_EFFECTS__*/
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

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UUID_V7_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Check canonical UUID text with version 4 and RFC variant bits. */
/*#__NO_SIDE_EFFECTS__*/
export function isUuidV4String(value: unknown): value is UuidV4String {
  return typeof value === "string" && UUID_V4_RE.test(value);
}

/** Check canonical UUID text with version 7 and RFC variant bits. */
/*#__NO_SIDE_EFFECTS__*/
export function isUuidV7String(value: unknown): value is UuidV7String {
  return typeof value === "string" && UUID_V7_RE.test(value);
}

/** Check for a 16-byte `Uint8Array` without claiming a UUID version or issuance. */
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

/** Read one 48-bit big-endian timestamp without allocating an intermediate representation. */
export function uuidTimestampFromBytesUnchecked(bytes: Uint8Array, byteOffset: number): number {
  let timestamp = 0;
  for (let i = 0; i < 6; i += 1) timestamp = timestamp * 256 + (bytes[byteOffset + i] ?? 0);
  return timestamp;
}
