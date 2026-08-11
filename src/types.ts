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
  uuidV7(): UuidV7String;
  uuidV7Bytes(out?: Uint8Array, offset?: number): Error | Uint8Array;
}

/**
 * A schema is its mixing step, not the data behind one. Holding `mix` as a function rather than
 * exposing a permutation and an XOR table is what lets the masking code stay ignorant of which
 * scheme it is running: adding one is a new constructor in `schema.ts` and no branch anywhere.
 */
export interface MaskSchema {
  readonly id: string;
  /**
   * Which of the four scheme slots this occupies in a slug's spare bits. Decoding reads it and
   * applies exactly the matching schema, so schemes never have to be told apart by trial and
   * checksum — the id partitions them. Slot 0 is the original permute-and-XOR family, whose
   * slugs predate the marker and therefore encode a zero there.
   */
  readonly slugId: MaskSchemaSlugId;
  readonly tagBits: 4 | 6;
  /**
   * Transforms 16 bytes; `forward: false` MUST be the exact inverse. `input` and `output` MUST
   * NOT be the same array: a scheme that permutes reads source bytes it would already have
   * overwritten, which corrupts silently rather than failing.
   */
  mix(input: Uint8Array, output: Uint8Array, forward: boolean): void;
}

export type MaskSchemaSlugId = 0 | 1 | 2 | 3;

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
  readonly tagBits?: 4 | 6;
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
    readonly masks?: readonly MaskSchema[];
  };
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
 */
export interface UuidSlugCodec {
  readonly sentinels: readonly UuidV7Sentinel[];
  uuidV4(): UuidV4String;
  uuidV7(): UuidV7String;
  uuidV4Bytes(out?: Uint8Array, offset?: number): Error | Uint8Array;
  uuidV7Bytes(out?: Uint8Array, offset?: number): Error | Uint8Array;
  uuidV4Slug(): UuidV4Slug;
  uuidV7Slug(): UuidV7Slug;
  uuidV7MaskedSlug(): MaskedUuidV7Slug;
  /**
   * Masking is UUIDv7-only. The tag that detects a wrong schema is carried in the version and
   * variant bits, which are constant for v7 and therefore free; any other version would have to
   * store its real version somewhere, and the spare encoding bits are already spent on the
   * scheme marker. Supporting every version would cost a 23rd character on every masked slug
   * forever, to hide a timestamp that only v7 has.
   */
  uuidV7ToMaskedSlug(uuid: string): Error | PublicUuidV7Slug;
  maskedSlugToUuidV7(slug: string): Error | UuidV7String;
}
