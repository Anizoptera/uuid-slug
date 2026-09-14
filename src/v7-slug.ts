// SPDX-License-Identifier: Apache-2.0

import type { UuidSlugError } from "./errors.ts";
import { BASE64URL_NAME, encode } from "./alphabet.ts";
import { UUID_TEXT_LOWERCASE } from "./types.ts";
import type { GeneratedUuidV7, PlainUuidV7Slug, UuidTextCase, UuidV7StringFor } from "./types.ts";
import { generateUuidV7Bytes } from "./v7-keyless.ts";
import { resolveSlugAlphabet } from "./slug.ts";
import { formatUuidBytesUnchecked, invalidUuidTextCase, isUuidTextCase } from "./uuid.ts";
import type { SlugAlphabet } from "./slug.ts";

/**
 * Generate a plain UUIDv7 slug. Lowercase base32hex preserves the module-level UUID byte order;
 * base64url does not preserve that order under text comparison.
 *
 * @param alphabet - Output spelling. Omit for the shorter 22-character base64url form.
 */
export function generatePlainUuidV7Slug(
  alphabet: SlugAlphabet = BASE64URL_NAME,
): PlainUuidV7Slug | UuidSlugError {
  const resolved = resolveSlugAlphabet(alphabet);
  if (resolved instanceof Error) return resolved;
  const bytes = generateUuidV7Bytes();
  if (bytes instanceof Error) return bytes;
  return encode(bytes, resolved) as PlainUuidV7Slug;
}

/**
 * Generate UUIDv7 text and a plain slug for the same UUID. Successful calls join the module-level
 * current-time sequence.
 *
 * @param alphabet - Slug spelling. Omit for the shorter 22-character base64url form.
 * @param textCase - UUID text spelling. Pass it alone to keep the default slug alphabet.
 * @returns UUID text plus one slug in the selected alphabet, or `UuidSlugError` when generation fails.
 */
export function generateUuidV7WithPlainSlug(
  alphabet?: SlugAlphabet,
): GeneratedUuidV7<PlainUuidV7Slug> | UuidSlugError;
export function generateUuidV7WithPlainSlug<Case extends UuidTextCase>(
  textCase: Case,
): GeneratedUuidV7<PlainUuidV7Slug, Case> | UuidSlugError;
export function generateUuidV7WithPlainSlug<Case extends UuidTextCase>(
  alphabet: SlugAlphabet,
  textCase: Case,
): GeneratedUuidV7<PlainUuidV7Slug, Case> | UuidSlugError;
export function generateUuidV7WithPlainSlug(
  alphabetOrCase: SlugAlphabet | UuidTextCase = BASE64URL_NAME,
  textCase: UuidTextCase = UUID_TEXT_LOWERCASE,
): GeneratedUuidV7<PlainUuidV7Slug, UuidTextCase> | UuidSlugError {
  const selectedCase = isUuidTextCase(alphabetOrCase) ? alphabetOrCase : textCase;
  if (!isUuidTextCase(selectedCase)) return invalidUuidTextCase();
  const alphabet = isUuidTextCase(alphabetOrCase) ? BASE64URL_NAME : alphabetOrCase;
  const resolved = resolveSlugAlphabet(alphabet);
  if (resolved instanceof Error) return resolved;
  const bytes = generateUuidV7Bytes();
  if (bytes instanceof Error) return bytes;
  return {
    uuid: formatUuidBytesUnchecked(bytes, 0, selectedCase) as UuidV7StringFor<UuidTextCase>,
    slug: encode(bytes, resolved) as PlainUuidV7Slug,
  };
}
