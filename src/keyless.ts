// SPDX-License-Identifier: Apache-2.0

/** Keyless operations avoid codec setup. Masking stays on codecs because it requires their key. */
import { runtime } from "#runtime";
import {
  checkByteRange,
  checkRange,
  fillRandomBytes,
  nativeOrFallback,
  UuidSlugError,
} from "./errors";
import type {
  UuidV4Bytes,
  UuidV4Slug,
  UuidV4String,
  UuidV7Bytes,
  UuidV7Generator,
  UuidV7Slug,
  UuidV7String,
} from "./types";
import { bytesToUuid, bytesToSlug, isUuidV4String, isUuidV7Slug } from "./uuid";
import type { SlugAlphabet } from "./uuid";
import { createPortableUuidV7Generator, createRuntimeGenerator } from "./v7";

/** Configure the clock for one sequence; entropy always comes from the package runtime. */
export interface UuidV7GeneratorOptions {
  /** Return Unix milliseconds; finite fractional readings are truncated. Defaults to `Date.now`. */
  readonly clock?: () => number;
}

/** Create an owned UUIDv7 sequence backed by the package's cryptographic runtime source. */
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
 * Randomness is drawn into a private buffer and copied out instead of filled through a view of the
 * caller's array: `fillRandom` requires a plain `ArrayBuffer` because Web Crypto rejects a
 * `SharedArrayBuffer` view, and caller-supplied output carries no such guarantee. Reused rather
 * than allocated per call, matching the v7 generator, so the cost is one 16-byte copy.
 */
const v4Random = new Uint8Array(16);
let generatingV4 = false;

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
  if (generatingV4)
    return new UuidSlugError(
      "rng_unavailable",
      "UUIDv4 generation cannot be reentered from its entropy source.",
    );
  const target = output ?? new Uint8Array(16);
  const badRange =
    output === undefined
      ? checkRange(16, outputOffset, 16)
      : checkByteRange(output, outputOffset, 16);
  if (badRange) return badRange;
  generatingV4 = true;
  try {
    const failed = fillRandomBytes(runtime.fillRandom, v4Random);
    if (failed) return failed;
    target.set(v4Random, outputOffset);
    target[outputOffset + 6] = ((target[outputOffset + 6] ?? 0) & 0x0f) | 0x40;
    target[outputOffset + 8] = ((target[outputOffset + 8] ?? 0) & 0x3f) | 0x80;
    return target;
  } finally {
    generatingV4 = false;
  }
}

function portableUuidV4(): UuidV4String | UuidSlugError {
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
        portableUuidV4,
        "UUIDv4 generation",
      )
    : portableUuidV4();
}

/**
 * Generate a direct UUIDv4 slug in the selected alphabet. Alphabet selection is representation,
 * not sorting, so v4 and v7 generation accept the same project-wide spelling choice.
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
/** Generate a canonical UUIDv7 string for the current clock reading. */
export const generateUuidV7 = (): UuidV7String | UuidSlugError => v7().generateUuidV7();

/** Generate package-owned UUIDv7 bytes, or write atomically into caller storage. */
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

/** Generate UUIDv7 text at a whole Unix millisecond in `0..2^48-1`. */
export const generateUuidV7At = (unixMs: number): UuidV7String | UuidSlugError =>
  v7().generateUuidV7At(unixMs);

/** Generate explicit-time UUIDv7 bytes without changing current-time sequence state. */
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
 * Taking the alphabet here keeps the sortable spelling available without constructing a keyed
 * codec, matching the representation argument on `uuidToSlug`.
 */
export function generateUuidV7Slug(
  alphabet: SlugAlphabet = "base64url",
): UuidV7Slug | UuidSlugError {
  // Gated on the ALPHABET, not merely on the hook's presence. The runtime's slug generator emits
  // base64url and nothing else, so an ungated branch answers a base32hex request with a 22-char
  // base64url string — and only Bun defines the hook, so vitest on Node cannot reach the branch at
  // all and the entire suite stays green. `test/runtime.bun.test.ts` is what actually covers it.
  // Probed per call rather than resolved once: resolving at module scope would reintroduce the
  // eager work the lazy cell above exists to avoid.
  //
  // Only base64url can use the native slug path; base32hex needs bytes for package encoding.
  const native = alphabet === "base64url" ? runtime.uuidV7Slug : undefined;
  if (native)
    return nativeOrFallback(
      native,
      isUuidV7Slug,
      (value) => value,
      () => portableUuidV7Slug(alphabet),
      "UUIDv7 slug generation",
    );
  return portableUuidV7Slug(alphabet);
}

function portableUuidV7Slug(alphabet: SlugAlphabet): UuidV7Slug | UuidSlugError {
  const bytes = v7().generateUuidV7Bytes();
  if (bytes instanceof Error) return bytes;
  return bytesToSlug(bytes, alphabet) as UuidV7Slug | UuidSlugError;
}
