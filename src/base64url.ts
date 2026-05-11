import { UuidSlugError } from "./errors";
import type { Base64UrlString } from "./types";

const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const DECODE = new Int16Array(128).fill(-1);
for (let i = 0; i < ALPHABET.length; i += 1) DECODE[ALPHABET.charCodeAt(i)] = i;

function byteAt(bytes: Uint8Array, index: number) {
  return bytes[index] ?? 0;
}

export function encodeBase64Url(bytes: Uint8Array): Base64UrlString {
  let out = "";
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const value =
      (byteAt(bytes, i) << 16) |
      (byteAt(bytes, i + 1) << 8) |
      byteAt(bytes, i + 2);
    out += ALPHABET[(value >>> 18) & 63];
    out += ALPHABET[(value >>> 12) & 63];
    out += ALPHABET[(value >>> 6) & 63];
    out += ALPHABET[value & 63];
  }
  const remaining = bytes.length - i;
  if (remaining === 1) {
    const value = byteAt(bytes, i) << 16;
    out += ALPHABET[(value >>> 18) & 63];
    out += ALPHABET[(value >>> 12) & 63];
  }
  if (remaining === 2) {
    const value = (byteAt(bytes, i) << 16) | (byteAt(bytes, i + 1) << 8);
    out += ALPHABET[(value >>> 18) & 63];
    out += ALPHABET[(value >>> 12) & 63];
    out += ALPHABET[(value >>> 6) & 63];
  }
  return out as Base64UrlString;
}

export function decodeBase64Url(
  value: string,
  out?: Uint8Array,
  offset = 0,
): Error | Uint8Array {
  if (value.includes("="))
    return new UuidSlugError(
      "invalid_base64url",
      "Base64url value must be unpadded.",
    );
  if (value.length % 4 === 1)
    return new UuidSlugError(
      "invalid_base64url",
      "Base64url length is impossible.",
    );

  const byteLength = Math.floor((value.length * 6) / 8);
  const target = out ?? new Uint8Array(byteLength);
  if (offset < 0 || offset + byteLength > target.length)
    return new UuidSlugError("invalid_buffer", "Output buffer is too small.");

  let buffer = 0;
  let bits = 0;
  let written = 0;
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    const decoded = code < DECODE.length ? (DECODE[code] ?? -1) : -1;
    if (decoded < 0)
      return new UuidSlugError(
        "invalid_base64url",
        `Invalid base64url character at offset ${i}.`,
      );
    buffer = (buffer << 6) | decoded;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      target[offset + written] = (buffer >>> bits) & 0xff;
      written += 1;
    }
  }
  if (bits > 0 && (buffer & ((1 << bits) - 1)) !== 0) {
    return new UuidSlugError(
      "invalid_base64url",
      "Base64url value has non-canonical trailing bits.",
    );
  }
  return out ? target : target.subarray(0, byteLength);
}

export function isBase64Url(
  value: null | string | undefined,
): value is Base64UrlString {
  if (!value || value.includes("=") || value.length % 4 === 1) return false;
  return decodeBase64Url(value) instanceof Error ? false : true;
}
