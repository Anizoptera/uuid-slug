// SPDX-License-Identifier: Apache-2.0

import { INVALID_OPTIONS, isUuidSlugError, UuidSlugError } from "./errors.ts";
import { readGenerationOptions } from "./generation-options.ts";
import type { GenerationOptionValues } from "./generation-options.ts";
import type { Uuid, UuidV7MaskingCodec } from "./types.ts";
import { generateUuidV7BytesWithGenerator } from "./v7-generator-input.ts";
import type { ValidatedUuidV7Generator } from "./v7-generator-input.ts";
import { createUuidValue } from "./uuid-value.ts";

export type UuidV7ValueOptionValues = Pick<
  GenerationOptionValues,
  "at" | "generator" | "maskingCodec"
>;

/** Generate through an untrusted structural generator and validate its bytes and payload layout. */
export function generateUuidV7ValueWithGenerator(
  generator: ValidatedUuidV7Generator,
  options: Pick<UuidV7ValueOptionValues, "at">,
  maskingCodec: UuidV7MaskingCodec,
): Uuid<7, true, true> | UuidSlugError;
export function generateUuidV7ValueWithGenerator(
  generator: ValidatedUuidV7Generator,
  options: Pick<UuidV7ValueOptionValues, "at">,
  maskingCodec?: UuidV7MaskingCodec,
): Uuid<7, boolean, true> | UuidSlugError;
export function generateUuidV7ValueWithGenerator(
  generator: ValidatedUuidV7Generator,
  options: Pick<UuidV7ValueOptionValues, "at">,
  maskingCodec?: UuidV7MaskingCodec,
): Uuid<7, boolean, true> | UuidSlugError {
  const generated = generateUuidV7BytesWithGenerator(generator, options);
  if (isUuidSlugError(generated)) return generated;
  return createUuidValue<7, boolean, true>(generated, maskingCodec, generator.payloadLayout);
}

/** Narrow an untrusted masking codec without relying on package-copy identity. */
export function readUuidV7MaskingCodec(
  value: unknown,
): UuidV7MaskingCodec | UuidSlugError | undefined {
  if (value === undefined) return undefined;
  try {
    if (
      value !== null &&
      typeof value === "object" &&
      typeof (value as { readonly uuidToMaskedSlug?: unknown }).uuidToMaskedSlug === "function"
    )
      return value as UuidV7MaskingCodec;
  } catch (cause) {
    return new UuidSlugError(INVALID_OPTIONS, "Reading UUIDv7 masking codec failed.", { cause });
  }
  return new UuidSlugError(INVALID_OPTIONS, "maskingCodec must be a UUIDv7 masking codec.");
}

/** Read untrusted value-generation options once and reject every unsupported key. */
export function readUuidV7ValueOptions(
  options: unknown,
  accepted: Readonly<Partial<Record<keyof UuidV7ValueOptionValues, true>>>,
): UuidV7ValueOptionValues | UuidSlugError {
  if (options === undefined) return {};
  return readGenerationOptions(options, accepted, "UUIDv7 value generation");
}
