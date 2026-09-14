// SPDX-License-Identifier: Apache-2.0

/** Keyless operations avoid codec setup. Masking stays on codecs because it requires their key. */
import { runtime } from "#runtime";
import { findUnknownOption, INVALID_OPTIONS, UuidSlugError } from "./errors.ts";
import type { UuidV7Bytes, UuidV7Generator, UuidV7String } from "./types.ts";
import { createPortableUuidV7Generator, createRuntimeGenerator } from "./v7.ts";

/** Configure one UUIDv7 sequence. Entropy always comes from the package runtime. */
export interface UuidV7GeneratorOptions {
  /**
   * Return Unix milliseconds; finite fractional readings are truncated. Invalid readings and
   * thrown values make that generation call return `invalid_timestamp`.
   *
   * @defaultValue `Date.now`
   */
  readonly clock?: () => number;
}

const GENERATOR_OPTIONS = {
  clock: true,
} as const satisfies Record<keyof UuidV7GeneratorOptions, true>;

/**
 * Create a UUIDv7 sequence with its own state, platform randomness, and optionally a caller-supplied
 * clock. Untyped calls with invalid options return `UuidSlugError`; valid TypeScript calls create
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
  if (options === null || typeof options !== "object" || Array.isArray(options))
    return new UuidSlugError(INVALID_OPTIONS, "Generator options must be an object.");
  let clock: UuidV7GeneratorOptions["clock"];
  try {
    const unknown = findUnknownOption(options, GENERATOR_OPTIONS);
    if (unknown !== undefined)
      return new UuidSlugError(INVALID_OPTIONS, `Unknown generator option: ${unknown}.`);
    clock = options.clock;
  } catch (cause) {
    return new UuidSlugError(INVALID_OPTIONS, "Reading generator options failed.", { cause });
  }
  if (clock !== undefined && typeof clock !== "function")
    return new UuidSlugError(INVALID_OPTIONS, "Generator clock must be a function.");
  return createPortableUuidV7Generator({
    ...(clock === undefined ? {} : { clock }),
    fillRandom: runtime.fillRandom,
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
/** Generate canonical UUIDv7 text for the current clock reading and platform randomness. */
export const generateUuidV7 = (): UuidV7String | UuidSlugError =>
  (generateDefaultUuidV7 ??= v7().generateUuidV7)();

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
 */
export const generateUuidV7At = (unixMs: number): UuidV7String | UuidSlugError =>
  v7().generateUuidV7At(unixMs);

/**
 * Generate UUIDv7 bytes at a whole Unix millisecond in `0..2^48-1` in a new plain 16-byte
 * `Uint8Array`, without changing current-time state.
 *
 * @param unixMs - Whole Unix millisecond encoded into the UUID.
 */
export function generateUuidV7BytesAt(unixMs: number): UuidV7Bytes | UuidSlugError;
/**
 * Write an explicit-time UUIDv7 into caller-owned storage only after successful generation.
 *
 * @param unixMs - Whole Unix millisecond encoded into the UUID.
 * @param output - Caller-owned array that receives the 16 UUID bytes.
 * @param outputOffset - Zero-based index where writing starts. Omit to start at index 0. Bytes
 * outside the written range stay unchanged.
 */
export function generateUuidV7BytesAt<Output extends Uint8Array>(
  unixMs: number,
  output: Output,
  outputOffset?: number,
): Output | UuidSlugError;
export function generateUuidV7BytesAt(
  timestamp: number,
  out?: Uint8Array,
  offset?: number,
): Uint8Array | UuidSlugError {
  const generate = v7().generateUuidV7BytesAt as (
    timestamp: number,
    out?: Uint8Array,
    offset?: number,
  ) => Uint8Array | UuidSlugError;
  return generate(timestamp, out, offset);
}
