// SPDX-License-Identifier: Apache-2.0

/**
 * The operations that need no key, built WITHOUT a codec.
 *
 * Generating an id and re-encoding one are keyless: the result is the same value whoever asks, so
 * a bare function is an honest shape for them. Reaching them through a codec is what made them
 * expensive — a codec carries a mask schema, a cipher and a sentinel table, none of which a caller
 * who never masks will ever execute, and all of which a bundler must keep once the graph reaches
 * them. Measured 2026-08-12 on the built package: an entry importing only `uuidV7Slug` minified to
 * 12,735 bytes through the codec and 4,559 from a bare generator; `uuidToSlug` alone, 12,725
 * against 2,188. `defaultCodec` still exists and still works — it is simply no longer on the path
 * every consumer walks.
 *
 * NOTHING KEYED MAY BE ADDED HERE (Art's ruling, 2026-08-12). The only key a bare function could
 * carry is `DEFAULT_MASK_SCHEMA`'s, whose seed is a string literal in this published package, so a
 * masked operation exported this way would be the shortest spelling of the headline feature and
 * the one that obfuscates nothing. Masking is reached through a codec built with your own seed.
 */
import { runtime } from "#runtime";
import {
  checkRange,
  errorOrThrow,
  fillRandomBytes,
  UuidRuntimeError,
  UuidSlugError,
} from "./errors";
import type { UuidV4Slug, UuidV4String, UuidV7Generator, UuidV7Slug, UuidV7String } from "./types";
import { formatUuid, formatUuidSlug } from "./uuid";
import type { SlugAlphabet } from "./uuid";
import { createRuntimeGenerator } from "./v7";

/**
 * Built on first use, and the laziness is what the measurement above depends on: a module-scope
 * CONSTRUCTION call is a side effect a bundler may not remove, so an eager one would pin the
 * generator, the runtime adapter and the entropy pool into a bundle that only ever re-encodes a
 * UUID. Measured the same day, the eager spelling cost 5,130 bytes for `uuidToSlug` alone against
 * 2,188 here.
 *
 * It also keeps import-time work at zero, which `test/entropy.test.ts` gates for a different
 * reason — a heap snapshot taken at module load must capture no drawn randomness.
 */
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
export function uuidV4Bytes(out?: Uint8Array, offset = 0): UuidSlugError | Uint8Array {
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

export function uuidV4(): UuidV4String {
  try {
    const native = runtime.uuidV4?.();
    if (native) return native;
  } catch (cause) {
    throw new UuidRuntimeError("Runtime UUIDv4 generation failed.", { cause });
  }
  return errorOrThrow(formatUuid(errorOrThrow(uuidV4Bytes()))) as UuidV4String;
}

/**
 * Takes the alphabet for the same reason `uuidV7Slug` does, and NOT because a v4 slug sorts — it
 * does not. The alphabet is a choice of representation, so a project that has standardised on the
 * 26-character lowercase form for its public ids needs its v4 slugs in it too; the pair differing
 * would be an asymmetry with nothing behind it.
 */
export function uuidV4Slug(alphabet: SlugAlphabet = "base64url"): UuidV4Slug {
  // The bytes came from `uuidV4Bytes`, which stamps version 4; the encoder sees only bytes and
  // cannot carry that through, which is what the assertion stands in for.
  return errorOrThrow(formatUuidSlug(errorOrThrow(uuidV4Bytes()), 0, alphabet)) as UuidV4Slug;
}

/*
 * Return types are DECLARED, not inferred, on all four. Inference reads them off the generator, so
 * a widened method there silently widens the package's public surface — and this package has
 * already been bitten by exactly that: `uuidV7Slug` once inferred `string | UuidSlug`, which
 * collapses to `string` because `Brand`'s marker is optional, so a branded return was promised that
 * nothing checked. A declared type turns that into a compile error at the one site that is wrong.
 */
export const uuidV7 = (): UuidV7String => v7().uuidV7();

export const uuidV7Bytes = (out?: Uint8Array, offset?: number): UuidSlugError | Uint8Array =>
  v7().uuidV7Bytes(out, offset);

export const uuidV7At = (timestamp: number): UuidSlugError | UuidV7String =>
  v7().uuidV7At(timestamp);

export const uuidV7BytesAt = (
  timestamp: number,
  out?: Uint8Array,
  offset?: number,
): UuidSlugError | Uint8Array => v7().uuidV7BytesAt(timestamp, out, offset);

/**
 * The alphabet is an argument here, exactly as it is on `uuidToSlug(uuid, alphabet)`, because
 * choosing it needs no key: without it the only way to GENERATE a base32hex slug was to build a
 * codec, so the sortable form cost the whole masking machinery while the unsortable one was free.
 * Positional and last, matching `uuidToSlug`, so the two spellings of "encode in this alphabet"
 * do not diverge.
 */
export function uuidV7Slug(alphabet: SlugAlphabet = "base64url"): UuidV7Slug {
  // Gated on the ALPHABET, not merely on the hook's presence. The runtime's slug generator emits
  // base64url and nothing else, so an ungated branch answers a base32hex request with a 22-char
  // base64url string — and only Bun defines the hook, so vitest on Node cannot reach the branch at
  // all and the entire suite stays green. `test/runtime.bun.test.ts` is what actually covers it.
  // Probed per call rather than resolved once: resolving at module scope would reintroduce the
  // eager work the lazy cell above exists to avoid.
  //
  // The gate is also where the two alphabets stop costing the same, which is worth knowing before
  // standardising on the sortable one: measured on Bun 2026-08-12, base64url runs 17.0M/s and
  // base32hex 4.2M/s. Not an encoder deficiency -- base64url is handed straight to the engine's
  // own slug generator here, while base32hex must draw bytes and encode them in JavaScript. 4M
  // ids/sec is ample for identifier issuance; the number is recorded so the 4x is not rediscovered
  // as a mystery.
  const native = alphabet === "base64url" ? runtime.uuidV7Slug : undefined;
  if (native) return native();
  // Asserted for the same reason `uuidV4Slug` asserts: the bytes come from a v7 generator and the
  // encoder sees only bytes, so it returns the version-agnostic brand.
  return errorOrThrow(formatUuidSlug(errorOrThrow(v7().uuidV7Bytes()), 0, alphabet)) as UuidV7Slug;
}
