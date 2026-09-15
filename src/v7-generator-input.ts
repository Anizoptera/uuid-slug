// SPDX-License-Identifier: Apache-2.0

import {
  checkByteRange,
  INVALID_OPTIONS,
  INVALID_TIMESTAMP,
  INVALID_UUID_VERSION,
  isUuidSlugError,
  UuidSlugError,
} from "./errors.ts";
import type { UuidV7Generator, UuidV7Instant, UuidV7PayloadLayout } from "./types.ts";
import { readUuidV7Instant } from "./instant.ts";
import { readUuidV7PayloadLayout, uuidV7PayloadFromBytesUnchecked } from "./v7-payload.ts";
import { isUuidV7Bytes, uuidTimestampFromBytesUnchecked } from "./uuid.ts";

const AT_OPTION = "at";
const UUID_V7_GENERATOR_REQUIRED = "generator must be a UUIDv7 generator.";

export interface UuidV7GenerationValues {
  readonly at?: unknown;
  readonly output?: unknown;
  readonly outputOffset?: unknown;
}

export interface ValidatedUuidV7Generator {
  readonly generateUuidV7Bytes: UuidV7Generator["generateUuidV7Bytes"];
  readonly payloadLayout: UuidV7PayloadLayout;
}

/** Narrow an untrusted generator without relying on package-copy identity. */
export function readUuidV7Generator(
  value: unknown,
): ValidatedUuidV7Generator | UuidSlugError | undefined {
  if (value === undefined) return undefined;
  try {
    if (value === null || typeof value !== "object")
      return new UuidSlugError(INVALID_OPTIONS, UUID_V7_GENERATOR_REQUIRED);
    const source = value as {
      readonly generateUuidV7Bytes?: unknown;
      readonly payloadLayout?: unknown;
    };
    const generateUuidV7Bytes = source.generateUuidV7Bytes;
    if (typeof generateUuidV7Bytes !== "function")
      return new UuidSlugError(INVALID_OPTIONS, UUID_V7_GENERATOR_REQUIRED);
    const payloadLayout = readUuidV7PayloadLayout(source.payloadLayout);
    if (payloadLayout instanceof Error) return payloadLayout;
    return { generateUuidV7Bytes, payloadLayout } as ValidatedUuidV7Generator;
  } catch (cause) {
    return new UuidSlugError(INVALID_OPTIONS, "Reading UUIDv7 generator failed.", { cause });
  }
}

/** Generate bytes only after validating every option that can fail without advancing sequence state. */
export function generateUuidV7BytesWithGenerator(
  generator: ValidatedUuidV7Generator,
  options: UuidV7GenerationValues,
): Uint8Array | UuidSlugError {
  const hasAt = Object.hasOwn(options, AT_OPTION);
  const requested = hasAt ? readUuidV7Instant(options.at) : undefined;
  if (requested instanceof Error) return requested;
  const hasOutput = Object.hasOwn(options, "output");
  const outputOffset = (options.outputOffset as number | undefined) ?? 0;
  if (hasOutput || Object.hasOwn(options, "outputOffset")) {
    const rangeError = checkByteRange(options.output, outputOffset, 16);
    if (rangeError) return rangeError;
  }
  let generated: unknown;
  try {
    const generateUuidV7Bytes = generator.generateUuidV7Bytes;
    generated = hasAt
      ? generateUuidV7Bytes({ at: options.at as UuidV7Instant })
      : generateUuidV7Bytes();
  } catch (cause) {
    return new UuidSlugError(INVALID_OPTIONS, "UUIDv7 generator failed.", { cause });
  }
  if (isUuidSlugError(generated)) return generated;
  if (!isUuidV7Bytes(generated))
    return new UuidSlugError(
      INVALID_UUID_VERSION,
      "Generator must return exactly 16 RFC-variant UUIDv7 bytes.",
    );
  if (requested) {
    const generatedUnixMs = uuidTimestampFromBytesUnchecked(generated, 0);
    const fractionBits = generator.payloadLayout.subMillisecondFractionBits;
    const requestedFraction = requested.fractionBucket12 >> (12 - fractionBits);
    const generatedFraction = Number(
      uuidV7PayloadFromBytesUnchecked(generated, 0) >> BigInt(74 - fractionBits),
    );
    if (
      generatedUnixMs < requested.unixMs ||
      (generatedUnixMs === requested.unixMs && generatedFraction < requestedFraction)
    )
      return new UuidSlugError(
        INVALID_TIMESTAMP,
        "UUIDv7 generator returned an instant before at; its output must preserve or advance the requested instant.",
      );
  }
  if (!hasOutput) return generated;
  const output = options.output as Uint8Array;
  output.set(generated, outputOffset);
  return output;
}
