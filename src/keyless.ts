// SPDX-License-Identifier: Apache-2.0

/** Keyless operations avoid codec setup. Masking stays on codecs because it requires their key. */
import { runtime } from "#runtime";
import { UuidSlugError } from "./errors";
import type { UuidV4Slug, UuidV7Bytes, UuidV7Generator, UuidV7Slug, UuidV7String } from "./types";
import { bytesToSlug } from "./uuid";
import type { SlugAlphabet } from "./uuid";
export { generateUuidV4, generateUuidV4Bytes } from "./v4";
import { generateUuidV4Bytes } from "./v4";
import { createPortableUuidV7Generator, createRuntimeGenerator } from "./v7";

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

/**
 * Create an independent UUIDv7 sequence with a caller-supplied clock and platform randomness.
 * Invalid JavaScript options throw `TypeError`; clock and entropy failures are returned by methods.
 *
 * @throws `TypeError` if `options` is not an object or `clock` is not a function.
 */
export function createUuidV7Generator(options: UuidV7GeneratorOptions): UuidV7Generator {
  if (options === null || typeof options !== "object" || Array.isArray(options))
    throw new TypeError("Generator options must be an object.");
  const clock = options.clock;
  return createPortableUuidV7Generator({
    ...(clock === undefined ? {} : { clock }),
    fillRandom: runtime.fillRandom,
  });
}

/** Delay generator setup so conversion-only imports draw no entropy and bundle no generator. */
let generator: UuidV7Generator | undefined;
const v7 = () => (generator ??= createRuntimeGenerator(runtime));

/**
 * Generate a direct UUIDv4 slug with platform randomness, using base64url by default. base32hex is
 * filesystem-safe but cannot make random UUIDv4 values chronological.
 */
export function generateUuidV4Slug(
  alphabet: SlugAlphabet = "base64url",
): UuidV4Slug | UuidSlugError {
  const bytes = generateUuidV4Bytes();
  if (bytes instanceof Error) return bytes;
  return bytesToSlug(bytes, alphabet) as UuidV4Slug | UuidSlugError;
}

/*
 * Return types are DECLARED, not inferred, on all four. Inference reads them off the generator, so
 * a widened method there silently widens the package's public surface. A declared type turns that
 * mismatch into a compile error at the one site that is wrong.
 */
/** Generate canonical UUIDv7 text for the current clock reading and platform randomness. */
export const generateUuidV7 = (): UuidV7String | UuidSlugError => v7().generateUuidV7();

/**
 * Generate UUIDv7 bytes with platform randomness. Without storage, return a new plain 16-byte
 * `Uint8Array`. With storage, write only after success and return the exact supplied array.
 */
export function generateUuidV7Bytes(): UuidV7Bytes | UuidSlugError;
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
 */
export const generateUuidV7At = (unixMs: number): UuidV7String | UuidSlugError =>
  v7().generateUuidV7At(unixMs);

/**
 * Generate UUIDv7 bytes at a whole Unix millisecond in `0..2^48-1` without changing current-time
 * state. The output overload validates before writing and returns the exact supplied array.
 */
export function generateUuidV7BytesAt(unixMs: number): UuidV7Bytes | UuidSlugError;
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

/**
 * Generate a direct UUIDv7 slug. Lowercase base32hex sorts across different milliseconds;
 * base64url and values generated within one millisecond have no chronological sort guarantee.
 */
export function generateUuidV7Slug(
  alphabet: SlugAlphabet = "base64url",
): UuidV7Slug | UuidSlugError {
  const bytes = v7().generateUuidV7Bytes();
  if (bytes instanceof Error) return bytes;
  return bytesToSlug(bytes, alphabet) as UuidV7Slug | UuidSlugError;
}
