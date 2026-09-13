// SPDX-License-Identifier: Apache-2.0

import type { UuidSlugError } from "./errors.ts";
import type { SlugAlphabet } from "./slug.ts";

declare const brand: unique symbol;
declare const uuidV7MaskBrand: unique symbol;

/** Accumulate validated value kinds without changing their runtime representation. */
type Brand<Value, Name extends string> = Value & {
  readonly [brand]: { [BrandName in Name]: true };
};

/** Canonical lowercase UUID text. This proves syntax only, not version or issuance. */
export type UuidString = Brand<string, "UuidString">;
/** Canonical lowercase UUIDv4 text with RFC variant bits. */
export type UuidV4String = Brand<UuidString, "UuidV4String">;
/** Canonical lowercase UUIDv7 text with RFC variant bits. */
export type UuidV7String = Brand<UuidString, "UuidV7String">;
/** A reversible direct UUID encoding: 22 base64url or 26 lowercase base32hex characters. */
export type UuidSlug = Brand<string, "UuidSlug">;
/** A direct slug whose decoded UUID is version 4 with the RFC variant. */
export type UuidV4Slug = Brand<UuidSlug, "UuidV4Slug">;
/** A direct slug whose decoded UUID is version 7 with the RFC variant. */
export type UuidV7Slug = Brand<UuidSlug, "UuidV7Slug">;
/** Carry a validated UUID version through lossless representation changes. */
export type PreserveUuidVersion<Input, UnknownVersion, Version4, Version7> =
  Input extends UuidSlugError
    ? never
    : Input extends UuidV4String | UuidV4Slug
      ? Version4
      : Input extends UuidV7String | UuidV7Slug
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
/** A codec sentinel written as its raw 22- or 26-character direct UUIDv7 slug. */
export type SentinelUuidV7Slug = Brand<UuidV7Slug, "SentinelUuidV7Slug">;
/** A codec result: either a masked UUIDv7 or a registered raw sentinel. */
export type UuidV7CodecSlug = MaskedUuidV7Slug | SentinelUuidV7Slug;

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
  UuidSlug | MaskedUuidSlug
>;
/** Reject known UUID text and masked slugs; only a direct slug decodes without a key. */
export type DirectUuidSlugInput<Input extends string | UuidSlugError> = RejectKnownInput<
  Input,
  UuidString | MaskedUuidSlug
>;
/** Reject known UUID text; slug brands stay accepted because direct and masked spellings overlap. */
type SlugStringInput<Input extends string | UuidSlugError> = RejectKnownInput<Input, UuidString>;
/** Reject known slugs and UUIDv4 text; the operation reads a UUIDv7 timestamp from text. */
export type UuidV7StringInput<Input extends string | UuidSlugError> = RejectKnownInput<
  Input,
  UuidSlug | MaskedUuidSlug | UuidV4String
>;
/** Reject known UUID text, masked slugs, and UUIDv4 slugs; the operation needs a direct UUIDv7 slug. */
export type UuidV7SlugInput<Input extends string | UuidSlugError> = RejectKnownInput<
  Input,
  UuidString | MaskedUuidSlug | UuidV4Slug
>;
/** Reject masked slugs and known UUIDv4 values; only UUIDv7 text or a direct UUIDv7 slug carries a timestamp. */
export type UuidV7TimestampInput<Input extends string | UuidSlugError> = RejectKnownInput<
  Input,
  MaskedUuidSlug | UuidV4String | UuidV4Slug
>;
/** Reject known UUIDv4 bytes; the operation needs UUIDv7 bytes. */
export type UuidV7BytesInput<Input extends Uint8Array | UuidSlugError> = RejectKnownInput<
  Input,
  UuidV4Bytes
>;
/** Exactly 16 validated UUID bytes. Package-owned values are plain `Uint8Array`. */
export type UuidBytes = Brand<Uint8Array, "UuidBytes">;
/** UUID bytes with version 4 and RFC variant bits. */
export type UuidV4Bytes = Brand<UuidBytes, "UuidV4Bytes">;
/** UUID bytes with version 7 and RFC variant bits. */
export type UuidV7Bytes = Brand<UuidBytes, "UuidV7Bytes">;

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
  /** Generate canonical UUIDv7 text for the current clock reading. */
  generateUuidV7(this: void): UuidV7String | UuidSlugError;
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
   * state.
   */
  generateUuidV7At(this: void, unixMs: number): UuidV7String | UuidSlugError;
  /** Generate a new 16-byte array at an explicit millisecond without changing current-time state. */
  generateUuidV7BytesAt(this: void, unixMs: number): UuidV7Bytes | UuidSlugError;
  /**
   * Write an explicit-time UUIDv7 only after success and return the exact supplied array.
   *
   * @param unixMs - Whole Unix millisecond encoded into the UUID.
   * @param output - Caller-owned array that receives the 16 UUID bytes.
   * @param outputOffset - Zero-based index where writing starts. Omit to start at index 0. Bytes
   * outside the written range stay unchanged.
   */
  generateUuidV7BytesAt<Output extends Uint8Array>(
    this: void,
    unixMs: number,
    output: Output,
    outputOffset?: number,
  ): Output | UuidSlugError;
}

/** An immutable handle for masking the recognizable fields of a UUIDv7; key material is not exposed. */
export interface UuidV7Mask {
  /** Diagnostic label only; mask objects and caller order select decoding behavior. */
  readonly label: string;
  readonly [uuidV7MaskBrand]: true;
}

/** Define a reversible 16-byte transform for `createCustomUuidV7Mask`. */
export interface CustomUuidV7MaskOptions {
  /**
   * Names this mask in the error returned when a callback fails after construction, which is why
   * it is required here and optional for seeded masks, whose transform cannot fail. It does not
   * select the mask during decoding.
   */
  readonly label: string;
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
  readonly label?: string;
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
  /** Nonempty application-facing name, unique within the codec and exposed through `codec.sentinels`. */
  readonly name: string;
  /** Canonical UUIDv7 text, unique within the codec, reserved for raw sentinel output. */
  readonly uuid: string;
}

/** A validated sentinel and its raw direct slug in the codec's output alphabet. */
export interface UuidV7Sentinel {
  /** The definition's application-facing name. */
  readonly name: string;
  /** The reserved raw slug; it is not a masked payload. */
  readonly slug: SentinelUuidV7Slug;
  /** The canonical UUIDv7 represented by `slug`. */
  readonly uuid: UuidV7String;
}

const MIGRATION_FORMATS = ["current-mask", "original-mask", "direct-slug"] as const;

/** The migration formats accepted by `UuidSlugMigrationDecoder`. */
export const UUID_SLUG_MIGRATION_FORMATS: typeof MIGRATION_FORMATS =
  /*#__PURE__*/ Object.freeze(MIGRATION_FORMATS);

/** Select one enabled migration format when the input's original encoding is known. */
export type UuidSlugMigrationFormat = (typeof UUID_SLUG_MIGRATION_FORMATS)[number];

/** Enable only formats your application has issued; writers keep using the codec. */
export interface UuidSlugMigrationOptions {
  /**
   * Accept the fixed-key format with a four-bit check that predates seeded masking, from before
   * package 0.2.0. Releases from 0.2.0 on write different formats, so enable it only for slugs
   * issued under that earlier scheme.
   *
   * @defaultValue `false`
   */
  readonly originalMask?: boolean;
  /**
   * Accept direct UUID slugs of any version, including retained trailing-bit aliases.
   *
   * @defaultValue `false`
   */
  readonly directSlug?: boolean;
}

type EnabledMigrationOption<
  Options,
  Option extends keyof UuidSlugMigrationOptions,
> = Option extends keyof Options ? (true extends Options[Option] ? Option : never) : never;

/** Project enabled options into the only format selectors that decoder can accept. */
export type EnabledMigrationFormat<Options extends UuidSlugMigrationOptions> =
  | "current-mask"
  | (EnabledMigrationOption<Options, "originalMask"> extends never ? never : "original-mask")
  | (EnabledMigrationOption<Options, "directSlug"> extends never ? never : "direct-slug");

/**
 * Decode current and explicitly enabled old formats without changing codec output.
 * Methods may be detached. A successful decode identifies a candidate UUID, not the issuing format
 * or a stored record. A preceding `UuidSlugError` is returned unchanged.
 */
export interface UuidSlugMigrationDecoder<
  in Format extends UuidSlugMigrationFormat = UuidSlugMigrationFormat,
> {
  /**
   * Return the first candidate in this order: sentinel, current masks, original mask, direct slug.
   * Pass `format` when its origin is known to avoid trying unrelated readers.
   *
   * @param slug - Identifier accepted by one enabled migration reader.
   * @param format - Known source format. Omit to try enabled readers in documented order.
   */
  uuidSlugToString<Input extends string | UuidSlugError>(
    this: void,
    slug: SlugStringInput<Input>,
    format?: Format,
  ): UuidString | UuidSlugError;
  /**
   * Return every distinct candidate in decode order for one application lookup. An empty array
   * means no enabled format matched; callback failure returns `UuidSlugError`, not a partial list.
   * A preceding `UuidSlugError` is returned unchanged.
   *
   * @param slug - Identifier accepted by one or more enabled migration readers.
   * @param format - Known source format. Omit to try enabled readers in documented order.
   */
  uuidSlugToStringCandidates<Input extends string | UuidSlugError>(
    this: void,
    slug: SlugStringInput<Input>,
    format?: Format,
  ): UuidString[] | UuidSlugError;
}

/** Configure one immutable UUIDv7 codec for writing, key rotation, and sentinels. */
export interface UuidV7SlugCodecOptions {
  /**
   * The writer mask and first reader. Supply a private seed or explicitly choose
   * `UUID_V7_TEST_MASK` for public test data. A returned `UuidSlugError` passes through unchanged.
   */
  readonly mask: UuidV7Mask | UuidV7MaskOptions | UuidSlugError;
  /**
   * Decode-only masks tried after `mask`, in caller order. Each item accepts a mask or its
   * construction options. A returned `UuidSlugError` passes through unchanged. Keep the list
   * short: every mask adds decoding work and another chance for a random input to pass its 16-bit
   * check.
   *
   * @defaultValue No previous masks.
   */
  readonly previousMasks?: readonly (UuidV7Mask | UuidV7MaskOptions | UuidSlugError)[];
  /**
   * Named UUIDv7 values emitted as raw direct slugs instead of masked payloads.
   *
   * @defaultValue No sentinels.
   */
  readonly sentinels?: readonly UuidV7SentinelConfig[];
  /**
   * Output spelling for masked IDs and sentinels.
   * `"base32hex"` preserves the full masked payload in 27 lowercase characters (26 for raw
   * sentinels), suitable for case-insensitive filesystems. Masked output has no sort-order promise.
   * Readers accept both spellings regardless of this writer selection.
   *
   * @defaultValue `"base64url"`
   */
  readonly outputAlphabet?: SlugAlphabet;
}

/**
 * An immutable UUIDv7 codec that owns its masks, sentinels, output alphabet, and byte source.
 * Methods may be detached. Decoding proves format integrity, not issuance or authorization.
 */
export interface UuidV7SlugCodec {
  /** Frozen sentinel metadata in the codec's configured output alphabet. */
  readonly sentinels: readonly UuidV7Sentinel[];
  /**
   * Create a reader for current and explicitly enabled old formats without changing this codec.
   * Untyped calls with invalid options return `UuidSlugError`; decode failures return it from the
   * reader. Valid TypeScript options create the reader directly.
   *
   * @param options - Old formats this application has actually issued. Omit for current formats only.
   */
  createMigrationDecoder<const Options extends UuidSlugMigrationOptions = {}>(
    this: void,
    options?: Options,
  ): UuidSlugMigrationDecoder<EnabledMigrationFormat<Options>>;
  /** Generate and encode a UUIDv7 as a masked slug or its registered raw sentinel slug. */
  generateUuidSlug(this: void): UuidV7CodecSlug | UuidSlugError;
  /**
   * Encode canonical UUIDv7 text as a masked slug, unless it is a registered sentinel.
   * Other UUID versions return `invalid_uuid_version`. TypeScript rejects known slug and UUIDv4
   * values; unbranded external values are validated when called. A preceding `UuidSlugError` is
   * returned unchanged.
   *
   * @param uuid - Canonical UUIDv7 text.
   */
  uuidStringToSlug<Input extends string | UuidSlugError>(
    this: void,
    uuid: UuidV7StringInput<Input>,
  ): UuidV7CodecSlug | UuidSlugError;
  /**
   * Encode exactly 16 UUIDv7 bytes as a masked slug, unless they identify a registered sentinel.
   * Other UUID versions return `invalid_uuid_version`. A preceding `UuidSlugError` is returned
   * unchanged.
   *
   * @param uuid - Exactly 16 UUIDv7 bytes.
   */
  uuidBytesToSlug<Input extends Uint8Array | UuidSlugError>(
    this: void,
    uuid: UuidV7BytesInput<Input>,
  ): UuidV7CodecSlug | UuidSlugError;
  /**
   * Decode the first passing sentinel or mask in configured order to canonical UUIDv7 text.
   * Success proves format integrity, not issuance. TypeScript rejects known UUID text; slug values
   * remain accepted because direct and masked spellings can overlap. A preceding `UuidSlugError`
   * is returned unchanged.
   *
   * @param slug - Masked slug or registered sentinel accepted by this codec.
   */
  uuidSlugToString<Input extends string | UuidSlugError>(
    this: void,
    slug: SlugStringInput<Input>,
  ): UuidV7String | UuidSlugError;
  /**
   * Decode to a new plain 16-byte `Uint8Array`. Use this when the caller needs binary output. A
   * preceding `UuidSlugError` is returned unchanged.
   *
   * @param slug - Masked slug or registered sentinel accepted by this codec.
   */
  uuidSlugToBytes<Input extends string | UuidSlugError>(
    this: void,
    slug: SlugStringInput<Input>,
  ): UuidV7Bytes | UuidSlugError;
  /**
   * Decode and validate before writing 16 bytes. Return the exact supplied array; errors leave it
   * unchanged. A preceding `UuidSlugError` is returned unchanged without writing.
   *
   * @param slug - Masked slug or registered sentinel accepted by this codec.
   * @param output - Caller-owned array that receives the 16 UUID bytes.
   * @param outputOffset - Zero-based index where writing starts. Omit to start at index 0. Bytes
   * outside the written range stay unchanged.
   */
  uuidSlugToBytes<Input extends string | UuidSlugError, Output extends Uint8Array>(
    this: void,
    slug: SlugStringInput<Input>,
    output: Output,
    outputOffset?: number,
  ): Output | UuidSlugError;
  /**
   * Decode a masked slug or registered sentinel with this codec and return its UUIDv7 Unix
   * timestamp in milliseconds. Success proves format integrity, not issuance or authorization. A
   * preceding `UuidSlugError` is returned unchanged.
   *
   * @param slug - Masked slug or registered sentinel accepted by this codec.
   */
  extractUuidSlugTimestamp<Input extends string | UuidSlugError>(
    this: void,
    slug: SlugStringInput<Input>,
  ): number | UuidSlugError;
  /**
   * Decode with this codec, check the symmetric timestamp window, and return the same slug.
   * This checks clock plausibility, not expiry, authentication, replay, or issuance. TypeScript
   * rejects known UUID text because only this codec can resolve overlapping slug spellings. A
   * preceding `UuidSlugError` is returned unchanged.
   *
   * @param slug - Masked slug or registered sentinel accepted by this codec.
   * @param window - Inclusive maximum distance from an explicit or current reference time.
   */
  validateUuidSlugTimestamp<Input extends string | UuidSlugError>(
    this: void,
    slug: SlugStringInput<Input>,
    window: UuidV7TimestampWindow,
  ): (Input & UuidV7CodecSlug) | UuidSlugError;
}
