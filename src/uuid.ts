import { decodeBase64Url, encodeBase64Url } from "./base64url";
import { UuidSlugError } from "./errors";
import type {
  UuidSlug,
  UuidString,
  UuidV4Slug,
  UuidV4String,
  UuidV7Slug,
  UuidV7String,
} from "./types";

const HEX = "0123456789abcdef";
const HEX_DECODE = new Int8Array(128).fill(-1);
for (let i = 0; i < 10; i += 1) HEX_DECODE[48 + i] = i;
for (let i = 0; i < 6; i += 1) HEX_DECODE[97 + i] = 10 + i;

const UUID_LENGTH = 36;
const SLUG_LENGTH = 22;
const UUID_BYTE_OFFSETS = [
  0, 2, 4, 6, 9, 11, 14, 16, 19, 21, 24, 26, 28, 30, 32, 34,
] as const;

function hexValue(code: number) {
  return code < HEX_DECODE.length ? HEX_DECODE[code] : -1;
}

export function parseUuid(
  uuid: string,
  out?: Uint8Array,
  offset = 0,
): Error | Uint8Array {
  if (uuid.length !== UUID_LENGTH)
    return new UuidSlugError("invalid_uuid", "UUID must be 36 characters.");
  if (
    uuid[8] !== "-" ||
    uuid[13] !== "-" ||
    uuid[18] !== "-" ||
    uuid[23] !== "-"
  ) {
    return new UuidSlugError(
      "invalid_uuid",
      "UUID hyphen positions are invalid.",
    );
  }

  const target = out ?? new Uint8Array(16);
  if (offset < 0 || offset + 16 > target.length)
    return new UuidSlugError("invalid_buffer", "Output buffer is too small.");

  for (
    let byteIndex = 0;
    byteIndex < UUID_BYTE_OFFSETS.length;
    byteIndex += 1
  ) {
    const textOffset = UUID_BYTE_OFFSETS[byteIndex] ?? 0;
    const high = hexValue(uuid.charCodeAt(textOffset)) ?? -1;
    const low = hexValue(uuid.charCodeAt(textOffset + 1)) ?? -1;
    if (high < 0 || low < 0)
      return new UuidSlugError(
        "invalid_uuid",
        `Invalid UUID hex at offset ${textOffset}.`,
      );
    target[offset + byteIndex] = (high << 4) | low;
  }
  return target;
}

export function formatUuid(bytes: Uint8Array, offset = 0): Error | UuidString {
  if (offset < 0 || offset + 16 > bytes.length)
    return new UuidSlugError(
      "invalid_buffer",
      "UUID byte buffer is too small.",
    );
  let out = "";
  for (let i = 0; i < 16; i += 1) {
    if (i === 4 || i === 6 || i === 8 || i === 10) out += "-";
    const byte = bytes[offset + i] ?? 0;
    out += HEX[byte >>> 4];
    out += HEX[byte & 0x0f];
  }
  return out as UuidString;
}

export function uuidVersion(bytes: Uint8Array, offset = 0): number {
  return (bytes[offset + 6] ?? 0) >>> 4;
}

export function isRfcVariant(bytes: Uint8Array, offset = 0): boolean {
  return (bytes[offset + 8] ?? 0) >>> 6 === 0b10;
}

export function isUuidString(
  uuid: null | string | undefined,
): uuid is UuidString {
  if (!uuid) return false;
  return parseUuid(uuid) instanceof Error ? false : true;
}

export function isUuidV4String(
  uuid: null | string | undefined,
): uuid is UuidV4String {
  if (!uuid) return false;
  const bytes = parseUuid(uuid);
  return bytes instanceof Error
    ? false
    : uuidVersion(bytes) === 4 && isRfcVariant(bytes);
}

export function isUuidV7String(
  uuid: null | string | undefined,
): uuid is UuidV7String {
  if (!uuid) return false;
  const bytes = parseUuid(uuid);
  return bytes instanceof Error
    ? false
    : uuidVersion(bytes) === 7 && isRfcVariant(bytes);
}

export function isUuidV7Bytes(bytes: Uint8Array): boolean {
  return bytes.length === 16 && uuidVersion(bytes) === 7 && isRfcVariant(bytes);
}

export function uuidBytesToSlug(
  bytes: Uint8Array,
  offset = 0,
): Error | UuidSlug {
  if (offset < 0 || offset + 16 > bytes.length)
    return new UuidSlugError(
      "invalid_buffer",
      "UUID byte buffer is too small.",
    );
  return encodeBase64Url(bytes.subarray(offset, offset + 16)) as UuidSlug;
}

export function slugToUuidBytes(
  slug: string,
  out?: Uint8Array,
  offset = 0,
): Error | Uint8Array {
  if (slug.length !== SLUG_LENGTH)
    return new UuidSlugError(
      "invalid_uuid_slug",
      "UUID slug must be 22 characters.",
    );
  return decodeBase64Url(slug, out, offset);
}

export function uuidToSlug(uuid: string): Error | UuidSlug {
  const bytes = parseUuid(uuid);
  if (bytes instanceof Error) return bytes;
  return uuidBytesToSlug(bytes);
}

export function slugToUuid(slug: string): Error | UuidString {
  const bytes = slugToUuidBytes(slug);
  if (bytes instanceof Error) return bytes;
  return formatUuid(bytes);
}

export function formatUuidSlug(
  bytes: Uint8Array,
  offset = 0,
): Error | UuidSlug {
  return uuidBytesToSlug(bytes, offset);
}

export function parseUuidSlug(
  slug: string,
  out?: Uint8Array,
  offset = 0,
): Error | Uint8Array {
  return slugToUuidBytes(slug, out, offset);
}

export function isUuidSlug(slug: null | string | undefined): slug is UuidSlug {
  if (!slug || slug.length !== SLUG_LENGTH) return false;
  return slugToUuidBytes(slug) instanceof Error ? false : true;
}

export function isUuidV4Slug(
  slug: null | string | undefined,
): slug is UuidV4Slug {
  if (!slug) return false;
  const bytes = slugToUuidBytes(slug);
  return bytes instanceof Error
    ? false
    : uuidVersion(bytes) === 4 && isRfcVariant(bytes);
}

export function isUuidV7Slug(
  slug: null | string | undefined,
): slug is UuidV7Slug {
  if (!slug) return false;
  const bytes = slugToUuidBytes(slug);
  return bytes instanceof Error
    ? false
    : uuidVersion(bytes) === 7 && isRfcVariant(bytes);
}

export function extractUuidV7Timestamp(bytes: Uint8Array, offset = 0): number {
  let timestamp = 0;
  for (let i = 0; i < 6; i += 1)
    timestamp = timestamp * 256 + (bytes[offset + i] ?? 0);
  return timestamp;
}

export function hasUuidV7Entropy(bytes: Uint8Array, offset = 0): boolean {
  const randA =
    (((bytes[offset + 6] ?? 0) & 0x0f) << 8) | (bytes[offset + 7] ?? 0);
  const randBFirst = (bytes[offset + 8] ?? 0) & 0x3f;
  let restZero = true;
  let restMax = true;
  for (let i = 9; i < 16; i += 1) {
    const byte = bytes[offset + i] ?? 0;
    if (byte !== 0x00) restZero = false;
    if (byte !== 0xff) restMax = false;
  }
  return (
    !(randA === 0 && randBFirst === 0 && restZero) &&
    !(randA === 0x0fff && randBFirst === 0x3f && restMax)
  );
}
