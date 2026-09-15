// SPDX-License-Identifier: Apache-2.0

/** Keyless operations avoid codec setup. Masking stays on codecs because it requires their key. */
import { runtime } from "#runtime";
import { UuidSlugError } from "./errors.ts";
import { readGenerationOptions } from "./generation-options.ts";
import { UUID_TEXT_LOWERCASE } from "./types.ts";
import type {
  GenerateUuidV7Options,
  GenerateUuidV7BytesIntoOptions,
  GenerateUuidV7BytesOptions,
  UuidTextCase,
  UuidV7Bytes,
  UuidV7StringFor,
} from "./types.ts";
import type { UuidV7PayloadLayout } from "./types.ts";
import { formatUuidBytesUnchecked, invalidUuidTextCase, isUuidTextCase } from "./uuid.ts";
import { createPortableUuidV7Generator } from "./v7.ts";
import type { PortableUuidV7Generator } from "./v7.ts";
import { generateUuidV7BytesWithGenerator, readUuidV7Generator } from "./v7-generator-input.ts";

const UUID_V7_TEXT_OPTIONS = {
  at: true,
  generator: true,
  textCase: true,
} as const satisfies Record<keyof GenerateUuidV7Options, true>;
const AT_OPTION = "at";
const UUID_V7_BYTE_OPTIONS = {
  at: true,
  generator: true,
  output: true,
  outputOffset: true,
} as const satisfies Record<keyof GenerateUuidV7BytesIntoOptions<Uint8Array>, true>;

/**
 * Text and bytes keep independent lazy state so neither output form pays cross-form coordination.
 * Native text plus required validation costs more than direct generation on current hosts;
 * bench/PERFORMANCE.md owns the comparison and remeasurement trigger.
 */
let textGenerator: PortableUuidV7Generator | undefined;
let byteGenerator: PortableUuidV7Generator | undefined;
const v7Text = () =>
  (textGenerator ??= createPortableUuidV7Generator({
    coordinateExplicitInstants: false,
    fillRandom: runtime.fillRandom,
  }));
const v7Bytes = () =>
  (byteGenerator ??= createPortableUuidV7Generator({
    coordinateExplicitInstants: false,
    fillRandom: runtime.fillRandom,
  }));
export const uuidV7DefaultPayloadLayout = (): UuidV7PayloadLayout => v7Bytes().payloadLayout;
let generateDefaultUuidV7: PortableUuidV7Generator["generateUuidV7"] | undefined;
let generateDefaultUuidV7Bytes: PortableUuidV7Generator["generateUuidV7Bytes"] | undefined;

/*
 * Return types are DECLARED, not inferred, on all four. Inference reads them off the generator, so
 * a widened method there silently widens the package's public surface. A declared type turns that
 * mismatch into a compile error at the one site that is wrong.
 */
/**
 * Generate UUIDv7 text for the current clock reading, lowercase by default. Module-level calls do
 * not provide ordering across calls.
 *
 * @param textCase - Built-in output spelling. Omit for lowercase.
 */
export function generateUuidV7<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
  textCase?: Case,
): UuidV7StringFor<Case> | UuidSlugError;
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
  if (textCaseOrOptions === undefined || isUuidTextCase(textCaseOrOptions))
    return (generateDefaultUuidV7 ??= v7Text().generateUuidV7)(textCaseOrOptions);
  const values = readGenerationOptions(
    textCaseOrOptions,
    UUID_V7_TEXT_OPTIONS,
    "UUIDv7 generation",
  );
  if (values instanceof Error) return values;
  const textCase = values.textCase ?? UUID_TEXT_LOWERCASE;
  if (!isUuidTextCase(textCase)) return invalidUuidTextCase();
  const generator = readUuidV7Generator(values.generator);
  if (generator instanceof Error) return generator;
  if (!generator)
    return v7Text().generateUuidV7({
      ...(Object.hasOwn(values, AT_OPTION) ? { at: values.at as never } : {}),
      textCase,
    }) as UuidV7StringFor<Case> | UuidSlugError;
  const bytes = generateUuidV7BytesWithGenerator(generator, values);
  return bytes instanceof Error
    ? bytes
    : (formatUuidBytesUnchecked(bytes, 0, textCase) as UuidV7StringFor<Case>);
}

/**
 * Generate UUIDv7 bytes with platform randomness in a new plain 16-byte `Uint8Array`. Module-level
 * calls do not provide ordering across calls.
 */
export function generateUuidV7Bytes(): UuidV7Bytes | UuidSlugError;
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
): Output | UuidSlugError;
/** Generate package-owned UUIDv7 bytes at an explicit time or the current clock reading. */
export function generateUuidV7Bytes(
  options: GenerateUuidV7BytesOptions,
): UuidV7Bytes | UuidSlugError;
/** Write UUIDv7 bytes at an explicit time or the current clock reading into caller-owned storage. */
export function generateUuidV7Bytes<Output extends Uint8Array>(
  options: GenerateUuidV7BytesIntoOptions<Output>,
): Output | UuidSlugError;
export function generateUuidV7Bytes(
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
    outOrOptions = {
      ...(Object.hasOwn(values, AT_OPTION) ? { at: values.at as never } : {}),
      ...(Object.hasOwn(values, "output") ? { output: values.output as Uint8Array } : {}),
      ...(Object.hasOwn(values, "outputOffset")
        ? { outputOffset: values.outputOffset as number }
        : {}),
    };
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
