// SPDX-License-Identifier: Apache-2.0

import { BASE64URL, decodeInto, encode } from "./alphabet";
import { UuidSlugError } from "./errors";
import type { Base64UrlString } from "./types";

export function encodeBase64Url(bytes: Uint8Array): Base64UrlString {
  return encode(bytes, BASE64URL) as Base64UrlString;
}

export function decodeBase64Url(value: string, out?: Uint8Array, offset = 0): Error | Uint8Array {
  // Padding is the most common malformed input by far, and the generic "invalid character"
  // message sends the reader looking for a typo instead of a stray "=".
  if (value.includes("="))
    return new UuidSlugError("invalid_base64url", "Base64url value must be unpadded.");
  const byteLength = Math.floor((value.length * BASE64URL.bitsPerChar) / 8);
  const target = out ?? new Uint8Array(byteLength);
  const result = decodeInto(value, BASE64URL, target, offset, byteLength);
  if (result instanceof Error) return result;
  return out ? target : target.subarray(0, byteLength);
}

export function isBase64Url(value: null | string | undefined): value is Base64UrlString {
  // The empty string decodes to zero bytes without error, but an identifier of no characters is
  // never what a caller means by "is this a slug"; rejecting it keeps the guard usable as one.
  if (!value) return false;
  return decodeBase64Url(value) instanceof Error ? false : true;
}
