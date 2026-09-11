// SPDX-License-Identifier: Apache-2.0

import { runtime } from "#runtime";
import {
  checkByteRange,
  checkRange,
  fillRandomBytes,
  nativeOrFallback,
  UuidSlugError,
} from "./errors";
import type { UuidV4Bytes, UuidV4String } from "./types";
import { bytesToUuid, isUuidV4String } from "./uuid";

/**
 * Randomness is drawn into private storage before copying to caller storage. Web Crypto rejects
 * SharedArrayBuffer views, so the runtime cannot safely fill an arbitrary caller buffer directly.
 */
const random = new Uint8Array(16);
let generating = false;

/** Generate package-owned UUIDv4 bytes, or write atomically into caller storage. */
export function generateUuidV4Bytes(): UuidV4Bytes | UuidSlugError;
export function generateUuidV4Bytes<Output extends Uint8Array>(
  output: Output,
  outputOffset?: number,
): Output | UuidSlugError;
export function generateUuidV4Bytes(
  output?: Uint8Array,
  outputOffset = 0,
): Uint8Array | UuidSlugError {
  if (output === undefined) return generateOwnedUuidV4Bytes(outputOffset);
  if (generating)
    return new UuidSlugError(
      "rng_unavailable",
      "UUIDv4 generation cannot be reentered from its entropy source.",
    );
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
  if (generating)
    return new UuidSlugError(
      "rng_unavailable",
      "UUIDv4 generation cannot be reentered from its entropy source.",
    );
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
  return bytes instanceof Error ? bytes : (bytesToUuid(bytes) as UuidV4String | UuidSlugError);
}

/** Generate a canonical UUIDv4 string with platform cryptographic randomness. */
export function generateUuidV4(): UuidV4String | UuidSlugError {
  return runtime.uuidV4
    ? nativeOrFallback(
        runtime.uuidV4,
        isUuidV4String,
        (value) => value,
        generatePortableUuidV4,
        "UUIDv4 generation",
      )
    : generatePortableUuidV4();
}
