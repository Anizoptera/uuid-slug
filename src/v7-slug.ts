// SPDX-License-Identifier: Apache-2.0

import type { UuidSlugError } from "./errors.ts";
import { BASE64URL_NAME } from "./alphabet.ts";
import type { GeneratedUuidV7, DirectUuidV7Slug, UuidV7String } from "./types.ts";
import { generateUuidV7Bytes } from "./v7-keyless.ts";
import { uuidBytesToDirectSlug } from "./slug.ts";
import { formatUuidBytesUnchecked } from "./uuid.ts";
import type { SlugAlphabet } from "./slug.ts";

/**
 * Generate a direct UUIDv7 slug. Lowercase base32hex sorts across different milliseconds;
 * base64url and values generated within one millisecond have no chronological sort guarantee.
 *
 * @param alphabet - Output spelling. Omit for the shorter 22-character base64url form.
 */
export function generateDirectUuidV7Slug(
  alphabet: SlugAlphabet = BASE64URL_NAME,
): DirectUuidV7Slug | UuidSlugError {
  const bytes = generateUuidV7Bytes();
  if (bytes instanceof Error) return bytes;
  return uuidBytesToDirectSlug(bytes, alphabet) as DirectUuidV7Slug | UuidSlugError;
}

/**
 * Generate canonical UUIDv7 text and a direct slug for the same UUID from one random byte draw.
 *
 * @param alphabet - Slug spelling. Omit for the shorter 22-character base64url form.
 * @returns Both lossless representations, or `UuidSlugError` when generation fails.
 */
export function generateUuidV7WithDirectSlug(
  alphabet: SlugAlphabet = BASE64URL_NAME,
): GeneratedUuidV7<DirectUuidV7Slug> | UuidSlugError {
  const bytes = generateUuidV7Bytes();
  if (bytes instanceof Error) return bytes;
  const slug = uuidBytesToDirectSlug(bytes, alphabet);
  return slug instanceof Error
    ? slug
    : { uuid: formatUuidBytesUnchecked(bytes) as UuidV7String, slug: slug as DirectUuidV7Slug };
}
