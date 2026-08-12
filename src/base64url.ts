// SPDX-License-Identifier: Apache-2.0

import { BASE64URL, decodeInto, encode } from "./alphabet";
import { UuidSlugError } from "./errors";
import type { Base64UrlString } from "./types";

export function encodeBase64Url(bytes: Uint8Array): Base64UrlString {
  return encode(bytes, BASE64URL);
}

/**
 * Decodes into `out` at `offset` when given one, otherwise into a fresh array.
 *
 * Returns a view over EXACTLY the bytes decoded, in both cases. The two used to disagree: without
 * `out` the result was `byteLength`-exact, with `out` it was the caller's entire buffer at its full
 * size, with the data at `offset` and no way to learn how many bytes had been written short of
 * recomputing `floor(value.length * 6 / 8)` by hand. One rule — "the bytes this call produced" —
 * makes the length usable and leaves the caller's own buffer reachable, since they own it.
 */
export function decodeBase64Url(
  value: string,
  out?: Uint8Array,
  offset = 0,
): UuidSlugError | Uint8Array {
  // Padding is the most common malformed input by far, and the generic "invalid character"
  // message sends the reader looking for a typo instead of a stray "=".
  if (value.includes("="))
    return new UuidSlugError("invalid_base64url", "Base64url value must be unpadded.");
  const byteLength = Math.floor((value.length * BASE64URL.bitsPerChar) / 8);
  const target = out ?? new Uint8Array(byteLength);
  const result = decodeInto(value, BASE64URL, target, offset, byteLength);
  if (result instanceof Error) return result;
  return target.subarray(offset, offset + byteLength);
}

export function isBase64Url(value: null | string | undefined): value is Base64UrlString {
  // The empty string decodes to zero bytes without error, but an identifier of no characters is
  // never what a caller means by "is this a slug"; rejecting it keeps the guard usable as one.
  if (!value) return false;
  return !(decodeBase64Url(value) instanceof Error);
}
