// SPDX-License-Identifier: Apache-2.0

import type { Uuid, UuidV7MaskingCodec, UuidV7ValueOptions } from "./types.ts";
import { UuidSlugError } from "./errors.ts";
import { createUuidValue } from "./uuid-value.ts";
import { currentUuidV7Bytes, uuidV7BytesAt, uuidV7DefaultPayloadLayout } from "./v7-keyless.ts";
import {
  generateUuidV7ValueWithGenerator,
  readUuidV7MaskingCodec,
  readUuidV7ValueOptions,
} from "./v7-value-options.ts";
import { readUuidV7Generator } from "./v7-generator-input.ts";

const UUID_V7_VALUE_OPTIONS = {
  at: true,
  generator: true,
  maskingCodec: true,
} as const satisfies Record<keyof UuidV7ValueOptions, true>;

/**
 * Generate an immutable UUIDv7 for the current clock reading with the module payload layout.
 *
 * @throws `UuidSlugError` with code `rng_unavailable` when generation cannot obtain
 * secure randomness.
 */
export function generateUuidV7Value(options?: undefined): Uuid<7, false, true>;
/**
 * Generate an immutable UUIDv7 with optional time, generator, and retained masking codec.
 * Only a supplied codec is retained; an undefined options branch uses default generation.
 * @throws `UuidSlugError` with code `rng_unavailable` if options are undefined and secure randomness is unavailable.
 */
export function generateUuidV7Value<const Options extends UuidV7ValueOptions | undefined = {}>(
  options: Options,
):
  | Uuid<7, Options extends { readonly maskingCodec: UuidV7MaskingCodec } ? true : false, true>
  | UuidSlugError;
export function generateUuidV7Value(
  options?: UuidV7ValueOptions,
): Uuid<7, boolean, true> | UuidSlugError {
  const values = readUuidV7ValueOptions(options, UUID_V7_VALUE_OPTIONS);
  if (values instanceof Error) return values;
  const generator = readUuidV7Generator(values.generator);
  if (generator instanceof Error) return generator;
  const maskingCodec = readUuidV7MaskingCodec(values.maskingCodec);
  if (maskingCodec instanceof Error) return maskingCodec;
  if (generator) return generateUuidV7ValueWithGenerator(generator, values, maskingCodec);
  const generated = !Object.hasOwn(values, "at") ? currentUuidV7Bytes() : uuidV7BytesAt(values.at);
  if (generated instanceof Error) {
    // Without options nothing the caller supplied can fail, so a failed draw is thrown.
    if (options === undefined) throw generated;
    return generated;
  }
  return createUuidValue<7, boolean, true>(generated, maskingCodec, uuidV7DefaultPayloadLayout());
}
