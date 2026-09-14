// SPDX-License-Identifier: Apache-2.0

/** Keyless operations avoid codec setup. Masking stays on codecs because it requires their key. */
import { runtime } from "#runtime";
import { findUnknownOption, INVALID_OPTIONS, isError, UuidSlugError } from "./errors.ts";
import {
  UUID_TEXT_LOWERCASE,
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
import { createPortableUuidV7Generator, createRuntimeGenerator } from "./v7.ts";

/** Configure one UUIDv7 sequence's clock and rollback behavior. */
export interface UuidV7GeneratorOptions {
  /**
   * Return Unix milliseconds; finite fractional readings are truncated. Invalid readings and
   * thrown values make that generation call return `invalid_timestamp`.
   *
   * @defaultValue `Date.now`
   */
  readonly readUnixMs?: () => number;
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
} as const satisfies Record<keyof UuidV7GeneratorOptions, true>;
const INVALID_GENERATOR_OPTIONS = "Generator options must be an object.";
const INVALID_ROLLBACK_POLICY = "Generator clockRollback must be a policy object.";

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
  try {
    if (Array.isArray(options))
      return new UuidSlugError(INVALID_OPTIONS, INVALID_GENERATOR_OPTIONS);
    const unknown = findUnknownOption(options, GENERATOR_OPTIONS);
    if (unknown !== undefined)
      return new UuidSlugError(INVALID_OPTIONS, `Unknown generator option: ${unknown}.`);
    readUnixMs = options.readUnixMs;
    clockRollback = options.clockRollback;
  } catch (cause) {
    return new UuidSlugError(INVALID_OPTIONS, "Reading generator options failed.", { cause });
  }
  if (readUnixMs !== undefined && typeof readUnixMs !== "function")
    return new UuidSlugError(INVALID_OPTIONS, "Generator readUnixMs must be a function.");
  const rollback = validatedRollback(clockRollback);
  if (rollback instanceof Error) return rollback;
  return createPortableUuidV7Generator({
    ...(rollback === undefined ? {} : { clockRollback: rollback }),
    ...(readUnixMs === undefined ? {} : { readUnixMs }),
    fillRandom,
  });
}

/**
 * Create a UUIDv7 sequence with its own state, platform randomness, and optionally a caller-supplied
 * readUnixMs. Untyped calls with invalid options return `UuidSlugError`; valid TypeScript calls create
 * the generator directly. Clock and entropy failures are returned by generator methods.
 *
 * @param options - Clock used by this sequence. Omit to read `Date.now`; the sequence state is
 * still separate from the module-level generator.
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
 * @param options - Clock and rollback behavior for this sequence.
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
    return result === undefined || isError(result)
      ? result
      : new TypeError("Generator fillRandom must return undefined or UuidSlugError.");
  });
}

/** Delay generator setup so conversion-only imports draw no entropy and bundle no generator. */
let generator: UuidV7Generator | undefined;
const v7 = () => (generator ??= createRuntimeGenerator(runtime));
let generateDefaultUuidV7: UuidV7Generator["generateUuidV7"] | undefined;

/*
 * Return types are DECLARED, not inferred, on all four. Inference reads them off the generator, so
 * a widened method there silently widens the package's public surface. A declared type turns that
 * mismatch into a compile error at the one site that is wrong.
 */
/**
 * Generate UUIDv7 text for the current readUnixMs reading, lowercase by default.
 *
 * @param textCase - Built-in output spelling. Omit for lowercase.
 */
export const generateUuidV7 = <Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
  textCase?: Case,
): UuidV7StringFor<Case> | UuidSlugError =>
  (generateDefaultUuidV7 ??= v7().generateUuidV7)(textCase);

/**
 * Generate UUIDv7 bytes with platform randomness in a new plain 16-byte `Uint8Array`.
 */
export function generateUuidV7Bytes(): UuidV7Bytes | UuidSlugError;
/**
 * Write UUIDv7 bytes into caller-owned storage only after successful generation.
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
  const generate = v7().generateUuidV7Bytes as (
    out?: Uint8Array,
    offset?: number,
  ) => Uint8Array | UuidSlugError;
  return generate(out, offset);
}

/**
 * Generate UUIDv7 text at a whole Unix millisecond in `0..2^48-1`. This does not change the
 * current-time sequence, and it does not promise ordering within one millisecond.
 *
 * @param unixMs - Whole Unix millisecond encoded into the UUID.
 * @param textCase - Built-in output spelling. Omit for lowercase.
 */
export const generateUuidV7AtUnixMs = <Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
  unixMs: number,
  textCase?: Case,
): UuidV7StringFor<Case> | UuidSlugError => v7().generateUuidV7AtUnixMs(unixMs, textCase);

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
  const generate = v7().generateUuidV7BytesAtUnixMs as (
    timestamp: number,
    out?: Uint8Array,
    offset?: number,
  ) => Uint8Array | UuidSlugError;
  return generate(timestamp, out, offset);
}
