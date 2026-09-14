// SPDX-License-Identifier: Apache-2.0

/** Keyless operations avoid codec setup. Masking stays on codecs because it requires their key. */
import { runtime } from "#runtime";
import {
  failedFallback,
  findUnknownOption,
  INVALID_OPTIONS,
  isError,
  nativeOrFallback,
  UuidSlugError,
} from "./errors.ts";
import {
  UUID_TEXT_LOWERCASE,
  UUID_TEXT_UPPERCASE,
  UUID_V7_ROLLBACK_ERROR,
  UUID_V7_ROLLBACK_PRESERVE,
  UUID_V7_ROLLBACK_RESET,
} from "./types.ts";
import type {
  UuidRandomFill,
  UuidTextCase,
  UuidV7Bytes,
  UuidV7ClockRollbackPolicy,
  UuidV7Generator,
  UuidV7StringFor,
} from "./types.ts";
import { createPortableUuidV7Generator } from "./v7.ts";
import { invalidUuidTextCase, isUuidTextCase, isUuidV7String } from "./uuid.ts";

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
    const action = (value as { readonly action?: unknown }).action;
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
    if (Array.isArray(options))
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
  return createPortableUuidV7Generator({
    ...(rollback === undefined ? {} : { clockRollback: rollback }),
    readUnixMs: readUnixMs ?? (fractionBits === 0 ? Date.now : readHighResolutionUnixMs),
    subMillisecondFractionBits: fractionBits,
    fillRandom,
  });
}

/**
 * Create a UUIDv7 sequence with its own state, platform randomness, and optionally a caller-supplied
 * readUnixMs. Successful current-time calls strictly increase in UUID byte order under the default
 * preserve rollback policy. Untyped calls with invalid options return `UuidSlugError`; valid
 * TypeScript calls create the generator directly. Clock and entropy failures are returned by methods.
 *
 * @param options - Clock and payload layout used by this sequence. Omit to read `Date.now` with no
 * fraction field; a selected fraction field uses the runtime's high-resolution clock when present.
 * @returns An independent generator.
 */
export function createUuidV7Generator(options?: UuidV7GeneratorOptions): UuidV7Generator;
export function createUuidV7Generator(
  options: UuidV7GeneratorOptions = {},
): UuidV7Generator | UuidSlugError {
  return buildGenerator(options, runtime.fillRandom);
}

/**
 * Create an independent UUIDv7 sequence that uses the caller's synchronous random-byte source.
 * The callback must fill every requested byte. Returned or thrown errors become generation
 * failures; the package cannot detect a successful partial or weak fill.
 *
 * @param fillRandom - Fill the complete array from the caller's chosen source.
 * @param options - Clock, payload layout, and rollback behavior for this sequence.
 */
export function createUuidV7GeneratorWithRandomFill(
  fillRandom: UuidRandomFill,
  options?: UuidV7GeneratorOptions,
): UuidV7Generator;
export function createUuidV7GeneratorWithRandomFill(
  fillRandom: UuidRandomFill,
  options: UuidV7GeneratorOptions = {},
): UuidV7Generator | UuidSlugError {
  if (typeof fillRandom !== "function")
    return new UuidSlugError(INVALID_OPTIONS, "Generator fillRandom must be a function.");
  return buildGenerator(options, (bytes) => {
    const result = fillRandom(bytes);
    return result === undefined || isError(result) ? result : undefined;
  });
}

/**
 * Text uses a validated native primitive when present; bytes keep lazy portable state because
 * parsing native text costs more than direct generation. The forms deliberately do not coordinate.
 * bench/PERFORMANCE.md owns the comparison; remeasure when either host primitive changes.
 */
let textGenerator: UuidV7Generator | undefined;
let byteGenerator: UuidV7Generator | undefined;
const v7Text = () =>
  (textGenerator ??= createPortableUuidV7Generator({ fillRandom: runtime.fillRandom }));
const v7Bytes = () =>
  (byteGenerator ??= createPortableUuidV7Generator({ fillRandom: runtime.fillRandom }));
let generateDefaultUuidV7: UuidV7Generator["generateUuidV7"] | undefined;
let generateDefaultUuidV7Bytes: UuidV7Generator["generateUuidV7Bytes"] | undefined;
let trustedNativeUuidV7: (() => string) | undefined;

const portableUuidV7 = <Case extends UuidTextCase>(
  textCase: Case,
): UuidV7StringFor<Case> | UuidSlugError =>
  (generateDefaultUuidV7 ??= v7Text().generateUuidV7)(textCase);

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
export const generateUuidV7 = <Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
  textCase: Case = UUID_TEXT_LOWERCASE as Case,
): UuidV7StringFor<Case> | UuidSlugError => {
  if (!isUuidTextCase(textCase)) return invalidUuidTextCase();
  const native = runtime.uuidV7;
  if (!native) return portableUuidV7(textCase);
  if (native !== trustedNativeUuidV7) {
    const result = nativeOrFallback(
      native,
      isUuidV7String,
      (value) =>
        (textCase === UUID_TEXT_UPPERCASE ? value.toUpperCase() : value) as UuidV7StringFor<Case>,
      () => portableUuidV7(textCase),
      "UUIDv7 generation",
    );
    if (!(result instanceof Error)) trustedNativeUuidV7 = native;
    return result;
  }
  try {
    const uuid = native();
    return (textCase === UUID_TEXT_UPPERCASE ? uuid.toUpperCase() : uuid) as UuidV7StringFor<Case>;
  } catch (nativeCause) {
    const fallback = portableUuidV7(textCase);
    return fallback instanceof Error
      ? failedFallback(nativeCause, fallback, "Native and portable UUIDv7 generation failed.")
      : fallback;
  }
};

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
export function generateUuidV7Bytes(out?: Uint8Array, offset?: number): Uint8Array | UuidSlugError {
  const generate = (generateDefaultUuidV7Bytes ??= v7Bytes().generateUuidV7Bytes) as (
    out?: Uint8Array,
    offset?: number,
  ) => Uint8Array | UuidSlugError;
  return generate(out, offset);
}

/**
 * Generate UUIDv7 text at a whole Unix millisecond in `0..2^48-1` without sequence state.
 *
 * @param unixMs - Whole Unix millisecond encoded into the UUID.
 * @param textCase - Built-in output spelling. Omit for lowercase.
 */
export const generateUuidV7AtUnixMs = <Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
  unixMs: number,
  textCase?: Case,
): UuidV7StringFor<Case> | UuidSlugError => v7Text().generateUuidV7AtUnixMs(unixMs, textCase);

/**
 * Generate UUIDv7 bytes at a whole Unix millisecond in `0..2^48-1` in a new plain 16-byte
 * `Uint8Array`, without changing current-time state.
 *
 * @param unixMs - Whole Unix millisecond encoded into the UUID.
 */
export function generateUuidV7BytesAtUnixMs(unixMs: number): UuidV7Bytes | UuidSlugError;
/**
 * Write an explicit-time UUIDv7 into caller-owned storage only after successful generation.
 *
 * @param unixMs - Whole Unix millisecond encoded into the UUID.
 * @param output - Caller-owned array that receives the 16 UUID bytes.
 * @param outputOffset - Zero-based index where writing starts. Omit to start at index 0. Bytes
 * outside the written range stay unchanged.
 */
export function generateUuidV7BytesAtUnixMs<Output extends Uint8Array>(
  unixMs: number,
  output: Output,
  outputOffset?: number,
): Output | UuidSlugError;
export function generateUuidV7BytesAtUnixMs(
  timestamp: number,
  out?: Uint8Array,
  offset?: number,
): Uint8Array | UuidSlugError {
  const generate = v7Bytes().generateUuidV7BytesAtUnixMs as (
    timestamp: number,
    out?: Uint8Array,
    offset?: number,
  ) => Uint8Array | UuidSlugError;
  return generate(timestamp, out, offset);
}
