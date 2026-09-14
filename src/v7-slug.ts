// SPDX-License-Identifier: Apache-2.0

import type { UuidSlugError } from "./errors.ts";
import { BASE64URL_NAME, encode } from "./alphabet.ts";
import { UUID_TEXT_LOWERCASE } from "./types.ts";
import type { GeneratedUuidV7, DirectUuidV7Slug, UuidTextCase, UuidV7StringFor } from "./types.ts";
import { generateUuidV7Bytes } from "./v7-keyless.ts";
import { resolveSlugAlphabet } from "./slug.ts";
import { formatUuidBytesUnchecked, invalidUuidTextCase, isUuidTextCase } from "./uuid.ts";
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
  const resolved = resolveSlugAlphabet(alphabet);
  if (resolved instanceof Error) return resolved;
  const bytes = generateUuidV7Bytes();
  if (bytes instanceof Error) return bytes;
  return encode(bytes, resolved) as DirectUuidV7Slug;
}

/**
 * Generate UUIDv7 text and a direct slug for the same UUID from one random byte draw.
 *
 * @param alphabet - Slug spelling. Omit for the shorter 22-character base64url form.
 * @param textCase - UUID text spelling. Pass it alone to keep the default slug alphabet.
 * @returns Both lossless representations, or `UuidSlugError` when generation fails.
 */
export function generateUuidV7WithDirectSlug(
  alphabet?: SlugAlphabet,
): GeneratedUuidV7<DirectUuidV7Slug> | UuidSlugError;
export function generateUuidV7WithDirectSlug<Case extends UuidTextCase>(
  textCase: Case,
): GeneratedUuidV7<DirectUuidV7Slug, Case> | UuidSlugError;
export function generateUuidV7WithDirectSlug<Case extends UuidTextCase>(
  alphabet: SlugAlphabet,
  textCase: Case,
): GeneratedUuidV7<DirectUuidV7Slug, Case> | UuidSlugError;
export function generateUuidV7WithDirectSlug(
  alphabetOrCase: SlugAlphabet | UuidTextCase = BASE64URL_NAME,
  textCase: UuidTextCase = UUID_TEXT_LOWERCASE,
): GeneratedUuidV7<DirectUuidV7Slug, UuidTextCase> | UuidSlugError {
  const selectedCase = isUuidTextCase(alphabetOrCase) ? alphabetOrCase : textCase;
  if (!isUuidTextCase(selectedCase)) return invalidUuidTextCase();
  const alphabet = isUuidTextCase(alphabetOrCase) ? BASE64URL_NAME : alphabetOrCase;
  const resolved = resolveSlugAlphabet(alphabet);
  if (resolved instanceof Error) return resolved;
  const bytes = generateUuidV7Bytes();
  if (bytes instanceof Error) return bytes;
  return {
    uuid: formatUuidBytesUnchecked(bytes, 0, selectedCase) as UuidV7StringFor<UuidTextCase>,
    slug: encode(bytes, resolved) as DirectUuidV7Slug,
  };
}
