// SPDX-License-Identifier: Apache-2.0

import type { Uuid, UuidV7MaskingCodec, UuidV7ValueOptions } from "./types.ts";
import { UuidSlugError } from "./errors.ts";
import { createUuidValue } from "./uuid-value.ts";
import {
  generateUuidV7Bytes,
  generateUuidV7BytesAtUnixMs,
  uuidV7DefaultPayloadLayout,
} from "./v7-keyless.ts";
import {
  generateUuidV7ValueWithGenerator,
  readUuidV7Generator,
  readUuidV7MaskingCodec,
  readUuidV7ValueOptions,
} from "./v7-value-options.ts";

/** Generate an immutable UUIDv7 with optional time, generator, and retained masking codec. */
export function generateUuidV7Value<const Options extends UuidV7ValueOptions = {}>(
  options?: Options,
):
  | Uuid<7, Options extends { readonly maskingCodec: UuidV7MaskingCodec } ? true : false, true>
  | UuidSlugError;
export function generateUuidV7Value(
  options?: UuidV7ValueOptions,
): Uuid<7, boolean, true> | UuidSlugError {
  const values = readUuidV7ValueOptions(options, {
    generator: true,
    maskingCodec: true,
    unixMs: true,
  });
  if (values instanceof Error) return values;
  const generator = readUuidV7Generator(values.generator);
  if (generator instanceof Error) return generator;
  const maskingCodec = readUuidV7MaskingCodec(values.maskingCodec);
  if (maskingCodec instanceof Error) return maskingCodec;
  if (generator) return generateUuidV7ValueWithGenerator(generator, values.unixMs, maskingCodec);
  const generated =
    values.unixMs === undefined
      ? generateUuidV7Bytes()
      : generateUuidV7BytesAtUnixMs(values.unixMs as number);
  return generated instanceof Error
    ? generated
    : createUuidValue<7, boolean, true>(generated, maskingCodec, uuidV7DefaultPayloadLayout());
}
