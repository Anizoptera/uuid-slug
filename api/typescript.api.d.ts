// Generated consumer-visible declarations; update with `bun run api:update` instead of editing.

declare const ALPHABETS: readonly ["base64url", "base32hex"];
export declare interface AsyncUuidV7MaskOptions extends UuidV7MaskOptions {
  readonly signal?: AbortSignal;
}
declare type Brand<Value, Name extends string> = Value & {
  readonly [brand]: {
    [BrandName in Name]: true;
  };
};
declare const brand: unique symbol;
export declare function bytesToSlug(
  bytes: Uint8Array,
  alphabet?: SlugAlphabet,
): UuidSlug | UuidSlugError;
export declare function bytesToSlug(
  bytes: Uint8Array,
  byteOffset: number,
  alphabet?: SlugAlphabet,
): UuidSlug | UuidSlugError;
export declare function bytesToUuid(
  bytes: Uint8Array,
  byteOffset?: number,
): UuidString | UuidSlugError;
export declare function createCustomUuidV7Mask(
  options: CustomUuidV7MaskOptions,
): UuidV7Mask | UuidSlugError;
export declare function createUuidV7Generator(options: UuidV7GeneratorOptions): UuidV7Generator;
export declare function createUuidV7Mask(options: UuidV7MaskOptions): UuidV7Mask | UuidSlugError;
export declare function createUuidV7MaskAsync(
  options: AsyncUuidV7MaskOptions,
): Promise<UuidV7Mask | UuidSlugError>;
export declare function createUuidV7SlugCodec(
  options: UuidV7SlugCodecOptions,
): UuidV7SlugCodec | UuidSlugError;
export declare interface CustomUuidV7MaskOptions {
  readonly label: string;
  readonly mask: (bytes: Uint8Array) => Uint8Array | UuidSlugError;
  readonly unmask: (bytes: Uint8Array) => Uint8Array | UuidSlugError;
}
declare type DirectUuidSlugInput<Input extends string> = RejectKnownInput<
  Input,
  UuidString | MaskedUuidSlug
>;
declare type EnabledMigrationFormat<Options extends UuidSlugMigrationOptions> =
  | "current-mask"
  | (EnabledMigrationOption<Options, "originalMask"> extends never ? never : "original-mask")
  | (EnabledMigrationOption<Options, "plainSlug"> extends never ? never : "plain-slug");
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
  "invalid_options",
  "invalid_sentinel",
  "invalid_timestamp",
  "invalid_uuid",
  "invalid_uuid_slug",
  "invalid_uuid_version",
  "rng_unavailable",
  "timestamp_outside_window",
];
export declare function extractUuidV7Timestamp<Input extends string>(
  value: UuidV7TimestampInput<Input>,
): number | UuidSlugError;
export declare function extractUuidV7Timestamp<Input extends Uint8Array>(
  value: UuidV7BytesInput<Input>,
  byteOffset?: number,
): number | UuidSlugError;
export declare function generateUuidV4(): UuidV4String | UuidSlugError;
export declare function generateUuidV4Bytes(): UuidV4Bytes | UuidSlugError;
export declare function generateUuidV4Bytes<Output extends Uint8Array>(
  output: Output,
  outputOffset?: number,
): Output | UuidSlugError;
export declare function generateUuidV4Slug(alphabet?: SlugAlphabet): UuidV4Slug | UuidSlugError;
export declare const generateUuidV7: () => UuidV7String | UuidSlugError;
export declare const generateUuidV7At: (unixMs: number) => UuidV7String | UuidSlugError;
export declare function generateUuidV7Bytes(): UuidV7Bytes | UuidSlugError;
export declare function generateUuidV7Bytes<Output extends Uint8Array>(
  output: Output,
  outputOffset?: number,
): Output | UuidSlugError;
export declare function generateUuidV7BytesAt(unixMs: number): UuidV7Bytes | UuidSlugError;
export declare function generateUuidV7BytesAt<Output extends Uint8Array>(
  unixMs: number,
  output: Output,
  outputOffset?: number,
): Output | UuidSlugError;
export declare function generateUuidV7Slug(alphabet?: SlugAlphabet): UuidV7Slug | UuidSlugError;
export declare function isUuidBytes(value: unknown): value is UuidBytes;
export declare function isUuidSlug(value: unknown): value is UuidSlug;
export declare function isUuidSlugError(value: unknown): value is UuidSlugError;
export declare function isUuidString(value: unknown): value is UuidString;
export declare function isUuidV4Bytes(value: unknown): value is UuidV4Bytes;
export declare function isUuidV4Slug(value: unknown): value is UuidV4Slug;
export declare function isUuidV4String(value: unknown): value is UuidV4String;
export declare function isUuidV7Bytes(value: unknown): value is UuidV7Bytes;
export declare function isUuidV7Slug(value: unknown): value is UuidV7Slug;
export declare function isUuidV7String(value: unknown): value is UuidV7String;
declare type MaskedUuidSlug = Brand<string, "MaskedUuidSlug">;
export declare type MaskedUuidV7Slug = Brand<MaskedUuidSlug, "MaskedUuidV7Slug">;
declare const maskSchemaBrand: unique symbol;
declare const MIGRATION_FORMATS: readonly ["current-mask", "original-mask", "plain-slug"];
declare type PreserveUuidVersion<Input, UnknownVersion, Version4, Version7> = Input extends
  | UuidV4String
  | UuidV4Slug
  ? Version4
  : Input extends UuidV7String | UuidV7Slug
    ? Version7
    : UnknownVersion;
declare type RejectKnownInput<Input, Invalid> = [Extract<Input, Invalid>] extends [never]
  ? Input
  : never;
export declare type SentinelUuidV7Slug = Brand<UuidV7Slug, "SentinelUuidV7Slug">;
export declare type SlugAlphabet = (typeof UUID_SLUG_ALPHABETS)[number];
declare type SlugStringInput<Input extends string> = RejectKnownInput<Input, UuidString>;
export declare function slugToBytes<Input extends string>(
  slug: DirectUuidSlugInput<Input>,
): PreserveUuidVersion<Input, UuidBytes, UuidV4Bytes, UuidV7Bytes> | UuidSlugError;
export declare function slugToBytes<Input extends string, Output extends Uint8Array>(
  slug: DirectUuidSlugInput<Input>,
  output: Output,
  outputOffset?: number,
): Output | UuidSlugError;
export declare function slugToUuid<Input extends string>(
  slug: DirectUuidSlugInput<Input>,
): PreserveUuidVersion<Input, UuidString, UuidV4String, UuidV7String> | UuidSlugError;
export declare const UUID_SLUG_ALPHABETS: typeof ALPHABETS;
export declare const UUID_SLUG_ERROR_CODES: typeof ERROR_CODES;
export declare const UUID_SLUG_MIGRATION_FORMATS: typeof MIGRATION_FORMATS;
export declare const UUID_V7_TEST_MASK: UuidV7Mask;
export declare type UuidBytes = Brand<Uint8Array, "UuidBytes">;
export declare type UuidSlug = Brand<string, "UuidSlug">;
export declare class UuidSlugError extends Error {
  readonly code: UuidSlugErrorCode;
  constructor(code: UuidSlugErrorCode, message: string, options?: ErrorOptions);
}
export declare type UuidSlugErrorCode = (typeof UUID_SLUG_ERROR_CODES)[number];
export declare interface UuidSlugMigrationDecoder<
  in Format extends UuidSlugMigrationFormat = UuidSlugMigrationFormat,
> {
  decodeSlug<Input extends string>(
    this: void,
    slug: SlugStringInput<Input>,
    format?: Format,
  ): UuidString | UuidSlugError;
  decodeSlugCandidates<Input extends string>(
    this: void,
    slug: SlugStringInput<Input>,
    format?: Format,
  ): UuidString[] | UuidSlugError;
}
export declare type UuidSlugMigrationFormat = (typeof UUID_SLUG_MIGRATION_FORMATS)[number];
export declare interface UuidSlugMigrationOptions {
  readonly originalMask?: boolean;
  readonly plainSlug?: boolean;
}
export declare type UuidString = Brand<string, "UuidString">;
declare type UuidStringInput<Input extends string> = RejectKnownInput<
  Input,
  UuidSlug | MaskedUuidSlug
>;
export declare function uuidToBytes<Input extends string>(
  uuid: UuidStringInput<Input>,
): PreserveUuidVersion<Input, UuidBytes, UuidV4Bytes, UuidV7Bytes> | UuidSlugError;
export declare function uuidToBytes<Input extends string, Output extends Uint8Array>(
  uuid: UuidStringInput<Input>,
  output: Output,
  outputOffset?: number,
): Output | UuidSlugError;
export declare function uuidToSlug<Input extends string>(
  uuid: UuidStringInput<Input>,
  alphabet?: SlugAlphabet,
): PreserveUuidVersion<Input, UuidSlug, UuidV4Slug, UuidV7Slug> | UuidSlugError;
export declare type UuidV4Bytes = Brand<UuidBytes, "UuidV4Bytes">;
export declare type UuidV4Slug = Brand<UuidSlug, "UuidV4Slug">;
export declare type UuidV4String = Brand<UuidString, "UuidV4String">;
export declare type UuidV7Bytes = Brand<UuidBytes, "UuidV7Bytes">;
declare type UuidV7BytesInput<Input extends Uint8Array> = RejectKnownInput<Input, UuidV4Bytes>;
export declare type UuidV7CodecSlug = MaskedUuidV7Slug | SentinelUuidV7Slug;
export declare interface UuidV7Generator {
  generateUuidV7(this: void): UuidV7String | UuidSlugError;
  generateUuidV7Bytes(this: void): UuidV7Bytes | UuidSlugError;
  generateUuidV7Bytes<Output extends Uint8Array>(
    this: void,
    output: Output,
    outputOffset?: number,
  ): Output | UuidSlugError;
  generateUuidV7At(this: void, unixMs: number): UuidV7String | UuidSlugError;
  generateUuidV7BytesAt(this: void, unixMs: number): UuidV7Bytes | UuidSlugError;
  generateUuidV7BytesAt<Output extends Uint8Array>(
    this: void,
    unixMs: number,
    output: Output,
    outputOffset?: number,
  ): Output | UuidSlugError;
}
export declare interface UuidV7GeneratorOptions {
  readonly clock?: () => number;
}
export declare interface UuidV7Mask {
  readonly label: string;
  readonly [maskSchemaBrand]: true;
}
export declare interface UuidV7MaskOptions {
  readonly label?: string;
  readonly seed: string | Uint8Array;
  readonly keyDerivationIterations?: number;
}
export declare interface UuidV7Sentinel {
  readonly name: string;
  readonly slug: SentinelUuidV7Slug;
  readonly uuid: UuidV7String;
}
export declare interface UuidV7SentinelConfig {
  readonly name: string;
  readonly uuid: string;
}
export declare type UuidV7Slug = Brand<UuidSlug, "UuidV7Slug">;
export declare interface UuidV7SlugCodec {
  readonly sentinels: readonly UuidV7Sentinel[];
  createMigrationDecoder<const Options extends UuidSlugMigrationOptions = {}>(
    this: void,
    options?: Options,
  ): UuidSlugMigrationDecoder<EnabledMigrationFormat<Options>>;
  generateSlug(this: void): UuidV7CodecSlug | UuidSlugError;
  encodeUuid<Input extends string | Uint8Array>(
    this: void,
    uuid: UuidV7ValueInput<Input>,
  ): UuidV7CodecSlug | UuidSlugError;
  decodeSlug<Input extends string>(
    this: void,
    slug: SlugStringInput<Input>,
  ): UuidV7String | UuidSlugError;
  decodeSlugToBytes<Input extends string>(
    this: void,
    slug: SlugStringInput<Input>,
  ): UuidV7Bytes | UuidSlugError;
  decodeSlugToBytes<Input extends string, Output extends Uint8Array>(
    this: void,
    slug: SlugStringInput<Input>,
    output: Output,
    outputOffset?: number,
  ): Output | UuidSlugError;
  extractSlugTimestamp<Input extends string>(
    this: void,
    slug: SlugStringInput<Input>,
  ): number | UuidSlugError;
  validateSlugTimestamp<Input extends string>(
    this: void,
    slug: SlugStringInput<Input>,
    window: UuidV7TimestampWindow,
  ): (Input & UuidV7CodecSlug) | UuidSlugError;
}
export declare interface UuidV7SlugCodecOptions {
  readonly previousMasks?: readonly (UuidV7Mask | UuidV7MaskOptions)[];
  readonly mask: UuidV7Mask | UuidV7MaskOptions;
  readonly sentinels?: readonly UuidV7SentinelConfig[];
  readonly outputAlphabet?: SlugAlphabet;
}
declare type UuidV7SlugInput<Input extends string> = RejectKnownInput<
  Input,
  UuidString | MaskedUuidSlug | UuidV4Slug
>;
export declare type UuidV7String = Brand<UuidString, "UuidV7String">;
declare type UuidV7StringInput<Input extends string> = RejectKnownInput<
  Input,
  UuidSlug | MaskedUuidSlug | UuidV4String
>;
declare type UuidV7TimestampInput<Input extends string> = RejectKnownInput<
  Input,
  MaskedUuidSlug | UuidV4String | UuidV4Slug
>;
export declare interface UuidV7TimestampWindow {
  readonly maxTimestampDeltaMs: number;
  readonly referenceUnixMs?: number;
}
declare type UuidV7ValueInput<Input extends string | Uint8Array> = RejectKnownInput<
  Input,
  UuidSlug | MaskedUuidSlug | UuidV4String | UuidV4Bytes
>;
export declare function validateUuidV7SlugTimestamp<Input extends string>(
  slug: UuidV7SlugInput<Input>,
  window: UuidV7TimestampWindow,
): (Input & UuidV7Slug) | UuidSlugError;
export declare function validateUuidV7Timestamp<Input extends string>(
  uuid: UuidV7StringInput<Input>,
  window: UuidV7TimestampWindow,
): (Input & UuidV7String) | UuidSlugError;
