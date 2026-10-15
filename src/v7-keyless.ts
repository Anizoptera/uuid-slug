// SPDX-License-Identifier: Apache-2.0

/** Keyless operations avoid codec setup. Masking stays on codecs because it requires their key. */
import { runtime } from "#runtime";
import {
  ERROR_MARKER,
  fillRandomBytes,
  generatedOrThrow,
  INVALID_TIMESTAMP,
  portableAfterNative,
  readClock,
  stringInput,
  UuidSlugError,
} from "./errors.ts";
import { readGenerationOptions } from "./generation-options.ts";
import { UUID_TEXT_LOWERCASE, UUID_TEXT_UPPERCASE } from "./types.ts";
import type {
  GenerateUuidV7Options,
  GenerateUuidV7BytesIntoOptions,
  GenerateUuidV7BytesOptions,
  UuidOutput,
  UuidTextCase,
  UuidTextCaseArguments,
  UuidV7Bytes,
  UuidV7StringFor,
} from "./types.ts";
import type { UuidV7PayloadLayout } from "./types.ts";
import { readUuidV7Instant } from "./instant.ts";
import { formatUuidBytesUnchecked, resolveUuidTextCase } from "./uuid.ts";
import { createPortableUuidV7Generator } from "./v7.ts";
import type { PortableUuidV7Generator } from "./v7.ts";
import { generateUuidV7BytesWithGenerator, readUuidV7Generator } from "./v7-generator-input.ts";

const UUID_V7_TEXT_OPTIONS = {
  at: true,
  generator: true,
  textCase: true,
} as const satisfies Record<keyof GenerateUuidV7Options, true>;
const AT_OPTION = "at";
const UUID_V7_GENERATION = "UUIDv7 generation";
const UUID_V7_BYTE_OPTIONS = {
  at: true,
  generator: true,
  output: true,
  outputOffset: true,
} as const satisfies Record<keyof GenerateUuidV7BytesIntoOptions<Uint8Array>, true>;

/**
 * Text and bytes keep independent lazy state so neither output form pays cross-form coordination.
 * Native defaults avoid constructing this generator. Explicit time, configured generators and
 * native failure still need portable state; bench/decisions.md owns the selection evidence.
 */
let textGenerator: PortableUuidV7Generator | undefined;
let byteGenerator: PortableUuidV7Generator | undefined;
const v7Text = () =>
  (textGenerator ??= createPortableUuidV7Generator({
    coordinateExplicitInstants: false,
    fillRandom: runtime.fillRandom,
    textScratch: keylessTextBytes,
  }));
const v7Bytes = () =>
  (byteGenerator ??= createPortableUuidV7Generator({
    coordinateExplicitInstants: false,
    fillRandom: runtime.fillRandom,
  }));
export const uuidV7DefaultPayloadLayout = (): UuidV7PayloadLayout => v7Bytes().payloadLayout;
// Text formatting reads these bytes before returning, and the module generators run no caller code.
const keylessTextBytes = new Uint8Array(16);

/**
 * Draw with options this module already read. Rebuilding an options object for the generator's
 * public method allocated it and read every option a second time (bench/decisions.md).
 */
function drawFromReadOptions(
  generator: PortableUuidV7Generator,
  values: { readonly at?: unknown },
  output?: Uint8Array,
  outputOffset?: number,
): Uint8Array | UuidSlugError {
  return Object.hasOwn(values, AT_OPTION)
    ? drawAt(generator, values.at, output, outputOffset)
    : generator.drawUuidV7Bytes(undefined, output, outputOffset);
}

function drawAt(
  generator: PortableUuidV7Generator,
  at: unknown,
  output?: Uint8Array,
  outputOffset?: number,
): Uint8Array | UuidSlugError {
  const instant = readUuidV7Instant(at);
  return instant instanceof Error
    ? instant
    : generator.drawUuidV7Bytes(instant, output, outputOffset);
}

/** Module-generator bytes at an `at` option value the caller has read but not validated. */
export const uuidV7BytesAt = (at: unknown): Uint8Array | UuidSlugError => drawAt(v7Bytes(), at);

/*
 * Slug and pair writers encode their bytes before returning and draw nothing in between, so they
 * borrow the generator's private text scratch instead of validating a second module buffer as
 * caller output. Text keeps cached generator delegation; replacing it with a direct module
 * formatter has not earned its cost on the primary calls (bench/decisions.md).
 * Keep configured output validation and the generator's reentrancy guard; a borrowed buffer
 * must never escape or survive another draw. Remeasure complete calls when either writer changes
 * (bench/decisions.md), rather than assuming fewer checks improve every runtime.
 */
export const currentUuidV7Scratch = (): Uint8Array | UuidSlugError =>
  v7Text().drawUuidV7Bytes(undefined, keylessTextBytes);
export const uuidV7ScratchAt = (at: unknown): Uint8Array | UuidSlugError =>
  drawAt(v7Text(), at, keylessTextBytes);
// Select without a draw so native hosts avoid portable setup and other hosts keep the original
// public call body. Remeasure defaults and configured calls if this boundary changes.
let generateDefaultUuidV7: ((textCase: UuidTextCase) => string | UuidSlugError) | undefined =
  runtime.uuidV7 ? generateNativeDefaultUuidV7 : undefined;
let generatePortableUuidV7: PortableUuidV7Generator["generateUuidV7"] | undefined;
let generateDefaultUuidV7Bytes: PortableUuidV7Generator["generateUuidV7Bytes"] | undefined;

// Keep fallback lazy and error-valued so both native and portable causes survive a dual failure.
const portableUuidV7Text = (textCase: UuidTextCase): string | UuidSlugError =>
  (generatePortableUuidV7 ??= v7Text().generateUuidV7)(textCase);

// Trust proper native results directly; validation and identity tracking add guarantees beyond
// the default native baseline. Keep exception fallback separate from configured calls, and
// remeasure complete calls when host capabilities change; bench/decisions.md owns evidence.
function generateNativeDefaultUuidV7<Case extends UuidTextCase>(
  selectedCase: Case,
): UuidV7StringFor<Case> | UuidSlugError {
  const native = runtime.uuidV7;
  if (!native) return portableUuidV7Text(selectedCase) as UuidV7StringFor<Case> | UuidSlugError;
  let uuid: string | UuidSlugError;
  try {
    uuid = native();
  } catch (nativeCause) {
    uuid = portableAfterNative(
      nativeCause,
      portableUuidV7Text,
      UUID_TEXT_LOWERCASE,
      UUID_V7_GENERATION,
    );
  }
  // Only the public preset call owns the permitted throw; fallback here retains error values.
  if (typeof uuid !== "string") return uuid;
  return (
    selectedCase === UUID_TEXT_UPPERCASE ? uuid.toUpperCase() : uuid
  ) as UuidV7StringFor<Case>;
}

/*
 * Return types are DECLARED, not inferred, on all four. Inference reads them off the generator, so
 * a widened method there silently widens the package's public surface. A declared type turns that
 * mismatch into a compile error at the one site that is wrong.
 */
/**
 * Generate current-time UUIDv7 text, lowercase by default. Module-level calls do not provide
 * ordering across calls; the runtime's logical timestamp can advance during bursts. Use an
 * explicitly created generator when clock policy or payload layout must be controlled.
 * Native runtime results are trusted without additional output guarantees.
 *
 * @param textCase - Built-in output spelling. Omit for lowercase.
 * @throws `UuidSlugError` with code `rng_unavailable` when generation cannot obtain
 * secure randomness.
 */
export function generateUuidV7<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
  ...textCase: UuidTextCaseArguments<Case>
): UuidV7StringFor<Case>;
/**
 * Generate UUIDv7 text at an explicit time or the current clock reading. Explicit time does not
 * join module-level sequence state.
 *
 * @param options - Time, sequence, and text spelling. Omit `generator` for an independent call.
 */
export function generateUuidV7<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
  options: GenerateUuidV7Options<Case>,
): UuidV7StringFor<Case> | UuidSlugError;
export function generateUuidV7<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
  textCaseOrOptions?: Case | GenerateUuidV7Options<Case>,
): UuidV7StringFor<Case> | UuidSlugError {
  const directCase =
    textCaseOrOptions === undefined
      ? UUID_TEXT_LOWERCASE
      : typeof textCaseOrOptions === "string"
        ? textCaseOrOptions
        : undefined;
  // A spelling preset is the only input on this path, and an unknown one can arrive only from an
  // untyped call, so it stays an error value while a failed draw is thrown.
  if (directCase !== undefined) {
    const selectedCase = resolveUuidTextCase(directCase);
    return selectedCase instanceof Error
      ? selectedCase
      : (generatedOrThrow(
          (generateDefaultUuidV7 ??= v7Text().generateUuidV7)(selectedCase),
        ) as UuidV7StringFor<Case>);
  }
  let values = readGenerationOptions(textCaseOrOptions, UUID_V7_TEXT_OPTIONS, UUID_V7_GENERATION);
  if (values instanceof Error) {
    const wrappedCase = stringInput(textCaseOrOptions);
    if (wrappedCase !== undefined) {
      const selectedCase = resolveUuidTextCase(wrappedCase);
      return selectedCase instanceof Error
        ? selectedCase
        : (generatedOrThrow(
            (generateDefaultUuidV7 ??= v7Text().generateUuidV7)(selectedCase),
          ) as UuidV7StringFor<Case>);
    }
  }
  if (values instanceof Error) return values;
  const textCase = resolveUuidTextCase(values.textCase ?? UUID_TEXT_LOWERCASE);
  if (textCase instanceof Error) return textCase;
  const generator = readUuidV7Generator(values.generator);
  if (generator instanceof Error) return generator;
  // Package sequences already own text scratch. Current-time text can reuse it without allocating
  // bytes; explicit time keeps the validated draw because text delegation would reread its options.
  // Structural generators retain the byte seam. Remeasure if either dispatch contract changes.
  const generateText = generator?.generateUuidV7;
  if (generateText && !Object.hasOwn(values, AT_OPTION))
    return generateText(textCase) as UuidV7StringFor<Case> | UuidSlugError;
  const bytes = generator
    ? generateUuidV7BytesWithGenerator(generator, values, true)
    : drawFromReadOptions(v7Text(), values, keylessTextBytes);
  // The draw already validates bytes and recognizes failures. Inline this union check because
  // another predicate call adds work to structural generators; no second UUID validation is needed.
  if (!ArrayBuffer.isView(bytes)) return bytes;
  let failed = false;
  try {
    failed = (bytes as Uint8Array & { readonly [ERROR_MARKER]?: unknown })[ERROR_MARKER] === true;
  } catch {
    // A valid view with an inaccessible marker cannot be an unmarked native Error.
  }
  return failed
    ? (bytes as Uint8Array & UuidSlugError)
    : (formatUuidBytesUnchecked(bytes, 0, textCase) as UuidV7StringFor<Case>);
}

/**
 * Generate UUIDv7 bytes with platform randomness in a new plain 16-byte `Uint8Array`. Module-level
 * calls do not provide ordering across calls.
 *
 * @throws `UuidSlugError` with code `rng_unavailable` when generation cannot obtain
 * secure randomness.
 */
export function generateUuidV7Bytes(): UuidV7Bytes;
/**
 * Write UUIDv7 bytes into caller-owned storage only after successful generation. Module-level calls
 * do not provide ordering across calls.
 *
 * @param output - Caller-owned array that receives the 16 UUID bytes.
 * @param outputOffset - Zero-based index where writing starts. Omit to start at index 0. Bytes
 * outside the written range stay unchanged.
 */
export function generateUuidV7Bytes<Output extends Uint8Array>(
  output: Output,
  outputOffset?: number,
): UuidOutput<Output> | UuidSlugError;
/** Generate package-owned UUIDv7 bytes at an explicit time or the current clock reading. */
export function generateUuidV7Bytes(
  options: GenerateUuidV7BytesOptions,
): UuidV7Bytes | UuidSlugError;
/** Write UUIDv7 bytes at an explicit time or the current clock reading into caller-owned storage. */
export function generateUuidV7Bytes<Output extends Uint8Array>(
  options: GenerateUuidV7BytesIntoOptions<Output>,
): UuidOutput<Output> | UuidSlugError;
export function generateUuidV7Bytes(
  outOrOptions?:
    | Uint8Array
    | GenerateUuidV7BytesOptions
    | GenerateUuidV7BytesIntoOptions<Uint8Array>,
  offset?: number,
): Uint8Array | UuidSlugError {
  // Only an untyped call reaches an offset without storage; that misuse stays an error value.
  if (outOrOptions === undefined && (offset === undefined || offset === 0))
    return generatedOrThrow(generateSelectedDefaultUuidV7Bytes());
  return uuidV7BytesFor(outOrOptions, offset);
}

/** Current-time bytes from the module generator with failures returned for option-taking callers. */
export const currentUuidV7Bytes = (): UuidV7Bytes | UuidSlugError =>
  (generateDefaultUuidV7Bytes ??= v7Bytes().generateUuidV7Bytes)();

// Independent draws remove unrequested sequence work from owned defaults. Keep JITless on its
// measured generator path; configured calls and immutable values retain their declared layout.
// Remeasure complete calls if entropy, timestamp writing or runtime selection changes;
// bench/decisions.md owns runtime comparisons rather than this selection comment.
const generateSelectedDefaultUuidV7Bytes = runtime.jitless
  ? currentUuidV7Bytes
  : generateDefaultOwnedUuidV7Bytes;

/** Every module-level byte form with failures returned; public seams without fallible input throw. */
export function uuidV7BytesFor(
  outOrOptions?:
    | Uint8Array
    | GenerateUuidV7BytesOptions
    | GenerateUuidV7BytesIntoOptions<Uint8Array>,
  offset?: number,
): Uint8Array | UuidSlugError {
  if (
    outOrOptions !== undefined &&
    outOrOptions !== null &&
    typeof outOrOptions === "object" &&
    !Array.isArray(outOrOptions) &&
    !ArrayBuffer.isView(outOrOptions)
  ) {
    const values = readGenerationOptions(
      outOrOptions,
      UUID_V7_BYTE_OPTIONS,
      "UUIDv7 byte generation",
    );
    if (values instanceof Error) return values;
    const generator = readUuidV7Generator(values.generator);
    if (generator instanceof Error) return generator;
    if (generator) return generateUuidV7BytesWithGenerator(generator, values);
    return drawFromReadOptions(
      v7Bytes(),
      values,
      values.output as Uint8Array | undefined,
      values.outputOffset as number | undefined,
    );
  }
  const generate = (generateDefaultUuidV7Bytes ??= v7Bytes().generateUuidV7Bytes) as (
    outputOrOptions?:
      | Uint8Array
      | GenerateUuidV7BytesOptions
      | GenerateUuidV7BytesIntoOptions<Uint8Array>,
    outputOffset?: number,
  ) => Uint8Array | UuidSlugError;
  return generate(outOrOptions, offset);
}

function generateDefaultOwnedUuidV7Bytes(): UuidV7Bytes | UuidSlugError {
  // The shared boundaries preserve clock and entropy failures. Fill the result directly instead
  // of generating UUIDv4 first, which retains unrelated generation code in packed consumers.
  const clock = readClock(Date.now);
  if (clock instanceof Error) return clock;
  if (typeof clock !== "number" || !(clock >= 0 && clock < 0x1_0000_0000_0000))
    return new UuidSlugError(INVALID_TIMESTAMP, "Clock must fit the UUIDv7 timestamp.");
  const ms = Math.trunc(clock);
  const bytes = new Uint8Array(16);
  const failed = fillRandomBytes(runtime.fillRandom, bytes);
  if (failed) return failed;
  // Fixed stores avoid repeated division while preserving all 48 timestamp bits; 32-bit shifts
  // alone would discard the high word. Version and variant replacement leaves 74 random bits.
  const high = Math.floor(ms / 0x1_0000_0000);
  const low = ms >>> 0;
  bytes[0] = high >>> 8;
  bytes[1] = high;
  bytes[2] = low >>> 24;
  bytes[3] = low >>> 16;
  bytes[4] = low >>> 8;
  bytes[5] = low;
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  return bytes as UuidV7Bytes;
}
