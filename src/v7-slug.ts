// SPDX-License-Identifier: Apache-2.0

import type { UuidSlugError } from "./errors.ts";
import type { UuidV7Slug } from "./types.ts";
import { generateUuidV7Bytes } from "./v7-keyless.ts";
import { bytesToSlug } from "./slug.ts";
import type { SlugAlphabet } from "./slug.ts";

export { UUID_SLUG_ERROR_CODES, UuidSlugError, isUuidSlugError } from "./errors.ts";
export type { UuidSlugErrorCode } from "./errors.ts";
export type { UuidV7Slug } from "./types.ts";
export type { SlugAlphabet } from "./slug.ts";

/**
 * Generate a direct UUIDv7 slug. Lowercase base32hex sorts across different milliseconds;
 * base64url and values generated within one millisecond have no chronological sort guarantee.
 *
 * @param alphabet - Output spelling. Omit for the shorter 22-character base64url form.
 */
export function generateUuidV7Slug(
  alphabet: SlugAlphabet = "base64url",
): UuidV7Slug | UuidSlugError {
  const bytes = generateUuidV7Bytes();
  if (bytes instanceof Error) return bytes;
  return bytesToSlug(bytes, alphabet) as UuidV7Slug | UuidSlugError;
}
