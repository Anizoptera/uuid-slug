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

export interface MaskSchema {
  readonly id: string;
  readonly inverse: Uint8Array;
  readonly permute: Uint8Array;
  readonly tagBits: 4 | 6;
  readonly xor: Uint8Array;
}

export interface MaskSchemaOptions {
  readonly id?: string;
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

export interface UuidSlugCodec {
  readonly sentinels: readonly UuidV7Sentinel[];
  uuidV4(): UuidV4String;
  uuidV7(): UuidV7String;
  uuidV4Bytes(out?: Uint8Array, offset?: number): Error | Uint8Array;
  uuidV7Bytes(out?: Uint8Array, offset?: number): Error | Uint8Array;
  uuidV4Slug(): UuidV4Slug;
  uuidV7Slug(): UuidV7Slug;
  uuidV7MaskedSlug(): MaskedUuidV7Slug;
  uuidToSlug(uuid: string): Error | UuidSlug;
  slugToUuid(slug: string): Error | UuidString;
  uuidToMaskedSlug(uuid: string): Error | MaskedUuidSlug;
  maskedSlugToUuid(slug: string): Error | UuidString;
  uuidV7ToMaskedSlug(uuid: string): Error | PublicUuidV7Slug;
  maskedSlugToUuidV7(slug: string): Error | UuidV7String;
  parseUuid(
    uuid: string,
    out?: Uint8Array,
    offset?: number,
  ): Error | Uint8Array;
  formatUuid(bytes: Uint8Array, offset?: number): Error | UuidString;
  parseUuidSlug(
    slug: string,
    out?: Uint8Array,
    offset?: number,
  ): Error | Uint8Array;
  formatUuidSlug(bytes: Uint8Array, offset?: number): Error | UuidSlug;
}
