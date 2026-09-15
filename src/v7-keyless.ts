// SPDX-License-Identifier: Apache-2.0

/** Keyless operations avoid codec setup. Masking stays on codecs because it requires their key. */
import { runtime } from "#runtime";
import { UuidSlugError } from "./errors.ts";
import { UUID_TEXT_LOWERCASE } from "./types.ts";
import type { UuidTextCase, UuidV7Bytes, UuidV7StringFor } from "./types.ts";
import type { UuidV7PayloadLayout } from "./types.ts";
import { createPortableUuidV7Generator } from "./v7.ts";
import type { PortableUuidV7Generator } from "./v7.ts";

/**
 * Text and bytes keep independent lazy state so neither output form pays cross-form coordination.
 * Native text plus required validation costs more than direct generation on current hosts;
 * bench/PERFORMANCE.md owns the comparison and remeasurement trigger.
 */
let textGenerator: PortableUuidV7Generator | undefined;
let byteGenerator: PortableUuidV7Generator | undefined;
const v7Text = () =>
  (textGenerator ??= createPortableUuidV7Generator({ fillRandom: runtime.fillRandom }));
const v7Bytes = () =>
  (byteGenerator ??= createPortableUuidV7Generator({ fillRandom: runtime.fillRandom }));
export const uuidV7DefaultPayloadLayout = (): UuidV7PayloadLayout => v7Bytes().payloadLayout;
let generateDefaultUuidV7: PortableUuidV7Generator["generateUuidV7"] | undefined;
let generateDefaultUuidV7Bytes: PortableUuidV7Generator["generateUuidV7Bytes"] | undefined;

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
  textCase?: Case,
): UuidV7StringFor<Case> | UuidSlugError =>
  (generateDefaultUuidV7 ??= v7Text().generateUuidV7)(textCase);

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
