// SPDX-License-Identifier: Apache-2.0

import type { UuidSlugError } from "./errors.ts";
import type { SlugAlphabet } from "./slug.ts";
import type {
  UUID_TEXT_LOWERCASE,
  SEEDED_MASK_FORMAT,
  EnabledMigrationFormat,
  GeneratedUuidV7,
  GenerateUuidV7WithMaskedSlugOptions,
  MaskingCodecUuidInput,
  MaskedOrSentinelUuidV7Slug,
  PlainUuidSlug,
  PlainUuidSlugResult,
  PlainUuidV7Slug,
  PlainUuidV7SlugInput,
  SlugStringInput,
  Uuid,
  UuidBytesResult,
  UuidInput,
  UuidSlugMigrationDecoder,
  UuidSlugMigrationOptions,
  UuidStringResult,
  UuidTextCase,
  UuidV7Bytes,
  UuidV7Mask,
  UuidV7MaskOptions,
  UuidV7MaskingCodecValueOptions,
  UuidV7Payload,
  UuidV7PayloadLayout,
  UuidV7Sentinel,
  UuidV7SentinelConfig,
  UuidV7StringFor,
  UuidV7TimestampWindow,
  UuidV7ValueInput,
  UuidVersionOf,
} from "./types.ts";

/** Key rotation, sentinel, and output options shared by both ways of supplying the writer mask. */
export interface UuidV7MaskingCodecSharedOptions {
  /**
   * First Unix millisecond accepted by masking. The inclusive end is this value plus
   * `MAX_MASKED_UUID_V7_TIMESTAMP_OFFSET_MS`. Changing it changes masked slugs, so retain the old
   * value with its mask in `previousMasks` while stored slugs still use it.
   *
   * @defaultValue `0`
   */
  readonly timestampRangeStartUnixMs?: number;
  /**
   * Decode-only masks tried after the writer mask, in caller order. Each item accepts a mask or its
   * derivation options. A returned `UuidSlugError` passes through unchanged. Keep the list short:
   * every mask adds decoding work and another chance for a random input to pass its 16-bit check.
   *
   * @defaultValue No previous masks.
   */
  readonly previousMasks?: readonly (
    | UuidV7Mask
    | UuidV7MaskOptions
    | UuidV7PreviousMask
    | UuidSlugError
  )[];
  /**
   * Named UUIDv7 values emitted as raw plain slugs instead of masked payloads.
   *
   * @defaultValue No sentinels.
   */
  readonly sentinels?: readonly UuidV7SentinelConfig[];
  /**
   * Output spelling for masked UUID slugs and plain sentinel UUID slugs.
   * `"base32hex"` preserves the full masked payload in 27 lowercase characters (26 for raw
   * sentinels), suitable for case-insensitive filesystems. Masked output has no sort-order promise.
   * Readers accept both spellings regardless of this writer selection.
   *
   * @defaultValue `"base64url"`
   */
  readonly maskedSlugAlphabet?: SlugAlphabet;
}

/**
 * Configure one immutable UUIDv7 masking codec for writing, key rotation, and sentinels. Supply the
 * writer mask exactly one way: `maskSeed` for private key material, or `mask` for a shared derived
 * mask, `UUID_V7_TEST_MASK`, or seed material that also needs a label or a key-derivation work factor.
 */
export type UuidV7MaskingCodecOptions =
  | (UuidV7MaskingCodecSharedOptions & {
      /**
       * The writer mask and first reader. Supply a derived mask, its derivation options, or
       * explicitly choose `UUID_V7_TEST_MASK` for public test data. A returned `UuidSlugError`
       * passes through unchanged.
       */
      readonly mask: UuidV7Mask | UuidV7MaskOptions | UuidSlugError;
      readonly maskSeed?: never;
    })
  | (UuidV7MaskingCodecSharedOptions & {
      readonly mask?: never;
      /**
       * Stable secret key material for the writer mask, derived with the default work factor.
       * Generate at least 16 bytes, keep it outside source control, and retain old values in
       * `previousMasks`; a known UUID/slug pair permits offline guesses. JavaScript also accepts a
       * genuine `String` object.
       */
      readonly maskSeed: string | Uint8Array;
    });

/** A retained mask and the timestamp-range start used to create its stored slugs. */
export interface UuidV7PreviousMask {
  /** Retained decode-only mask or its derivation options. */
  readonly mask: UuidV7Mask | UuidV7MaskOptions | UuidSlugError;
  /** First Unix millisecond accepted by this retained mask. Omit for `0`. */
  readonly timestampRangeStartUnixMs?: number;
}

/**
 * An immutable UUIDv7 masking codec that owns its masks, sentinels, output alphabet, and byte source.
 * Methods may be detached. Decoding proves format integrity, not issuance or authorization.
 * JavaScript UUID and slug text inputs normalize genuine `String` objects; TypeScript uses primitives.
 */
export interface UuidV7MaskingCodec {
  /** Frozen sentinel metadata in the masking codec's configured masked-slug alphabet. */
  readonly sentinels: readonly UuidV7Sentinel[];
  /** Generate an immutable UUIDv7 with this masking codec retained. */
  generateUuidV7Value(
    this: void,
    options?: UuidV7MaskingCodecValueOptions,
  ): Uuid<7, true, true> | UuidSlugError;
  /** Parse any accepted UUID form and retain this codec. A plain-v4 slug brand cannot exclude a masked-v7 reading. */
  parseUuid<Input extends UuidInput>(
    this: void,
    uuid: Input,
  ): Uuid<UuidVersionOf<MaskingCodecUuidInput<Input>>, true> | UuidSlugError;
  /**
   * Convert any accepted UUID form to normalized UUID text. A 22-character slug is read as masked
   * when it passes this codec's check and as plain otherwise.
   * A plain UUIDv4 slug can therefore return UUIDv4 or UUIDv7 text.
   */
  uuidToString<Input extends UuidInput, Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
    this: void,
    uuid: Input,
    textCase?: Case,
  ): UuidStringResult<MaskingCodecUuidInput<Input>, Case>;
  /**
   * Read one UUID out of a larger array as normalized UUID text. Bytes carry no masked spelling.
   *
   * @param byteOffset - Zero-based index where the UUID starts. Omit for a standalone UUID.
   */
  uuidToString<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
    this: void,
    uuid: Uint8Array,
    byteOffset: number,
    textCase?: Case,
  ): UuidStringResult<Uint8Array, Case>;
  /**
   * Convert any accepted UUID form to a new plain 16-byte array. A 22-character slug is read as
   * masked when it passes this codec's check and as plain otherwise.
   * A plain UUIDv4 slug can therefore return UUIDv4 or UUIDv7 bytes.
   */
  uuidToBytes<Input extends UuidInput>(
    this: void,
    uuid: Input,
  ): UuidBytesResult<MaskingCodecUuidInput<Input>>;
  /** Convert any accepted UUID form into caller-owned storage after complete validation. */
  uuidToBytes<Output extends Uint8Array>(
    this: void,
    uuid: UuidInput,
    output: Output,
    outputOffset?: number,
  ): Output | UuidSlugError;
  /**
   * Copy one UUID out of a larger array. Bytes carry no masked spelling.
   *
   * @param byteOffset - Zero-based index where the UUID starts. Omit for a standalone UUID.
   */
  uuidToBytes(this: void, uuid: Uint8Array, byteOffset: number): UuidBytesResult<Uint8Array>;
  /** Copy one UUID out of a larger array into caller-owned storage. */
  uuidToBytes<Output extends Uint8Array>(
    this: void,
    uuid: Uint8Array,
    byteOffset: number,
    output: Output,
    outputOffset?: number,
  ): Output | UuidSlugError;
  /**
   * Convert any accepted UUID form to a plain UUID slug. A 22-character slug is read as masked
   * when it passes this codec's check and as plain otherwise.
   * A plain UUIDv4 slug can therefore return a plain UUIDv4 or UUIDv7 slug.
   */
  uuidToPlainSlug<Input extends UuidInput>(
    this: void,
    uuid: Input,
    alphabet?: SlugAlphabet,
  ): PlainUuidSlugResult<MaskingCodecUuidInput<Input>>;
  /**
   * Read one UUID out of a larger array as a plain UUID slug. Bytes carry no masked spelling.
   *
   * @param byteOffset - Zero-based index where the UUID starts. Omit for a standalone UUID.
   */
  uuidToPlainSlug(
    this: void,
    uuid: Uint8Array,
    byteOffset: number,
    alphabet?: SlugAlphabet,
  ): PlainUuidSlugResult<Uint8Array>;
  /**
   * Create a reader for current and explicitly enabled old formats without changing this codec.
   * Omitted options return the reader directly. Configured construction returns `invalid_options`
   * for unknown keys, nonboolean settings or inaccessible properties. Check construction once
   * before reusing the reader; decode failures return `UuidSlugError` from the reader.
   *
   * @param options - Old formats this application has actually issued. Omit for current formats only.
   */
  createUuidSlugMigrationDecoder(
    this: void,
    options?: undefined,
  ): UuidSlugMigrationDecoder<typeof SEEDED_MASK_FORMAT>;
  /** Create a reusable reader with explicitly enabled old formats; check configuration failure once. */
  createUuidSlugMigrationDecoder<const Options extends UuidSlugMigrationOptions>(
    this: void,
    options: Options | undefined,
  ): UuidSlugMigrationDecoder<EnabledMigrationFormat<Options>> | UuidSlugError;
  /**
   * Generate and encode a UUIDv7 as a masked slug or its registered raw sentinel slug.
   * Options may select an explicit time and a generator whose sequence this call joins.
   * Returns `invalid_timestamp` outside the codec's inclusive configured timestamp range unless
   * the generated UUID is a registered sentinel, which
   * is returned as a plain slug without masking.
   */
  generateMaskedUuidV7Slug(
    this: void,
    options?: UuidV7MaskingCodecValueOptions,
  ): MaskedOrSentinelUuidV7Slug | UuidSlugError;
  /**
   * Generate UUIDv7 text and its masked or sentinel slug from one random byte draw. UUID text is
   * lowercase unless `textCase` selects uppercase. Options may select an explicit time and a
   * generator whose sequence this call joins.
   * Returns `invalid_timestamp` outside the codec's inclusive configured timestamp range unless
   * the generated UUID is a registered sentinel, which
   * is returned as a plain slug without masking.
   *
   * @param textCase - Built-in UUID text spelling. Omit for lowercase.
   */
  generateUuidV7WithMaskedSlug<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
    this: void,
    textCase?: Case,
  ): GeneratedUuidV7<MaskedOrSentinelUuidV7Slug, Case> | UuidSlugError;
  /** Generate the pair through selected sequence state at an explicit time or the current clock. */
  generateUuidV7WithMaskedSlug<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
    this: void,
    options: GenerateUuidV7WithMaskedSlugOptions<Case>,
  ): GeneratedUuidV7<MaskedOrSentinelUuidV7Slug, Case> | UuidSlugError;
  /**
   * Convert UUID text, 16 UUID bytes, a plain slug, or a masked slug to this masking codec's
   * current masked spelling. A 22-character slug is read as masked when it passes this codec's
   * check and as plain otherwise. Other UUID versions
   * return `invalid_uuid_version`. TypeScript rejects known UUIDv4 values; unbranded external
   * values are validated when called. Timestamps outside the codec's inclusive configured range
   * return `invalid_timestamp`; sentinels are
   * returned as plain slugs without masking and retain the full UUIDv7 timestamp range. A preceding
   * `UuidSlugError` is returned unchanged.
   *
   * @param uuid - Any supported UUIDv7 text, bytes, plain slug, masked slug, or sentinel.
   */
  uuidToMaskedSlug<Input extends UuidInput>(
    this: void,
    uuid: UuidV7ValueInput<Input>,
  ): MaskedOrSentinelUuidV7Slug | UuidSlugError;
  /**
   * Convert either plain UUIDv7 slug spelling to this codec's current masked or sentinel spelling.
   * TypeScript rejects known UUIDv4 slugs. Other UUIDv4 input returns `invalid_uuid_version`;
   * an out-of-range UUIDv7 returns `invalid_timestamp`; a
   * preceding `UuidSlugError` is returned unchanged.
   *
   * @param plainUuidSlug - Plain UUID slug whose source representation is known by the caller.
   */
  plainToMaskedUuidSlug<Input extends string | UuidSlugError>(
    this: void,
    plainUuidSlug: PlainUuidV7SlugInput<Input>,
  ): MaskedOrSentinelUuidV7Slug | UuidSlugError;
  /**
   * Convert a masked slug or registered sentinel to a plain UUIDv7 slug. The codec selects the
   * first passing current or previous mask; output defaults to base64url. A preceding
   * `UuidSlugError` is returned unchanged.
   *
   * @param maskedUuidSlug - Masked UUIDv7 slug or registered sentinel.
   * @param alphabet - Plain output spelling. Omit for base64url.
   */
  maskedToPlainUuidSlug<Input extends string | UuidSlugError>(
    this: void,
    maskedUuidSlug: SlugStringInput<Input>,
    alphabet?: SlugAlphabet,
  ): PlainUuidV7Slug | UuidSlugError;
  /**
   * Decode the first passing sentinel or mask in configured order to UUIDv7 text in the selected
   * case, lowercase by default.
   * Success proves format integrity, not issuance. TypeScript rejects known UUID text; slug values
   * remain accepted because plain and masked spellings can overlap. A preceding `UuidSlugError`
   * is returned unchanged.
   *
   * @param maskedUuidSlug - Masked UUIDv7 slug or registered sentinel accepted by this masking codec.
   * @param textCase - Built-in UUID text spelling. Omit for lowercase.
   */
  maskedSlugToUuidString<
    Input extends string | UuidSlugError,
    Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE,
  >(
    this: void,
    maskedUuidSlug: SlugStringInput<Input>,
    textCase?: Case,
  ): UuidV7StringFor<Case> | UuidSlugError;
  /**
   * Decode to a new plain 16-byte `Uint8Array`. Use this when the caller needs binary output. A
   * preceding `UuidSlugError` is returned unchanged.
   *
   * @param maskedUuidSlug - Masked UUIDv7 slug or registered sentinel accepted by this masking codec.
   */
  maskedSlugToUuidBytes<Input extends string | UuidSlugError>(
    this: void,
    maskedUuidSlug: SlugStringInput<Input>,
  ): UuidV7Bytes | UuidSlugError;
  /**
   * Decode and validate before writing 16 bytes. Return the exact supplied array; errors leave it
   * unchanged. A preceding `UuidSlugError` is returned unchanged without writing.
   *
   * @param maskedUuidSlug - Masked UUIDv7 slug or registered sentinel accepted by this masking codec.
   * @param output - Caller-owned array that receives the 16 UUID bytes.
   * @param outputOffset - Zero-based index where writing starts. Omit to start at index 0. Bytes
   * outside the written range stay unchanged.
   */
  maskedSlugToUuidBytes<Input extends string | UuidSlugError, Output extends Uint8Array>(
    this: void,
    maskedUuidSlug: SlugStringInput<Input>,
    output: Output,
    outputOffset?: number,
  ): Output | UuidSlugError;
  /**
   * Decode a masked slug or registered sentinel with this codec and return its UUIDv7 Unix
   * timestamp in milliseconds. Success proves format integrity, not issuance or authorization. A
   * preceding `UuidSlugError` is returned unchanged.
   *
   * @param maskedUuidSlug - Masked slug or registered sentinel accepted by this masking codec.
   */
  extractMaskedUuidV7UnixMs<Input extends string | UuidSlugError>(
    this: void,
    maskedUuidSlug: SlugStringInput<Input>,
  ): number | UuidSlugError;
  /**
   * Decode with this codec, then interpret the UUIDv7 payload under the layout the caller supplies.
   * The slug cannot identify its generator or layout, so this method never guesses.
   *
   * @param maskedUuidSlug - Masked slug or registered sentinel accepted by this masking codec.
   * @param layout - Known leading fraction and fixed-counter widths.
   * @returns The decoded millisecond timestamp, declared fields, and undeclared low payload bits;
   * or a `UuidSlugError` when the slug, mask match, UUID, or layout is invalid.
   */
  extractMaskedUuidV7Payload<Input extends string | UuidSlugError>(
    this: void,
    maskedUuidSlug: SlugStringInput<Input>,
    layout: UuidV7PayloadLayout,
  ): UuidV7Payload | UuidSlugError;
  /**
   * Decode with this codec, check the symmetric timestamp window, and return a canonical slug.
   * Base32hex output is lowercase; case-sensitive base64url is unchanged.
   * This checks clock plausibility, not expiry, authentication, replay, or issuance. TypeScript
   * rejects known UUID text because only this codec can resolve overlapping slug spellings. A
   * preceding `UuidSlugError` is returned unchanged.
   *
   * @param maskedUuidSlug - Masked slug or registered sentinel accepted by this masking codec.
   * @param window - Inclusive maximum distance from an explicit or current reference time.
   */
  validateMaskedUuidV7SlugUnixMs<Input extends string | UuidSlugError>(
    this: void,
    maskedUuidSlug: SlugStringInput<Input>,
    window: UuidV7TimestampWindow,
  ):
    | (Input extends PlainUuidSlug | MaskedOrSentinelUuidV7Slug
        ? Input & MaskedOrSentinelUuidV7Slug
        : MaskedOrSentinelUuidV7Slug)
    | UuidSlugError;
}
