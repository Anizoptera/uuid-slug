// SPDX-License-Identifier: Apache-2.0

import { findUnknownOption, INVALID_OPTIONS, stringInput, UuidSlugError } from "./errors.ts";

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
    if (Array.isArray(options))
      return new UuidSlugError(INVALID_OPTIONS, `${operation} options must be a plain object.`);
    const prototype = Object.getPrototypeOf(options);
    if (prototype !== null && Object.getPrototypeOf(prototype) !== null)
      return new UuidSlugError(INVALID_OPTIONS, `${operation} options must be a plain object.`);
    const unknown = findUnknownOption(options, accepted);
    if (unknown !== undefined)
      return new UuidSlugError(INVALID_OPTIONS, `Unknown ${operation} option: ${unknown}.`);
    const source = options as GenerationOptionValues;
    return {
      ...(accepted.alphabet && Object.hasOwn(source, "alphabet")
        ? { alphabet: stringInput(source.alphabet) ?? source.alphabet }
        : {}),
      ...(accepted.at && Object.hasOwn(source, "at") ? { at: source.at } : {}),
      ...(accepted.generator && Object.hasOwn(source, "generator")
        ? { generator: source.generator }
        : {}),
      ...(accepted.maskingCodec && Object.hasOwn(source, "maskingCodec")
        ? { maskingCodec: source.maskingCodec }
        : {}),
      ...(accepted.output && Object.hasOwn(source, "output") ? { output: source.output } : {}),
      ...(accepted.outputOffset && Object.hasOwn(source, "outputOffset")
        ? { outputOffset: source.outputOffset }
        : {}),
      ...(accepted.textCase && Object.hasOwn(source, "textCase")
        ? { textCase: stringInput(source.textCase) ?? source.textCase }
        : {}),
    };
  } catch (cause) {
    return new UuidSlugError(INVALID_OPTIONS, `Reading ${operation} options failed.`, { cause });
  }
}
