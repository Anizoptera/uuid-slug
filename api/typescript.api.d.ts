// Generated consumer-visible declarations; update with `bun run api:update` instead of editing.

export declare interface AsyncMaskSchemaOptions extends MaskSchemaOptions {
  readonly signal?: AbortSignal;
}
declare type Brand<Value, Name extends string> = Value & {
  readonly [brand]: {
    [BrandName in Name]: true;
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
declare type DirectUuidSlugInput<Input extends string> = RejectKnownInput<
  Input,
  UuidString | MaskedUuidSlug
>;
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
export declare function extractUuidV7Timestamp<Input extends Uint8Array>(
  bytes: UuidV7BytesInput<Input>,
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
  readonly now?: () => number;
  readonly windowMs?: number;
}
export declare function isUuidSlug(slug: unknown): slug is UuidSlug;
export declare function isUuidSlugError(value: unknown): value is UuidSlugError;
export declare function isUuidString(uuid: unknown): uuid is UuidString;
export declare function isUuidV4Slug(slug: unknown): slug is UuidV4Slug;
export declare function isUuidV4String(uuid: unknown): uuid is UuidV4String;
export declare function isUuidV7Bytes(bytes: unknown): bytes is UuidV7Bytes;
export declare function isUuidV7Slug(slug: unknown): slug is UuidV7Slug;
export declare function isUuidV7String(uuid: unknown): uuid is UuidV7String;
declare type MaskedUuidSlug = Brand<string, "MaskedUuidSlug">;
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
export declare function parseUuid<Input extends string>(
  uuid: UuidStringInput<Input>,
): PreserveUuidVersion<Input, UuidBytes, UuidV4Bytes, UuidV7Bytes> | UuidSlugError;
export declare function parseUuid<Input extends string, Output extends Uint8Array>(
  uuid: UuidStringInput<Input>,
  out: Output,
  offset?: number,
): Output | UuidSlugError;
export declare function parseUuidSlug<Input extends string>(
  slug: DirectUuidSlugInput<Input>,
): PreserveUuidVersion<Input, UuidBytes, UuidV4Bytes, UuidV7Bytes> | UuidSlugError;
export declare function parseUuidSlug<Input extends string, Output extends Uint8Array>(
  slug: DirectUuidSlugInput<Input>,
  out: Output,
  offset?: number,
): Output | UuidSlugError;
declare type PreserveUuidVersion<Input, UnknownVersion, Version4, Version7> = Input extends
  | UuidV4String
  | UuidV4Slug
  ? Version4
  : Input extends UuidV7String | UuidV7Slug
    ? Version7
    : UnknownVersion;
export declare const PUBLIC_MASK_SCHEMA: MaskSchema;
export declare type PublicUuidV7Slug = MaskedUuidV7Slug | SentinelUuidV7Slug;
declare type RejectKnownInput<Input, Invalid> = [Extract<Input, Invalid>] extends [never]
  ? Input
  : never;
export declare type SentinelUuidV7Slug = Brand<UuidV7Slug, "SentinelUuidV7Slug">;
export declare type SlugAlphabet = "base64url" | "base32hex";
declare type SlugStringInput<Input extends string> = RejectKnownInput<Input, UuidString>;
export declare function slugToUuid<Input extends string>(
  slug: DirectUuidSlugInput<Input>,
): PreserveUuidVersion<Input, UuidString, UuidV4String, UuidV7String> | UuidSlugError;
export declare function unwrapUuidSlug<Value>(value: Value): Exclude<Value, UuidSlugError>;
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
  uuidV7ToMaskedSlug<Input extends string | Uint8Array>(
    this: void,
    uuid: UuidV7ValueInput<Input>,
  ): PublicUuidV7Slug | UuidSlugError;
  maskedSlugToUuidV7<Input extends string>(
    this: void,
    slug: SlugStringInput<Input>,
  ): UuidV7String | UuidSlugError;
  maskedSlugToUuidV7Bytes<Input extends string>(
    this: void,
    slug: SlugStringInput<Input>,
  ): UuidV7Bytes | UuidSlugError;
  maskedSlugToUuidV7Bytes<Input extends string, Output extends Uint8Array>(
    this: void,
    slug: SlugStringInput<Input>,
    out: Output,
    offset?: number,
  ): Output | UuidSlugError;
  validateMaskedSlugFresh<Input extends string>(
    this: void,
    slug: SlugStringInput<Input>,
    freshness?: FreshValidationOptions,
  ): (Input & PublicUuidV7Slug) | UuidSlugError;
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
export declare interface UuidSlugMigration<in Format extends MigrationFormat = MigrationFormat> {
  decode<Input extends string>(
    this: void,
    slug: SlugStringInput<Input>,
    format?: Format,
  ): UuidString | UuidSlugError;
  candidates<Input extends string>(
    this: void,
    slug: SlugStringInput<Input>,
    format?: Format,
  ): UuidString[] | UuidSlugError;
}
export declare interface UuidSlugMigrationOptions {
  readonly original?: boolean;
  readonly plain?: boolean;
}
export declare type UuidString = Brand<string, "UuidString">;
declare type UuidStringInput<Input extends string> = RejectKnownInput<
  Input,
  UuidSlug | MaskedUuidSlug
>;
export declare function uuidToSlug<Input extends string>(
  uuid: UuidStringInput<Input>,
  alphabet?: SlugAlphabet,
): PreserveUuidVersion<Input, UuidSlug, UuidV4Slug, UuidV7Slug> | UuidSlugError;
export declare function uuidV4(): UuidV4String | UuidSlugError;
export declare type UuidV4Bytes = Brand<UuidBytes, "UuidV4Bytes">;
export declare function uuidV4Bytes(): UuidV4Bytes | UuidSlugError;
export declare function uuidV4Bytes<Output extends Uint8Array>(
  out: Output,
  offset?: number,
): Output | UuidSlugError;
export declare type UuidV4Slug = Brand<UuidSlug, "UuidV4Slug">;
export declare function uuidV4Slug(alphabet?: SlugAlphabet): UuidV4Slug | UuidSlugError;
export declare type UuidV4String = Brand<UuidString, "UuidV4String">;
export declare const uuidV7: () => UuidV7String | UuidSlugError;
export declare const uuidV7At: (timestamp: number) => UuidV7String | UuidSlugError;
export declare type UuidV7Bytes = Brand<UuidBytes, "UuidV7Bytes">;
export declare function uuidV7Bytes(): UuidV7Bytes | UuidSlugError;
export declare function uuidV7Bytes<Output extends Uint8Array>(
  out: Output,
  offset?: number,
): Output | UuidSlugError;
export declare function uuidV7BytesAt(timestamp: number): UuidV7Bytes | UuidSlugError;
export declare function uuidV7BytesAt<Output extends Uint8Array>(
  timestamp: number,
  out: Output,
  offset?: number,
): Output | UuidSlugError;
declare type UuidV7BytesInput<Input extends Uint8Array> = RejectKnownInput<Input, UuidV4Bytes>;
export declare interface UuidV7BytesSource {
  uuidV7Bytes(this: void): Uint8Array | UuidSlugError;
}
export declare interface UuidV7Generator extends UuidV7BytesSource {
  uuidV7(this: void): UuidV7String | UuidSlugError;
  uuidV7Bytes(this: void): UuidV7Bytes | UuidSlugError;
  uuidV7Bytes<Output extends Uint8Array>(
    this: void,
    out: Output,
    offset?: number,
  ): Output | UuidSlugError;
  uuidV7At(this: void, timestamp: number): UuidV7String | UuidSlugError;
  uuidV7BytesAt(this: void, timestamp: number): UuidV7Bytes | UuidSlugError;
  uuidV7BytesAt<Output extends Uint8Array>(
    this: void,
    timestamp: number,
    out: Output,
    offset?: number,
  ): Output | UuidSlugError;
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
declare type UuidV7SlugInput<Input extends string> = RejectKnownInput<
  Input,
  UuidString | MaskedUuidSlug | UuidV4Slug
>;
export declare type UuidV7String = Brand<UuidString, "UuidV7String">;
declare type UuidV7StringInput<Input extends string> = RejectKnownInput<
  Input,
  UuidSlug | MaskedUuidSlug | UuidV4String
>;
declare type UuidV7ValueInput<Input extends string | Uint8Array> = RejectKnownInput<
  Input,
  UuidSlug | MaskedUuidSlug | UuidV4String | UuidV4Bytes
>;
export declare function validateUuidV7Fresh<Input extends string>(
  uuid: UuidV7StringInput<Input>,
  options?: FreshValidationOptions,
): (Input & UuidV7String) | UuidSlugError;
export declare function validateUuidV7SlugFresh<Input extends string>(
  slug: UuidV7SlugInput<Input>,
  options?: FreshValidationOptions,
): (Input & UuidV7Slug) | UuidSlugError;
