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
import { formatUuid, formatUuidSlug, isUuidV4String, isUuidV7Slug } from "./uuid";
import type { SlugAlphabet } from "./uuid";
import { createRuntimeGenerator } from "./v7";

/** Delay generator setup so conversion-only imports draw no entropy and bundle no generator. */
let generator: UuidV7Generator | undefined;
const v7 = () => (generator ??= createRuntimeGenerator(runtime));

/**
 * Randomness is drawn into a private buffer and copied out instead of filled through a view of the
 * caller's array: `fillRandom` requires a plain `ArrayBuffer` because Web Crypto rejects a
 * `SharedArrayBuffer` view, and a caller-supplied `out` carries no such guarantee. Reused rather
 * than allocated per call, matching the v7 generator, so the cost is one 16-byte copy.
 */
const v4Random = new Uint8Array(16);

/** Shared with `createUuidSlugCodec`, so a v4 has one implementation however it is reached. */
export function uuidV4Bytes(): UuidV4Bytes | UuidSlugError;
export function uuidV4Bytes<T extends Uint8Array>(out: T, offset?: number): T | UuidSlugError;
export function uuidV4Bytes(out?: Uint8Array, offset = 0): Uint8Array | UuidSlugError {
  const target = out ?? new Uint8Array(16);
  const badRange = out === undefined ? checkRange(16, offset, 16) : checkByteRange(out, offset, 16);
  if (badRange) return badRange;
  const failed = fillRandomBytes(runtime.fillRandom, v4Random);
  if (failed) return failed;
  target.set(v4Random, offset);
  target[offset + 6] = ((target[offset + 6] ?? 0) & 0x0f) | 0x40;
  target[offset + 8] = ((target[offset + 8] ?? 0) & 0x3f) | 0x80;
  return target;
}

function portableUuidV4(): UuidV4String | UuidSlugError {
  const bytes = uuidV4Bytes();
  return bytes instanceof Error ? bytes : (formatUuid(bytes) as UuidV4String | UuidSlugError);
}

export function uuidV4(): UuidV4String | UuidSlugError {
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
 * Takes the alphabet for the same reason `uuidV7Slug` does, and NOT because a v4 slug sorts — it
 * does not. The alphabet is a choice of representation, so a project that has standardised on the
 * 26-character lowercase form for its public ids needs its v4 slugs in it too; the pair differing
 * would be an asymmetry with nothing behind it.
 */
export function uuidV4Slug(alphabet: SlugAlphabet = "base64url"): UuidV4Slug | UuidSlugError {
  const bytes = uuidV4Bytes();
  if (bytes instanceof Error) return bytes;
  return formatUuidSlug(bytes, alphabet) as UuidV4Slug | UuidSlugError;
}

/*
 * Return types are DECLARED, not inferred, on all four. Inference reads them off the generator, so
 * a widened method there silently widens the package's public surface. A declared type turns that
 * mismatch into a compile error at the one site that is wrong.
 */
export const uuidV7 = (): UuidV7String | UuidSlugError => v7().uuidV7();

export function uuidV7Bytes(): UuidV7Bytes | UuidSlugError;
export function uuidV7Bytes<T extends Uint8Array>(out: T, offset?: number): T | UuidSlugError;
export function uuidV7Bytes(out?: Uint8Array, offset?: number): Uint8Array | UuidSlugError {
  const generate = v7().uuidV7Bytes as (
    out?: Uint8Array,
    offset?: number,
  ) => Uint8Array | UuidSlugError;
  return generate(out, offset);
}

export const uuidV7At = (timestamp: number): UuidV7String | UuidSlugError =>
  v7().uuidV7At(timestamp);

export function uuidV7BytesAt(timestamp: number): UuidV7Bytes | UuidSlugError;
export function uuidV7BytesAt<T extends Uint8Array>(
  timestamp: number,
  out: T,
  offset?: number,
): T | UuidSlugError;
export function uuidV7BytesAt(
  timestamp: number,
  out?: Uint8Array,
  offset?: number,
): Uint8Array | UuidSlugError {
  const generate = v7().uuidV7BytesAt as (
    timestamp: number,
    out?: Uint8Array,
    offset?: number,
  ) => Uint8Array | UuidSlugError;
  return generate(timestamp, out, offset);
}

/**
 * The alphabet is an argument here, exactly as it is on `uuidToSlug(uuid, alphabet)`, because
 * choosing it needs no key: without it the only way to GENERATE a base32hex slug was to build a
 * codec, so the sortable form cost the whole masking machinery while the unsortable one was free.
 * Positional and last, matching `uuidToSlug`, so the two spellings of "encode in this alphabet"
 * do not diverge.
 */
export function uuidV7Slug(alphabet: SlugAlphabet = "base64url"): UuidV7Slug | UuidSlugError {
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
  const bytes = v7().uuidV7Bytes();
  if (bytes instanceof Error) return bytes;
  return formatUuidSlug(bytes, alphabet) as UuidV7Slug | UuidSlugError;
}
