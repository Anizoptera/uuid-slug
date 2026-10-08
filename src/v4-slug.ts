// SPDX-License-Identifier: Apache-2.0

import { generatedOrThrow } from "./errors.ts";
import type { UuidSlugError } from "./errors.ts";
import { BASE64URL_NAME, encode } from "./alphabet.ts";
import type { PlainUuidV4Slug } from "./types.ts";
import { drawUuidV4Scratch } from "./v4.ts";
import { resolveSlugAlphabet } from "./slug.ts";
import type { SlugAlphabet } from "./slug.ts";

/**
 * Generate a plain UUIDv4 slug with platform randomness, using base64url by default. base32hex is
 * filesystem-safe but cannot make random UUIDv4 values chronological.
 *
 * @param alphabet - Output spelling. Omit for the shorter 22-character base64url form.
 * @throws `UuidSlugError` with code `rng_unavailable` when generation cannot obtain
 * secure randomness.
 */
export function generatePlainUuidV4Slug(alphabet?: SlugAlphabet): PlainUuidV4Slug;
export function generatePlainUuidV4Slug(
  alphabet: SlugAlphabet = BASE64URL_NAME,
): PlainUuidV4Slug | UuidSlugError {
  // Only an untyped call reaches an unknown alphabet; that misuse stays an error value.
  const resolved = resolveSlugAlphabet(alphabet);
  if (resolved instanceof Error) return resolved;
  return encode(generatedOrThrow(drawUuidV4Scratch()), resolved) as PlainUuidV4Slug;
}
