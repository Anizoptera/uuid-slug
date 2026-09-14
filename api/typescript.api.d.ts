// Generated signature baseline for compatibility checks; update with `bun run api:update` instead of editing.

export declare const ABORTED = "aborted";
export declare interface AsyncUuidV7MaskOptions extends UuidV7MaskOptions {
  readonly signal?: AbortSignal;
}
export declare const BASE32HEX = "base32hex";
export declare const BASE64URL = "base64url";
declare type Brand<Value, Name extends string> = Value & {
  readonly [brand]: {
    [BrandName in Name]: true;
  };
};
declare const brand: unique symbol;
export declare function bytesToUuidString<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
  bytes: Uint8Array | UuidSlugError,
  textCase?: Case,
): UuidStringFor<Case> | UuidSlugError;
export declare function bytesToUuidString<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
  bytes: Uint8Array | UuidSlugError,
  byteOffset: number,
  textCase?: Case,
): UuidStringFor<Case> | UuidSlugError;
export declare function createCustomUuidV7Mask(
  options: CustomUuidV7MaskOptions,
): UuidV7Mask | UuidSlugError;
export declare function createUuidV7Generator(options?: UuidV7GeneratorOptions): UuidV7Generator;
export declare function createUuidV7SlugCodec(
  options: UuidV7SlugCodecOptions,
): UuidV7SlugCodec | UuidSlugError;
export declare interface CustomUuidV7MaskOptions {
  readonly diagnosticLabel: string;
  readonly mask: (bytes: Uint8Array) => Uint8Array | UuidSlugError;
  readonly unmask: (bytes: Uint8Array) => Uint8Array | UuidSlugError;
}
export declare function deriveUuidV7Mask(options: UuidV7MaskOptions): UuidV7Mask | UuidSlugError;
export declare function deriveUuidV7MaskAsync(
  options: AsyncUuidV7MaskOptions,
): Promise<UuidV7Mask | UuidSlugError>;
export declare const DIRECT_SLUG_FORMAT = "direct-slug";
export declare type DirectUuidSlug = Brand<string, "DirectUuidSlug">;
declare type DirectUuidSlugInput<Input extends string | UuidSlugError> = RejectKnownInput<
  Input,
  UuidString | MaskedUuidSlug
>;
export declare type DirectUuidV4Slug = Brand<DirectUuidSlug, "DirectUuidV4Slug">;
export declare type DirectUuidV7Slug = Brand<DirectUuidSlug, "DirectUuidV7Slug">;
declare type DirectUuidV7SlugInput<Input extends string | UuidSlugError> = RejectKnownInput<
  Input,
  UuidString | MaskedUuidSlug | DirectUuidV4Slug
>;
declare type EnabledMigrationFormat<Options extends UuidSlugMigrationOptions> =
  | typeof SEEDED_MASK_FORMAT
  | (EnabledMigrationOption<Options, "acceptFixedMask"> extends never
      ? never
      : typeof FIXED_MASK_FORMAT)
  | (EnabledMigrationOption<Options, "acceptDirectSlug"> extends never
      ? never
      : typeof DIRECT_SLUG_FORMAT);
declare type EnabledMigrationOption<
  Options,
  Option extends keyof UuidSlugMigrationOptions,
> = Option extends keyof Options ? (true extends Options[Option] ? Option : never) : never;
export declare function extractUuidV7UnixMs<Input extends string | UuidSlugError>(
  value: UuidV7TimestampInput<Input>,
): number | UuidSlugError;
export declare function extractUuidV7UnixMs<Input extends Uint8Array | UuidSlugError>(
  value: UuidV7BytesInput<Input>,
  byteOffset?: number,
): number | UuidSlugError;
export declare const FIXED_MASK_FORMAT = "fixed-mask";
export declare function generateDirectUuidV4Slug(
  alphabet?: SlugAlphabet,
): DirectUuidV4Slug | UuidSlugError;
export declare function generateDirectUuidV7Slug(
  alphabet?: SlugAlphabet,
): DirectUuidV7Slug | UuidSlugError;
export declare interface GeneratedUuidV7<Slug extends DirectUuidV7Slug | UuidV7CodecSlug> {
  readonly uuid: UuidV7String;
  readonly slug: Slug;
}
export declare function generateUuidV4(): UuidV4String | UuidSlugError;
export declare function generateUuidV4Bytes(): UuidV4Bytes | UuidSlugError;
export declare function generateUuidV4Bytes<Output extends Uint8Array>(
  output: Output,
  outputOffset?: number,
): Output | UuidSlugError;
export declare const generateUuidV7: () => UuidV7String | UuidSlugError;
export declare const generateUuidV7AtUnixMs: (unixMs: number) => UuidV7String | UuidSlugError;
export declare function generateUuidV7Bytes(): UuidV7Bytes | UuidSlugError;
export declare function generateUuidV7Bytes<Output extends Uint8Array>(
  output: Output,
  outputOffset?: number,
): Output | UuidSlugError;
export declare function generateUuidV7BytesAtUnixMs(unixMs: number): UuidV7Bytes | UuidSlugError;
export declare function generateUuidV7BytesAtUnixMs<Output extends Uint8Array>(
  unixMs: number,
  output: Output,
  outputOffset?: number,
): Output | UuidSlugError;
export declare function generateUuidV7WithDirectSlug(
  alphabet?: SlugAlphabet,
): GeneratedUuidV7<DirectUuidV7Slug> | UuidSlugError;
export declare const INVALID_BASE32HEX = "invalid_base32hex";
export declare const INVALID_BASE64URL = "invalid_base64url";
export declare const INVALID_BUFFER = "invalid_buffer";
export declare const INVALID_MASK = "invalid_mask";
export declare const INVALID_OPTIONS = "invalid_options";
export declare const INVALID_SENTINEL = "invalid_sentinel";
export declare const INVALID_TIMESTAMP = "invalid_timestamp";
export declare const INVALID_UUID = "invalid_uuid";
export declare const INVALID_UUID_SLUG = "invalid_uuid_slug";
export declare const INVALID_UUID_VERSION = "invalid_uuid_version";
export declare function isDirectUuidSlug(value: unknown): value is DirectUuidSlug;
export declare function isDirectUuidV4Slug(value: unknown): value is DirectUuidV4Slug;
export declare function isDirectUuidV7Slug(value: unknown): value is DirectUuidV7Slug;
export declare function isUuidBytes(value: unknown): value is UuidBytes;
export declare function isUuidSlugError(value: unknown): value is UuidSlugError;
export declare function isUuidString(value: unknown): value is UuidString;
export declare function isUuidV4Bytes(value: unknown): value is UuidV4Bytes;
export declare function isUuidV4String(value: unknown): value is UuidV4String;
export declare function isUuidV7Bytes(value: unknown): value is UuidV7Bytes;
export declare function isUuidV7String(value: unknown): value is UuidV7String;
declare type MaskedUuidSlug = Brand<string, "MaskedUuidSlug">;
export declare type MaskedUuidV7Slug = Brand<MaskedUuidSlug, "MaskedUuidV7Slug">;
declare type PreserveUuidVersion<Input, UnknownVersion, Version4, Version7> =
  Input extends UuidSlugError
    ? never
    : Input extends UuidV4String | DirectUuidV4Slug
      ? Version4
      : Input extends UuidV7String | DirectUuidV7Slug
        ? Version7
        : UnknownVersion;
declare type RejectKnownInput<Input, Invalid> = [
  Extract<Exclude<Input, UuidSlugError>, Invalid>,
] extends [never]
  ? Input
  : never;
export declare const RNG_UNAVAILABLE = "rng_unavailable";
export declare const SEEDED_MASK_FORMAT = "seeded-mask";
export declare type SentinelUuidV7Slug = Brand<DirectUuidV7Slug, "SentinelUuidV7Slug">;
export declare type SlugAlphabet = typeof BASE64URL | typeof BASE32HEX;
declare type SlugStringInput<Input extends string | UuidSlugError> = RejectKnownInput<
  Input,
  UuidString
>;
export declare function slugToUuidBytes<Input extends string | UuidSlugError>(
  slug: DirectUuidSlugInput<Input>,
): PreserveUuidVersion<Input, UuidBytes, UuidV4Bytes, UuidV7Bytes> | UuidSlugError;
export declare function slugToUuidBytes<
  Input extends string | UuidSlugError,
  Output extends Uint8Array,
>(slug: DirectUuidSlugInput<Input>, output: Output, outputOffset?: number): Output | UuidSlugError;
export declare function slugToUuidString<Input extends string | UuidSlugError>(
  slug: DirectUuidSlugInput<Input>,
): PreserveUuidVersion<Input, UuidString, UuidV4String, UuidV7String> | UuidSlugError;
export declare const TIMESTAMP_OUTSIDE_WINDOW = "timestamp_outside_window";
export declare type UppercaseUuidString = Brand<string, "UppercaseUuidString">;
export declare const UUID_TEXT_LOWERCASE: unique symbol;
export declare const UUID_TEXT_UPPERCASE: unique symbol;
export declare const UUID_V7_TEST_MASK: UuidV7Mask;
export declare type UuidBytes = Brand<Uint8Array, "UuidBytes">;
export declare function uuidBytesToDirectSlug(
  bytes: Uint8Array | UuidSlugError,
  alphabet?: SlugAlphabet,
): DirectUuidSlug | UuidSlugError;
export declare function uuidBytesToDirectSlug(
  bytes: Uint8Array | UuidSlugError,
  byteOffset: number,
  alphabet?: SlugAlphabet,
): DirectUuidSlug | UuidSlugError;
export declare class UuidSlugError extends Error {
  readonly __failure: true;
  readonly code: UuidSlugErrorCode;
  constructor(code: UuidSlugErrorCode, message: string, options?: ErrorOptions);
}
export declare type UuidSlugErrorCode =
  | typeof ABORTED
  | typeof INVALID_BASE32HEX
  | typeof INVALID_BASE64URL
  | typeof INVALID_BUFFER
  | typeof INVALID_MASK
  | typeof INVALID_OPTIONS
  | typeof INVALID_SENTINEL
  | typeof INVALID_TIMESTAMP
  | typeof INVALID_UUID
  | typeof INVALID_UUID_SLUG
  | typeof INVALID_UUID_VERSION
  | typeof RNG_UNAVAILABLE
  | typeof TIMESTAMP_OUTSIDE_WINDOW;
export declare interface UuidSlugMigrationDecoder<
  in Format extends UuidSlugMigrationFormat = UuidSlugMigrationFormat,
> {
  slugToUuidString<Input extends string | UuidSlugError>(
    this: void,
    slug: SlugStringInput<Input>,
    format?: Format,
  ): UuidString | UuidSlugError;
  slugToUuidStringCandidates<Input extends string | UuidSlugError>(
    this: void,
    slug: SlugStringInput<Input>,
    format?: Format,
  ): readonly UuidString[] | UuidSlugError;
}
export declare type UuidSlugMigrationFormat =
  | typeof SEEDED_MASK_FORMAT
  | typeof FIXED_MASK_FORMAT
  | typeof DIRECT_SLUG_FORMAT;
export declare interface UuidSlugMigrationOptions {
  readonly acceptFixedMask?: boolean;
  readonly acceptDirectSlug?: boolean;
}
export declare type UuidString = Brand<string, "UuidString">;
export declare type UuidStringFor<Case extends UuidTextCase> =
  Case extends typeof UUID_TEXT_UPPERCASE ? UppercaseUuidString : UuidString;
declare type UuidStringInput<Input extends string | UuidSlugError> = RejectKnownInput<
  Input,
  DirectUuidSlug | MaskedUuidSlug
>;
export declare function uuidStringToBytes<Input extends string | UuidSlugError>(
  uuid: UuidStringInput<Input>,
): PreserveUuidVersion<Input, UuidBytes, UuidV4Bytes, UuidV7Bytes> | UuidSlugError;
export declare function uuidStringToBytes<
  Input extends string | UuidSlugError,
  Output extends Uint8Array,
>(uuid: UuidStringInput<Input>, output: Output, outputOffset?: number): Output | UuidSlugError;
export declare function uuidStringToDirectSlug<Input extends string | UuidSlugError>(
  uuid: UuidStringInput<Input>,
  alphabet?: SlugAlphabet,
): PreserveUuidVersion<Input, DirectUuidSlug, DirectUuidV4Slug, DirectUuidV7Slug> | UuidSlugError;
export declare type UuidTextCase = typeof UUID_TEXT_LOWERCASE | typeof UUID_TEXT_UPPERCASE;
export declare type UuidV4Bytes = Brand<UuidBytes, "UuidV4Bytes">;
export declare type UuidV4String = Brand<UuidString, "UuidV4String">;
export declare type UuidV7Bytes = Brand<UuidBytes, "UuidV7Bytes">;
declare type UuidV7BytesInput<Input extends Uint8Array | UuidSlugError> = RejectKnownInput<
  Input,
  UuidV4Bytes
>;
export declare type UuidV7CodecSlug = MaskedUuidV7Slug | SentinelUuidV7Slug;
export declare interface UuidV7Generator {
  generateUuidV7(this: void): UuidV7String | UuidSlugError;
  generateUuidV7Bytes(this: void): UuidV7Bytes | UuidSlugError;
  generateUuidV7Bytes<Output extends Uint8Array>(
    this: void,
    output: Output,
    outputOffset?: number,
  ): Output | UuidSlugError;
  generateUuidV7AtUnixMs(this: void, unixMs: number): UuidV7String | UuidSlugError;
  generateUuidV7BytesAtUnixMs(this: void, unixMs: number): UuidV7Bytes | UuidSlugError;
  generateUuidV7BytesAtUnixMs<Output extends Uint8Array>(
    this: void,
    unixMs: number,
    output: Output,
    outputOffset?: number,
  ): Output | UuidSlugError;
}
export declare interface UuidV7GeneratorOptions {
  readonly readUnixMs?: () => number;
}
export declare interface UuidV7Mask {
  readonly diagnosticLabel: string;
  readonly [uuidV7MaskBrand]: true;
}
declare const uuidV7MaskBrand: unique symbol;
export declare interface UuidV7MaskOptions {
  readonly diagnosticLabel?: string;
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
export declare interface UuidV7SlugCodec {
  readonly sentinels: readonly UuidV7Sentinel[];
  createMigrationDecoder<const Options extends UuidSlugMigrationOptions = {}>(
    this: void,
    options?: Options,
  ): UuidSlugMigrationDecoder<EnabledMigrationFormat<Options>>;
  generateUuidV7CodecSlug(this: void): UuidV7CodecSlug | UuidSlugError;
  generateUuidV7WithCodecSlug(this: void): GeneratedUuidV7<UuidV7CodecSlug> | UuidSlugError;
  uuidToSlug<Input extends string | Uint8Array | UuidSlugError>(
    this: void,
    uuid: UuidV7ValueInput<Input>,
  ): UuidV7CodecSlug | UuidSlugError;
  slugToUuidString<Input extends string | UuidSlugError>(
    this: void,
    slug: SlugStringInput<Input>,
  ): UuidV7String | UuidSlugError;
  slugToUuidBytes<Input extends string | UuidSlugError>(
    this: void,
    slug: SlugStringInput<Input>,
  ): UuidV7Bytes | UuidSlugError;
  slugToUuidBytes<Input extends string | UuidSlugError, Output extends Uint8Array>(
    this: void,
    slug: SlugStringInput<Input>,
    output: Output,
    outputOffset?: number,
  ): Output | UuidSlugError;
  extractUuidSlugUnixMs<Input extends string | UuidSlugError>(
    this: void,
    slug: SlugStringInput<Input>,
  ): number | UuidSlugError;
  validateUuidSlugUnixMs<Input extends string | UuidSlugError>(
    this: void,
    slug: SlugStringInput<Input>,
    window: UuidV7TimestampWindow,
  ): (Input & UuidV7CodecSlug) | UuidSlugError;
}
export declare interface UuidV7SlugCodecOptions {
  readonly mask: UuidV7Mask | UuidV7MaskOptions | UuidSlugError;
  readonly previousMasks?: readonly (UuidV7Mask | UuidV7MaskOptions | UuidSlugError)[];
  readonly sentinels?: readonly UuidV7SentinelConfig[];
  readonly outputAlphabet?: SlugAlphabet;
}
export declare type UuidV7String = Brand<UuidString, "UuidV7String">;
declare type UuidV7StringInput<Input extends string | UuidSlugError> = RejectKnownInput<
  Input,
  DirectUuidSlug | MaskedUuidSlug | UuidV4String
>;
declare type UuidV7TimestampInput<Input extends string | UuidSlugError> = RejectKnownInput<
  Input,
  MaskedUuidSlug | UuidV4String | DirectUuidV4Slug
>;
export declare interface UuidV7TimestampWindow {
  readonly maxTimestampDeltaMs: number;
  readonly referenceUnixMs?: number;
}
declare type UuidV7ValueInput<Input extends string | Uint8Array | UuidSlugError> = RejectKnownInput<
  Input,
  DirectUuidSlug | MaskedUuidSlug | UuidV4String | UuidV4Bytes
>;
export declare function validateDirectUuidV7SlugUnixMs<Input extends string | UuidSlugError>(
  slug: DirectUuidV7SlugInput<Input>,
  window: UuidV7TimestampWindow,
): (Input & DirectUuidV7Slug) | UuidSlugError;
export declare function validateUuidV7Timestamp<Input extends string | UuidSlugError>(
  uuid: UuidV7StringInput<Input>,
  window: UuidV7TimestampWindow,
): UuidV7String | UuidSlugError;
