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
export declare function bytesToUuidSlug(
  bytes: Uint8Array | UuidSlugError,
  alphabet?: SlugAlphabet,
): UuidSlug | UuidSlugError;
export declare function bytesToUuidSlug(
  bytes: Uint8Array | UuidSlugError,
  byteOffset: number,
  alphabet?: SlugAlphabet,
): UuidSlug | UuidSlugError;
export declare function bytesToUuidString(
  bytes: Uint8Array | UuidSlugError,
  byteOffset?: number,
): UuidString | UuidSlugError;
export declare function createCustomUuidV7Mask(
  options: CustomUuidV7MaskOptions,
): UuidV7Mask | UuidSlugError;
export declare function createUuidV7Generator(options?: UuidV7GeneratorOptions): UuidV7Generator;
export declare function createUuidV7Mask(options: UuidV7MaskOptions): UuidV7Mask | UuidSlugError;
export declare function createUuidV7MaskAsync(
  options: AsyncUuidV7MaskOptions,
): Promise<UuidV7Mask | UuidSlugError>;
export declare function createUuidV7SlugCodec(
  options: UuidV7SlugCodecOptions,
): UuidV7SlugCodec | UuidSlugError;
export declare const CURRENT_MASK_FORMAT = "current-mask";
export declare interface CustomUuidV7MaskOptions {
  readonly label: string;
  readonly mask: (bytes: Uint8Array) => Uint8Array | UuidSlugError;
  readonly unmask: (bytes: Uint8Array) => Uint8Array | UuidSlugError;
}
export declare const DIRECT_SLUG_FORMAT = "direct-slug";
declare type DirectUuidSlugInput<Input extends string | UuidSlugError> = RejectKnownInput<
  Input,
  UuidString | MaskedUuidSlug
>;
declare type EnabledMigrationFormat<Options extends UuidSlugMigrationOptions> =
  | typeof CURRENT_MASK_FORMAT
  | (EnabledMigrationOption<Options, "acceptOriginalMask"> extends never
      ? never
      : typeof ORIGINAL_MASK_FORMAT)
  | (EnabledMigrationOption<Options, "acceptDirectSlug"> extends never
      ? never
      : typeof DIRECT_SLUG_FORMAT);
declare type EnabledMigrationOption<
  Options,
  Option extends keyof UuidSlugMigrationOptions,
> = Option extends keyof Options ? (true extends Options[Option] ? Option : never) : never;
export declare function extractUuidV7Timestamp<Input extends string | UuidSlugError>(
  value: UuidV7TimestampInput<Input>,
): number | UuidSlugError;
export declare function extractUuidV7Timestamp<Input extends Uint8Array | UuidSlugError>(
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
export declare const ORIGINAL_MASK_FORMAT = "original-mask";
declare type PreserveUuidVersion<Input, UnknownVersion, Version4, Version7> =
  Input extends UuidSlugError
    ? never
    : Input extends UuidV4String | UuidV4Slug
      ? Version4
      : Input extends UuidV7String | UuidV7Slug
        ? Version7
        : UnknownVersion;
declare type RejectKnownInput<Input, Invalid> = [
  Extract<Exclude<Input, UuidSlugError>, Invalid>,
] extends [never]
  ? Input
  : never;
export declare const RNG_UNAVAILABLE = "rng_unavailable";
export declare type SentinelUuidV7Slug = Brand<UuidV7Slug, "SentinelUuidV7Slug">;
export declare type SlugAlphabet = typeof BASE64URL | typeof BASE32HEX;
declare type SlugStringInput<Input extends string | UuidSlugError> = RejectKnownInput<
  Input,
  UuidString
>;
export declare const TIMESTAMP_OUTSIDE_WINDOW = "timestamp_outside_window";
export declare const UUID_V7_TEST_MASK: UuidV7Mask;
export declare type UuidBytes = Brand<Uint8Array, "UuidBytes">;
export declare type UuidSlug = Brand<string, "UuidSlug">;
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
  uuidSlugToString<Input extends string | UuidSlugError>(
    this: void,
    slug: SlugStringInput<Input>,
    format?: Format,
  ): UuidString | UuidSlugError;
  uuidSlugToStringCandidates<Input extends string | UuidSlugError>(
    this: void,
    slug: SlugStringInput<Input>,
    format?: Format,
  ): UuidString[] | UuidSlugError;
}
export declare type UuidSlugMigrationFormat =
  | typeof CURRENT_MASK_FORMAT
  | typeof ORIGINAL_MASK_FORMAT
  | typeof DIRECT_SLUG_FORMAT;
export declare interface UuidSlugMigrationOptions {
  readonly acceptOriginalMask?: boolean;
  readonly acceptDirectSlug?: boolean;
}
export declare function uuidSlugToBytes<Input extends string | UuidSlugError>(
  slug: DirectUuidSlugInput<Input>,
): PreserveUuidVersion<Input, UuidBytes, UuidV4Bytes, UuidV7Bytes> | UuidSlugError;
export declare function uuidSlugToBytes<
  Input extends string | UuidSlugError,
  Output extends Uint8Array,
>(slug: DirectUuidSlugInput<Input>, output: Output, outputOffset?: number): Output | UuidSlugError;
export declare function uuidSlugToString<Input extends string | UuidSlugError>(
  slug: DirectUuidSlugInput<Input>,
): PreserveUuidVersion<Input, UuidString, UuidV4String, UuidV7String> | UuidSlugError;
export declare type UuidString = Brand<string, "UuidString">;
declare type UuidStringInput<Input extends string | UuidSlugError> = RejectKnownInput<
  Input,
  UuidSlug | MaskedUuidSlug
>;
export declare function uuidStringToBytes<Input extends string | UuidSlugError>(
  uuid: UuidStringInput<Input>,
): PreserveUuidVersion<Input, UuidBytes, UuidV4Bytes, UuidV7Bytes> | UuidSlugError;
export declare function uuidStringToBytes<
  Input extends string | UuidSlugError,
  Output extends Uint8Array,
>(uuid: UuidStringInput<Input>, output: Output, outputOffset?: number): Output | UuidSlugError;
export declare function uuidStringToSlug<Input extends string | UuidSlugError>(
  uuid: UuidStringInput<Input>,
  alphabet?: SlugAlphabet,
): PreserveUuidVersion<Input, UuidSlug, UuidV4Slug, UuidV7Slug> | UuidSlugError;
export declare type UuidV4Bytes = Brand<UuidBytes, "UuidV4Bytes">;
export declare type UuidV4Slug = Brand<UuidSlug, "UuidV4Slug">;
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
  readonly [uuidV7MaskBrand]: true;
}
declare const uuidV7MaskBrand: unique symbol;
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
  generateUuidSlug(this: void): UuidV7CodecSlug | UuidSlugError;
  uuidToSlug<Input extends string | Uint8Array | UuidSlugError>(
    this: void,
    uuid: UuidV7ValueInput<Input>,
  ): UuidV7CodecSlug | UuidSlugError;
  uuidSlugToString<Input extends string | UuidSlugError>(
    this: void,
    slug: SlugStringInput<Input>,
  ): UuidV7String | UuidSlugError;
  uuidSlugToBytes<Input extends string | UuidSlugError>(
    this: void,
    slug: SlugStringInput<Input>,
  ): UuidV7Bytes | UuidSlugError;
  uuidSlugToBytes<Input extends string | UuidSlugError, Output extends Uint8Array>(
    this: void,
    slug: SlugStringInput<Input>,
    output: Output,
    outputOffset?: number,
  ): Output | UuidSlugError;
  extractUuidSlugTimestamp<Input extends string | UuidSlugError>(
    this: void,
    slug: SlugStringInput<Input>,
  ): number | UuidSlugError;
  validateUuidSlugTimestamp<Input extends string | UuidSlugError>(
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
declare type UuidV7SlugInput<Input extends string | UuidSlugError> = RejectKnownInput<
  Input,
  UuidString | MaskedUuidSlug | UuidV4Slug
>;
export declare type UuidV7String = Brand<UuidString, "UuidV7String">;
declare type UuidV7StringInput<Input extends string | UuidSlugError> = RejectKnownInput<
  Input,
  UuidSlug | MaskedUuidSlug | UuidV4String
>;
declare type UuidV7TimestampInput<Input extends string | UuidSlugError> = RejectKnownInput<
  Input,
  MaskedUuidSlug | UuidV4String | UuidV4Slug
>;
export declare interface UuidV7TimestampWindow {
  readonly maxTimestampDeltaMs: number;
  readonly referenceUnixMs?: number;
}
declare type UuidV7ValueInput<Input extends string | Uint8Array | UuidSlugError> = RejectKnownInput<
  Input,
  UuidSlug | MaskedUuidSlug | UuidV4String | UuidV4Bytes
>;
export declare function validateUuidV7SlugTimestamp<Input extends string | UuidSlugError>(
  slug: UuidV7SlugInput<Input>,
  window: UuidV7TimestampWindow,
): (Input & UuidV7Slug) | UuidSlugError;
export declare function validateUuidV7Timestamp<Input extends string | UuidSlugError>(
  uuid: UuidV7StringInput<Input>,
  window: UuidV7TimestampWindow,
): (Input & UuidV7String) | UuidSlugError;
