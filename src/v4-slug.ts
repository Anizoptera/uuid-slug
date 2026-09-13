// SPDX-License-Identifier: Apache-2.0

import { isUuidSlugError } from "./errors.ts";
import type { UuidSlugError } from "./errors.ts";
import type { UuidV4Slug } from "./types.ts";
import { generateUuidV4Bytes } from "./v4.ts";
import { bytesToUuidSlug } from "./slug.ts";
import type { SlugAlphabet } from "./slug.ts";

/**
 * Generate a direct UUIDv4 slug with platform randomness, using base64url by default. base32hex is
 * filesystem-safe but cannot make random UUIDv4 values chronological.
 *
 * @param alphabet - Output spelling. Omit for the shorter 22-character base64url form.
 */
export function generateUuidV4Slug(
  alphabet: SlugAlphabet = "base64url",
): UuidV4Slug | UuidSlugError {
  const bytes = generateUuidV4Bytes();
  if (isUuidSlugError(bytes)) return bytes;
  return bytesToUuidSlug(bytes, alphabet) as UuidV4Slug | UuidSlugError;
}
