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
  bytes: UuidByteInput | UuidSlugError,
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
export declare function createUuidV7GeneratorWithRandomFill(
  fillRandom: UuidRandomFill,
  options?: UuidV7GeneratorOptions,
): UuidV7Generator;
export declare function createUuidV7MaskingCodec(
  options: UuidV7MaskingCodecOptions,
): UuidV7MaskingCodec | UuidSlugError;
export declare interface CustomUuidV7MaskOptions {
  readonly diagnosticLabel: string;
  readonly mask: (bytes: Uint8Array) => Uint8Array | UuidSlugError;
  readonly unmask: (bytes: Uint8Array) => Uint8Array | UuidSlugError;
}
export declare function deriveUuidV7Mask(options: UuidV7MaskOptions): UuidV7Mask | UuidSlugError;
export declare function deriveUuidV7MaskAsync(
  options: AsyncUuidV7MaskOptions,
): Promise<UuidV7Mask | UuidSlugError>;
declare type EnabledMigrationFormat<Options extends UuidSlugMigrationOptions> =
  | typeof SEEDED_MASK_FORMAT
  | (EnabledMigrationOption<Options, "acceptFixedMask"> extends never
      ? never
      : typeof FIXED_MASK_FORMAT)
  | (EnabledMigrationOption<Options, "acceptPlainSlug"> extends never
      ? never
      : typeof PLAIN_SLUG_FORMAT);
declare type EnabledMigrationOption<
  Options,
  Option extends keyof UuidSlugMigrationOptions,
> = Option extends keyof Options ? (true extends Options[Option] ? Option : never) : never;
export declare function extractUuidV7UnixMs<Input extends string | UuidSlugError>(
  value: UuidV7TimestampInput<Input>,
): number | UuidSlugError;
export declare function extractUuidV7UnixMs<Input extends UuidByteInput | UuidSlugError>(
  value: UuidV7BytesInput<Input>,
  byteOffset?: number,
): number | UuidSlugError;
export declare function extractUuidVersion<Input extends UuidInput>(
  uuid: KeylessUuidInput<Input>,
): UuidVersion | UuidSlugError;
export declare const FIXED_MASK_FORMAT = "fixed-mask";
export declare interface GeneratedUuidV7<
  Slug extends PlainUuidV7Slug | MaskedOrSentinelUuidV7Slug,
  Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE,
> {
  readonly uuid: UuidV7StringFor<Case>;
  readonly slug: Slug;
}
export declare function generatePlainUuidV4Slug(
  alphabet?: SlugAlphabet,
): PlainUuidV4Slug | UuidSlugError;
export declare function generatePlainUuidV7Slug(
  alphabet?: SlugAlphabet,
): PlainUuidV7Slug | UuidSlugError;
export declare function generateUuidV4<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
  textCase?: Case,
): UuidV4StringFor<Case> | UuidSlugError;
export declare function generateUuidV4Bytes(): UuidV4Bytes | UuidSlugError;
export declare function generateUuidV4Bytes<Output extends Uint8Array>(
  output: Output,
  outputOffset?: number,
): Output | UuidSlugError;
export declare function generateUuidV4WithRandomFill<
  Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE,
>(fillRandom: UuidRandomFill, textCase?: Case): UuidV4StringFor<Case> | UuidSlugError;
export declare const generateUuidV7: <Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
  textCase?: Case,
) => UuidV7StringFor<Case> | UuidSlugError;
export declare const generateUuidV7AtUnixMs: <
  Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE,
>(
  unixMs: number,
  textCase?: Case,
) => UuidV7StringFor<Case> | UuidSlugError;
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
export declare function generateUuidV7WithPlainSlug(
  alphabet?: SlugAlphabet,
): GeneratedUuidV7<PlainUuidV7Slug> | UuidSlugError;
export declare function generateUuidV7WithPlainSlug<Case extends UuidTextCase>(
  textCase: Case,
): GeneratedUuidV7<PlainUuidV7Slug, Case> | UuidSlugError;
export declare function generateUuidV7WithPlainSlug<Case extends UuidTextCase>(
  alphabet: SlugAlphabet,
  textCase: Case,
): GeneratedUuidV7<PlainUuidV7Slug, Case> | UuidSlugError;
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
export declare function isPlainUuidSlug(value: unknown): value is PlainUuidSlug;
export declare function isPlainUuidV4Slug(value: unknown): value is PlainUuidV4Slug;
export declare function isPlainUuidV7Slug(value: unknown): value is PlainUuidV7Slug;
export declare function isUuidBytes(value: unknown): value is UuidBytes;
export declare function isUuidSlugError(value: unknown): value is UuidSlugError;
export declare function isUuidString(value: unknown): value is UuidString;
export declare function isUuidText(value: unknown): value is UuidText;
export declare function isUuidV4Bytes(value: unknown): value is UuidV4Bytes;
export declare function isUuidV4String(value: unknown): value is UuidV4String;
export declare function isUuidV4Text(value: unknown): value is UuidV4Text;
export declare function isUuidV7Bytes(value: unknown): value is UuidV7Bytes;
export declare function isUuidV7String(value: unknown): value is UuidV7String;
export declare function isUuidV7Text(value: unknown): value is UuidV7Text;
declare type KeylessUuidInput<Input> = [
  Extract<Exclude<Input, UuidSlugError>, MaskedUuidV7Slug>,
] extends [never]
  ? Input
  : never;
export declare type MaskedOrSentinelUuidV7Slug = MaskedUuidV7Slug | SentinelUuidV7Slug;
declare type MaskedUuidSlug = Brand<string, "MaskedUuidSlug">;
export declare type MaskedUuidV7Slug = Brand<MaskedUuidSlug, "MaskedUuidV7Slug">;
export declare const MAX_MASKED_UUID_V7_TIMESTAMP_OFFSET_MS: number;
export declare const MAX_UUID: UuidString;
export declare const NIL_UUID: UuidString;
export declare const PLAIN_SLUG_FORMAT = "plain-slug";
export declare function plainSlugToUuidBytes<Input extends string | UuidSlugError>(
  plainUuidSlug: PlainUuidSlugInput<Input>,
): PreserveUuidVersion<Input, UuidBytes, UuidV4Bytes, UuidV7Bytes> | UuidSlugError;
export declare function plainSlugToUuidBytes<
  Input extends string | UuidSlugError,
  Output extends Uint8Array,
>(
  plainUuidSlug: PlainUuidSlugInput<Input>,
  output: Output,
  outputOffset?: number,
): Output | UuidSlugError;
export declare function plainSlugToUuidString<
  Input extends string | UuidSlugError,
  Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE,
>(
  plainUuidSlug: PlainUuidSlugInput<Input>,
  textCase?: Case,
):
  | PreserveUuidVersion<Input, UuidStringFor<Case>, UuidV4StringFor<Case>, UuidV7StringFor<Case>>
  | UuidSlugError;
export declare type PlainUuidSlug = Brand<string, "PlainUuidSlug">;
declare type PlainUuidSlugInput<Input extends string | UuidSlugError> = RejectKnownInput<
  Input,
  UuidText | MaskedUuidSlug
>;
export declare type PlainUuidSlugResult<Input> =
  | PreserveUuidVersion<Input, PlainUuidSlug, PlainUuidV4Slug, PlainUuidV7Slug>
  | UuidSlugError;
export declare type PlainUuidV4Slug = Brand<PlainUuidSlug, "PlainUuidV4Slug">;
export declare type PlainUuidV7Slug = Brand<PlainUuidSlug, "PlainUuidV7Slug">;
declare type PlainUuidV7SlugInput<Input extends string | UuidSlugError> = RejectKnownInput<
  Input,
  UuidText | MaskedUuidSlug | PlainUuidV4Slug
>;
declare type PreserveUuidVersion<Input, UnknownVersion, Version4, Version7> =
  Input extends UuidSlugError
    ? never
    : Input extends UuidV4Text | PlainUuidV4Slug | UuidV4Bytes
      ? Version4
      : Input extends UuidV7Text | PlainUuidV7Slug | UuidV7Bytes | MaskedUuidSlug
        ? Version7
        : UnknownVersion;
declare type RejectKnownInput<Input, Invalid> = [
  Extract<Exclude<Input, UuidSlugError>, Invalid>,
] extends [never]
  ? Input
  : never;
export declare const RNG_UNAVAILABLE = "rng_unavailable";
export declare const SEEDED_MASK_FORMAT = "seeded-mask";
export declare type SentinelUuidV7Slug = Brand<PlainUuidV7Slug, "SentinelUuidV7Slug">;
export declare type SlugAlphabet = typeof BASE64URL | typeof BASE32HEX;
declare type SlugStringInput<Input extends string | UuidSlugError> = RejectKnownInput<
  Input,
  UuidText
>;
export declare const TIMESTAMP_OUTSIDE_WINDOW = "timestamp_outside_window";
export declare type UppercaseUuidString = Brand<UuidText, "UppercaseUuidString">;
export declare type UppercaseUuidV4String = Brand<UppercaseUuidString & UuidV4Text, "UuidV4String">;
export declare type UppercaseUuidV7String = Brand<UppercaseUuidString & UuidV7Text, "UuidV7String">;
export declare const UUID_TEXT_LOWERCASE = "lowercase";
export declare const UUID_TEXT_UPPERCASE = "uppercase";
export declare const UUID_V7_ROLLBACK_ERROR = "error";
export declare const UUID_V7_ROLLBACK_PRESERVE = "preserve";
export declare const UUID_V7_ROLLBACK_RESET = "reset";
export declare const UUID_V7_TEST_MASK: UuidV7Mask;
export declare type UuidByteInput = Uint8Array | ArrayBuffer | DataView;
export declare type UuidBytes = Brand<Uint8Array, "UuidBytes">;
export declare type UuidBytesResult<Input> =
  | PreserveUuidVersion<Input, UuidBytes, UuidV4Bytes, UuidV7Bytes>
  | UuidSlugError;
export declare function uuidBytesToPlainSlug(
  bytes: UuidByteInput | UuidSlugError,
  alphabet?: SlugAlphabet,
): PlainUuidSlug | UuidSlugError;
export declare function uuidBytesToPlainSlug(
  bytes: Uint8Array | UuidSlugError,
  byteOffset: number,
  alphabet?: SlugAlphabet,
): PlainUuidSlug | UuidSlugError;
export declare type UuidInput = string | UuidByteInput | UuidSlugError;
export declare type UuidRandomFill = (bytes: Uint8Array) => void | UuidSlugError;
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
  uuidToString<
    Input extends string | UuidSlugError,
    Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE,
  >(
    this: void,
    uuidSlug: SlugStringInput<Input>,
    textCase?: Case,
  ): UuidStringFor<Case> | UuidSlugError;
  uuidToString<Input extends string | UuidSlugError>(
    this: void,
    uuidSlug: SlugStringInput<Input>,
    format: Format | undefined,
  ): UuidString | UuidSlugError;
  uuidToString<Input extends string | UuidSlugError, Case extends UuidTextCase>(
    this: void,
    uuidSlug: SlugStringInput<Input>,
    format: Format,
    textCase: Case,
  ): UuidStringFor<Case> | UuidSlugError;
  uuidToStringCandidates<
    Input extends string | UuidSlugError,
    Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE,
  >(
    this: void,
    uuidSlug: SlugStringInput<Input>,
    textCase?: Case,
  ): readonly UuidStringFor<Case>[] | UuidSlugError;
  uuidToStringCandidates<Input extends string | UuidSlugError>(
    this: void,
    uuidSlug: SlugStringInput<Input>,
    format: Format | undefined,
  ): readonly UuidString[] | UuidSlugError;
  uuidToStringCandidates<Input extends string | UuidSlugError, Case extends UuidTextCase>(
    this: void,
    uuidSlug: SlugStringInput<Input>,
    format: Format,
    textCase: Case,
  ): readonly UuidStringFor<Case>[] | UuidSlugError;
}
export declare type UuidSlugMigrationFormat =
  | typeof SEEDED_MASK_FORMAT
  | typeof FIXED_MASK_FORMAT
  | typeof PLAIN_SLUG_FORMAT;
export declare interface UuidSlugMigrationOptions {
  readonly acceptFixedMask?: boolean;
  readonly acceptPlainSlug?: boolean;
}
export declare type UuidString = Brand<UuidText, "UuidString">;
export declare type UuidStringFor<Case extends UuidTextCase> =
  Case extends typeof UUID_TEXT_UPPERCASE ? UppercaseUuidString : UuidString;
declare type UuidStringInput<Input extends string | UuidSlugError> = RejectKnownInput<
  Input,
  PlainUuidSlug | MaskedUuidSlug
>;
export declare type UuidStringResult<
  Input,
  Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE,
> =
  | PreserveUuidVersion<Input, UuidStringFor<Case>, UuidV4StringFor<Case>, UuidV7StringFor<Case>>
  | UuidSlugError;
export declare function uuidStringToBytes<Input extends string | UuidSlugError>(
  uuid: UuidStringInput<Input>,
): PreserveUuidVersion<Input, UuidBytes, UuidV4Bytes, UuidV7Bytes> | UuidSlugError;
export declare function uuidStringToBytes<
  Input extends string | UuidSlugError,
  Output extends Uint8Array,
>(uuid: UuidStringInput<Input>, output: Output, outputOffset?: number): Output | UuidSlugError;
export declare function uuidStringToPlainSlug<Input extends string | UuidSlugError>(
  uuid: UuidStringInput<Input>,
  alphabet?: SlugAlphabet,
): PreserveUuidVersion<Input, PlainUuidSlug, PlainUuidV4Slug, PlainUuidV7Slug> | UuidSlugError;
export declare type UuidText = Brand<string, "UuidText">;
export declare type UuidTextCase = typeof UUID_TEXT_LOWERCASE | typeof UUID_TEXT_UPPERCASE;
export declare function uuidToBytes<Input extends UuidInput>(
  uuid: KeylessUuidInput<Input>,
): UuidBytesResult<Input>;
export declare function uuidToBytes<Input extends UuidInput, Output extends Uint8Array>(
  uuid: KeylessUuidInput<Input>,
  output: Output,
  outputOffset?: number,
): Output | UuidSlugError;
export declare function uuidToPlainSlug<Input extends UuidInput>(
  uuid: KeylessUuidInput<Input>,
  alphabet?: SlugAlphabet,
): PlainUuidSlugResult<Input>;
export declare function uuidToString<
  Input extends UuidInput,
  Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE,
>(uuid: KeylessUuidInput<Input>, textCase?: Case): UuidStringResult<Input, Case>;
export declare type UuidV4Bytes = Brand<UuidBytes, "UuidV4Bytes">;
export declare type UuidV4String = Brand<UuidString & UuidV4Text, "UuidV4String">;
export declare type UuidV4StringFor<Case extends UuidTextCase> =
  Case extends typeof UUID_TEXT_UPPERCASE ? UppercaseUuidV4String : UuidV4String;
export declare type UuidV4Text = Brand<UuidText, "UuidV4Text">;
export declare interface UuidV7Bounds<Value extends UuidV7StringFor<UuidTextCase> | UuidV7Bytes> {
  readonly startInclusive: Value;
  readonly endInclusive: Value;
}
export declare function uuidV7Bounds<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
  startUnixMs: number,
  textCase?: Case,
): UuidV7Bounds<UuidV7StringFor<Case>> | UuidSlugError;
export declare function uuidV7Bounds<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
  startUnixMs: number,
  endUnixMs: number,
  textCase?: Case,
): UuidV7Bounds<UuidV7StringFor<Case>> | UuidSlugError;
export declare function uuidV7ByteBounds(
  startUnixMs: number,
  endUnixMs?: number,
): UuidV7Bounds<UuidV7Bytes> | UuidSlugError;
export declare type UuidV7Bytes = Brand<UuidBytes, "UuidV7Bytes">;
declare type UuidV7BytesInput<Input extends UuidByteInput | UuidSlugError> = RejectKnownInput<
  Input,
  UuidV4Bytes
>;
export declare type UuidV7ClockRollbackPolicy =
  | {
      readonly action: typeof UUID_V7_ROLLBACK_PRESERVE;
    }
  | {
      readonly action: typeof UUID_V7_ROLLBACK_RESET | typeof UUID_V7_ROLLBACK_ERROR;
      readonly toleranceMs: number;
    };
export declare interface UuidV7Generator {
  generateUuidV7<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
    this: void,
    textCase?: Case,
  ): UuidV7StringFor<Case> | UuidSlugError;
  generateUuidV7Bytes(this: void): UuidV7Bytes | UuidSlugError;
  generateUuidV7Bytes<Output extends Uint8Array>(
    this: void,
    output: Output,
    outputOffset?: number,
  ): Output | UuidSlugError;
  generateUuidV7AtUnixMs<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
    this: void,
    unixMs: number,
    textCase?: Case,
  ): UuidV7StringFor<Case> | UuidSlugError;
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
  readonly clockRollback?: UuidV7ClockRollbackPolicy;
}
export declare interface UuidV7Mask {
  readonly diagnosticLabel: string;
  readonly [uuidV7MaskBrand]: true;
}
declare const uuidV7MaskBrand: unique symbol;
export declare interface UuidV7MaskingCodec {
  readonly sentinels: readonly UuidV7Sentinel[];
  uuidToString<Input extends UuidInput, Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
    this: void,
    uuid: Input,
    textCase?: Case,
  ): UuidStringResult<Input, Case>;
  uuidToBytes<Input extends UuidInput>(this: void, uuid: Input): UuidBytesResult<Input>;
  uuidToBytes<Output extends Uint8Array>(
    this: void,
    uuid: UuidInput,
    output: Output,
    outputOffset?: number,
  ): Output | UuidSlugError;
  uuidToPlainSlug<Input extends UuidInput>(
    this: void,
    uuid: Input,
    alphabet?: SlugAlphabet,
  ): PlainUuidSlugResult<Input>;
  createUuidSlugMigrationDecoder<const Options extends UuidSlugMigrationOptions = {}>(
    this: void,
    options?: Options,
  ): UuidSlugMigrationDecoder<EnabledMigrationFormat<Options>>;
  generateMaskedUuidV7Slug(this: void): MaskedOrSentinelUuidV7Slug | UuidSlugError;
  generateUuidV7WithMaskedSlug<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
    this: void,
    textCase?: Case,
  ): GeneratedUuidV7<MaskedOrSentinelUuidV7Slug, Case> | UuidSlugError;
  uuidToMaskedSlug<Input extends string | UuidByteInput | UuidSlugError>(
    this: void,
    uuid: UuidV7ValueInput<Input>,
  ): MaskedOrSentinelUuidV7Slug | UuidSlugError;
  plainToMaskedUuidSlug<Input extends string | UuidSlugError>(
    this: void,
    plainUuidSlug: PlainUuidSlugInput<Input>,
  ): MaskedOrSentinelUuidV7Slug | UuidSlugError;
  maskedToPlainUuidSlug<Input extends string | UuidSlugError>(
    this: void,
    maskedUuidSlug: SlugStringInput<Input>,
    alphabet?: SlugAlphabet,
  ): PlainUuidV7Slug | UuidSlugError;
  maskedSlugToUuidString<
    Input extends string | UuidSlugError,
    Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE,
  >(
    this: void,
    maskedUuidSlug: SlugStringInput<Input>,
    textCase?: Case,
  ): UuidV7StringFor<Case> | UuidSlugError;
  maskedSlugToUuidBytes<Input extends string | UuidSlugError>(
    this: void,
    maskedUuidSlug: SlugStringInput<Input>,
  ): UuidV7Bytes | UuidSlugError;
  maskedSlugToUuidBytes<Input extends string | UuidSlugError, Output extends Uint8Array>(
    this: void,
    maskedUuidSlug: SlugStringInput<Input>,
    output: Output,
    outputOffset?: number,
  ): Output | UuidSlugError;
  extractMaskedUuidV7UnixMs<Input extends string | UuidSlugError>(
    this: void,
    maskedUuidSlug: SlugStringInput<Input>,
  ): number | UuidSlugError;
  validateMaskedUuidV7SlugUnixMs<Input extends string | UuidSlugError>(
    this: void,
    maskedUuidSlug: SlugStringInput<Input>,
    window: UuidV7TimestampWindow,
  ): (Input & MaskedOrSentinelUuidV7Slug) | UuidSlugError;
}
export declare interface UuidV7MaskingCodecOptions {
  readonly mask: UuidV7Mask | UuidV7MaskOptions | UuidSlugError;
  readonly timestampRangeStartUnixMs?: number;
  readonly previousMasks?: readonly (
    | UuidV7Mask
    | UuidV7MaskOptions
    | UuidV7PreviousMask
    | UuidSlugError
  )[];
  readonly sentinels?: readonly UuidV7SentinelConfig[];
  readonly maskedSlugAlphabet?: SlugAlphabet;
}
export declare interface UuidV7MaskOptions {
  readonly diagnosticLabel?: string;
  readonly seed: string | Uint8Array;
  readonly keyDerivationIterations?: number;
}
export declare interface UuidV7PreviousMask {
  readonly mask: UuidV7Mask | UuidV7MaskOptions | UuidSlugError;
  readonly timestampRangeStartUnixMs?: number;
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
export declare type UuidV7String = Brand<UuidString & UuidV7Text, "UuidV7String">;
export declare type UuidV7StringFor<Case extends UuidTextCase> =
  Case extends typeof UUID_TEXT_UPPERCASE ? UppercaseUuidV7String : UuidV7String;
declare type UuidV7StringInput<Input extends string | UuidSlugError> = RejectKnownInput<
  Input,
  PlainUuidSlug | MaskedUuidSlug | UuidV4Text
>;
export declare type UuidV7Text = Brand<UuidText, "UuidV7Text">;
declare type UuidV7TimestampInput<Input extends string | UuidSlugError> = RejectKnownInput<
  Input,
  MaskedUuidSlug | UuidV4Text | PlainUuidV4Slug
>;
export declare interface UuidV7TimestampWindow {
  readonly maxTimestampDeltaMs: number;
  readonly referenceUnixMs?: number;
}
declare type UuidV7ValueInput<Input extends string | UuidByteInput | UuidSlugError> =
  RejectKnownInput<Input, UuidV4Text | UuidV4Bytes>;
export declare type UuidVersion =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15;
export declare function validatePlainUuidV7SlugUnixMs<Input extends string | UuidSlugError>(
  slug: PlainUuidV7SlugInput<Input>,
  window: UuidV7TimestampWindow,
): (Input & PlainUuidV7Slug) | UuidSlugError;
export declare function validateUuidV7Timestamp<
  Input extends string | UuidSlugError,
  Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE,
>(
  uuid: UuidV7StringInput<Input>,
  window: UuidV7TimestampWindow,
  textCase?: Case,
): UuidV7StringFor<Case> | UuidSlugError;
