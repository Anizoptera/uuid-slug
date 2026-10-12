// SPDX-License-Identifier: Apache-2.0

import { runtime } from "#runtime";
import { generatedOrThrow, isUuidSlugError, portableAfterNative, stringInput } from "./errors.ts";
import type { UuidSlugError } from "./errors.ts";
import { BASE64URL as BASE64URL_ALPHABET, BASE64URL_NAME, encode } from "./alphabet.ts";
import { readGenerationOptions } from "./generation-options.ts";
import { UUID_TEXT_LOWERCASE } from "./types.ts";
import type {
  GeneratedUuidV7,
  GeneratePlainUuidV7SlugOptions,
  GenerateUuidV7WithPlainSlugOptions,
  PlainUuidV7Slug,
  UuidTextCase,
  UuidV7Generator,
  UuidV7StringFor,
} from "./types.ts";
import { currentUuidV7Scratch, uuidV7ScratchAt } from "./v7-keyless.ts";
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
const GENERATOR_PLAIN_SLUG_OPTIONS = {
  alphabet: true,
  at: true,
} as const satisfies Record<keyof Omit<GeneratePlainUuidV7SlugOptions, "generator">, true>;
const GENERATOR_WITH_PLAIN_SLUG_OPTIONS = {
  alphabet: true,
  at: true,
  textCase: true,
} as const satisfies Record<keyof Omit<GenerateUuidV7WithPlainSlugOptions, "generator">, true>;
const AT_OPTION = "at";
const PLAIN_UUID_V7_SLUG_GENERATION = "plain UUIDv7 slug generation";
const hasNativeUuidV7Slug = runtime.uuidV7Slug !== undefined;

/** Supply the UUIDv7 bytes one slug operation encodes, from a sequence or from the module clock. */
type DrawUuidV7Bytes = (values: { readonly at?: unknown }) => Uint8Array | UuidSlugError;

// Keep failures as values until the public preset call owns the permitted entropy throw.
const portableUuidV7Slug = (): string | UuidSlugError => {
  const bytes = currentUuidV7Scratch();
  return bytes instanceof Error ? bytes : encode(bytes, BASE64URL_ALPHABET);
};

// Direct native output removes clock, entropy, byte writing and encoding from ordinary calls.
// Configured calls and base32hex remain portable. Remeasure complete calls and resources if this
// boundary changes; bench/PERFORMANCE.md owns evidence. Trust proper native results directly;
// result validation and identity tracking would impose stronger default guarantees.
function nativeUuidV7Slug(): string | UuidSlugError {
  const native = runtime.uuidV7Slug;
  if (!native) return portableUuidV7Slug();
  try {
    return native();
  } catch (cause) {
    return portableAfterNative(cause, portableUuidV7Slug, undefined, PLAIN_UUID_V7_SLUG_GENERATION);
  }
}

/** Draw for the module-level calls, where an untrusted `generator` option may select a sequence. */
const drawKeylessUuidV7Bytes: DrawUuidV7Bytes = (values) => {
  const generator = readUuidV7Generator((values as { generator?: unknown }).generator);
  if (generator instanceof Error) return generator;
  return generator
    ? generateUuidV7BytesWithGenerator(generator, values, true)
    : !Object.hasOwn(values, AT_OPTION)
      ? currentUuidV7Scratch()
      : uuidV7ScratchAt(values.at);
};

/**
 * Read one plain-slug call's options, resolve its alphabet, draw, and encode.
 *
 * `presetFormThrows` carries the module-level rule that an alphabet alone cannot fail once
 * accepted, so a failed draw is thrown on that form and returned on the options form, whose time
 * and generator can fail. A generator method never throws: its clock and sequence state can fail
 * on every form.
 */
function plainUuidV7SlugFrom(
  alphabetOrOptions: SlugAlphabet | GeneratePlainUuidV7SlugOptions,
  accepted: Record<string, true>,
  drawBytes: DrawUuidV7Bytes,
  presetFormThrows: boolean,
): PlainUuidV7Slug | UuidSlugError {
  let alphabetOnly = typeof alphabetOrOptions === "string";
  let values = alphabetOnly
    ? { alphabet: alphabetOrOptions as SlugAlphabet }
    : readGenerationOptions(alphabetOrOptions, accepted, PLAIN_UUID_V7_SLUG_GENERATION);
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
  const bytes = drawBytes(values);
  if (isUuidSlugError(bytes)) {
    if (alphabetOnly && presetFormThrows) throw bytes;
    return bytes;
  }
  return encode(bytes, resolved) as PlainUuidV7Slug;
}

/**
 * Read one pair call's options, resolve both spellings, draw, and encode.
 *
 * `presetFormThrows` carries the same rule as `plainUuidV7SlugFrom`.
 */
function uuidV7WithPlainSlugFrom(
  alphabetOrCaseOrOptions: SlugAlphabet | UuidTextCase | GenerateUuidV7WithPlainSlugOptions,
  textCase: UuidTextCase,
  accepted: Record<string, true>,
  drawBytes: DrawUuidV7Bytes,
  presetFormThrows: boolean,
): GeneratedUuidV7<PlainUuidV7Slug, UuidTextCase> | UuidSlugError {
  let presetsOnly = typeof alphabetOrCaseOrOptions === "string";
  let values = presetsOnly
    ? isUuidTextCase(alphabetOrCaseOrOptions)
      ? { alphabet: BASE64URL_NAME, textCase: alphabetOrCaseOrOptions }
      : { alphabet: alphabetOrCaseOrOptions as SlugAlphabet, textCase }
    : readGenerationOptions(alphabetOrCaseOrOptions, accepted, "UUIDv7 pair generation");
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
  const bytes = drawBytes(values);
  if (isUuidSlugError(bytes)) {
    if (presetsOnly && presetFormThrows) throw bytes;
    return bytes;
  }
  return {
    uuid: formatUuidBytesUnchecked(bytes, 0, selectedCase) as UuidV7StringFor<UuidTextCase>,
    slug: encode(bytes, resolved) as PlainUuidV7Slug,
  };
}

/**
 * Build one generator's slug methods around the sequence's own byte draw. The generator is the
 * package's own, so these skip the untrusted-generator validation the module-level calls run.
 */
export function uuidV7GeneratorSlugMethods(
  drawBytes: DrawUuidV7Bytes,
): Pick<UuidV7Generator, "generatePlainUuidV7Slug" | "generateUuidV7WithPlainSlug"> {
  return {
    generatePlainUuidV7Slug: (
      alphabetOrOptions:
        | SlugAlphabet
        | Omit<GeneratePlainUuidV7SlugOptions, "generator"> = BASE64URL_NAME,
    ) => plainUuidV7SlugFrom(alphabetOrOptions, GENERATOR_PLAIN_SLUG_OPTIONS, drawBytes, false),
    generateUuidV7WithPlainSlug: (
      alphabetOrCaseOrOptions:
        | SlugAlphabet
        | UuidTextCase
        | Omit<GenerateUuidV7WithPlainSlugOptions, "generator"> = BASE64URL_NAME,
      textCase: UuidTextCase = UUID_TEXT_LOWERCASE,
    ) =>
      uuidV7WithPlainSlugFrom(
        alphabetOrCaseOrOptions,
        textCase,
        GENERATOR_WITH_PLAIN_SLUG_OPTIONS,
        drawBytes,
        false,
      ),
  };
}

/**
 * Generate a plain UUIDv7 slug. Lowercase base32hex preserves UUID byte order; base64url does not
 * preserve that order under text comparison. Native runtime results are trusted without
 * additional output guarantees. Module calls may advance their logical timestamp
 * during bursts; select a generator when this result must join its sequence or control its clock.
 *
 * @param alphabet - Output spelling. Omit for the shorter 22-character base64url form.
 * @throws `UuidSlugError` with code `rng_unavailable` when generation cannot obtain
 * secure randomness.
 */
export function generatePlainUuidV7Slug(alphabet?: SlugAlphabet): PlainUuidV7Slug;
/** Generate a plain UUIDv7 slug with optional time, alphabet, and sequence state. */
export function generatePlainUuidV7Slug(
  options: GeneratePlainUuidV7SlugOptions,
): PlainUuidV7Slug | UuidSlugError;
/**
 * Forward either an alphabet preset or generation options without branching at the call site.
 * Configured failures return `UuidSlugError`.
 * @throws `UuidSlugError` with code `rng_unavailable` when a preset or undefined branch cannot obtain secure randomness.
 */
export function generatePlainUuidV7Slug(
  alphabetOrOptions: SlugAlphabet | GeneratePlainUuidV7SlugOptions | undefined,
): PlainUuidV7Slug | UuidSlugError;
export function generatePlainUuidV7Slug(
  alphabetOrOptions: SlugAlphabet | GeneratePlainUuidV7SlugOptions = BASE64URL_NAME,
): PlainUuidV7Slug | UuidSlugError {
  // An exact base64url preset needs no further normalization. Native-capable hosts skip portable
  // generation and encoding; other presets still validate before drawing. Wrapped strings retain
  // their existing normalization path. Remeasure all complete calls if selection changes.
  if (typeof alphabetOrOptions === "string") {
    if (hasNativeUuidV7Slug && alphabetOrOptions === BASE64URL_NAME)
      return generatedOrThrow(nativeUuidV7Slug()) as PlainUuidV7Slug;
    const alphabet = resolveSlugAlphabet(alphabetOrOptions);
    return alphabet instanceof Error
      ? alphabet
      : (encode(generatedOrThrow(currentUuidV7Scratch()), alphabet) as PlainUuidV7Slug);
  }
  return plainUuidV7SlugFrom(
    alphabetOrOptions,
    PLAIN_UUID_V7_SLUG_OPTIONS,
    drawKeylessUuidV7Bytes,
    true,
  );
}

/**
 * Generate UUIDv7 text and a plain slug for the same UUID. Select a generator when this result must
 * join its sequence.
 *
 * @param alphabet - Slug spelling. Omit for the shorter 22-character base64url form.
 * @param textCase - UUID text spelling. Pass it alone to keep the default slug alphabet.
 * @returns UUID text plus one slug in the selected alphabet.
 * @throws `UuidSlugError` with code `rng_unavailable` when generation cannot obtain
 * secure randomness.
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
  // Primitive presets cannot select a clock or generator. Resolve them before the shared scratch
  // draw, then derive both requested spellings without constructing an internal options record.
  // Wrapped strings and configured calls retain their existing normalization and failure path.
  if (typeof alphabetOrCaseOrOptions === "string") {
    const caseOnly = isUuidTextCase(alphabetOrCaseOrOptions);
    const selectedCase = resolveUuidTextCase(caseOnly ? alphabetOrCaseOrOptions : textCase);
    if (selectedCase instanceof Error) return selectedCase;
    const alphabet = resolveSlugAlphabet(caseOnly ? BASE64URL_NAME : alphabetOrCaseOrOptions);
    if (alphabet instanceof Error) return alphabet;
    const bytes = generatedOrThrow(currentUuidV7Scratch());
    return {
      uuid: formatUuidBytesUnchecked(bytes, 0, selectedCase) as UuidV7StringFor<UuidTextCase>,
      slug: encode(bytes, alphabet) as PlainUuidV7Slug,
    };
  }
  return uuidV7WithPlainSlugFrom(
    alphabetOrCaseOrOptions,
    textCase,
    UUID_V7_WITH_PLAIN_SLUG_OPTIONS,
    drawKeylessUuidV7Bytes,
    true,
  );
}
