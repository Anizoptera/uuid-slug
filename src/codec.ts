// SPDX-License-Identifier: Apache-2.0

import { checkByteRange, isUuidSlugError, UuidSlugError } from "./errors";
import { generateUuidV7Bytes as generateDefaultUuidV7Bytes } from "./keyless";
import { uuidV7BytesToMaskedSlug, decodeMaskedSlug } from "./mask";
import { createMigration } from "./migration";
import { isMaskSchema } from "./schema-handle";
import { createUuidV7Mask } from "./schema";
import type {
  EnabledMigrationFormat,
  UuidV7Mask,
  UuidV7MaskOptions,
  UuidV7CodecSlug,
  SentinelUuidV7Slug,
  UuidSlugMigrationDecoder,
  UuidSlugMigrationOptions,
  UuidV7SlugCodec,
  UuidV7SlugCodecOptions,
  UuidV7Bytes,
  UuidV7Slug,
  UuidV7SlugInput,
  UuidV7Sentinel,
  UuidV7String,
  UuidV7StringInput,
} from "./types";
import {
  isUuidV7Bytes,
  resolveSlugAlphabet,
  uuidToBytes,
  slugToBytes,
  bytesToUuid,
  bytesToSlug,
  extractUuidV7Timestamp,
} from "./uuid";
import type { UuidV7TimestampWindow, UuidV7SentinelConfig } from "./types";
import type { SlugAlphabet } from "./uuid";

type SentinelState = {
  readonly bySlug: ReadonlyMap<string, { uuid: UuidV7String; bytes: Uint8Array }>;
  readonly encoded: readonly { bytes: Uint8Array; slug: SentinelUuidV7Slug }[];
  readonly sentinels: readonly UuidV7Sentinel[];
};

const EMPTY_SENTINELS: readonly UuidV7Sentinel[] = Object.freeze([]);
const EMPTY_ENCODED_SENTINELS: readonly {
  bytes: Uint8Array;
  slug: SentinelUuidV7Slug;
}[] = Object.freeze([]);
const EMPTY_SENTINEL_STATE: SentinelState = Object.freeze({
  bySlug: new Map(),
  encoded: EMPTY_ENCODED_SENTINELS,
  sentinels: EMPTY_SENTINELS,
});

function schemaFromOption(mask: UuidV7Mask | UuidV7MaskOptions): UuidV7Mask | UuidSlugError {
  if (isMaskSchema(mask)) return mask;
  if (typeof mask !== "object" || mask === null)
    return new UuidSlugError(
      "invalid_mask_schema",
      "Pass a mask schema handle or mask options containing a private seed.",
    );
  return createUuidV7Mask(mask);
}

function createSentinels(
  definitions: readonly UuidV7SentinelConfig[],
  alphabet: SlugAlphabet,
): SentinelState | UuidSlugError {
  const sentinels: UuidV7Sentinel[] = [];
  const names = new Set<string>();
  const byUuid = new Set<string>();
  const encoded: { bytes: Uint8Array; slug: SentinelUuidV7Slug }[] = [];
  const bySlug = new Map<string, { uuid: UuidV7String; bytes: Uint8Array }>();
  for (const definition of definitions) {
    if (
      typeof definition !== "object" ||
      definition === null ||
      typeof definition.name !== "string" ||
      typeof definition.uuid !== "string"
    )
      return new UuidSlugError(
        "invalid_sentinel",
        "Each sentinel must have a name and UUIDv7 string.",
      );
    if (definition.name.length === 0)
      return new UuidSlugError("invalid_sentinel", "Sentinel names must not be empty.");
    if (names.has(definition.name))
      return new UuidSlugError(
        "invalid_sentinel",
        `Sentinel name "${definition.name}" must be unique within a codec.`,
      );
    // Sentinel configuration accepts raw strings so callers do not need casts before reaching the
    // validating seam. Check each value here, while a bad definition is still a constructor error
    // rather than a codec that fails on every later decode.
    const bytes = uuidToBytes(definition.uuid);
    if (bytes instanceof Error) return bytes;
    if (!isUuidV7Bytes(bytes))
      return new UuidSlugError(
        "invalid_uuid_version",
        `Sentinel "${definition.name}" must be a UUIDv7, got ${definition.uuid}.`,
      );
    // Reject duplicate UUIDs before the array and lookup maps can disagree about which exposed
    // sentinel owns the reserved value.
    if (byUuid.has(definition.uuid))
      return new UuidSlugError(
        "invalid_uuid",
        `Sentinel "${definition.name}" repeats the UUID of an earlier sentinel.`,
      );
    // Sentinels remain raw UUIDs; only their writer follows the masked alphabet selection.
    const slug = bytesToSlug(bytes, alphabet);
    if (slug instanceof Error) return slug;
    const sentinel = Object.freeze({
      name: definition.name,
      // `bytesToSlug` returns the version-agnostic brand; the v7-ness comes
      // from the check above.
      slug: slug as SentinelUuidV7Slug,
      uuid: definition.uuid as UuidV7String,
    });
    sentinels.push(sentinel);
    names.add(definition.name);
    byUuid.add(definition.uuid);
    encoded.push({ bytes, slug: sentinel.slug });
    bySlug.set(sentinel.slug, { uuid: sentinel.uuid, bytes });
    const alternate = bytesToSlug(bytes, alphabet === "base64url" ? "base32hex" : "base64url");
    if (alternate instanceof Error) return alternate;
    bySlug.set(alternate, { uuid: sentinel.uuid, bytes });
  }
  return { bySlug, encoded, sentinels: Object.freeze(sentinels) };
}

/**
 * Build an immutable UUIDv7 slug codec. The current mask writes and reads first; previous masks
 * only read in caller order. Invalid options and unexpected failures return package errors.
 */
export function createUuidV7SlugCodec(
  options: UuidV7SlugCodecOptions,
): UuidV7SlugCodec | UuidSlugError {
  try {
    return buildUuidSlugCodec(options);
  } catch (cause) {
    return new UuidSlugError("invalid_mask_schema", "Codec construction failed.", { cause });
  }
}

function buildUuidSlugCodec(options: UuidV7SlugCodecOptions): UuidV7SlugCodec | UuidSlugError {
  const mask = typeof options === "object" && options !== null ? options.mask : undefined;
  if (mask === undefined || mask === null)
    return new UuidSlugError(
      "invalid_mask_schema",
      "Pass { mask: { seed } } for private masking or { mask: UUID_V7_TEST_MASK } for public examples.",
    );
  const schemaResult = schemaFromOption(mask);
  if (isUuidSlugError(schemaResult)) return schemaResult;
  const schema = schemaResult;
  // Decode tries exactly the caller's schemas in order. Every added schema increases false
  // acceptance, and the first passing schema decides the result, so no fallback is added here.
  const previousMasks: UuidV7Mask[] = [];
  const previousMaskOptions = options.previousMasks ?? [];
  if (!Array.isArray(previousMaskOptions))
    return new UuidSlugError("invalid_mask_schema", "previousMasks must be an array of schemas.");
  for (const previousOption of previousMaskOptions) {
    const previous = schemaFromOption(previousOption);
    if (isUuidSlugError(previous)) return previous;
    previousMasks.push(previous);
  }
  const generateUuidV7Bytes = options.generateUuidV7Bytes;
  if (generateUuidV7Bytes !== undefined && typeof generateUuidV7Bytes !== "function")
    return new UuidSlugError("invalid_mask_schema", "generateUuidV7Bytes must be a function.");
  const generateBytes = generateUuidV7Bytes ?? generateDefaultUuidV7Bytes;
  const outputAlphabet = options.outputAlphabet ?? "base64url";
  const outputAlphabetResult = resolveSlugAlphabet(outputAlphabet);
  if (isUuidSlugError(outputAlphabetResult)) return outputAlphabetResult;
  const sentinelDefinitions = options.sentinels ?? EMPTY_SENTINELS;
  if (!Array.isArray(sentinelDefinitions))
    return new UuidSlugError(
      "invalid_sentinel",
      "sentinels must be an array of named UUIDv7 values.",
    );
  const sentinelState =
    sentinelDefinitions.length === 0
      ? EMPTY_SENTINEL_STATE
      : createSentinels(sentinelDefinitions, outputAlphabet);
  if (isUuidSlugError(sentinelState)) return sentinelState;
  const sentinels = sentinelState;

  function encodeMasked(bytes: Uint8Array): UuidV7CodecSlug | UuidSlugError {
    if (!isUuidV7Bytes(bytes))
      return new UuidSlugError(
        "invalid_uuid_version",
        "Masked UUID slugs require 16 UUIDv7 bytes.",
      );
    for (const sentinel of sentinels.encoded) {
      let index = 0;
      while (index < 16 && sentinel.bytes[index] === bytes[index]) index += 1;
      if (index === 16) return sentinel.slug;
    }
    return uuidV7BytesToMaskedSlug(bytes, schema, outputAlphabet, sentinels.bySlug);
  }

  function encodeUuid(uuid: string | Uint8Array): UuidV7CodecSlug | UuidSlugError {
    if (typeof uuid !== "string") return encodeMasked(uuid);
    const bytes = uuidToBytes(uuid);
    return bytes instanceof Error ? bytes : encodeMasked(bytes);
  }

  function decodeSlug(slug: string): UuidV7String | UuidSlugError {
    const sentinel = sentinels.bySlug.get(slug);
    if (sentinel) return sentinel.uuid;
    const decoded = decodeMaskedSlug(slug, schema, previousMasks);
    if (decoded instanceof Error) return decoded;
    return bytesToUuid(decoded) as UuidV7String | UuidSlugError;
  }

  function decodeSlugToBytes(slug: string): UuidV7Bytes | UuidSlugError;
  function decodeSlugToBytes<Output extends Uint8Array>(
    slug: string,
    output: Output,
    outputOffset?: number,
  ): Output | UuidSlugError;
  function decodeSlugToBytes(
    slug: string,
    output?: Uint8Array,
    outputOffset = 0,
  ): Uint8Array | UuidSlugError {
    const badRange = output === undefined ? undefined : checkByteRange(output, outputOffset, 16);
    if (badRange) return badRange;
    const sentinelBytes = sentinels.bySlug.get(slug)?.bytes;
    const decoded = sentinelBytes ?? decodeMaskedSlug(slug, schema, previousMasks);
    if (decoded instanceof Error) return decoded;
    if (output) {
      output.set(decoded, outputOffset);
      return output;
    }
    return sentinelBytes ? new Uint8Array(sentinelBytes) : decoded;
  }

  function generateSlug(): UuidV7CodecSlug | UuidSlugError {
    try {
      const bytes = generateBytes();
      return isUuidSlugError(bytes) ? bytes : encodeMasked(bytes);
    } catch (cause) {
      return new UuidSlugError("rng_unavailable", "UUIDv7 byte generation failed.", { cause });
    }
  }

  function createMigrationDecoder<const Options extends UuidSlugMigrationOptions = {}>(
    migrationOptions?: Options,
  ): UuidSlugMigrationDecoder<EnabledMigrationFormat<Options>> {
    return createMigration([schema, ...previousMasks], sentinels.bySlug, migrationOptions);
  }

  function validateSlugTimestamp<Input extends string>(
    slug: Input,
    window: UuidV7TimestampWindow,
  ): (Input & UuidV7CodecSlug) | UuidSlugError {
    const bytes =
      sentinels.bySlug.get(slug)?.bytes ?? decodeMaskedSlug(slug, schema, previousMasks);
    if (bytes instanceof Error) return bytes;
    if (!isUuidV7Bytes(bytes))
      return new UuidSlugError("invalid_uuid_version", "Decoded UUID is not UUIDv7.");
    const valid = validateTimestampBytes(bytes, window);
    return valid instanceof Error ? valid : (slug as Input & UuidV7CodecSlug);
  }

  const codec: UuidV7SlugCodec = {
    sentinels: sentinels.sentinels,
    createMigrationDecoder,
    generateSlug,
    encodeUuid,
    decodeSlug,
    decodeSlugToBytes,
    validateSlugTimestamp,
  };
  return Object.freeze(codec);
}

/**
 * Return canonical UUIDv7 text when its timestamp is inside the inclusive symmetric window.
 * This checks timestamp sanity, not expiry, authentication, replay safety, or issuance.
 * Generic capture rejects known slug and UUIDv4 brands; bare strings remain runtime-validated
 * because widening has erased their provenance.
 */
export function validateUuidV7Timestamp<Input extends string>(
  uuid: UuidV7StringInput<Input>,
  window: UuidV7TimestampWindow,
): (Input & UuidV7String) | UuidSlugError {
  const uuidText: string = uuid;
  const bytes = uuidToBytes(uuidText);
  if (bytes instanceof Error)
    return new UuidSlugError("invalid_uuid", "Expected canonical UUIDv7 string.");
  const valid = validateTimestampBytes(bytes, window);
  return valid instanceof Error ? valid : (uuidText as Input & UuidV7String);
}

/** Decode before reading the reference time so validation performs one clock observation. */
function validateTimestampBytes(
  bytes: Uint8Array,
  window: UuidV7TimestampWindow,
): undefined | UuidSlugError {
  if (!isUuidV7Bytes(bytes)) return new UuidSlugError("invalid_uuid_version", "Expected UUIDv7.");
  const timestamp = extractUuidV7Timestamp(bytes);
  if (timestamp instanceof Error) return timestamp;
  let maxTimestampDeltaMs: number;
  let referenceUnixMs: number;
  try {
    if (typeof window !== "object" || window === null || Array.isArray(window))
      return new UuidSlugError("invalid_timestamp", "Timestamp window must be an object.");
    maxTimestampDeltaMs = window.maxTimestampDeltaMs;
    referenceUnixMs = window.referenceUnixMs ?? Date.now();
  } catch (cause) {
    return new UuidSlugError("invalid_timestamp", "Timestamp window could not be read.", {
      cause,
    });
  }
  if (!Number.isFinite(maxTimestampDeltaMs) || maxTimestampDeltaMs < 0)
    return new UuidSlugError(
      "invalid_timestamp",
      "maxTimestampDeltaMs must be a finite, nonnegative number of milliseconds.",
    );
  if (!Number.isFinite(referenceUnixMs))
    return new UuidSlugError(
      "invalid_timestamp",
      "referenceUnixMs must be a finite number of Unix milliseconds.",
    );
  if (
    timestamp < referenceUnixMs - maxTimestampDeltaMs ||
    timestamp > referenceUnixMs + maxTimestampDeltaMs
  )
    return new UuidSlugError(
      "timestamp_outside_window",
      "UUIDv7 timestamp is outside the accepted window.",
    );
  return undefined;
}

/**
 * Return the same direct UUIDv7 slug when its timestamp is inside the inclusive symmetric window.
 * Use a codec method for masked or sentinel input. Generic capture rejects known UUID, masked, and
 * UUIDv4-slug brands; bare strings remain runtime-validated after their provenance is erased.
 */
export function validateUuidV7SlugTimestamp<Input extends string>(
  slug: UuidV7SlugInput<Input>,
  window: UuidV7TimestampWindow,
): (Input & UuidV7Slug) | UuidSlugError {
  const directSlug: string = slug;
  const bytes = slugToBytes(directSlug);
  if (bytes instanceof Error) return bytes;
  const valid = validateTimestampBytes(bytes, window);
  return valid instanceof Error ? valid : (directSlug as Input & UuidV7Slug);
}
