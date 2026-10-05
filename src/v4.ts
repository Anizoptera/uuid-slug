// SPDX-License-Identifier: Apache-2.0

import { runtime } from "#runtime";
import {
  checkByteRange,
  checkRange,
  fillRandomBytes,
  generatedOrThrow,
  INVALID_OPTIONS,
  isError,
  RNG_UNAVAILABLE,
  portableAfterNative,
  UuidSlugError,
} from "./errors.ts";
import { UUID_TEXT_LOWERCASE, UUID_TEXT_UPPERCASE } from "./types.ts";
import type { UuidRandomFill, UuidTextCase, UuidV4Bytes, UuidV4StringFor } from "./types.ts";
import {
  bytesToUuidString,
  formatUuidBytesUnchecked,
  isUuidTextCase,
  resolveUuidTextCase,
} from "./uuid.ts";

export { isUuidSlugError } from "./errors.ts";
export { UuidSlugError };
export type { UuidSlugErrorCode } from "./errors.ts";
export type { UuidV4Bytes, UuidV4String } from "./types.ts";
export { isUuidV4Bytes, isUuidV4String, isUuidV4Text } from "./uuid.ts";

const UUID_V4_GENERATION = "UUIDv4 generation";
const REENTRANT_GENERATION_MESSAGE =
  "UUIDv4 generation cannot be reentered from its entropy source.";

/**
 * Randomness is drawn into private storage before copying to caller storage. Web Crypto rejects
 * SharedArrayBuffer views, so the runtime cannot safely fill an arbitrary caller buffer directly.
 */
const random = new Uint8Array(16);
let generating = false;

/**
 * Generate UUIDv4 bytes with platform randomness in a new plain 16-byte `Uint8Array`.
 *
 * @throws `UuidSlugError` with code `rng_unavailable` when the runtime has no secure random
 * source. No supported runtime lacks one, so this is not expected during normal operation.
 */
export function generateUuidV4Bytes(): UuidV4Bytes;
/**
 * Write UUIDv4 bytes into caller-owned storage only after successful generation.
 *
 * @param output - Caller-owned array that receives the 16 UUID bytes.
 * @param outputOffset - Zero-based index where writing starts. Omit to start at index 0. Bytes
 * outside the written range stay unchanged.
 */
export function generateUuidV4Bytes<Output extends Uint8Array>(
  output: Output,
  outputOffset?: number,
): Output | UuidSlugError;
export function generateUuidV4Bytes(
  output?: Uint8Array,
  outputOffset = 0,
): Uint8Array | UuidSlugError {
  if (output === undefined) {
    // Only an untyped call reaches an offset without storage; that misuse stays an error value.
    const badRange = outputOffset === 0 ? undefined : checkRange(16, outputOffset, 16);
    if (badRange) return badRange;
    return generatedOrThrow(generateOwnedUuidV4Bytes());
  }
  if (generating) return new UuidSlugError(RNG_UNAVAILABLE, REENTRANT_GENERATION_MESSAGE);
  const badRange = checkByteRange(output, outputOffset, 16);
  if (badRange) return badRange;
  generating = true;
  try {
    const failed = fillRandomBytes(runtime.fillRandom, random);
    if (failed) return failed;
    output.set(random, outputOffset);
    output[outputOffset + 6] = ((output[outputOffset + 6] ?? 0) & 0x0f) | 0x40;
    output[outputOffset + 8] = ((output[outputOffset + 8] ?? 0) & 0x3f) | 0x80;
    return output;
  } finally {
    generating = false;
  }
}

// Keep owned output separate so it can draw directly into its result without adding a post-draw
// ownership branch to caller-buffer writes. Merge the paths if either primary runtime loses this win.
// Failures are returned so slug and text callers can decide at their own public seam.
export function generateOwnedUuidV4Bytes(): UuidV4Bytes | UuidSlugError {
  if (generating) return new UuidSlugError(RNG_UNAVAILABLE, REENTRANT_GENERATION_MESSAGE);
  const output = new Uint8Array(16);
  generating = true;
  try {
    const failed = fillRandomBytes(runtime.fillRandom, output);
    if (failed) return failed;
    output[6] = ((output[6] ?? 0) & 0x0f) | 0x40;
    output[8] = ((output[8] ?? 0) & 0x3f) | 0x80;
    return output as UuidV4Bytes;
  } finally {
    generating = false;
  }
}

/**
 * Generate UUIDv4 text through the portable implementation, even on native-capable hosts.
 * Failures are returned so the native path can aggregate them with its own cause.
 */
export function generatePortableUuidV4<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
  textCase: Case = UUID_TEXT_LOWERCASE as Case,
): UuidV4StringFor<Case> | UuidSlugError {
  if (!isUuidTextCase(textCase)) {
    const selectedCase = resolveUuidTextCase(textCase);
    if (selectedCase instanceof Error) return selectedCase;
    textCase = selectedCase as Case;
  }
  const bytes = drawUuidV4Scratch();
  return bytes instanceof Error
    ? bytes
    : (formatUuidBytesUnchecked(bytes, 0, textCase) as UuidV4StringFor<Case>);
}

/**
 * Fill the module scratch with UUIDv4 bytes for a writer that reads them before its next draw. Text
 * and slug writers never expose the scratch, so they skip a new array and the public converters'
 * input checks, which cost about a third of Node's portable text call (bench/PERFORMANCE.md).
 * Encoding cannot draw entropy, so the scratch cannot change between this return and the read.
 */
export function drawUuidV4Scratch(): Uint8Array | UuidSlugError {
  if (generating) return new UuidSlugError(RNG_UNAVAILABLE, REENTRANT_GENERATION_MESSAGE);
  generating = true;
  try {
    const failed = fillRandomBytes(runtime.fillRandom, random);
    if (failed) return failed;
    random[6] = ((random[6] ?? 0) & 0x0f) | 0x40;
    random[8] = ((random[8] ?? 0) & 0x3f) | 0x80;
    return random;
  } finally {
    generating = false;
  }
}

/**
 * Generate UUIDv4 text with platform cryptographic randomness, lowercase by default.
 * Native runtime results are trusted without additional output guarantees.
 *
 * @param textCase - Built-in output spelling. Omit for lowercase.
 * @throws `UuidSlugError` with code `rng_unavailable` when the runtime has no secure random
 * source. No supported runtime lacks one, so this is not expected during normal operation.
 */
export function generateUuidV4<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
  textCase?: Case,
): UuidV4StringFor<Case>;
export function generateUuidV4<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
  textCase: Case = UUID_TEXT_LOWERCASE as Case,
): UuidV4StringFor<Case> | UuidSlugError {
  if (!isUuidTextCase(textCase)) {
    // Only an untyped call reaches an unknown spelling; that misuse stays an error value.
    const selectedCase = resolveUuidTextCase(textCase);
    if (selectedCase instanceof Error) return selectedCase;
    textCase = selectedCase as Case;
  }
  // Native generation is useful only for text, which the host returns directly. Byte and slug
  // routes stay portable because parsing native text adds work and complicates atomic output.
  // Keep native generation in this public function instead of another helper call; the complete
  // Bun text call improves with this shape. Portable-first runtimes leave before native handling.
  // A successful string needs no local Error check; only a failed result reaches the throw seam.
  // Trust proper native output directly: validation and identity tracking impose guarantees
  // beyond the default native baseline. Configured entropy still validates at its caller seam.
  // Remeasure each output form if case normalization, host APIs or engine inlining
  // changes; bench/PERFORMANCE.md owns the evidence.
  const native = runtime.uuidV4;
  if (!native) return generatedOrThrow(generatePortableUuidV4(textCase));
  let uuid: string | UuidSlugError;
  try {
    uuid = native();
  } catch (nativeCause) {
    uuid = portableAfterNative<UuidTextCase>(
      nativeCause,
      generatePortableUuidV4,
      UUID_TEXT_LOWERCASE,
      UUID_V4_GENERATION,
    );
  }
  if (typeof uuid !== "string") return generatedOrThrow(uuid);
  return (textCase === UUID_TEXT_UPPERCASE ? uuid.toUpperCase() : uuid) as UuidV4StringFor<Case>;
}

/**
 * Generate UUIDv4 text from the caller's synchronous random-byte source. The callback must fill
 * all 16 bytes. Returned or thrown errors become generation failures; the package cannot detect a
 * successful partial or weak fill.
 *
 * @param fillRandom - Fill the complete array from the caller's chosen source.
 * @param textCase - Built-in output spelling. Omit for lowercase.
 */
export function generateUuidV4WithRandomFill<
  Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE,
>(
  fillRandom: UuidRandomFill,
  textCase: Case = UUID_TEXT_LOWERCASE as Case,
): UuidV4StringFor<Case> | UuidSlugError {
  if (typeof fillRandom !== "function")
    return new UuidSlugError(INVALID_OPTIONS, "UUIDv4 fillRandom must be a function.");
  if (!isUuidTextCase(textCase)) {
    const selectedCase = resolveUuidTextCase(textCase);
    if (selectedCase instanceof Error) return selectedCase;
    textCase = selectedCase as Case;
  }
  if (generating) return new UuidSlugError(RNG_UNAVAILABLE, REENTRANT_GENERATION_MESSAGE);
  const bytes = new Uint8Array(16);
  generating = true;
  try {
    const failed = fillRandomBytes((output) => {
      const result = fillRandom(output);
      return result === undefined || isError(result) ? result : undefined;
    }, bytes);
    if (failed) return failed;
    bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
    bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
    return bytesToUuidString(bytes, textCase) as UuidV4StringFor<Case> | UuidSlugError;
  } finally {
    generating = false;
  }
}
