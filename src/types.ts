// SPDX-License-Identifier: Apache-2.0

import type { UuidSlugError } from "./errors.ts";
import type { SlugAlphabet } from "./slug.ts";

declare const brand: unique symbol;
declare const uuidV7MaskBrand: unique symbol;

/** Select the standard lowercase UUID text spelling. */
export const UUID_TEXT_LOWERCASE = "lowercase";
/** Select the standard uppercase UUID text spelling. */
export const UUID_TEXT_UPPERCASE = "uppercase";

/** Select the hexadecimal letter case of UUID text output. */
export type UuidTextCase = typeof UUID_TEXT_LOWERCASE | typeof UUID_TEXT_UPPERCASE;

/** Accumulate validated value kinds without changing their runtime representation. */
type Brand<Value, Name extends string> = Value & {
  readonly [brand]: { [BrandName in Name]: true };
};

/** Valid mixed-case canonical, compact, URN, or brace-wrapped UUID text; this proves syntax only. */
export type UuidText = Brand<string, "UuidText">;
/** Valid UUIDv4 text with RFC variant bits, in any accepted spelling. */
export type UuidV4Text = Brand<UuidText, "UuidV4Text">;
/** Valid UUIDv7 text with RFC variant bits, in any accepted spelling. */
export type UuidV7Text = Brand<UuidText, "UuidV7Text">;
/** Canonical lowercase UUID text. This proves syntax only, not version or issuance. */
export type UuidString = Brand<UuidText, "UuidString">;
/** Standard uppercase UUID text. This proves syntax only, not version or issuance. */
export type UppercaseUuidString = Brand<UuidText, "UppercaseUuidString">;
/** UUID text inferred from its requested output case. */
export type UuidStringFor<Case extends UuidTextCase> = Case extends typeof UUID_TEXT_UPPERCASE
  ? UppercaseUuidString
  : UuidString;
/** Canonical lowercase UUIDv4 text with RFC variant bits. */
export type UuidV4String = Brand<UuidString & UuidV4Text, "UuidV4String">;
/** Uppercase UUIDv4 text with RFC variant bits. */
export type UppercaseUuidV4String = Brand<UppercaseUuidString & UuidV4Text, "UuidV4String">;
/** UUIDv4 text inferred from its requested output case. */
export type UuidV4StringFor<Case extends UuidTextCase> = Case extends typeof UUID_TEXT_UPPERCASE
  ? UppercaseUuidV4String
  : UuidV4String;
/** Canonical lowercase UUIDv7 text with RFC variant bits. */
export type UuidV7String = Brand<UuidString & UuidV7Text, "UuidV7String">;
/** Uppercase UUIDv7 text with RFC variant bits. */
export type UppercaseUuidV7String = Brand<UppercaseUuidString & UuidV7Text, "UuidV7String">;
/** UUIDv7 text inferred from its requested output case. */
export type UuidV7StringFor<Case extends UuidTextCase> = Case extends typeof UUID_TEXT_UPPERCASE
  ? UppercaseUuidV7String
  : UuidV7String;
/** A reversible plain UUID encoding: 22 base64url or 26 lowercase base32hex characters. */
export type PlainUuidSlug = Brand<string, "PlainUuidSlug">;
/** A plain slug whose decoded UUID is version 4 with the RFC variant. */
export type PlainUuidV4Slug = Brand<PlainUuidSlug, "PlainUuidV4Slug">;
/** A plain slug whose decoded UUID is version 7 with the RFC variant. */
export type PlainUuidV7Slug = Brand<PlainUuidSlug, "PlainUuidV7Slug">;
/** Carry a validated UUID version through lossless representation changes. */
export type PreserveUuidVersion<Input, UnknownVersion, Version4, Version7> =
  Input extends UuidSlugError
    ? never
    : Input extends UuidV4Text | PlainUuidV4Slug | UuidV4Bytes
      ? Version4
      : Input extends UuidV7Text | PlainUuidV7Slug | UuidV7Bytes | MaskedUuidSlug
        ? Version7
        : UnknownVersion;
/** A masked payload in either spelling; its check bits are not plain-encoding padding. */
type MaskedUuidSlug = Brand<string, "MaskedUuidSlug">;
/**
 * A checked, keyed UUIDv7 payload: 22 base64url or 27 lowercase base32hex characters.
 * Both spellings hide recognizable UUID field positions. The check detects wrong keys and
 * malformed values; it does not prove issuance or authorization.
 */
export type MaskedUuidV7Slug = Brand<MaskedUuidSlug, "MaskedUuidV7Slug">;
/** An application sentinel written as its ordinary 22- or 26-character plain UUIDv7 slug. */
export type SentinelUuidV7Slug = Brand<PlainUuidV7Slug, "SentinelUuidV7Slug">;
/** A masking result: either a masked UUIDv7 or a registered plain sentinel. */
export type MaskedOrSentinelUuidV7Slug = MaskedUuidV7Slug | SentinelUuidV7Slug;

/** One generated UUIDv7 in the selected text case and one selected slug made from the same bytes. */
export interface GeneratedUuidV7<
  Slug extends PlainUuidV7Slug | MaskedOrSentinelUuidV7Slug,
  Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE,
> {
  /** UUIDv7 text in the requested case. */
  readonly uuid: UuidV7StringFor<Case>;
  /** Selected plain, masked, or sentinel spelling of the same UUID bytes. */
  readonly slug: Slug;
}

/*
 * Reject a captured brand that proves an input cannot satisfy an operation. Bare strings remain
 * valid because widening erases their child brand, leaving runtime validation as the only sound
 * judge; tuple wrapping makes one invalid member reject the entire known union.
 */
type RejectKnownInput<Input, Invalid> = [Extract<Exclude<Input, UuidSlugError>, Invalid>] extends [
  never,
]
  ? Input
  : never;

/** Reject a known slug; the operation parses UUID text. A bare string is validated at runtime. */
export type UuidStringInput<Input extends string | UuidSlugError> = RejectKnownInput<
  Input,
  PlainUuidSlug | MaskedUuidSlug
>;
/** Reject known UUID text and masked slugs; only a plain slug decodes without a key. */
export type PlainUuidSlugInput<Input extends string | UuidSlugError> = RejectKnownInput<
  Input,
  UuidText | MaskedUuidSlug
>;
/** Reject known UUID text; slug brands stay accepted because plain and masked spellings overlap. */
type SlugStringInput<Input extends string | UuidSlugError> = RejectKnownInput<Input, UuidText>;
/** Reject known slugs and UUIDv4 text; the operation reads a UUIDv7 timestamp from text. */
export type UuidV7StringInput<Input extends string | UuidSlugError> = RejectKnownInput<
  Input,
  PlainUuidSlug | MaskedUuidSlug | UuidV4Text
>;
/** Reject known UUID text, masked slugs, and UUIDv4 slugs; the operation needs a plain UUIDv7 slug. */
export type PlainUuidV7SlugInput<Input extends string | UuidSlugError> = RejectKnownInput<
  Input,
  UuidText | MaskedUuidSlug | PlainUuidV4Slug
>;
/** Reject masked slugs and known UUIDv4 values; only UUIDv7 text or a plain UUIDv7 slug carries a timestamp. */
export type UuidV7TimestampInput<Input extends string | UuidSlugError> = RejectKnownInput<
  Input,
  MaskedUuidSlug | UuidV4Text | PlainUuidV4Slug
>;
/** Reject known UUIDv4 bytes; the operation needs UUIDv7 bytes. */
export type UuidV7BytesInput<Input extends UuidByteInput | UuidSlugError> = RejectKnownInput<
  Input,
  UuidV4Bytes
>;
/** Reject known UUIDv4 values; a masking codec accepts every UUIDv7 form. */
type UuidV7ValueInput<Input extends string | UuidByteInput | UuidSlugError> = RejectKnownInput<
  Input,
  UuidV4Text | UuidV4Bytes
>;
/** Exactly 16 validated UUID bytes. Package-owned values are plain `Uint8Array`. */
export type UuidBytes = Brand<Uint8Array, "UuidBytes">;
/** UUID bytes with version 4 and RFC variant bits. */
export type UuidV4Bytes = Brand<UuidBytes, "UuidV4Bytes">;
/** UUID bytes with version 7 and RFC variant bits. */
export type UuidV7Bytes = Brand<UuidBytes, "UuidV7Bytes">;

/** A UUID byte source: a `Uint8Array`, a complete `ArrayBuffer`, or a `DataView`'s declared range. */
export type UuidByteInput = Uint8Array | ArrayBuffer | DataView;
/** Any supported UUID text, byte, or slug input, plus a preceding package error. */
export type UuidInput = string | UuidByteInput | UuidSlugError;
/** UUID text or the error returned while converting the captured input. */
export type UuidStringResult<Input, Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE> =
  | PreserveUuidVersion<Input, UuidStringFor<Case>, UuidV4StringFor<Case>, UuidV7StringFor<Case>>
  | UuidSlugError;
/** UUID bytes or the error returned while converting the captured input. */
export type UuidBytesResult<Input> =
  | PreserveUuidVersion<Input, UuidBytes, UuidV4Bytes, UuidV7Bytes>
  | UuidSlugError;
/** A plain UUID slug or the error returned while converting the captured input. */
export type PlainUuidSlugResult<Input> =
  | PreserveUuidVersion<Input, PlainUuidSlug, PlainUuidV4Slug, PlainUuidV7Slug>
  | UuidSlugError;

/**
 * An inclusive timestamp window around `referenceUnixMs` or the current time.
 * This checks clock plausibility, not expiry, authentication, replay, or issuance.
 */
export interface UuidV7TimestampWindow {
  /** Maximum absolute difference from the reference time, inclusive. Must be finite and nonnegative. */
  readonly maxTimestampDeltaMs: number;
  /**
   * Finite Unix milliseconds used as the reference.
   *
   * @defaultValue One `Date.now()` reading per validation call.
   */
  readonly referenceUnixMs?: number;
}

/**
 * A stateful UUIDv7 sequence using one clock and platform cryptographic randomness. Methods may be
 * detached. Expected clock and entropy failures return `UuidSlugError` without corrupting the next
 * generation attempt.
 */
export interface UuidV7Generator {
  /** Generate UUIDv7 text for the current clock reading in the selected case, lowercase by default. */
  generateUuidV7<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
    this: void,
    textCase?: Case,
  ): UuidV7StringFor<Case> | UuidSlugError;
  /** Generate a new plain 16-byte `Uint8Array` for the current clock reading. */
  generateUuidV7Bytes(this: void): UuidV7Bytes | UuidSlugError;
  /**
   * Write 16 bytes only after success and return the exact supplied array.
   *
   * @param output - Caller-owned array that receives the 16 UUID bytes.
   * @param outputOffset - Zero-based index where writing starts. Omit to start at index 0. Bytes
   * outside the written range stay unchanged.
   */
  generateUuidV7Bytes<Output extends Uint8Array>(
    this: void,
    output: Output,
    outputOffset?: number,
  ): Output | UuidSlugError;
  /**
   * Generate at a whole Unix millisecond in `0..2^48-1` without changing current-time sequence
   * state. UUID text is lowercase unless `textCase` selects uppercase.
   */
  generateUuidV7AtUnixMs<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
    this: void,
    unixMs: number,
    textCase?: Case,
  ): UuidV7StringFor<Case> | UuidSlugError;
  /** Generate a new 16-byte array at an explicit millisecond without changing current-time state. */
  generateUuidV7BytesAtUnixMs(this: void, unixMs: number): UuidV7Bytes | UuidSlugError;
  /**
   * Write an explicit-time UUIDv7 only after success and return the exact supplied array.
   *
   * @param unixMs - Whole Unix millisecond encoded into the UUID.
   * @param output - Caller-owned array that receives the 16 UUID bytes.
   * @param outputOffset - Zero-based index where writing starts. Omit to start at index 0. Bytes
   * outside the written range stay unchanged.
   */
  generateUuidV7BytesAtUnixMs<Output extends Uint8Array>(
    this: void,
    unixMs: number,
    output: Output,
    outputOffset?: number,
  ): Output | UuidSlugError;
}

/** An immutable handle for masking the recognizable fields of a UUIDv7; key material is not exposed. */
export interface UuidV7Mask {
  /** Diagnostic label only; mask objects and caller order select decoding behavior. */
  readonly diagnosticLabel: string;
  readonly [uuidV7MaskBrand]: true;
}

/** Define a reversible 16-byte transform for `createCustomUuidV7Mask`. */
export interface CustomUuidV7MaskOptions {
  /**
   * Names this mask in the error returned when a callback fails after construction, which is why
   * it is required here and optional for seeded masks, whose transform cannot fail. It does not
   * select the mask during decoding.
   */
  readonly diagnosticLabel: string;
  /** Transform an isolated 16-byte array; return exactly 16 bytes or `UuidSlugError`. */
  readonly mask: (bytes: Uint8Array) => Uint8Array | UuidSlugError;
  /** Invert `mask` for every possible 16-byte input. */
  readonly unmask: (bytes: Uint8Array) => Uint8Array | UuidSlugError;
}

/**
 * Options for deriving an immutable UUIDv7 mask from stable secret key material. Keep the seed and
 * iteration count available while identifiers produced with this mask must remain readable.
 */
export interface UuidV7MaskOptions {
  /**
   * Diagnostic label only; decoding uses the mask object and caller-specified order.
   *
   * @defaultValue `"seeded"`
   */
  readonly diagnosticLabel?: string;
  /**
   * Stable secret key material. Generate at least 16 bytes, keep it outside source control, and
   * retain old values in `previousMasks`; a known UUID/slug pair permits offline guesses.
   */
  readonly seed: string | Uint8Array;
  /**
   * Key-derivation work factor in `1..16777216` (2^24), paid at mask construction rather than per ID.
   * Changing it changes every derived key, so retain the old seed and count in `previousMasks`
   * when identifiers issued under them must remain readable.
   *
   * @defaultValue `1`
   */
  readonly keyDerivationIterations?: number;
}

/** Mask derivation options with cooperative cancellation for expensive construction. */
export interface AsyncUuidV7MaskOptions extends UuidV7MaskOptions {
  /**
   * Stop cooperative derivation and return an `aborted` error with `reason` as its cause.
   *
   * @defaultValue No cancellation.
   */
  readonly signal?: AbortSignal;
}

/** Define a named UUIDv7 that must bypass masking. */
export interface UuidV7SentinelConfig {
  /** Nonempty application-facing name, unique within one masking codec. */
  readonly name: string;
  /**
   * UUIDv7 text in an accepted spelling, unique after normalization. Sentinels bypass
   * masking, so their timestamps may exceed `MAX_MASKED_UUID_V7_UNIX_MS`.
   */
  readonly uuid: string;
}

/** A validated sentinel and its ordinary plain slug in the masking codec's masked-slug alphabet. */
export interface UuidV7Sentinel {
  /** The definition's application-facing name. */
  readonly name: string;
  /** The reserved raw slug; it is not a masked payload. */
  readonly slug: SentinelUuidV7Slug;
  /** The canonical UUIDv7 represented by `slug`. */
  readonly uuid: UuidV7String;
}

/** Select decoding with the codec's seeded mask. */
export const SEEDED_MASK_FORMAT = "seeded-mask";
/** Select decoding with the opt-in fixed mask. */
export const FIXED_MASK_FORMAT = "fixed-mask";
/** Select decoding as an opt-in plain UUID slug. */
export const PLAIN_SLUG_FORMAT = "plain-slug";

/** Select one enabled migration format when the input's original encoding is known. */
export type UuidSlugMigrationFormat =
  | typeof SEEDED_MASK_FORMAT
  | typeof FIXED_MASK_FORMAT
  | typeof PLAIN_SLUG_FORMAT;

/** Enable only formats your application has issued; writers keep using the codec. */
export interface UuidSlugMigrationOptions {
  /**
   * Accept the fixed-key format with a four-bit check that predates seeded masking, from before
   * package 0.2.0. Releases from 0.2.0 on write different formats, so enable it only for slugs
   * issued under that earlier scheme.
   *
   * @defaultValue `false`
   */
  readonly acceptFixedMask?: boolean;
  /**
   * Accept plain UUID slugs of any version, including retained trailing-bit aliases.
   *
   * @defaultValue `false`
   */
  readonly acceptPlainSlug?: boolean;
}

type EnabledMigrationOption<
  Options,
  Option extends keyof UuidSlugMigrationOptions,
> = Option extends keyof Options ? (true extends Options[Option] ? Option : never) : never;

/** Project enabled options into the only format selectors that decoder can accept. */
export type EnabledMigrationFormat<Options extends UuidSlugMigrationOptions> =
  | typeof SEEDED_MASK_FORMAT
  | (EnabledMigrationOption<Options, "acceptFixedMask"> extends never
      ? never
      : typeof FIXED_MASK_FORMAT)
  | (EnabledMigrationOption<Options, "acceptPlainSlug"> extends never
      ? never
      : typeof PLAIN_SLUG_FORMAT);

/**
 * Decode current and explicitly enabled old formats without changing masking-codec output.
 * Methods may be detached. A successful decode identifies a candidate UUID, not the issuing format
 * or a stored record. A preceding `UuidSlugError` is returned unchanged.
 */
export interface UuidSlugMigrationDecoder<
  in Format extends UuidSlugMigrationFormat = UuidSlugMigrationFormat,
> {
  /**
   * Return the first candidate in this order: sentinel, seeded masks, fixed mask, plain slug.
   * Pass `format` when its origin is known to avoid trying unrelated readers.
   *
   * @param uuidSlug - Identifier accepted by one enabled migration reader.
   * @param format - Known source format. Omit to try enabled readers in documented order.
   * @param textCase - UUID text spelling. Pass it after `uuidSlug` when format is unknown, or after a
   * known format. Omit for lowercase.
   */
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
  /**
   * Return every distinct candidate in decode order for one application lookup. An empty array
   * means no enabled format matched; callback failure returns `UuidSlugError`, not a partial list.
   * A preceding `UuidSlugError` is returned unchanged.
   *
   * @param uuidSlug - Identifier accepted by one or more enabled migration readers.
   * @param format - Known source format. Omit to try enabled readers in documented order.
   * @param textCase - UUID text spelling. Pass it after `uuidSlug` when format is unknown, or after a
   * known format. Omit for lowercase.
   */
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

/** Configure one immutable UUIDv7 masking codec for writing, key rotation, and sentinels. */
export interface UuidV7MaskingCodecOptions {
  /**
   * The writer mask and first reader. Supply a private seed or explicitly choose
   * `UUID_V7_TEST_MASK` for public test data. A returned `UuidSlugError` passes through unchanged.
   */
  readonly mask: UuidV7Mask | UuidV7MaskOptions | UuidSlugError;
  /**
   * Decode-only masks tried after `mask`, in caller order. Each item accepts a mask or its
   * derivation options. A returned `UuidSlugError` passes through unchanged. Keep the list short:
   * every mask adds decoding work and another chance for a random input to pass its 16-bit check.
   *
   * @defaultValue No previous masks.
   */
  readonly previousMasks?: readonly (UuidV7Mask | UuidV7MaskOptions | UuidSlugError)[];
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
 * An immutable UUIDv7 masking codec that owns its masks, sentinels, output alphabet, and byte source.
 * Methods may be detached. Decoding proves format integrity, not issuance or authorization.
 */
export interface UuidV7MaskingCodec {
  /** Frozen sentinel metadata in the masking codec's configured masked-slug alphabet. */
  readonly sentinels: readonly UuidV7Sentinel[];
  /** Convert any accepted UUID form to normalized UUID text. Ambiguous raw slugs fail explicitly. */
  uuidToString<Input extends UuidInput, Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
    this: void,
    uuid: Input,
    textCase?: Case,
  ): UuidStringResult<Input, Case>;
  /** Convert any accepted UUID form to a new plain 16-byte array. Ambiguous raw slugs fail explicitly. */
  uuidToBytes<Input extends UuidInput>(this: void, uuid: Input): UuidBytesResult<Input>;
  /** Convert any accepted UUID form into caller-owned storage after complete validation. */
  uuidToBytes<Output extends Uint8Array>(
    this: void,
    uuid: UuidInput,
    output: Output,
    outputOffset?: number,
  ): Output | UuidSlugError;
  /** Convert any accepted UUID form to a plain UUID slug. A dual-valid raw slug selects its plain meaning. */
  uuidToPlainSlug<Input extends UuidInput>(
    this: void,
    uuid: Input,
    alphabet?: SlugAlphabet,
  ): PlainUuidSlugResult<Input>;
  /**
   * Create a reader for current and explicitly enabled old formats without changing this codec.
   * Untyped calls with invalid options return `UuidSlugError`; decode failures return it from the
   * reader. Valid TypeScript options create the reader directly.
   *
   * @param options - Old formats this application has actually issued. Omit for current formats only.
   */
  createUuidSlugMigrationDecoder<const Options extends UuidSlugMigrationOptions = {}>(
    this: void,
    options?: Options,
  ): UuidSlugMigrationDecoder<EnabledMigrationFormat<Options>>;
  /**
   * Generate and encode a UUIDv7 as a masked slug or its registered raw sentinel slug.
   * Returns `invalid_timestamp` after `MAX_MASKED_UUID_V7_UNIX_MS` unless the generated UUID is a
   * registered sentinel, which is returned as a plain slug without masking.
   */
  generateMaskedUuidV7Slug(this: void): MaskedOrSentinelUuidV7Slug | UuidSlugError;
  /**
   * Generate UUIDv7 text and its masked or sentinel slug from one random byte draw. UUID text is
   * lowercase unless `textCase` selects uppercase.
   * Returns `invalid_timestamp` after `MAX_MASKED_UUID_V7_UNIX_MS` unless the generated UUID is a
   * registered sentinel, which is returned as a plain slug without masking.
   *
   * @param textCase - Built-in UUID text spelling. Omit for lowercase.
   */
  generateUuidV7WithMaskedSlug<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
    this: void,
    textCase?: Case,
  ): GeneratedUuidV7<MaskedOrSentinelUuidV7Slug, Case> | UuidSlugError;
  /**
   * Convert UUID text, 16 UUID bytes, a plain slug, or a masked slug to this masking codec's
   * current masked spelling. A dual-valid raw slug selects its masked meaning. Other UUID versions
   * return `invalid_uuid_version`. TypeScript rejects known UUIDv4 values; unbranded external
   * values are validated when called. Timestamps after
   * `MAX_MASKED_UUID_V7_UNIX_MS` return `invalid_timestamp`; registered sentinels are always
   * returned as plain slugs without masking and retain the full UUIDv7 timestamp range. A preceding
   * `UuidSlugError` is returned unchanged.
   *
   * @param uuid - Any supported UUIDv7 text, bytes, plain slug, masked slug, or sentinel.
   */
  uuidToMaskedSlug<Input extends string | UuidByteInput | UuidSlugError>(
    this: void,
    uuid: UuidV7ValueInput<Input>,
  ): MaskedOrSentinelUuidV7Slug | UuidSlugError;
  /**
   * Convert either plain UUIDv7 slug spelling to this codec's current masked or sentinel spelling.
   * UUIDv4 returns `invalid_uuid_version`; an out-of-range UUIDv7 returns `invalid_timestamp`; a
   * preceding `UuidSlugError` is returned unchanged.
   *
   * @param plainUuidSlug - Plain UUID slug whose source representation is known by the caller.
   */
  plainToMaskedUuidSlug<Input extends string | UuidSlugError>(
    this: void,
    plainUuidSlug: PlainUuidSlugInput<Input>,
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
   * Decode with this codec, check the symmetric timestamp window, and return the same slug.
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
  ): (Input & MaskedOrSentinelUuidV7Slug) | UuidSlugError;
}
