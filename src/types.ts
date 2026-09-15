// SPDX-License-Identifier: Apache-2.0

import type { UuidSlugError } from "./errors.ts";
import type { SlugAlphabet } from "./slug.ts";

declare const brand: unique symbol;
declare const uuidV7MaskBrand: unique symbol;

/** Select the standard lowercase UUID text spelling. */
export const UUID_TEXT_LOWERCASE = "lowercase";
/** Select the standard uppercase UUID text spelling. */
export const UUID_TEXT_UPPERCASE = "uppercase";
/** Keep emitting from the last UUID timestamp when the clock moves backward. */
export const UUID_V7_ROLLBACK_PRESERVE = "preserve";
/** Restart the sequence at the earlier clock reading after the configured tolerance. */
export const UUID_V7_ROLLBACK_RESET = "reset";
/** Return `invalid_timestamp` after the configured rollback tolerance. */
export const UUID_V7_ROLLBACK_ERROR = "error";

/** Select the hexadecimal letter case of UUID text output. */
export type UuidTextCase = typeof UUID_TEXT_LOWERCASE | typeof UUID_TEXT_UPPERCASE;

/** The complete four-bit UUID version field, whether assigned or reserved. */
export type UuidVersion = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

/** UUID bits use the Apollo NCS layout. */
export const UUID_VARIANT_NCS = "ncs";
/** UUID bits use the RFC 9562 layout. */
export const UUID_VARIANT_RFC = "rfc";
/** UUID bits use the reserved Microsoft layout. */
export const UUID_VARIANT_MICROSOFT = "microsoft";
/** UUID bits use the reserved future layout. */
export const UUID_VARIANT_FUTURE = "future";

/** The layout family selected by the UUID variant bits. */
export type UuidVariant =
  | typeof UUID_VARIANT_NCS
  | typeof UUID_VARIANT_RFC
  | typeof UUID_VARIANT_MICROSOFT
  | typeof UUID_VARIANT_FUTURE;

/** Choose how one created generator handles a clock reading below its accepted high-water mark. */
export type UuidV7ClockRollbackPolicy =
  | { readonly action: typeof UUID_V7_ROLLBACK_PRESERVE }
  | {
      readonly action: typeof UUID_V7_ROLLBACK_RESET | typeof UUID_V7_ROLLBACK_ERROR;
      /** Preserve the previous timestamp while total clock skew is at most this many milliseconds. */
      readonly toleranceMs: number;
    };

/** Fill every byte requested by an explicit custom-entropy operation. */
export type UuidRandomFill = (bytes: Uint8Array) => void | UuidSlugError;

/** Accumulate validated value kinds without changing their runtime representation. */
type Brand<Value, Name extends string> = Value & {
  readonly [brand]: { [BrandName in Name]: true };
};

/** Valid mixed-case canonical, compact, URN, or brace-wrapped UUID text; this proves syntax only. */
export type UuidText = Brand<string, "UuidText">;
/** Valid UUIDv4 text with RFC variant bits, in any accepted spelling. */
export type UuidV4Text = Brand<UuidText, "UuidV4Text">;
/** Valid UUIDv7 text with RFC variant bits, in any accepted spelling. Its 74 payload bits have no inferred meaning. */
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
    : Input extends Uuid<infer Version, boolean, boolean>
      ? Version extends 4
        ? Version4
        : Version extends 7
          ? Version7
          : UnknownVersion
      : Input extends UuidV4Text | PlainUuidV4Slug | UuidV4Bytes
        ? Version4
        : Input extends UuidV7Text | PlainUuidV7Slug | UuidV7Bytes | MaskedUuidSlug
          ? Version7
          : UnknownVersion;
/** Preserve a UUID version already proved by the input; otherwise retain the complete field range. */
export type UuidVersionOf<Input> = Input extends UuidSlugError
  ? never
  : Input extends Uuid<infer Version, boolean, boolean>
    ? Version
    : Input extends UuidV4Text | PlainUuidV4Slug | UuidV4Bytes
      ? 4
      : Input extends UuidV7Text | PlainUuidV7Slug | UuidV7Bytes | MaskedUuidSlug
        ? 7
        : UuidVersion;
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

/** Inclusive bounds that contain every UUIDv7 from the requested Unix-millisecond interval. */
export interface UuidV7Bounds<Value extends UuidV7StringFor<UuidTextCase> | UuidV7Bytes> {
  /** Smallest RFC-variant UUIDv7 at the first requested millisecond. */
  readonly startInclusive: Value;
  /** Largest RFC-variant UUIDv7 at the last requested millisecond. */
  readonly endInclusive: Value;
}

/** Describe the leading UUIDv7 payload fields that the caller already knows were encoded. */
export interface UuidV7PayloadLayout {
  /** Number of leading `rand_a` bits holding an RFC 9562 Method 3 fraction; `0` means absent. */
  readonly subMillisecondFractionBits: number;
  /** Number of following bits holding an RFC 9562 Method 1 fixed counter; `0` means absent. */
  readonly counterBits: number;
}

/** UUIDv7 payload decoded under a caller-supplied layout. */
export interface UuidV7Payload {
  /** Standard 48-bit Unix millisecond timestamp. */
  readonly unixMs: number;
  /** Method 3 fraction bucket, or `undefined` when the layout assigns no fraction bits. */
  readonly subMillisecondFraction: { readonly value: number; readonly bits: number } | undefined;
  /** Method 1 counter, or `undefined` when the layout assigns no counter bits. */
  readonly counter: { readonly value: bigint; readonly bits: number } | undefined;
  /** Least-significant payload bits whose meaning the layout does not declare. */
  readonly remaining: { readonly value: bigint; readonly bits: number };
}

/** Stable facts read from one immutable UUID without interpreting application-owned payload bits. */
export interface UuidInspection<Version extends UuidVersion = UuidVersion> {
  /** Canonical lowercase UUID text. */
  readonly uuid: UuidStringForVersion<Version, typeof UUID_TEXT_LOWERCASE>;
  /** The complete four-bit version field, whether assigned or reserved. */
  readonly version: Version;
  /** The UUID layout family selected by the variant bits. */
  readonly variant: UuidVariant;
  /** Standard UUIDv7 Unix milliseconds, present only for an RFC-variant UUIDv7. */
  readonly unixMs: number | undefined;
  /** Whether every UUID bit is zero. */
  readonly isNil: boolean;
  /** Whether every UUID bit is one. */
  readonly isMax: boolean;
}

/** Canonical UUID text narrowed when the parsed value proves version 4 or 7. */
export type UuidStringForVersion<Version, Case extends UuidTextCase> = Version extends 4
  ? UuidV4StringFor<Case>
  : Version extends 7
    ? UuidV7StringFor<Case>
    : UuidStringFor<Case>;
/** UUID bytes narrowed when the parsed value proves version 4 or 7. */
export type UuidBytesForVersion<Version> = Version extends 4
  ? UuidV4Bytes
  : Version extends 7
    ? UuidV7Bytes
    : UuidBytes;
/** Plain UUID slug narrowed when the parsed value proves version 4 or 7. */
export type PlainUuidSlugForVersion<Version> = Version extends 4
  ? PlainUuidV4Slug
  : Version extends 7
    ? PlainUuidV7Slug
    : PlainUuidSlug;

/** An immutable parsed UUID with optional preset masking and UUIDv7 payload-layout capabilities. */
export interface Uuid<
  Version extends UuidVersion = UuidVersion,
  HasMaskingCodec extends boolean = false,
  HasPayloadLayout extends boolean = false,
> {
  /** The UUID version field. */
  readonly version: Version;
  /** Return stable UUID facts in one serializable record. */
  inspect(this: Uuid<Version, HasMaskingCodec, HasPayloadLayout>): UuidInspection<Version>;
  /** Return canonical UUID text, lowercase by default. */
  toString<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
    this: Uuid<Version, HasMaskingCodec, HasPayloadLayout>,
    textCase?: Case,
  ): UuidStringForVersion<Version, Case>;
  /** Return a new plain 16-byte UUID array. */
  toBytes(this: Uuid<Version, HasMaskingCodec, HasPayloadLayout>): UuidBytesForVersion<Version>;
  /** Write the UUID into caller-owned storage after validating the complete destination range. */
  toBytes<Output extends Uint8Array>(
    this: Uuid<Version, HasMaskingCodec, HasPayloadLayout>,
    output: Output,
    outputOffset?: number,
  ): Output | UuidSlugError;
  /** Return a plain UUID slug, using base64url by default. */
  toPlainSlug(
    this: Uuid<Version, HasMaskingCodec, HasPayloadLayout>,
    alphabet?: SlugAlphabet,
  ): PlainUuidSlugForVersion<Version>;
  /** Return the masked UUIDv7 spelling using an explicit or preset masking codec. */
  toMaskedSlug(
    this: Uuid<Version, HasMaskingCodec, HasPayloadLayout>,
    ...codec: Version extends 4
      ? readonly [maskingCodec: never]
      : HasMaskingCodec extends true
        ? readonly [maskingCodec?: UuidV7MaskingCodec]
        : readonly [maskingCodec: UuidV7MaskingCodec]
  ): MaskedOrSentinelUuidV7Slug | UuidSlugError;
  /** Decode UUIDv7 payload fields using an explicit or generated preset layout. */
  extractV7Payload(
    this: Uuid<Version, HasMaskingCodec, HasPayloadLayout>,
    ...layout: Version extends 4
      ? readonly [payloadLayout: never]
      : HasPayloadLayout extends true
        ? readonly [payloadLayout?: UuidV7PayloadLayout]
        : readonly [payloadLayout: UuidV7PayloadLayout]
  ): UuidV7Payload | UuidSlugError;
  /** Serialize as canonical lowercase UUID text; capabilities are process-local. */
  toJSON(
    this: Uuid<Version, HasMaskingCodec, HasPayloadLayout>,
  ): UuidStringForVersion<Version, typeof UUID_TEXT_LOWERCASE>;
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
type UuidV7ValueInput<Input extends UuidInput> = RejectKnownInput<
  Input,
  UuidV4Text | UuidV4Bytes | Uuid<4, boolean, boolean>
>;
/** Exactly 16 validated UUID bytes. Package-owned values are plain `Uint8Array`. */
export type UuidBytes = Brand<Uint8Array, "UuidBytes">;
/** UUID bytes with version 4 and RFC variant bits. */
export type UuidV4Bytes = Brand<UuidBytes, "UuidV4Bytes">;
/** UUID bytes with version 7 and RFC variant bits. */
export type UuidV7Bytes = Brand<UuidBytes, "UuidV7Bytes">;

/** A UUID byte source: a `Uint8Array`, a complete `ArrayBuffer`, or a `DataView`'s declared range. */
export type UuidByteInput = Uint8Array | ArrayBuffer | DataView;
type AnyUuidForVersion<Version extends UuidVersion> =
  | Uuid<Version>
  | Uuid<Version, false, true>
  | Uuid<Version, true>
  | Uuid<Version, true, true>;
type AnyUuid =
  | AnyUuidForVersion<UuidVersion>
  | { [Version in UuidVersion]: AnyUuidForVersion<Version> }[UuidVersion];
/** Any supported UUID text, byte, or slug input, plus a preceding package error. */
export type UuidInput = string | UuidByteInput | AnyUuid | UuidSlugError;
/** Reject a branded masked slug where no masking codec is available. */
export type KeylessUuidInput<Input> = [
  Extract<Exclude<Input, UuidSlugError>, MaskedUuidV7Slug>,
] extends [never]
  ? Input
  : never;
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
 * A stateful UUIDv7 sequence using one clock and entropy source. Successful
 * calls strictly increase in UUID byte order under the default preserve rollback policy, including
 * calls with `at`. Methods may be detached. Expected clock
 * and entropy failures return `UuidSlugError` without corrupting the next generation attempt.
 */
export interface UuidV7Generator {
  /** Payload layout emitted by this generator; pass it to UUIDv7 payload extraction. */
  readonly payloadLayout: UuidV7PayloadLayout;
  /** Generate an immutable UUIDv7 that remembers this generator's payload layout. */
  generateUuidV7Value<const Options extends UuidV7GeneratorValueOptions = {}>(
    this: void,
    options?: Options,
  ):
    | Uuid<7, Options extends { readonly maskingCodec: UuidV7MaskingCodec } ? true : false, true>
    | UuidSlugError;
  /** Generate UUIDv7 text for the current clock reading in the selected case, lowercase by default. */
  generateUuidV7<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
    this: void,
    textCase?: Case,
  ): UuidV7StringFor<Case> | UuidSlugError;
  /** Generate UUIDv7 text at an explicit time or the current clock reading. */
  generateUuidV7<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
    this: void,
    options: Omit<GenerateUuidV7Options<Case>, "generator">,
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
  /** Generate package-owned UUIDv7 bytes at an explicit time or the current clock reading. */
  generateUuidV7Bytes(
    this: void,
    options: Omit<GenerateUuidV7BytesOptions, "generator">,
  ): UuidV7Bytes | UuidSlugError;
  /** Write UUIDv7 bytes at an explicit time or the current clock reading into caller-owned storage. */
  generateUuidV7Bytes<Output extends Uint8Array>(
    this: void,
    options: Omit<GenerateUuidV7BytesIntoOptions<Output>, "generator">,
  ): Output | UuidSlugError;
}

/** A standard host instant; generation uses every sub-millisecond fraction bit its layout provides. */
export type UuidV7Instant =
  | number
  | bigint
  | string
  | Date
  | { readonly epochMilliseconds: number | bigint }
  | { readonly epochNanoseconds: bigint }
  | { readonly seconds: number | bigint; readonly nanoseconds?: number | bigint };

/** Select an explicit time and UUID text spelling for one UUIDv7. */
export interface GenerateUuidV7Options<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE> {
  /** Time to encode. A created generator joins its sequence; a module call stays independent. */
  readonly at?: UuidV7Instant;
  /** Generator that supplies entropy, payload layout, and sequence policy. */
  readonly generator?: UuidV7Generator;
  /** UUID text spelling. Omit for lowercase. */
  readonly textCase?: Case;
}

/** Select an explicit time and alphabet for one plain UUIDv7 slug. */
export interface GeneratePlainUuidV7SlugOptions {
  /** Time to encode. A selected generator may advance it to preserve its sequence. */
  readonly at?: UuidV7Instant;
  /** Slug spelling. Omit for the shorter base64url form. */
  readonly alphabet?: SlugAlphabet;
  /** Generator that supplies entropy, payload layout, and sequence policy. */
  readonly generator?: UuidV7Generator;
}

/** Select an explicit time for package-owned UUIDv7 bytes. */
export interface GenerateUuidV7BytesOptions {
  /** Time to encode. A created generator joins its sequence; a module call stays independent. */
  readonly at?: UuidV7Instant;
  /** Generator that supplies entropy, payload layout, and sequence policy. */
  readonly generator?: UuidV7Generator;
  readonly output?: never;
  readonly outputOffset?: never;
}

/** Select an explicit time and caller-owned storage for UUIDv7 bytes. */
export interface GenerateUuidV7BytesIntoOptions<Output extends Uint8Array> {
  /** Time to encode. A created generator joins its sequence; a module call stays independent. */
  readonly at?: UuidV7Instant;
  /** Generator that supplies entropy, payload layout, and sequence policy. */
  readonly generator?: UuidV7Generator;
  /** Caller-owned array that receives the 16 UUID bytes after successful generation. */
  readonly output: Output;
  /** Zero-based index where writing starts. Omit to start at index 0. */
  readonly outputOffset?: number;
}

/** Select time and both spellings for one UUIDv7 text-and-plain-slug pair. */
export interface GenerateUuidV7WithPlainSlugOptions<
  Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE,
> {
  /** Time to encode. A selected generator may advance it to preserve its sequence. */
  readonly at?: UuidV7Instant;
  /** Slug spelling. Omit for the shorter base64url form. */
  readonly alphabet?: SlugAlphabet;
  /** Generator that supplies entropy, payload layout, and sequence policy. */
  readonly generator?: UuidV7Generator;
  /** UUID text spelling. Omit for lowercase. */
  readonly textCase?: Case;
}

/** Select optional state for immutable UUIDv7 generation through a generator. */
export interface UuidV7GeneratorValueOptions {
  /** Time to encode through this generator's sequence state. */
  readonly at?: UuidV7Instant;
  /** Masking codec retained by the generated UUID for later masked conversion. */
  readonly maskingCodec?: UuidV7MaskingCodec;
}

/** Select independent owners and time for top-level immutable UUIDv7 generation. */
export interface UuidV7ValueOptions extends UuidV7GeneratorValueOptions {
  /** Generator that supplies entropy, sequence policy, and the retained payload layout. */
  readonly generator?: UuidV7Generator;
}

/** Select optional generation state when a masking codec is already preset. */
export interface UuidV7MaskingCodecValueOptions {
  /** Time to encode. A selected generator may advance it to preserve its sequence. */
  readonly at?: UuidV7Instant;
  /** Generator that supplies entropy, sequence policy, and the retained payload layout. */
  readonly generator?: UuidV7Generator;
}

/** Select generation state and UUID text spelling for one masked UUIDv7 pair. */
export interface GenerateUuidV7WithMaskedSlugOptions<
  Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE,
> extends UuidV7MaskingCodecValueOptions {
  /** UUID text spelling. Omit for lowercase. */
  readonly textCase?: Case;
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
   * masking, so their timestamps may lie outside the codec's configured range.
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
   * First Unix millisecond accepted by masking. The inclusive end is this value plus
   * `MAX_MASKED_UUID_V7_TIMESTAMP_OFFSET_MS`. Changing it changes masked slugs, so retain the old
   * value with its mask in `previousMasks` while stored slugs still use it.
   *
   * @defaultValue `0`
   */
  readonly timestampRangeStartUnixMs?: number;
  /**
   * Decode-only masks tried after `mask`, in caller order. Each item accepts a mask or its
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
 */
export interface UuidV7MaskingCodec {
  /** Frozen sentinel metadata in the masking codec's configured masked-slug alphabet. */
  readonly sentinels: readonly UuidV7Sentinel[];
  /** Generate an immutable UUIDv7 with this masking codec retained. */
  generateUuidV7Value(
    this: void,
    options?: UuidV7MaskingCodecValueOptions,
  ): Uuid<7, true, true> | UuidSlugError;
  /** Parse any accepted UUID form and retain this codec for later masked conversions. */
  parseUuid<Input extends UuidInput>(
    this: void,
    uuid: Input,
  ): Uuid<UuidVersionOf<Input>, true> | UuidSlugError;
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
   * current masked spelling. A dual-valid raw slug selects its masked meaning. Other UUID versions
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
