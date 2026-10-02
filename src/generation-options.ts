// SPDX-License-Identifier: Apache-2.0

import { findUnknownOption, INVALID_OPTIONS, isPlainRecord, UuidSlugError } from "./errors.ts";

export interface GenerationOptionValues {
  readonly alphabet?: unknown;
  readonly at?: unknown;
  readonly generator?: unknown;
  readonly maskingCodec?: unknown;
  readonly output?: unknown;
  readonly outputOffset?: unknown;
  readonly textCase?: unknown;
}

/** Read selected generation options once and reject every unsupported key. */
export function readGenerationOptions(
  options: unknown,
  accepted: Readonly<Partial<Record<keyof GenerationOptionValues, true>>>,
  operation: string,
): GenerationOptionValues | UuidSlugError {
  if (options === null || typeof options !== "object")
    return new UuidSlugError(INVALID_OPTIONS, `${operation} options must be a plain object.`);
  try {
    if (!isPlainRecord(options))
      return new UuidSlugError(INVALID_OPTIONS, `${operation} options must be a plain object.`);
    const unknown = findUnknownOption(options, accepted);
    if (unknown !== undefined)
      return new UuidSlugError(INVALID_OPTIONS, `Unknown ${operation} option: ${unknown}.`);
    const source = options as GenerationOptionValues;
    // Direct assignments build one object; a conditional spread per option allocated a temporary
    // object for each (bench/PERFORMANCE.md). Each accepted own property is read once, in this
    // order. Callers resolve `alphabet` and `textCase`, which also unwraps `String` objects.
    const values: { -readonly [Key in keyof GenerationOptionValues]: unknown } = {};
    if (accepted.alphabet && Object.hasOwn(source, "alphabet")) values.alphabet = source.alphabet;
    if (accepted.at && Object.hasOwn(source, "at")) values.at = source.at;
    if (accepted.generator && Object.hasOwn(source, "generator"))
      values.generator = source.generator;
    if (accepted.maskingCodec && Object.hasOwn(source, "maskingCodec"))
      values.maskingCodec = source.maskingCodec;
    if (accepted.output && Object.hasOwn(source, "output")) values.output = source.output;
    if (accepted.outputOffset && Object.hasOwn(source, "outputOffset"))
      values.outputOffset = source.outputOffset;
    if (accepted.textCase && Object.hasOwn(source, "textCase")) values.textCase = source.textCase;
    return values;
  } catch (cause) {
    return new UuidSlugError(INVALID_OPTIONS, `Reading ${operation} options failed.`, { cause });
  }
}
