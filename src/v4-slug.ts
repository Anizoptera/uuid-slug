// SPDX-License-Identifier: Apache-2.0

import type { UuidSlugError } from "./errors.ts";
import { BASE64URL_NAME } from "./alphabet.ts";
import type { DirectUuidV4Slug } from "./types.ts";
import { generateUuidV4Bytes } from "./v4.ts";
import { uuidBytesToDirectSlug } from "./slug.ts";
import type { SlugAlphabet } from "./slug.ts";

/**
 * Generate a direct UUIDv4 slug with platform randomness, using base64url by default. base32hex is
 * filesystem-safe but cannot make random UUIDv4 values chronological.
 *
 * @param alphabet - Output spelling. Omit for the shorter 22-character base64url form.
 */
export function generateDirectUuidV4Slug(
  alphabet: SlugAlphabet = BASE64URL_NAME,
): DirectUuidV4Slug | UuidSlugError {
  const bytes = generateUuidV4Bytes();
  if (bytes instanceof Error) return bytes;
  return uuidBytesToDirectSlug(bytes, alphabet) as DirectUuidV4Slug | UuidSlugError;
}
