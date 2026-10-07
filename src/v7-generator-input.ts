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
import type { PortableUuidV7Generator } from "./v7.ts";
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
  // Only the private package sequence supplies text: structural generators retain byte validation.
  readonly generateUuidV7?: PortableUuidV7Generator["generateUuidV7"];
  /** Present only on package generators, whose bytes need no validation or defensive copy. */
  readonly drawUuidV7Bytes?: PortableUuidV7Generator["drawUuidV7Bytes"];
}

/** Return its argument so a subclass can add private fields to an existing object. */
// eslint-disable-next-line typescript/no-extraneous-class -- only a class constructor can hand `super` an existing object
class ReturnObject {
  constructor(value: object) {
    return value;
  }
}

/**
 * Stamps the sequence onto a public generator this package copy created. That object is frozen and
 * its layout was validated when it was built, so reading it again proves nothing, and its sequence
 * writes fresh or caller-owned bytes that nothing else retains. A lookalike, a proxy, or a generator
 * from another package copy has no stamp and takes the structural read.
 *
 * Structural validation allocated a validated object and rescanned the layout keys on every call
 * that passed `generator`, and the untrusted-generator call then needed a scratch buffer, byte
 * validation, an `at` check, and a copy (bench/PERFORMANCE.md). The stamp adds a private field
 * instead of a class prototype, so the public object stays plain. A module `WeakMap` is the rejected
 * alternative: registration made default generator creation 1.6 times slower. Remeasure if engines
 * change how they store private fields or weak collections.
 */
class PackageUuidV7Generator extends ReturnObject {
  readonly #sequence: PortableUuidV7Generator;

  constructor(generator: object, sequence: PortableUuidV7Generator) {
    super(generator);
    this.#sequence = sequence;
  }

  static sequenceOf(value: unknown): PortableUuidV7Generator | undefined {
    return typeof value === "object" && value !== null && #sequence in value
      ? value.#sequence
      : undefined;
  }
}

/** Stamp a not-yet-frozen public generator with the sequence behind its methods, and return it. */
export function stampPackageUuidV7Generator<Generator extends object>(
  generator: Generator,
  sequence: PortableUuidV7Generator,
): Generator {
  return new PackageUuidV7Generator(generator, sequence) as object as Generator;
}

/** Narrow an untrusted generator without relying on package-copy identity. */
export function readUuidV7Generator(
  value: unknown,
): ValidatedUuidV7Generator | UuidSlugError | undefined {
  if (value === undefined) return undefined;
  const packaged = PackageUuidV7Generator.sequenceOf(value);
  if (packaged) return packaged;
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

/**
 * Generate bytes only after validating every option that can fail without advancing sequence state.
 *
 * The generator receives the result buffer and may keep a reference to it, so a result the caller
 * keeps is a copy. Pass `borrowed` only when the package consumes the bytes before returning and
 * never returns them: text, slug, and masked-slug writers skip that copy (bench/PERFORMANCE.md).
 */
export function generateUuidV7BytesWithGenerator(
  generator: ValidatedUuidV7Generator,
  options: UuidV7GenerationValues,
  borrowed = false,
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
  const drawUuidV7Bytes = generator.drawUuidV7Bytes;
  if (drawUuidV7Bytes)
    return drawUuidV7Bytes(
      requested,
      hasOutput ? (options.output as Uint8Array) : undefined,
      outputOffset,
    );
  let generated: unknown;
  const generatedOutput = new Uint8Array(16);
  try {
    const generateUuidV7Bytes = generator.generateUuidV7Bytes;
    generated = hasAt
      ? generateUuidV7Bytes({ at: options.at as UuidV7Instant, output: generatedOutput })
      : generateUuidV7Bytes(generatedOutput);
  } catch (cause) {
    return new UuidSlugError(INVALID_OPTIONS, "UUIDv7 generator failed.", { cause });
  }
  if (isUuidSlugError(generated)) return generated;
  if (!isUuidV7Bytes(generated))
    return new UuidSlugError(
      INVALID_UUID_VERSION,
      "Generator must return exactly 16 RFC-variant UUIDv7 bytes.",
    );
  if (generated !== generatedOutput) generatedOutput.set(generated);
  if (requested) {
    const generatedUnixMs = uuidTimestampFromBytesUnchecked(generatedOutput, 0);
    const fractionBits = generator.payloadLayout.subMillisecondFractionBits;
    const requestedFraction = requested.fractionBucket12 >> (12 - fractionBits);
    const generatedFraction = Number(
      uuidV7PayloadFromBytesUnchecked(generatedOutput, 0) >> BigInt(74 - fractionBits),
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
  if (!hasOutput) return borrowed ? generatedOutput : new Uint8Array(generatedOutput);
  const output = options.output as Uint8Array;
  output.set(generatedOutput, outputOffset);
  return output;
}
