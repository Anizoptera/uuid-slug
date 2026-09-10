// SPDX-License-Identifier: Apache-2.0

/** Keyless operations avoid codec setup. Masking stays on codecs because it requires their key. */
import { runtime } from "#runtime";
import { checkRange, fillRandomBytes, UuidSlugError } from "./errors";
import type { UuidV4Slug, UuidV4String, UuidV7Generator, UuidV7Slug, UuidV7String } from "./types";
import { formatUuid, formatUuidSlug } from "./uuid";
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
export function uuidV4Bytes(out?: Uint8Array, offset = 0): Uint8Array | UuidSlugError {
  const target = out ?? new Uint8Array(16);
  const badRange = checkRange(target.length, offset, 16);
  if (badRange) return badRange;
  const failed = fillRandomBytes(runtime.fillRandom, v4Random);
  if (failed) return failed;
  target.set(v4Random, offset);
  target[offset + 6] = ((target[offset + 6] ?? 0) & 0x0f) | 0x40;
  target[offset + 8] = ((target[offset + 8] ?? 0) & 0x3f) | 0x80;
  return target;
}

export function uuidV4(): UuidV4String | UuidSlugError {
  try {
    const native = runtime.uuidV4?.();
    if (native) return native;
  } catch (cause) {
    return new UuidSlugError("rng_unavailable", "Runtime UUIDv4 generation failed.", { cause });
  }
  const bytes = uuidV4Bytes();
  if (bytes instanceof Error) return bytes;
  return formatUuid(bytes) as UuidV4String | UuidSlugError;
}

/**
 * Takes the alphabet for the same reason `uuidV7Slug` does, and NOT because a v4 slug sorts — it
 * does not. The alphabet is a choice of representation, so a project that has standardised on the
 * 26-character lowercase form for its public ids needs its v4 slugs in it too; the pair differing
 * would be an asymmetry with nothing behind it.
 */
export function uuidV4Slug(alphabet: SlugAlphabet = "base64url"): UuidV4Slug | UuidSlugError {
  // The bytes came from `uuidV4Bytes`, which stamps version 4; the encoder sees only bytes and
  // cannot carry that through, which is what the assertion stands in for.
  const bytes = uuidV4Bytes();
  if (bytes instanceof Error) return bytes;
  return formatUuidSlug(bytes, 0, alphabet) as UuidV4Slug | UuidSlugError;
}

/*
 * Return types are DECLARED, not inferred, on all four. Inference reads them off the generator, so
 * a widened method there silently widens the package's public surface — and this package has
 * already been bitten by exactly that: `uuidV7Slug` once inferred `string | UuidSlug`, which
 * collapses to `string` because `Brand`'s marker is optional, so a branded return was promised that
 * nothing checked. A declared type turns that into a compile error at the one site that is wrong.
 */
export const uuidV7 = (): UuidV7String | UuidSlugError => v7().uuidV7();

export const uuidV7Bytes = (out?: Uint8Array, offset?: number): Uint8Array | UuidSlugError =>
  v7().uuidV7Bytes(out, offset);

export const uuidV7At = (timestamp: number): UuidV7String | UuidSlugError =>
  v7().uuidV7At(timestamp);

export const uuidV7BytesAt = (
  timestamp: number,
  out?: Uint8Array,
  offset?: number,
): Uint8Array | UuidSlugError => v7().uuidV7BytesAt(timestamp, out, offset);

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
  if (native) {
    try {
      return native();
    } catch (cause) {
      return new UuidSlugError("rng_unavailable", "Runtime UUIDv7 slug generation failed.", {
        cause,
      });
    }
  }
  // Asserted for the same reason `uuidV4Slug` asserts: the bytes come from a v7 generator and the
  // encoder sees only bytes, so it returns the version-agnostic brand.
  const bytes = v7().uuidV7Bytes();
  if (bytes instanceof Error) return bytes;
  return formatUuidSlug(bytes, 0, alphabet) as UuidV7Slug | UuidSlugError;
}
