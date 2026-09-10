// SPDX-License-Identifier: Apache-2.0

import type { UuidSlugError } from "./errors";
import type { SlugAlphabet } from "./uuid";

declare const brand: unique symbol;
declare const maskSchemaBrand: unique symbol;

/** Accumulate nested brand names while still accepting caller string literals. */
export type Brand<T, Name extends string> = T & { readonly [brand]?: { [K in Name]: true } };

export type UuidString = Brand<string, "UuidString">;
export type UuidV4String = Brand<UuidString, "UuidV4String">;
export type UuidV7String = Brand<UuidString, "UuidV7String">;
/** Either alphabet: 22 base64url characters or 26 base32hex characters. */
export type UuidSlug = Brand<string, "UuidSlug">;
export type UuidV4Slug = Brand<UuidSlug, "UuidV4Slug">;
export type UuidV7Slug = Brand<UuidSlug, "UuidV7Slug">;
/** A masked payload in either spelling; its check bits are not plain-encoding padding. */
export type MaskedUuidSlug = Brand<UuidSlug, "MaskedUuidSlug">;
export type MaskedUuidV7Slug = Brand<MaskedUuidSlug, "MaskedUuidV7Slug">;
export type SentinelUuidV7Slug = Brand<UuidV7Slug, "SentinelUuidV7Slug">;
export type PublicUuidV7Slug = MaskedUuidV7Slug | SentinelUuidV7Slug;
export type UuidBytes = Brand<Uint8Array, "UuidBytes">;

export interface FreshValidationOptions {
  /** Finite Unix milliseconds; read once per validation. */
  now?: () => number;
  /** Finite, nonnegative radius around now, inclusive in both directions; default 24 hours. */
  windowMs?: number;
}

export interface UuidV7Generator {
  uuidV7(this: void): UuidSlugError | UuidV7String;
  uuidV7Bytes(this: void, out?: Uint8Array, offset?: number): UuidSlugError | Uint8Array;
  /**
   * Generate at a caller-supplied millisecond. A SEPARATE entry point rather than an optional
   * trailing parameter on the pair above, because an optional positional timestamp is silently
   * mappable: `Array.from({length: n}, gen.uuidV7Bytes)` would pass the index as the instant and
   * mint n ids dated 1970, with no type error. Taking the timestamp FIRST makes that impossible.
   *
   * Returns an Error rather than throwing on a bad instant: a caller-supplied value out of range
   * is ordinary input validation, not an exceptional condition.
   */
  uuidV7At(this: void, timestamp: number): UuidSlugError | UuidV7String;
  uuidV7BytesAt(
    this: void,
    timestamp: number,
    out?: Uint8Array,
    offset?: number,
  ): UuidSlugError | Uint8Array;
}

/** A frozen package-produced masking handle whose transform and key material stay private. */
export interface MaskSchema {
  readonly id: string;
  readonly [maskSchemaBrand]: true;
}

export interface CustomMaskSchemaOptions {
  readonly id: string;
  readonly forward: (input: Uint8Array, output: Uint8Array) => void;
  readonly reverse: (input: Uint8Array, output: Uint8Array) => void;
}

/**
 * UUIDv7 content leaves 16 bits for the check. The default Feistel mix spreads timestamp changes
 * across the block; callers that need another reversible transform can pass a `MaskSchema`.
 */
export interface MaskSchemaOptions {
  readonly id?: string;
  /**
   * Generate a secret, for example with `openssl rand -base64 32`, and keep it outside source
   * control. At least 16 bytes are required; strings are UTF-8 encoded. A known UUID/slug pair
   * permits offline guesses, so length alone is not protection. Preserve old seeds for decoding
   * issued slugs; rotate by retaining their schema settings in `previousMasks`.
   */
  readonly seed: string | Uint8Array;
  /**
   * Work factor for turning the seed into key material, default 1 — the cheapest setting, chosen so
   * that codec construction does only the requested work. Higher counts add construction and
   * seed-guessing cost; they are paid when the schema is built, never per id.
   *
   * WIRE-FORMAT-BEARING, exactly as `seed` is: a different count derives different keys, so every
   * masked slug issued under the old count stops decoding. Rotate it the way a seed is rotated —
   * the new setting in `mask`, the old one kept in `previousMasks` — never by editing in place.
   */
  readonly keyIterations?: number;
}

/** The synchronous seed options plus cooperative cancellation; no scheduling knobs are required. */
export interface AsyncMaskSchemaOptions extends MaskSchemaOptions {
  readonly signal?: AbortSignal;
}

export interface UuidV7SentinelDefinition {
  readonly name: string;
  readonly uuid: UuidV7String;
}

export interface UuidV7Sentinel {
  readonly name: string;
  readonly slug: SentinelUuidV7Slug;
  readonly uuid: UuidV7String;
}

/** Select a known encoding instead of guessing from overlapping slug text. */
export type MigrationFormat = "current" | "original" | "plain";

/** Enable only formats your application has issued; writers keep using the codec. */
export interface UuidSlugMigrationOptions {
  readonly original?: boolean;
  readonly plain?: boolean;
}

export interface UuidSlugMigration {
  /** Return the first candidate: sentinel, current keys, original mask, then plain UUID. */
  decode(this: void, slug: string, format?: MigrationFormat): UuidSlugError | UuidString;
  /** Return distinct candidates for one application lookup; an empty array means no match. */
  candidates(this: void, slug: string, format?: MigrationFormat): UuidSlugError | UuidString[];
}

export interface UuidSlugCodecOptions {
  readonly generator?: UuidV7Generator;
  /**
   * Schemas to try after `mask`, in the order given — how a seed is rotated. Takes a seed exactly
   * as `mask` does: a rotated seed is the ordinary reason this list exists, and requiring a
   * pre-built schema for it cost the commonest case a constructor and an error branch that naming
   * the current seed never needed. Named for rotation rather than for legacy, because a previous
   * key is not a different kind of thing from the current one — rotation is only a change of
   * position between this list and `mask`.
   *
   * Keep it short. Each entry is tried in turn, so the codec's wrong-answer rate is the sum over
   * the whole list.
   */
  readonly previousMasks?: readonly (MaskSchema | MaskSchemaOptions)[];
  /**
   * The schema that ENCODES, and the first tried when decoding. Kept separate from the list above
   * rather than folded into one ordered array: in a single list the encoding schema is whichever
   * happens to be first, so appending a rotated seed leaves you still issuing ids under the old
   * one while believing you rotated. Nothing about that failure is visible.
   *
   * Required because silently selecting published key material makes protected-looking slugs
   * readable by anyone. Supply private seed options or explicitly select `PUBLIC_MASK_SCHEMA`.
   */
  readonly mask: MaskSchema | MaskSchemaOptions;
  readonly sentinels?: readonly UuidV7SentinelDefinition[];
  /**
   * Output spelling for masked IDs and sentinels; defaults to `"base64url"`.
   * `"base32hex"` preserves the full masked payload in 27 lowercase characters (26 for raw
   * sentinels), suitable for case-insensitive filesystems. Masked output has no sort-order promise.
   * Readers accept both spellings regardless of this writer selection.
   */
  readonly maskedSlugAlphabet?: SlugAlphabet;
}

/**
 * Only what depends on the codec's own state: the generator used for masked UUIDv7 output, the
 * mask schemas, and the sentinels it was built with.
 *
 * Plain conversions are module-level functions because their result does not depend on codec state.
 */
export interface UuidSlugCodec {
  readonly sentinels: readonly UuidV7Sentinel[];
  /** Create an opt-in reader without changing generation or ordinary codec decoding. */
  migration(this: void, options?: UuidSlugMigrationOptions): UuidSlugMigration;
  /**
   * `this: void` lets callers detach methods without `.bind`; implementations cannot rely on `this`.
   */
  uuidV7MaskedSlug(this: void): UuidSlugError | PublicUuidV7Slug;
  /**
   * Masking is UUIDv7-only, and the reason is that the whole format is spent. The check rides in
   * bits a v7 provably wastes — its constant version and variant, and the timestamp's top six —
   * plus whatever the encoding has left over. Another version would have to store its real
   * version and its full timestamp somewhere, and there is no somewhere: every one of the 132
   * bits in 22 characters already has a job. Supporting all versions would cost a 23rd character
   * on every masked slug forever, to hide a creation time only v7 discloses.
   */
  uuidV7ToMaskedSlug(this: void, uuid: string): UuidSlugError | PublicUuidV7Slug;
  maskedSlugToUuidV7(this: void, slug: string): UuidSlugError | UuidV7String;
  /**
   * `maskedSlugToUuidV7` plus the freshness rules of `validateUuidV7Fresh`, returning the slug.
   *
   * Lives on the codec because unmasking requires that codec's key. Plain-slug freshness remains
   * module-level because it needs no key.
   *
   * Preserve the input type because successful freshness validation returns the caller's exact
   * spelling rather than relabeling it as a newly produced value.
   */
  validateMaskedSlugFresh<S extends string>(
    this: void,
    slug: S,
    freshness?: FreshValidationOptions,
  ): UuidSlugError | S;
}
