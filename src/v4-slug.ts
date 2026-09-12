// SPDX-License-Identifier: Apache-2.0

import type { UuidSlugError } from "./errors";
import type { UuidV4Slug } from "./types";
import { generateUuidV4Bytes } from "./v4";
import { bytesToSlug } from "./slug";
import type { SlugAlphabet } from "./slug";

export { UUID_SLUG_ERROR_CODES, UuidSlugError, isUuidSlugError } from "./errors";
export type { UuidSlugErrorCode } from "./errors";
export type { UuidV4Slug } from "./types";
export type { SlugAlphabet } from "./slug";

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
  if (bytes instanceof Error) return bytes;
  return bytesToSlug(bytes, alphabet) as UuidV4Slug | UuidSlugError;
}
