// Generated consumer-visible declarations; update with `bun run api:update` instead of editing.

export declare interface AsyncMaskSchemaOptions extends MaskSchemaOptions {
  readonly signal?: AbortSignal;
}
declare type Brand<T, Name extends string> = T & {
  readonly [brand]: {
    [K in Name]: true;
  };
};
declare const brand: unique symbol;
export declare function createCustomMaskSchema(
  options: CustomMaskSchemaOptions,
): MaskSchema | UuidSlugError;
export declare function createMaskSchema(options: MaskSchemaOptions): MaskSchema | UuidSlugError;
export declare function createMaskSchemaAsync(
  options: AsyncMaskSchemaOptions,
): Promise<MaskSchema | UuidSlugError>;
export declare function createUuidSlugCodec(
  options: UuidSlugCodecOptions,
): UuidSlugCodec | UuidSlugError;
export declare function createUuidV7Generator(options: UuidV7GeneratorOptions): UuidV7Generator;
export declare interface CustomMaskSchemaOptions {
  readonly id: string;
  readonly forward: (input: Uint8Array) => Uint8Array | UuidSlugError;
  readonly reverse: (input: Uint8Array) => Uint8Array | UuidSlugError;
}
declare type EnabledMigrationFormat<Options extends UuidSlugMigrationOptions> =
  | "current"
  | EnabledMigrationOption<Options, "original">
  | EnabledMigrationOption<Options, "plain">;
declare type EnabledMigrationOption<
  Options,
  Option extends keyof UuidSlugMigrationOptions,
> = Option extends keyof Options ? (true extends Options[Option] ? Option : never) : never;
declare const ERROR_CODES: readonly [
  "aborted",
  "invalid_base32",
  "invalid_base64url",
  "invalid_buffer",
  "invalid_mask_schema",
  "invalid_timestamp",
  "invalid_uuid",
  "invalid_uuid_slug",
  "invalid_uuid_version",
  "rng_unavailable",
  "stale_uuid",
];
export declare function extractUuidV7Timestamp(
  bytes: Uint8Array,
  offset?: number,
): number | UuidSlugError;
export declare function formatUuid(bytes: Uint8Array, offset?: number): UuidString | UuidSlugError;
export declare function formatUuidSlug(
  bytes: Uint8Array,
  alphabet?: SlugAlphabet,
): UuidSlug | UuidSlugError;
export declare function formatUuidSlug(
  bytes: Uint8Array,
  offset: number,
  alphabet?: SlugAlphabet,
): UuidSlug | UuidSlugError;
export declare interface FreshValidationOptions {
  now?: () => number;
  windowMs?: number;
}
export declare function isUuidSlug(slug: unknown): slug is UuidSlug;
export declare function isUuidSlugError(value: unknown): value is UuidSlugError;
export declare function isUuidString(uuid: unknown): uuid is UuidString;
export declare function isUuidV4Slug(slug: unknown): slug is UuidV4Slug;
export declare function isUuidV4String(uuid: unknown): uuid is UuidV4String;
export declare function isUuidV7Bytes(bytes: unknown): bytes is UuidV7Bytes;
export declare function isUuidV7Slug(slug: unknown): slug is UuidV7Slug;
export declare function isUuidV7String(uuid: unknown): uuid is UuidV7String;
declare type MaskedUuidSlug = Brand<UuidSlug, "MaskedUuidSlug">;
export declare type MaskedUuidV7Slug = Brand<MaskedUuidSlug, "MaskedUuidV7Slug">;
export declare interface MaskSchema {
  readonly id: string;
  readonly [maskSchemaBrand]: true;
}
declare const maskSchemaBrand: unique symbol;
export declare interface MaskSchemaOptions {
  readonly id?: string;
  readonly seed: string | Uint8Array;
  readonly keyIterations?: number;
}
export declare type MigrationFormat = "current" | "original" | "plain";
export declare function parseUuid(uuid: string): UuidBytes | UuidSlugError;
export declare function parseUuid<T extends Uint8Array>(
  uuid: string,
  out: T,
  offset?: number,
): T | UuidSlugError;
export declare function parseUuidSlug(slug: string): UuidBytes | UuidSlugError;
export declare function parseUuidSlug<T extends Uint8Array>(
  slug: string,
  out: T,
  offset?: number,
): T | UuidSlugError;
export declare const PUBLIC_MASK_SCHEMA: MaskSchema;
export declare type PublicUuidV7Slug = MaskedUuidV7Slug | SentinelUuidV7Slug;
export declare type SentinelUuidV7Slug = Brand<UuidV7Slug, "SentinelUuidV7Slug">;
export declare type SlugAlphabet = "base64url" | "base32hex";
export declare function slugToUuid(slug: string): UuidString | UuidSlugError;
export declare const UUID_SLUG_ERROR_CODES: typeof ERROR_CODES;
export declare const UUID_V7_SENTINEL_DEFINITIONS: readonly UuidV7SentinelDefinition[];
export declare type UuidBytes = Brand<Uint8Array, "UuidBytes">;
export declare type UuidSlug = Brand<string, "UuidSlug">;
export declare interface UuidSlugCodec {
  readonly sentinels: readonly UuidV7Sentinel[];
  migration<const Options extends UuidSlugMigrationOptions = {}>(
    this: void,
    options?: Options,
  ): UuidSlugMigration<EnabledMigrationFormat<Options>>;
  uuidV7MaskedSlug(this: void): PublicUuidV7Slug | UuidSlugError;
  uuidV7ToMaskedSlug(this: void, uuid: string): PublicUuidV7Slug | UuidSlugError;
  maskedSlugToUuidV7(this: void, slug: string): UuidV7String | UuidSlugError;
  validateMaskedSlugFresh<S extends string>(
    this: void,
    slug: S,
    freshness?: FreshValidationOptions,
  ): S | UuidSlugError;
}
export declare interface UuidSlugCodecOptions {
  readonly generator?: UuidV7BytesSource;
  readonly previousMasks?: readonly (MaskSchema | MaskSchemaOptions)[];
  readonly mask: MaskSchema | MaskSchemaOptions;
  readonly sentinels?: readonly UuidV7SentinelDefinition[];
  readonly maskedSlugAlphabet?: SlugAlphabet;
}
export declare class UuidSlugError extends Error {
  readonly code: UuidSlugErrorCode;
  constructor(code: UuidSlugErrorCode, message: string, options?: ErrorOptions);
}
export declare type UuidSlugErrorCode = (typeof UUID_SLUG_ERROR_CODES)[number];
export declare interface UuidSlugMigration<Format extends MigrationFormat = MigrationFormat> {
  decode(this: void, slug: string, format?: Format): UuidString | UuidSlugError;
  candidates(this: void, slug: string, format?: Format): UuidString[] | UuidSlugError;
}
export declare interface UuidSlugMigrationOptions {
  readonly original?: boolean;
  readonly plain?: boolean;
}
export declare type UuidString = Brand<string, "UuidString">;
export declare function uuidToSlug(uuid: string, alphabet?: SlugAlphabet): UuidSlug | UuidSlugError;
export declare function uuidV4(): UuidV4String | UuidSlugError;
export declare type UuidV4Bytes = Brand<UuidBytes, "UuidV4Bytes">;
export declare function uuidV4Bytes(): UuidV4Bytes | UuidSlugError;
export declare function uuidV4Bytes<T extends Uint8Array>(
  out: T,
  offset?: number,
): T | UuidSlugError;
export declare type UuidV4Slug = Brand<UuidSlug, "UuidV4Slug">;
export declare function uuidV4Slug(alphabet?: SlugAlphabet): UuidV4Slug | UuidSlugError;
export declare type UuidV4String = Brand<UuidString, "UuidV4String">;
export declare const uuidV7: () => UuidV7String | UuidSlugError;
export declare const uuidV7At: (timestamp: number) => UuidV7String | UuidSlugError;
export declare type UuidV7Bytes = Brand<UuidBytes, "UuidV7Bytes">;
export declare function uuidV7Bytes(): UuidV7Bytes | UuidSlugError;
export declare function uuidV7Bytes<T extends Uint8Array>(
  out: T,
  offset?: number,
): T | UuidSlugError;
export declare function uuidV7BytesAt(timestamp: number): UuidV7Bytes | UuidSlugError;
export declare function uuidV7BytesAt<T extends Uint8Array>(
  timestamp: number,
  out: T,
  offset?: number,
): T | UuidSlugError;
export declare interface UuidV7BytesSource {
  uuidV7Bytes(this: void): Uint8Array | UuidSlugError;
}
export declare interface UuidV7Generator extends UuidV7BytesSource {
  uuidV7(this: void): UuidV7String | UuidSlugError;
  uuidV7Bytes(this: void): UuidV7Bytes | UuidSlugError;
  uuidV7Bytes<T extends Uint8Array>(this: void, out: T, offset?: number): T | UuidSlugError;
  uuidV7At(this: void, timestamp: number): UuidV7String | UuidSlugError;
  uuidV7BytesAt(this: void, timestamp: number): UuidV7Bytes | UuidSlugError;
  uuidV7BytesAt<T extends Uint8Array>(
    this: void,
    timestamp: number,
    out: T,
    offset?: number,
  ): T | UuidSlugError;
}
export declare interface UuidV7GeneratorOptions {
  readonly clock?: () => number;
  readonly fillRandom: (bytes: Uint8Array<ArrayBuffer>) => void;
}
export declare interface UuidV7Sentinel {
  readonly name: string;
  readonly slug: SentinelUuidV7Slug;
  readonly uuid: UuidV7String;
}
export declare interface UuidV7SentinelDefinition {
  readonly name: string;
  readonly uuid: string;
}
export declare type UuidV7Slug = Brand<UuidSlug, "UuidV7Slug">;
export declare function uuidV7Slug(alphabet?: SlugAlphabet): UuidV7Slug | UuidSlugError;
export declare type UuidV7String = Brand<UuidString, "UuidV7String">;
export declare function validateUuidV7Fresh(
  uuid: string,
  options?: FreshValidationOptions,
): UuidV7String | UuidSlugError;
export declare function validateUuidV7SlugFresh(
  slug: string,
  options?: FreshValidationOptions,
): UuidV7Slug | UuidSlugError;
