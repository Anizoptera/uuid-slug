// SPDX-License-Identifier: Apache-2.0

declare const brand: unique symbol;

export type Brand<T, Name extends string> = T & { readonly [brand]?: Name };

export type Base64UrlString = Brand<string, "Base64UrlString">;
export type UuidString = Brand<string, "UuidString">;
export type UuidV4String = Brand<UuidString, "UuidV4String">;
export type UuidV7String = Brand<UuidString, "UuidV7String">;
export type UuidSlug = Brand<Base64UrlString, "UuidSlug">;
export type UuidV4Slug = Brand<UuidSlug, "UuidV4Slug">;
export type UuidV7Slug = Brand<UuidSlug, "UuidV7Slug">;
export type MaskedUuidSlug = Brand<UuidSlug, "MaskedUuidSlug">;
export type MaskedUuidV7Slug = Brand<MaskedUuidSlug, "MaskedUuidV7Slug">;
export type SentinelUuidV7Slug = Brand<UuidV7Slug, "SentinelUuidV7Slug">;
export type PublicUuidV7Slug = MaskedUuidV7Slug | SentinelUuidV7Slug;
export type UuidBytes = Brand<Uint8Array, "UuidBytes">;

export interface FreshValidationOptions {
  now?: () => number;
  windowMs?: number;
}

export interface UuidV7Generator {
  uuidV7(this: void): UuidV7String;
  uuidV7Bytes(this: void, out?: Uint8Array, offset?: number): Error | Uint8Array;
  /**
   * Generate at a caller-supplied millisecond. A SEPARATE entry point rather than an optional
   * trailing parameter on the pair above, because an optional positional timestamp is silently
   * mappable: `Array.from({length: n}, gen.uuidV7Bytes)` would pass the index as the instant and
   * mint n ids dated 1970, with no type error. Taking the timestamp FIRST makes that impossible.
   *
   * Returns an Error rather than throwing on a bad instant: a caller-supplied value out of range
   * is ordinary input validation, not an exceptional condition.
   */
  uuidV7At(this: void, timestamp: number): Error | UuidV7String;
  uuidV7BytesAt(
    this: void,
    timestamp: number,
    out?: Uint8Array,
    offset?: number,
  ): Error | Uint8Array;
}

/**
 * A schema is its mixing step, not the data behind one. Holding `mix` as a function rather than
 * exposing a permutation and an XOR table is what lets the masking code stay ignorant of which
 * scheme it is running: adding one is a new constructor in `schema.ts` and no branch anywhere.
 */
export interface MaskSchema {
  readonly id: string;
  readonly tagBits: MaskTagBits;
  /**
   * Transforms 16 bytes; `forward: false` MUST be the exact inverse. `input` and `output` MUST
   * NOT be the same array: a scheme that permutes reads source bytes it would already have
   * overwritten, which corrupts silently rather than failing.
   */
  mix(input: Uint8Array, output: Uint8Array, forward: boolean): void;
}

/**
 * How many of a UUIDv7's information-free bits the wrong-key check occupies, and thereby WHERE
 * it sits — the regions nest, so one number fixes the layout:
 *
 * - `4`  — byte 6's version nibble.
 * - `6`  — plus byte 8's two variant bits.
 * - `12` — plus byte 0's top six bits, the high end of the 48-bit timestamp, which stay zero until
 *   the year 2109. Claiming them is what makes a 16-bit check fit in 22 characters, and it is why
 *   this tier REFUSES to encode a timestamp at or past 2^42 ms instead of truncating it.
 *
 * 12 is the tier for slugs this package mints. 4 and 6 exist only to read slugs an older scheme
 * already issued, and their checksum is part of that wire format, so it is never "improved".
 */
export type MaskTagBits = 4 | 6 | 12;

/** Named rather than numbered, so a schema's scheme survives being written down and read back. */
export type MaskSchemeKind = "feistel" | "substitution";

export interface MaskSchemaOptions {
  readonly id?: string;
  /**
   * Defaults to `feistel`. `substitution` exists to decode slugs issued before the Feistel and
   * SHOULD NOT be chosen for new ones: it maps one output byte per input byte, so ids sharing a
   * timestamp share bytes — measured, 4 of 16 held constant across a second.
   */
  readonly kind?: MaskSchemeKind;
  readonly seed: string | Uint8Array;
}

export interface ExplicitMaskSchema {
  readonly id?: string;
  readonly permute: Uint8Array;
  readonly tagBits: 4 | 6;
  readonly xor: Uint8Array;
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

export interface UuidSlugCodecOptions {
  readonly generator?: UuidV7Generator;
  readonly legacy?: {
    readonly directDecode?: boolean;
    /**
     * Schemas to try after `mask`, in the order given. Takes a seed exactly as `mask` does: a
     * rotated seed is the ordinary reason this list exists, and requiring a pre-built schema for
     * it meant the commonest case cost a constructor and an error branch that the current seed
     * never needed. The asymmetry taught the wrong thing too — that a previous key is a different
     * kind of thing from the current one, when rotation is only a change of position in this list.
     */
    readonly masks?: readonly (MaskSchema | MaskSchemaOptions)[];
  };
  /**
   * The schema that ENCODES, and the first tried when decoding. Kept separate from the list above
   * rather than folded into one ordered array: in a single list the encoding schema is whichever
   * happens to be first, so appending a rotated seed leaves you still issuing ids under the old
   * one while believing you rotated. Nothing about that failure is visible.
   */
  readonly mask?: MaskSchema | MaskSchemaOptions;
  readonly sentinels?: readonly UuidV7SentinelDefinition[];
}

/**
 * Only what depends on the codec's own state: the generator it draws from, and the mask schema
 * plus sentinels it was built with.
 *
 * The plain conversions (`uuidToSlug`, `parseUuid`, `formatUuidSlug`, …) are module-level
 * functions and deliberately absent here. They are pure — the same input gives the same output
 * whatever seed the codec holds — so carrying them as methods implied a dependency on the seed
 * that does not exist, and was the single most misleading thing about the previous shape.
 *
 * It EXTENDS `UuidV7Generator` rather than restating its methods, so that a generation capability
 * cannot be added and left unreachable: the codec is the only way a consumer reaches the generator,
 * and a new method on that interface now fails to compile here until it is forwarded. Restating the
 * signatures instead made the four v7 entry points a clerical obligation nothing enforced, and two
 * of them sat implemented-but-unwired through a release.
 */
export interface UuidSlugCodec extends UuidV7Generator {
  readonly sentinels: readonly UuidV7Sentinel[];
  /**
   * Every method declares `this: void`, which is load-bearing rather than decoration: the
   * top-level shortcuts are plain references (`export const uuidV7 = defaultCodec.uuidV7`), so a
   * method reaching for `this` would break the moment it was detached from the codec. The
   * annotation makes the compiler reject such an implementation instead of leaving the hazard to
   * a reviewer, and is what lets those references stay free of `.bind`.
   */
  uuidV4(this: void): UuidV4String;
  uuidV4Bytes(this: void, out?: Uint8Array, offset?: number): Error | Uint8Array;
  uuidV4Slug(this: void): UuidV4Slug;
  uuidV7Slug(this: void): UuidV7Slug;
  uuidV7MaskedSlug(this: void): MaskedUuidV7Slug;
  /**
   * Masking is UUIDv7-only, and the reason is that the whole format is spent. The check rides in
   * bits a v7 provably wastes — its constant version and variant, and the timestamp's top six —
   * plus whatever the encoding has left over. Another version would have to store its real
   * version and its full timestamp somewhere, and there is no somewhere: every one of the 132
   * bits in 22 characters already has a job. Supporting all versions would cost a 23rd character
   * on every masked slug forever, to hide a creation time only v7 discloses.
   */
  uuidV7ToMaskedSlug(this: void, uuid: string): Error | PublicUuidV7Slug;
  maskedSlugToUuidV7(this: void, slug: string): Error | UuidV7String;
  /**
   * Decodes to whatever version comes out, where `maskedSlugToUuidV7` insists on v7.
   *
   * NOT a redundant widening of that method, which is what it looks like: with
   * `legacy.directDecode` enabled a slug that matches no schema is tried as a plain unmasked
   * slug, and a system migrating off unmasked ids may well have UUIDv4 ones. Those decode here
   * and are rejected by the v7 form. Deleting this on the assumption it was a duplicate was
   * measured to break exactly that migration path.
   */
  maskedSlugToUuid(this: void, slug: string): Error | UuidString;
}
