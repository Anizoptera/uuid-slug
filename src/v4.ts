// SPDX-License-Identifier: Apache-2.0

import { runtime } from "#runtime";
import {
  checkByteRange,
  checkRange,
  failedFallback,
  fillRandomBytes,
  RNG_UNAVAILABLE,
  nativeOrFallback,
  UuidSlugError,
} from "./errors.ts";
import type { UuidV4Bytes, UuidV4String } from "./types.ts";
import { bytesToUuidString, isUuidV4String } from "./uuid.ts";

export { UUID_SLUG_ERROR_CODES, isUuidSlugError } from "./errors.ts";
export { UuidSlugError };
export type { UuidSlugErrorCode } from "./errors.ts";
export type { UuidV4Bytes, UuidV4String } from "./types.ts";
export { isUuidV4Bytes, isUuidV4String } from "./uuid.ts";

const REENTRANT_GENERATION_MESSAGE =
  "UUIDv4 generation cannot be reentered from its entropy source.";

/**
 * Randomness is drawn into private storage before copying to caller storage. Web Crypto rejects
 * SharedArrayBuffer views, so the runtime cannot safely fill an arbitrary caller buffer directly.
 */
const random = new Uint8Array(16);
let generating = false;
let trustedNativeUuidV4: (() => string) | undefined;

/**
 * Generate UUIDv4 bytes with platform randomness in a new plain 16-byte `Uint8Array`.
 */
export function generateUuidV4Bytes(): UuidV4Bytes | UuidSlugError;
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
  if (output === undefined) return generateOwnedUuidV4Bytes(outputOffset);
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
function generateOwnedUuidV4Bytes(outputOffset: number): UuidV4Bytes | UuidSlugError {
  if (generating) return new UuidSlugError(RNG_UNAVAILABLE, REENTRANT_GENERATION_MESSAGE);
  const badRange = checkRange(16, outputOffset, 16);
  if (badRange) return badRange;
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

/** Generate UUIDv4 text through the portable implementation, even on native-capable hosts. */
export function generatePortableUuidV4(): UuidV4String | UuidSlugError {
  const bytes = generateUuidV4Bytes();
  return bytes instanceof Error
    ? bytes
    : (bytesToUuidString(bytes) as UuidV4String | UuidSlugError);
}

/** Generate canonical UUIDv4 text with platform cryptographic randomness. */
export function generateUuidV4(): UuidV4String | UuidSlugError {
  // Native generation is useful only for text, which the host returns directly. Byte and slug
  // routes stay portable because parsing native text adds work and complicates atomic output.
  // Recheck each output form when host APIs change; bench/PERFORMANCE.md owns the evidence.
  const native = runtime.uuidV4;
  if (!native) return generatePortableUuidV4();
  // Validate a new adapter once, then trust that stable host contract on its hot path. Retaining
  // per-call validation made native UUIDv4 slower than direct wrappers. Function identity keeps
  // injected or replaced adapters behind validation; revalidate every call if a host method can
  // return malformed values intermittently without changing identity.
  if (native !== trustedNativeUuidV4) {
    const result = nativeOrFallback(
      native,
      isUuidV4String,
      (value) => value,
      generatePortableUuidV4,
      "UUIDv4 generation",
    );
    if (!(result instanceof Error)) trustedNativeUuidV4 = native;
    return result;
  }
  try {
    return native() as UuidV4String;
  } catch (nativeCause) {
    const fallback = generatePortableUuidV4();
    return fallback instanceof Error
      ? failedFallback(nativeCause, fallback, "Native and portable UUIDv4 generation failed.")
      : fallback;
  }
}
