// SPDX-License-Identifier: Apache-2.0

import type { UuidSlugError } from "./errors";
import type { SlugAlphabet } from "./uuid";

declare const brand: unique symbol;
declare const maskSchemaBrand: unique symbol;

/** Accumulate validated value kinds without changing their runtime representation. */
export type Brand<Value, Name extends string> = Value & {
  readonly [brand]: { [BrandName in Name]: true };
};

/** A canonical lowercase UUID string. This says nothing about issuance or ownership. */
export type UuidString = Brand<string, "UuidString">;
/** A canonical RFC-variant UUIDv4 string. */
export type UuidV4String = Brand<UuidString, "UuidV4String">;
/** A canonical RFC-variant UUIDv7 string. */
export type UuidV7String = Brand<UuidString, "UuidV7String">;
/** A direct UUID encoding: 22 base64url or 26 lowercase base32hex characters. */
export type UuidSlug = Brand<string, "UuidSlug">;
/** A direct slug whose decoded UUID is version 4 with the RFC variant. */
export type UuidV4Slug = Brand<UuidSlug, "UuidV4Slug">;
/** A direct slug whose decoded UUID is version 7 with the RFC variant. */
export type UuidV7Slug = Brand<UuidSlug, "UuidV7Slug">;
/** A masked payload in either spelling; its check bits are not plain-encoding padding. */
export type MaskedUuidSlug = Brand<string, "MaskedUuidSlug">;
/** A checked, keyed UUIDv7 payload: 22 base64url or 27 lowercase base32hex characters. */
export type MaskedUuidV7Slug = Brand<MaskedUuidSlug, "MaskedUuidV7Slug">;
/** A reserved UUIDv7 written as a raw 22- or 26-character direct slug. */
export type SentinelUuidV7Slug = Brand<UuidV7Slug, "SentinelUuidV7Slug">;
/** The result of masked encoding: a 22/27-character payload or a 22/26-character sentinel. */
export type PublicUuidV7Slug = MaskedUuidV7Slug | SentinelUuidV7Slug;

/**
 * Reject a captured brand that proves an input cannot satisfy an operation. Bare strings remain
 * valid because widening erases their child brand, leaving runtime validation as the only sound
 * judge; tuple wrapping makes one invalid member reject the entire known union.
 */
type RejectKnownInput<Input, Invalid> = [Extract<Input, Invalid>] extends [never] ? Input : never;

/** Reject values whose known representation or UUID version cannot satisfy the target operation. */
export type UuidStringInput<Input extends string> = RejectKnownInput<
  Input,
  UuidSlug | MaskedUuidSlug
>;
export type DirectUuidSlugInput<Input extends string> = RejectKnownInput<
  Input,
  UuidString | MaskedUuidSlug
>;
export type SlugStringInput<Input extends string> = RejectKnownInput<Input, UuidString>;
export type UuidV7StringInput<Input extends string> = RejectKnownInput<
  Input,
  UuidSlug | MaskedUuidSlug | UuidV4String
>;
export type UuidV7SlugInput<Input extends string> = RejectKnownInput<
  Input,
  UuidString | MaskedUuidSlug | UuidV4Slug
>;
export type UuidV7BytesInput<Input extends Uint8Array> = RejectKnownInput<Input, UuidV4Bytes>;
/** One validated 16-byte UUID payload. Package-owned values are plain `Uint8Array`. */
export type UuidBytes = Brand<Uint8Array, "UuidBytes">;
/** UUID bytes with version 4 and RFC variant bits. */
export type UuidV4Bytes = Brand<UuidBytes, "UuidV4Bytes">;
/** UUID bytes with version 7 and RFC variant bits. */
export type UuidV7Bytes = Brand<UuidBytes, "UuidV7Bytes">;

/** Configure a symmetric UUIDv7 timestamp check; this is not expiry, authentication, replay protection, or proof of issuance. */
export interface FreshValidationOptions {
  /** Finite Unix milliseconds; read once per validation. */
  readonly now?: () => number;
  /** Finite, nonnegative radius around now, inclusive in both directions; default 24 hours. */
  readonly windowMs?: number;
}

/** Supply valid UUIDv7 bytes to a codec without exposing generator internals. */
export interface UuidV7BytesSource {
  /** Return one valid 16-byte UUIDv7 payload or a package error. */
  uuidV7Bytes(this: void): Uint8Array | UuidSlugError;
}

/**
 * Generate UUIDv7 values with one owned clock, entropy source, and sequence state. Methods use
 * `this: void` so callers can detach them safely and implementations cannot require receiver state.
 */
export interface UuidV7Generator extends UuidV7BytesSource {
  /** Generate a canonical UUIDv7 string for the current clock reading. */
  uuidV7(this: void): UuidV7String | UuidSlugError;
  /** Generate package-owned UUIDv7 bytes for the current clock reading. */
  uuidV7Bytes(this: void): UuidV7Bytes | UuidSlugError;
  /** Write one UUIDv7 into `out` atomically and return that exact array. */
  uuidV7Bytes<Output extends Uint8Array>(
    this: void,
    out: Output,
    offset?: number,
  ): Output | UuidSlugError;
  /**
   * Generate at a whole Unix millisecond in `0..2^48-1` without changing current-time sequence
   * state. The timestamp comes first so callback indices cannot become timestamps by accident.
   */
  uuidV7At(this: void, timestamp: number): UuidV7String | UuidSlugError;
  /** Generate package-owned bytes at an explicit millisecond without changing sequence state. */
  uuidV7BytesAt(this: void, timestamp: number): UuidV7Bytes | UuidSlugError;
  /** Write one explicit-time UUIDv7 into `out` atomically and return that exact array. */
  uuidV7BytesAt<Output extends Uint8Array>(
    this: void,
    timestamp: number,
    out: Output,
    offset?: number,
  ): Output | UuidSlugError;
}

/** A frozen package-produced masking handle whose transform and key material stay private. */
export interface MaskSchema {
  /** Diagnostic label only; schema objects and caller order select decoding behavior. */
  readonly id: string;
  readonly [maskSchemaBrand]: true;
}

/** Adapt a reversible 16-byte transform into an opaque mask schema. */
export interface CustomMaskSchemaOptions {
  /** A diagnostic label; it does not select the schema during decoding. */
  readonly id: string;
  /** Return the transformed 16-byte block or a package error; the input is isolated for this call. */
  readonly forward: (input: Uint8Array) => Uint8Array | UuidSlugError;
  /** Invert `forward` for every input; construction can check only representative values. */
  readonly reverse: (input: Uint8Array) => Uint8Array | UuidSlugError;
}

/**
 * Derive an immutable masking schema from stable key material. UUIDv7's constant bits leave the
 * 16-bit check used by this format; another reversible transform belongs in a custom schema.
 */
export interface MaskSchemaOptions {
  /** Diagnostic label only; decoding uses the schema object and caller-specified order. */
  readonly id?: string;
  /**
   * Stable secret key material. Generate at least 16 bytes, keep it outside source control, and
   * retain old values in `previousMasks`; a known UUID/slug pair permits offline guesses.
   */
  readonly seed: string | Uint8Array;
  /**
   * Key-derivation work factor, default `1`, paid at schema construction rather than per ID.
   * Changing it changes every derived key, so retain the old seed and count in `previousMasks`
   * when identifiers issued under them must remain readable.
   */
  readonly keyIterations?: number;
}

/** The synchronous seed options plus cooperative cancellation; no scheduling knobs are required. */
export interface AsyncMaskSchemaOptions extends MaskSchemaOptions {
  /** Stop cooperative derivation and return an `aborted` error with `reason` as its cause. */
  readonly signal?: AbortSignal;
}

/** Define a named UUIDv7 that must bypass masking. */
export interface UuidV7SentinelDefinition {
  /** Application-facing name exposed through `codec.sentinels`. */
  readonly name: string;
  /** Canonical UUIDv7 text reserved by the codec. */
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

/** Select a known encoding instead of guessing from overlapping slug text. */
export type MigrationFormat = "current" | "original" | "plain";

/** Enable only formats your application has issued; writers keep using the codec. */
export interface UuidSlugMigrationOptions {
  /** Accept the original fixed-mask format with its four-bit check. */
  readonly original?: boolean;
  /** Accept direct UUID slugs, including retained trailing-bit aliases. */
  readonly plain?: boolean;
}

type EnabledMigrationOption<
  Options,
  Option extends keyof UuidSlugMigrationOptions,
> = Option extends keyof Options ? (true extends Options[Option] ? Option : never) : never;

/** Internal projection used to keep each migration reader's selector type honest. */
export type EnabledMigrationFormat<Options extends UuidSlugMigrationOptions> =
  | "current"
  | EnabledMigrationOption<Options, "original">
  | EnabledMigrationOption<Options, "plain">;

/** Read only the historical forms enabled at construction; this never changes codec writers. */
export interface UuidSlugMigration<in Format extends MigrationFormat = MigrationFormat> {
  /**
   * Return the first candidate: sentinel, current keys, original mask, then plain UUID. Known UUID
   * text is rejected; slug brands remain accepted because overlapping spellings do not prove origin.
   */
  decode<Input extends string>(
    this: void,
    slug: SlugStringInput<Input>,
    format?: Format,
  ): UuidString | UuidSlugError;
  /**
   * Return distinct candidates for one application lookup; an empty array means no match. Known
   * UUID text is rejected, while every slug spelling must be resolved by the enabled decoders.
   */
  candidates<Input extends string>(
    this: void,
    slug: SlugStringInput<Input>,
    format?: Format,
  ): UuidString[] | UuidSlugError;
}

/** Configure one immutable owner for masking, key rotation, sentinels, and masked generation. */
export interface UuidSlugCodecOptions {
  /** Optional UUIDv7 byte source; the codec validates every returned payload before masking. */
  readonly generator?: UuidV7BytesSource;
  /**
   * Decode-only schemas tried after `mask`, in caller order. Seed options are accepted directly so
   * ordinary key rotation needs no separate constructor or error branch. Keep the list short:
   * every schema adds work and another chance for a random input to pass its 16-bit check.
   */
  readonly previousMasks?: readonly (MaskSchema | MaskSchemaOptions)[];
  /**
   * The only writer schema and the first reader. Keeping it separate from `previousMasks` prevents
   * rotation from leaving an old key as the writer. Supply a private seed or explicitly choose
   * `PUBLIC_MASK_SCHEMA` for public test data.
   */
  readonly mask: MaskSchema | MaskSchemaOptions;
  /** Replace the default sentinel set; an empty array disables sentinels. */
  readonly sentinels?: readonly UuidV7SentinelDefinition[];
  /**
   * Output spelling for masked IDs and sentinels; defaults to `"base64url"`.
   * `"base32hex"` preserves the full masked payload in 27 lowercase characters (26 for raw
   * sentinels), suitable for case-insensitive filesystems. Masked output has no sort-order promise.
   * Readers accept both spellings regardless of this writer selection.
   */
  readonly maskedSlugAlphabet?: SlugAlphabet;
}

/**
 * Own the keys, sentinels, writer spelling, and byte source used by masked operations. Plain
 * conversions stay module-level because they need none of that state. Methods use `this: void` so
 * callers can detach them without binding and implementations cannot depend on a receiver.
 */
export interface UuidSlugCodec {
  /** Frozen reserved values in the codec's configured output alphabet. */
  readonly sentinels: readonly UuidV7Sentinel[];
  /**
   * Create an opt-in reader without changing generation or ordinary decoding.
   * Malformed option structure throws `TypeError`; enabled data failures return package errors.
   */
  migration<const Options extends UuidSlugMigrationOptions = {}>(
    this: void,
    options?: Options,
  ): UuidSlugMigration<EnabledMigrationFormat<Options>>;
  /** Generate UUIDv7 bytes, then return a masked slug or the matching raw sentinel slug. */
  uuidV7MaskedSlug(this: void): PublicUuidV7Slug | UuidSlugError;
  /**
   * Mask one UUIDv7, or return its raw sentinel slug. Other UUID versions do not have the spare
   * constant bits that keep this checked format at 22 base64url characters. Generic capture rejects
   * known slug and UUIDv4 brands; bare external strings remain runtime-validated.
   */
  uuidV7ToMaskedSlug<Input extends string>(
    this: void,
    uuid: UuidV7StringInput<Input>,
  ): PublicUuidV7Slug | UuidSlugError;
  /**
   * Return the first sentinel or schema candidate in configured order; this does not prove issuance.
   * Generic capture rejects known UUID text; slug brands remain accepted because overlapping
   * spellings do not prove which encoder produced them.
   */
  maskedSlugToUuidV7<Input extends string>(
    this: void,
    slug: SlugStringInput<Input>,
  ): UuidV7String | UuidSlugError;
  /**
   * Decode with this codec, apply the symmetric freshness window, and return the same spelling.
   * The check establishes timestamp sanity, not expiry, authentication, replay safety, or issuance.
   * Generic capture rejects known UUID text; slug brands remain accepted because only decoding with
   * this codec can resolve their overlapping spellings.
   */
  validateMaskedSlugFresh<Input extends string>(
    this: void,
    slug: SlugStringInput<Input>,
    freshness?: FreshValidationOptions,
  ): (Input & PublicUuidV7Slug) | UuidSlugError;
}
