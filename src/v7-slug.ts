// SPDX-License-Identifier: Apache-2.0

import type { UuidSlugError } from "./errors.ts";
import { BASE64URL_NAME, encode } from "./alphabet.ts";
import { readGenerationOptions } from "./generation-options.ts";
import { UUID_TEXT_LOWERCASE } from "./types.ts";
import type {
  GeneratedUuidV7,
  GeneratePlainUuidV7SlugOptions,
  GenerateUuidV7WithPlainSlugOptions,
  PlainUuidV7Slug,
  UuidTextCase,
  UuidV7Instant,
  UuidV7StringFor,
} from "./types.ts";
import { generateUuidV7Bytes } from "./v7-keyless.ts";
import { resolveSlugAlphabet } from "./slug.ts";
import { formatUuidBytesUnchecked, invalidUuidTextCase, isUuidTextCase } from "./uuid.ts";
import type { SlugAlphabet } from "./slug.ts";

const PLAIN_UUID_V7_SLUG_OPTIONS = {
  alphabet: true,
  at: true,
} as const satisfies Record<keyof GeneratePlainUuidV7SlugOptions, true>;
const UUID_V7_WITH_PLAIN_SLUG_OPTIONS = {
  alphabet: true,
  at: true,
  textCase: true,
} as const satisfies Record<keyof GenerateUuidV7WithPlainSlugOptions, true>;
const AT_OPTION = "at";

/**
 * Generate a plain UUIDv7 slug. Lowercase base32hex preserves UUID byte order; base64url does not
 * preserve that order under text comparison. Module-level calls do not provide ordering across calls.
 *
 * @param alphabet - Output spelling. Omit for the shorter 22-character base64url form.
 */
export function generatePlainUuidV7Slug(alphabet?: SlugAlphabet): PlainUuidV7Slug | UuidSlugError;
/** Generate a plain UUIDv7 slug at an explicit time or the current clock reading. */
export function generatePlainUuidV7Slug(
  options: GeneratePlainUuidV7SlugOptions,
): PlainUuidV7Slug | UuidSlugError;
export function generatePlainUuidV7Slug(
  alphabetOrOptions: SlugAlphabet | GeneratePlainUuidV7SlugOptions = BASE64URL_NAME,
): PlainUuidV7Slug | UuidSlugError {
  const values =
    typeof alphabetOrOptions === "string"
      ? { alphabet: alphabetOrOptions }
      : readGenerationOptions(
          alphabetOrOptions,
          PLAIN_UUID_V7_SLUG_OPTIONS,
          "plain UUIDv7 slug generation",
        );
  if (values instanceof Error) return values;
  const resolved = resolveSlugAlphabet((values.alphabet ?? BASE64URL_NAME) as SlugAlphabet);
  if (resolved instanceof Error) return resolved;
  const bytes = !Object.hasOwn(values, AT_OPTION)
    ? generateUuidV7Bytes()
    : generateUuidV7Bytes({ at: values.at as UuidV7Instant });
  if (bytes instanceof Error) return bytes;
  return encode(bytes, resolved) as PlainUuidV7Slug;
}

/**
 * Generate UUIDv7 text and a plain slug for the same UUID. Module-level calls do not provide
 * ordering across calls.
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
/** Generate UUIDv7 text and a plain slug at an explicit time or the current clock reading. */
export function generateUuidV7WithPlainSlug<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
  options: GenerateUuidV7WithPlainSlugOptions<Case>,
): GeneratedUuidV7<PlainUuidV7Slug, Case> | UuidSlugError;
export function generateUuidV7WithPlainSlug(
  alphabetOrCaseOrOptions:
    | SlugAlphabet
    | UuidTextCase
    | GenerateUuidV7WithPlainSlugOptions = BASE64URL_NAME,
  textCase: UuidTextCase = UUID_TEXT_LOWERCASE,
): GeneratedUuidV7<PlainUuidV7Slug, UuidTextCase> | UuidSlugError {
  const values =
    typeof alphabetOrCaseOrOptions === "string"
      ? isUuidTextCase(alphabetOrCaseOrOptions)
        ? { alphabet: BASE64URL_NAME, textCase: alphabetOrCaseOrOptions }
        : { alphabet: alphabetOrCaseOrOptions, textCase }
      : readGenerationOptions(
          alphabetOrCaseOrOptions,
          UUID_V7_WITH_PLAIN_SLUG_OPTIONS,
          "UUIDv7 pair generation",
        );
  if (values instanceof Error) return values;
  const selectedCase = values.textCase ?? UUID_TEXT_LOWERCASE;
  if (!isUuidTextCase(selectedCase)) return invalidUuidTextCase();
  const resolved = resolveSlugAlphabet((values.alphabet ?? BASE64URL_NAME) as SlugAlphabet);
  if (resolved instanceof Error) return resolved;
  const bytes = !Object.hasOwn(values, AT_OPTION)
    ? generateUuidV7Bytes()
    : generateUuidV7Bytes({ at: values.at as UuidV7Instant });
  if (bytes instanceof Error) return bytes;
  return {
    uuid: formatUuidBytesUnchecked(bytes, 0, selectedCase) as UuidV7StringFor<UuidTextCase>,
    slug: encode(bytes, resolved) as PlainUuidV7Slug,
  };
}
