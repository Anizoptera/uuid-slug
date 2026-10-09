// SPDX-License-Identifier: Apache-2.0

import { runtime } from "#runtime";
import {
  findUnknownOption,
  INVALID_OPTIONS,
  isPlainRecord,
  isSuccessfulUuidBytes,
  stringInput,
  UuidSlugError,
} from "./errors.ts";
import {
  UUID_V7_ROLLBACK_ERROR,
  UUID_V7_ROLLBACK_PRESERVE,
  UUID_V7_ROLLBACK_RESET,
} from "./types.ts";
import type {
  Uuid,
  UuidRandomFill,
  UuidV7ClockRollbackPolicy,
  UuidV7Generator,
  UuidV7GeneratorValueOptions,
  UuidV7MaskingCodec,
} from "./types.ts";
import { readUuidV7Instant } from "./instant.ts";
import { createUuidValue } from "./uuid-value.ts";
import { createPortableUuidV7Generator } from "./v7.ts";
import { uuidV7GeneratorSlugMethods } from "./v7-slug.ts";
import { stampPackageUuidV7Generator } from "./v7-generator-input.ts";
import { readUuidV7MaskingCodec, readUuidV7ValueOptions } from "./v7-value-options.ts";

/** Configure one UUIDv7 sequence's clock and rollback behavior. */
export interface UuidV7GeneratorOptions {
  /**
   * Return Unix milliseconds. Fractional readings feed `subMillisecondFractionBits`; otherwise
   * they are truncated. Invalid readings and thrown values return `invalid_timestamp`.
   *
   * @defaultValue `Date.now` with no fraction bits; otherwise the runtime high-resolution clock
   * when present, then `Date.now`
   */
  readonly readUnixMs?: () => number;
  /**
   * Whole number from 0 through 12 assigning leading payload bits to the RFC 9562
   * sub-millisecond fraction. The remaining leading payload bits hold the random-start counter.
   * Monotonic continuation can advance the encoded fraction ahead of a stalled or backward clock.
   *
   * @defaultValue `0`
   */
  readonly subMillisecondFractionBits?: number;
  /**
   * Handle a reading below the accepted clock high-water mark. Preserve-order behavior is the
   * default. Reset and error policies preserve small rollbacks through their inclusive tolerance.
   *
   * @defaultValue `{ action: "preserve" }`
   */
  readonly clockRollback?: UuidV7ClockRollbackPolicy;
}

const GENERATOR_OPTIONS = {
  clockRollback: true,
  readUnixMs: true,
  subMillisecondFractionBits: true,
} as const satisfies Record<keyof UuidV7GeneratorOptions, true>;
const INVALID_GENERATOR_OPTIONS = "Generator options must be an object.";
const INVALID_ROLLBACK_POLICY = "Generator clockRollback must be a policy object.";
const UUID_V7_GENERATOR_VALUE_OPTIONS = {
  at: true,
  maskingCodec: true,
} as const satisfies Record<keyof UuidV7GeneratorValueOptions, true>;
const AT_OPTION = "at";

const highResolutionClock = globalThis.performance;
const readHighResolutionUnixMs =
  highResolutionClock === undefined
    ? Date.now
    : () => highResolutionClock.timeOrigin + highResolutionClock.now();

function validatedRollback(
  value: unknown,
):
  | Extract<UuidV7ClockRollbackPolicy, { readonly toleranceMs: number }>
  | UuidSlugError
  | undefined {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== "object")
    return new UuidSlugError(INVALID_OPTIONS, INVALID_ROLLBACK_POLICY);
  try {
    if (Array.isArray(value)) return new UuidSlugError(INVALID_OPTIONS, INVALID_ROLLBACK_POLICY);
    const rawAction = (value as { readonly action?: unknown }).action;
    const action = stringInput(rawAction) ?? rawAction;
    const accepted =
      action === UUID_V7_ROLLBACK_PRESERVE
        ? ({ action: true } as const)
        : ({ action: true, toleranceMs: true } as const);
    const unknown = findUnknownOption(value, accepted);
    if (unknown !== undefined)
      return new UuidSlugError(INVALID_OPTIONS, `Unknown clock rollback option: ${unknown}.`);
    if (action === UUID_V7_ROLLBACK_PRESERVE) return undefined;
    if (action !== UUID_V7_ROLLBACK_RESET && action !== UUID_V7_ROLLBACK_ERROR)
      return new UuidSlugError(INVALID_OPTIONS, "Clock rollback action is not supported.");
    const toleranceMs = (value as { readonly toleranceMs?: unknown }).toleranceMs;
    if (!Number.isSafeInteger(toleranceMs) || (toleranceMs as number) < 0)
      return new UuidSlugError(
        INVALID_OPTIONS,
        "Clock rollback toleranceMs must be a nonnegative whole number.",
      );
    return { action, toleranceMs: toleranceMs as number };
  } catch (cause) {
    return new UuidSlugError(INVALID_OPTIONS, "Reading clock rollback policy failed.", { cause });
  }
}

function buildGenerator(
  options: UuidV7GeneratorOptions,
  fillRandom: (bytes: Uint8Array<ArrayBuffer>) => unknown,
): UuidV7Generator | UuidSlugError {
  if (options === null || typeof options !== "object")
    return new UuidSlugError(INVALID_OPTIONS, INVALID_GENERATOR_OPTIONS);
  let readUnixMs: UuidV7GeneratorOptions["readUnixMs"];
  let clockRollback: unknown;
  let subMillisecondFractionBits: unknown;
  try {
    if (!isPlainRecord(options))
      return new UuidSlugError(INVALID_OPTIONS, INVALID_GENERATOR_OPTIONS);
    const unknown = findUnknownOption(options, GENERATOR_OPTIONS);
    if (unknown !== undefined)
      return new UuidSlugError(INVALID_OPTIONS, `Unknown generator option: ${unknown}.`);
    readUnixMs = options.readUnixMs;
    clockRollback = options.clockRollback;
    subMillisecondFractionBits = options.subMillisecondFractionBits;
  } catch (cause) {
    return new UuidSlugError(INVALID_OPTIONS, "Reading generator options failed.", { cause });
  }
  if (readUnixMs !== undefined && typeof readUnixMs !== "function")
    return new UuidSlugError(INVALID_OPTIONS, "Generator readUnixMs must be a function.");
  if (
    subMillisecondFractionBits !== undefined &&
    (!Number.isInteger(subMillisecondFractionBits) ||
      (subMillisecondFractionBits as number) < 0 ||
      (subMillisecondFractionBits as number) > 12)
  )
    return new UuidSlugError(
      INVALID_OPTIONS,
      "Generator subMillisecondFractionBits must be a whole number from 0 through 12.",
    );
  const rollback = validatedRollback(clockRollback);
  if (rollback instanceof Error) return rollback;
  const fractionBits = (subMillisecondFractionBits as number | undefined) ?? 0;
  const generator = createPortableUuidV7Generator({
    ...(rollback === undefined ? {} : { clockRollback: rollback }),
    readUnixMs: readUnixMs ?? (fractionBits === 0 ? Date.now : readHighResolutionUnixMs),
    subMillisecondFractionBits: fractionBits,
    fillRandom,
  });
  /** One draw for every method on this object: the sequence's own bytes, at `at` or at its clock. */
  const drawSequencedBytes = (values: { readonly at?: unknown }) => {
    if (!Object.hasOwn(values, AT_OPTION)) return generator.drawUuidV7Bytes(undefined);
    const instant = readUuidV7Instant(values.at);
    return instant instanceof Error ? instant : generator.drawUuidV7Bytes(instant);
  };
  // Omission cannot prove a retained codec; the configured overload requires its runtime options.
  function generateUuidV7Value(valueOptions?: undefined): Uuid<7, false, true> | UuidSlugError;
  function generateUuidV7Value<const Options extends UuidV7GeneratorValueOptions>(
    valueOptions: Options,
  ):
    | Uuid<7, Options extends { readonly maskingCodec: UuidV7MaskingCodec } ? true : false, true>
    | UuidSlugError;
  function generateUuidV7Value(
    valueOptions?: UuidV7GeneratorValueOptions,
  ): Uuid<7, boolean, true> | UuidSlugError {
    const values = readUuidV7ValueOptions(valueOptions, UUID_V7_GENERATOR_VALUE_OPTIONS);
    if (values instanceof Error) return values;
    const maskingCodec = readUuidV7MaskingCodec(values.maskingCodec);
    if (maskingCodec instanceof Error) return maskingCodec;
    const generated = drawSequencedBytes(values);
    return isSuccessfulUuidBytes(generated)
      ? createUuidValue<7, boolean, true>(generated, maskingCodec, generator.payloadLayout)
      : generated;
  }
  // Named properties rather than a spread keep the internal draw off the public object.
  const created = stampPackageUuidV7Generator(
    {
      payloadLayout: generator.payloadLayout,
      generateUuidV7: generator.generateUuidV7,
      generateUuidV7Bytes: generator.generateUuidV7Bytes,
      ...uuidV7GeneratorSlugMethods(drawSequencedBytes),
      generateUuidV7Value,
    },
    generator,
  );
  return Object.freeze(created);
}

/**
 * Create a UUIDv7 sequence with its own state, clock policy, and platform randomness.
 * Invalid numeric ranges or clock policies return `UuidSlugError`.
 */
export function createUuidV7Generator(
  options?: UuidV7GeneratorOptions,
): UuidV7Generator | UuidSlugError;
export function createUuidV7Generator(
  options: UuidV7GeneratorOptions = {},
): UuidV7Generator | UuidSlugError {
  return buildGenerator(options, runtime.fillRandom);
}

/**
 * Create a UUIDv7 sequence using the caller's synchronous random-byte source.
 * Invalid numeric ranges or clock policies return `UuidSlugError`.
 */
export function createUuidV7GeneratorWithRandomFill(
  fillRandom: UuidRandomFill,
  options?: UuidV7GeneratorOptions,
): UuidV7Generator | UuidSlugError;
export function createUuidV7GeneratorWithRandomFill(
  fillRandom: UuidRandomFill,
  options: UuidV7GeneratorOptions = {},
): UuidV7Generator | UuidSlugError {
  if (typeof fillRandom !== "function")
    return new UuidSlugError(INVALID_OPTIONS, "Generator fillRandom must be a function.");
  // The generator's draw boundary owns failure recognition and exception containment.
  // Pass the source unchanged so marker-only failures cannot become successful draws.
  return buildGenerator(options, fillRandom);
}
