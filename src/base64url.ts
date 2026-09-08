// SPDX-License-Identifier: Apache-2.0

import { BASE64URL, decodeInto, encode, isEncoded } from "./alphabet";
import { checkRange, UuidSlugError } from "./errors";
import type { Base64UrlString } from "./types";

const UUID_BYTES = 16;
const UUID_BASE64URL_LENGTH = 22;

export function encodeBase64Url(bytes: Uint8Array): Base64UrlString | UuidSlugError {
  if (bytes.length !== UUID_BYTES)
    return new UuidSlugError("invalid_buffer", "Base64url UUID input must contain 16 bytes.");
  return encode(bytes, BASE64URL);
}

/**
 * Decodes into `out` at `offset` when given one, otherwise into a fresh array.
 *
 * Decodes one UUID payload and commits the caller's buffer only after full validation.
 */
export function decodeBase64Url(
  value: string,
  out?: Uint8Array,
  offset = 0,
): UuidSlugError | Uint8Array {
  if (value.length !== UUID_BASE64URL_LENGTH)
    return new UuidSlugError(
      "invalid_base64url",
      "Base64url UUID input must contain 22 characters.",
    );
  // Padding is the most common malformed input by far, and the generic "invalid character"
  // message sends the reader looking for a typo instead of a stray "=".
  if (value.includes("="))
    return new UuidSlugError("invalid_base64url", "Base64url value must be unpadded.");
  const decoded = new Uint8Array(UUID_BYTES);
  const result = decodeInto(value, BASE64URL, decoded, 0, UUID_BYTES);
  if (result instanceof Error) return result;
  const target = out ?? new Uint8Array(UUID_BYTES);
  const badRange = checkRange(target.length, offset, UUID_BYTES);
  if (badRange) return badRange;
  target.set(decoded, offset);
  return target.subarray(offset, offset + UUID_BYTES);
}

export function isBase64Url(value: null | string | undefined): value is Base64UrlString {
  return value?.length === UUID_BASE64URL_LENGTH && isEncoded(value, BASE64URL, UUID_BYTES);
}
