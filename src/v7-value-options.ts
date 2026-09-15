// SPDX-License-Identifier: Apache-2.0

import {
  findUnknownOption,
  INVALID_OPTIONS,
  INVALID_UUID_VERSION,
  isUuidSlugError,
  UuidSlugError,
} from "./errors.ts";
import type { Uuid, UuidV7Generator, UuidV7MaskingCodec, UuidV7PayloadLayout } from "./types.ts";
import { extractUuidV7Payload } from "./slug.ts";
import { createUuidValue } from "./uuid-value.ts";
import { isUuidV7Bytes } from "./uuid.ts";

export interface UuidV7ValueOptionValues {
  readonly generator?: unknown;
  readonly maskingCodec?: unknown;
  readonly unixMs?: unknown;
}

type UuidV7ValueGenerator = Pick<
  UuidV7Generator,
  "generateUuidV7Bytes" | "generateUuidV7BytesAtUnixMs" | "payloadLayout"
>;

/** Narrow an untrusted generator without relying on package-copy identity. */
export function readUuidV7Generator(value: unknown): UuidV7Generator | UuidSlugError | undefined {
  if (value === undefined) return undefined;
  try {
    if (
      value !== null &&
      typeof value === "object" &&
      typeof (value as { readonly generateUuidV7Bytes?: unknown }).generateUuidV7Bytes ===
        "function" &&
      typeof (value as { readonly generateUuidV7BytesAtUnixMs?: unknown })
        .generateUuidV7BytesAtUnixMs === "function"
    )
      return value as UuidV7Generator;
  } catch (cause) {
    return new UuidSlugError(INVALID_OPTIONS, "Reading UUIDv7 generator failed.", { cause });
  }
  return new UuidSlugError(INVALID_OPTIONS, "generator must be a UUIDv7 generator.");
}

/** Generate through an untrusted structural generator and validate its bytes and payload layout. */
export function generateUuidV7ValueWithGenerator(
  generator: UuidV7ValueGenerator,
  unixMs: unknown,
  maskingCodec?: UuidV7MaskingCodec,
): Uuid<7, boolean, true> | UuidSlugError {
  let generated: unknown;
  let payloadLayout: unknown;
  try {
    generated =
      unixMs === undefined
        ? generator.generateUuidV7Bytes()
        : generator.generateUuidV7BytesAtUnixMs(unixMs as number);
    payloadLayout = generator.payloadLayout;
  } catch (cause) {
    return new UuidSlugError(INVALID_OPTIONS, "UUIDv7 generator failed.", { cause });
  }
  if (isUuidSlugError(generated)) return generated;
  if (!isUuidV7Bytes(generated))
    return new UuidSlugError(
      INVALID_UUID_VERSION,
      "Generator must return exactly 16 RFC-variant UUIDv7 bytes.",
    );
  const layout = payloadLayout as UuidV7PayloadLayout;
  const payload = extractUuidV7Payload(generated, layout);
  if (payload instanceof Error) return payload;
  return createUuidValue<7, boolean, true>(generated, maskingCodec, layout);
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
  if (options === null || typeof options !== "object" || Array.isArray(options))
    return new UuidSlugError(INVALID_OPTIONS, "UUIDv7 value options must be an object.");
  try {
    const unknown = findUnknownOption(options, accepted);
    if (unknown !== undefined)
      return new UuidSlugError(INVALID_OPTIONS, `Unknown UUIDv7 value option: ${unknown}.`);
    const source = options as UuidV7ValueOptionValues;
    return {
      ...(accepted.generator ? { generator: source.generator } : {}),
      ...(accepted.maskingCodec ? { maskingCodec: source.maskingCodec } : {}),
      ...(accepted.unixMs ? { unixMs: source.unixMs } : {}),
    };
  } catch (cause) {
    return new UuidSlugError(INVALID_OPTIONS, "Reading UUIDv7 value options failed.", { cause });
  }
}
