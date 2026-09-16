// SPDX-License-Identifier: Apache-2.0

import { isUuidSlugError, stringInput } from "./errors.ts";
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
import { currentUuidV7Bytes, uuidV7BytesFor } from "./v7-keyless.ts";
import { generateUuidV7BytesWithGenerator, readUuidV7Generator } from "./v7-generator-input.ts";
import { resolveSlugAlphabet } from "./slug.ts";
import { formatUuidBytesUnchecked, isUuidTextCase, resolveUuidTextCase } from "./uuid.ts";
import type { SlugAlphabet } from "./slug.ts";

const PLAIN_UUID_V7_SLUG_OPTIONS = {
  alphabet: true,
  at: true,
  generator: true,
} as const satisfies Record<keyof GeneratePlainUuidV7SlugOptions, true>;
const UUID_V7_WITH_PLAIN_SLUG_OPTIONS = {
  alphabet: true,
  at: true,
  generator: true,
  textCase: true,
} as const satisfies Record<keyof GenerateUuidV7WithPlainSlugOptions, true>;
const AT_OPTION = "at";

/**
 * Generate a plain UUIDv7 slug. Lowercase base32hex preserves UUID byte order; base64url does not
 * preserve that order under text comparison. Select a generator when this result must join its sequence.
 *
 * @param alphabet - Output spelling. Omit for the shorter 22-character base64url form.
 * @throws `UuidSlugError` with code `rng_unavailable` when the runtime has no secure random
 * source. No supported runtime lacks one, so this is not expected during normal operation.
 */
export function generatePlainUuidV7Slug(alphabet?: SlugAlphabet): PlainUuidV7Slug;
/** Generate a plain UUIDv7 slug with optional time, alphabet, and sequence state. */
export function generatePlainUuidV7Slug(
  options: GeneratePlainUuidV7SlugOptions,
): PlainUuidV7Slug | UuidSlugError;
export function generatePlainUuidV7Slug(
  alphabetOrOptions: SlugAlphabet | GeneratePlainUuidV7SlugOptions = BASE64URL_NAME,
): PlainUuidV7Slug | UuidSlugError {
  // An alphabet alone cannot fail once accepted, so a failed draw is thrown on that form and
  // returned on the options form, whose time and generator can fail.
  let alphabetOnly = typeof alphabetOrOptions === "string";
  let values = alphabetOnly
    ? { alphabet: alphabetOrOptions as SlugAlphabet }
    : readGenerationOptions(
        alphabetOrOptions,
        PLAIN_UUID_V7_SLUG_OPTIONS,
        "plain UUIDv7 slug generation",
      );
  if (values instanceof Error) {
    const alphabet = stringInput(alphabetOrOptions);
    if (alphabet !== undefined) {
      values = { alphabet };
      alphabetOnly = true;
    }
  }
  if (values instanceof Error) return values;
  const resolved = resolveSlugAlphabet((values.alphabet ?? BASE64URL_NAME) as SlugAlphabet);
  if (resolved instanceof Error) return resolved;
  const generator = readUuidV7Generator(values.generator);
  if (generator instanceof Error) return generator;
  const bytes = generator
    ? generateUuidV7BytesWithGenerator(generator, values)
    : !Object.hasOwn(values, AT_OPTION)
      ? currentUuidV7Bytes()
      : uuidV7BytesFor({ at: values.at as UuidV7Instant });
  if (isUuidSlugError(bytes)) {
    if (alphabetOnly) throw bytes;
    return bytes;
  }
  return encode(bytes, resolved) as PlainUuidV7Slug;
}

/**
 * Generate UUIDv7 text and a plain slug for the same UUID. Select a generator when this result must
 * join its sequence.
 *
 * @param alphabet - Slug spelling. Omit for the shorter 22-character base64url form.
 * @param textCase - UUID text spelling. Pass it alone to keep the default slug alphabet.
 * @returns UUID text plus one slug in the selected alphabet.
 * @throws `UuidSlugError` with code `rng_unavailable` when the runtime has no secure random
 * source. No supported runtime lacks one, so this is not expected during normal operation.
 */
export function generateUuidV7WithPlainSlug(
  alphabet?: SlugAlphabet,
): GeneratedUuidV7<PlainUuidV7Slug>;
export function generateUuidV7WithPlainSlug<Case extends UuidTextCase>(
  textCase: Case,
): GeneratedUuidV7<PlainUuidV7Slug, Case>;
export function generateUuidV7WithPlainSlug<Case extends UuidTextCase>(
  alphabet: SlugAlphabet,
  textCase: Case,
): GeneratedUuidV7<PlainUuidV7Slug, Case>;
/**
 * Generate the pair with optional time, spelling, and sequence state.
 *
 * @returns UUID text plus one slug in the selected alphabet, or `UuidSlugError` when generation fails.
 */
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
  // Spelling presets alone cannot fail once accepted, so a failed draw is thrown on those forms
  // and returned on the options form, whose time and generator can fail.
  let presetsOnly = typeof alphabetOrCaseOrOptions === "string";
  let values = presetsOnly
    ? isUuidTextCase(alphabetOrCaseOrOptions)
      ? { alphabet: BASE64URL_NAME, textCase: alphabetOrCaseOrOptions }
      : { alphabet: alphabetOrCaseOrOptions as SlugAlphabet, textCase }
    : readGenerationOptions(
        alphabetOrCaseOrOptions,
        UUID_V7_WITH_PLAIN_SLUG_OPTIONS,
        "UUIDv7 pair generation",
      );
  if (values instanceof Error) {
    const selector = stringInput(alphabetOrCaseOrOptions);
    if (selector !== undefined) {
      values = isUuidTextCase(selector)
        ? { alphabet: BASE64URL_NAME, textCase: selector }
        : { alphabet: selector, textCase };
      presetsOnly = true;
    }
  }
  if (values instanceof Error) return values;
  const selectedCase = resolveUuidTextCase(values.textCase ?? UUID_TEXT_LOWERCASE);
  if (selectedCase instanceof Error) return selectedCase;
  const resolved = resolveSlugAlphabet((values.alphabet ?? BASE64URL_NAME) as SlugAlphabet);
  if (resolved instanceof Error) return resolved;
  const generator = readUuidV7Generator(values.generator);
  if (generator instanceof Error) return generator;
  const bytes = generator
    ? generateUuidV7BytesWithGenerator(generator, values)
    : !Object.hasOwn(values, AT_OPTION)
      ? currentUuidV7Bytes()
      : uuidV7BytesFor({ at: values.at as UuidV7Instant });
  if (isUuidSlugError(bytes)) {
    if (presetsOnly) throw bytes;
    return bytes;
  }
  return {
    uuid: formatUuidBytesUnchecked(bytes, 0, selectedCase) as UuidV7StringFor<UuidTextCase>,
    slug: encode(bytes, resolved) as PlainUuidV7Slug,
  };
}
