// SPDX-License-Identifier: Apache-2.0

import { runtime } from "#runtime";
import { isUuidSlugError, readClock, UuidSlugError } from "./errors";
import { uuidV7BytesToMaskedSlug, decodeMaskedSlug } from "./mask";
import { createMigration } from "./migration";
import { isMaskSchema } from "./schema-handle";
import { createMaskSchema } from "./schema";
import type {
  EnabledMigrationFormat,
  MaskSchema,
  MaskSchemaOptions,
  PublicUuidV7Slug,
  SentinelUuidV7Slug,
  UuidSlugCodec,
  UuidSlugCodecOptions,
  UuidSlugMigration,
  UuidSlugMigrationOptions,
  UuidV7BytesSource,
  UuidV7Slug,
  UuidV7Sentinel,
  UuidV7String,
} from "./types";
import { createRuntimeGenerator } from "./v7";
import {
  isUuidV7Bytes,
  resolveSlugAlphabet,
  parseUuid,
  parseUuidSlug,
  formatUuid,
  formatUuidSlug,
  extractUuidV7Timestamp,
} from "./uuid";
import type { FreshValidationOptions, UuidV7SentinelDefinition } from "./types";
import type { SlugAlphabet } from "./uuid";

export const UUID_V7_SENTINEL_DEFINITIONS: readonly UuidV7SentinelDefinition[] = Object.freeze([
  Object.freeze({
    name: "nil",
    uuid: "00000000-0000-7000-8000-000000000000",
  }),
  Object.freeze({
    name: "anonymousUser",
    uuid: "00000000-0001-7000-8000-000000000000",
  }),
  Object.freeze({
    name: "unknownUser",
    uuid: "00000000-0002-7000-8000-000000000000",
  }),
]);

function schemaFromOption(mask: MaskSchema | MaskSchemaOptions): MaskSchema | UuidSlugError {
  if (isMaskSchema(mask)) return mask;
  if (typeof mask !== "object" || mask === null)
    return new UuidSlugError(
      "invalid_mask_schema",
      "Pass a mask schema handle or mask options containing a private seed.",
    );
  return createMaskSchema(mask);
}

function createSentinels(
  definitions: readonly UuidV7SentinelDefinition[],
  alphabet: SlugAlphabet,
):
  | {
      bySlug: Map<string, { uuid: UuidV7String; bytes: Uint8Array }>;
      encoded: { bytes: Uint8Array; slug: SentinelUuidV7Slug }[];
      sentinels: readonly UuidV7Sentinel[];
    }
  | UuidSlugError {
  const sentinels: UuidV7Sentinel[] = [];
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
      return new UuidSlugError("invalid_uuid", "Each sentinel must have a name and UUIDv7 string.");
    // Sentinel configuration accepts raw strings so callers do not need casts before reaching the
    // validating seam. Check each value here, while a bad definition is still a constructor error
    // rather than a codec that fails on every later decode.
    const bytes = parseUuid(definition.uuid);
    if (bytes instanceof Error) return bytes;
    if (!isUuidV7Bytes(bytes))
      return new UuidSlugError(
        "invalid_uuid_version",
        `Sentinel "${definition.name}" must be a UUIDv7, got ${definition.uuid}.`,
      );
    // A duplicate collapses SILENTLY: both entries stay in `codec.sentinels`, while the lookup maps
    // keep only the last, so the codec reports a sentinel it will never match.
    if (byUuid.has(definition.uuid))
      return new UuidSlugError(
        "invalid_uuid",
        `Sentinel "${definition.name}" repeats the UUID of an earlier sentinel.`,
      );
    // Sentinels remain raw UUIDs; only their writer follows the masked alphabet selection.
    const slug = formatUuidSlug(bytes, alphabet);
    if (slug instanceof Error) return slug;
    const sentinel = Object.freeze({
      name: definition.name,
      // `formatUuidSlug` returns the version-agnostic brand; the v7-ness comes
      // from the check above.
      slug: slug as SentinelUuidV7Slug,
      uuid: definition.uuid as UuidV7String,
    });
    sentinels.push(sentinel);
    byUuid.add(definition.uuid);
    encoded.push({ bytes, slug: sentinel.slug });
    bySlug.set(sentinel.slug, { uuid: sentinel.uuid, bytes });
    const alternate = formatUuidSlug(bytes, alphabet === "base64url" ? "base32hex" : "base64url");
    if (alternate instanceof Error) return alternate;
    bySlug.set(alternate, { uuid: sentinel.uuid, bytes });
  }
  return { bySlug, encoded, sentinels: Object.freeze(sentinels) };
}

export function createUuidSlugCodec(options: UuidSlugCodecOptions): UuidSlugCodec | UuidSlugError {
  try {
    return buildUuidSlugCodec(options);
  } catch (cause) {
    return new UuidSlugError("invalid_mask_schema", "Codec construction failed.", { cause });
  }
}

function buildUuidSlugCodec(options: UuidSlugCodecOptions): UuidSlugCodec | UuidSlugError {
  const mask = typeof options === "object" && options !== null ? options.mask : undefined;
  if (mask === undefined || mask === null)
    return new UuidSlugError(
      "invalid_mask_schema",
      "Pass { mask: { seed } } for private masking or { mask: PUBLIC_MASK_SCHEMA } for public examples.",
    );
  const schemaResult = schemaFromOption(mask);
  if (schemaResult instanceof UuidSlugError) return schemaResult;
  const schema = schemaResult;
  // Decode tries exactly the caller's schemas in order. Every added schema increases false
  // acceptance, and the first passing schema decides the result, so no fallback is added here.
  const previousMasks: MaskSchema[] = [];
  const previousMaskOptions = options.previousMasks ?? [];
  if (!Array.isArray(previousMaskOptions))
    return new UuidSlugError("invalid_mask_schema", "previousMasks must be an array of schemas.");
  for (const previousOption of previousMaskOptions) {
    const previous = schemaFromOption(previousOption);
    if (previous instanceof UuidSlugError) return previous;
    previousMasks.push(previous);
  }
  const generatorOption: unknown = options.generator;
  const generator =
    generatorOption === undefined
      ? createRuntimeGenerator(runtime)
      : (generatorOption as UuidV7BytesSource);
  if (typeof generator?.uuidV7Bytes !== "function")
    return new UuidSlugError(
      "invalid_mask_schema",
      "generator must provide a uuidV7Bytes function.",
    );
  const maskedSlugAlphabet = options.maskedSlugAlphabet ?? "base64url";
  const maskedSlugAlphabetError = resolveSlugAlphabet(maskedSlugAlphabet);
  if (maskedSlugAlphabetError instanceof Error) return maskedSlugAlphabetError;
  const sentinelDefinitions = options.sentinels ?? UUID_V7_SENTINEL_DEFINITIONS;
  if (!Array.isArray(sentinelDefinitions))
    return new UuidSlugError("invalid_uuid", "sentinels must be an array of named UUIDv7 values.");
  const sentinelState = createSentinels(sentinelDefinitions, maskedSlugAlphabet);
  if (sentinelState instanceof UuidSlugError) return sentinelState;
  const sentinels = sentinelState;

  function encodeMasked(bytes: Uint8Array): PublicUuidV7Slug | UuidSlugError {
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
    return uuidV7BytesToMaskedSlug(bytes, schema, maskedSlugAlphabet, sentinels.bySlug);
  }

  function uuidV7ToMaskedSlug(uuid: string): PublicUuidV7Slug | UuidSlugError {
    const bytes = parseUuid(uuid);
    return bytes instanceof Error ? bytes : encodeMasked(bytes);
  }

  function maskedSlugToUuidV7(slug: string): UuidV7String | UuidSlugError {
    const sentinel = sentinels.bySlug.get(slug);
    if (sentinel) return sentinel.uuid;
    const decoded = decodeMaskedSlug(slug, schema, previousMasks);
    if (decoded instanceof Error) return decoded;
    return formatUuid(decoded) as UuidV7String | UuidSlugError;
  }

  function generateMaskedSlug(): PublicUuidV7Slug | UuidSlugError {
    try {
      const bytes = generator.uuidV7Bytes();
      return isUuidSlugError(bytes) ? bytes : encodeMasked(bytes);
    } catch (cause) {
      return new UuidSlugError("rng_unavailable", "UUIDv7 byte generation failed.", { cause });
    }
  }

  function migration<const Options extends UuidSlugMigrationOptions = {}>(
    migrationOptions?: Options,
  ): UuidSlugMigration<EnabledMigrationFormat<Options>> {
    return createMigration([schema, ...previousMasks], sentinels.bySlug, migrationOptions);
  }

  const codec: UuidSlugCodec = {
    sentinels: sentinels.sentinels,
    migration,
    uuidV7MaskedSlug: generateMaskedSlug,
    uuidV7ToMaskedSlug,
    maskedSlugToUuidV7,
    /**
     * Unmask, then apply the same freshness rules as `validateUuidV7Fresh`, returning the slug.
     *
     * This stays on the codec because unmasking must use the codec's selected key.
     *
     * Decode directly to bytes instead of formatting and reparsing a UUID. The method does not
     * access `this`, so it also works when detached from the codec.
     */
    validateMaskedSlugFresh(slug, freshness) {
      const bytes =
        sentinels.bySlug.get(slug)?.bytes ?? decodeMaskedSlug(slug, schema, previousMasks);
      if (bytes instanceof Error) return bytes;
      // The v7-specific decoder reports this before freshness validation does.
      if (!isUuidV7Bytes(bytes))
        return new UuidSlugError("invalid_uuid_version", "Decoded UUID is not UUIDv7.");
      const valid = validateFreshBytes(bytes, freshness);
      return valid instanceof Error ? valid : (slug as typeof slug & PublicUuidV7Slug);
    },
  };
  return Object.freeze(codec);
}

export function validateUuidV7Fresh(
  uuid: string,
  options?: FreshValidationOptions,
): UuidV7String | UuidSlugError {
  const bytes = parseUuid(uuid);
  if (bytes instanceof Error)
    return new UuidSlugError("invalid_uuid", "Expected canonical UUIDv7 string.");
  const valid = validateFreshBytes(bytes, options);
  return valid instanceof Error ? valid : (uuid as UuidV7String);
}

/** Capture decoded fields before calling an external clock, which can reenter a custom schema. */
function validateFreshBytes(
  bytes: Uint8Array,
  options?: FreshValidationOptions,
): undefined | UuidSlugError {
  if (!isUuidV7Bytes(bytes))
    return new UuidSlugError("invalid_uuid", "Expected canonical UUIDv7 string.");
  const timestamp = extractUuidV7Timestamp(bytes);
  if (timestamp instanceof Error) return timestamp;
  let windowMs = 86_400_000;
  let now = Date.now;
  try {
    if (
      options !== undefined &&
      (typeof options !== "object" || options === null || Array.isArray(options))
    )
      return new UuidSlugError("invalid_timestamp", "Freshness options must be an object.");
    if (options !== undefined) {
      windowMs = options.windowMs ?? windowMs;
      now = options.now ?? now;
    }
  } catch (cause) {
    return new UuidSlugError("invalid_timestamp", "Freshness options could not be read.", {
      cause,
    });
  }
  if (!Number.isFinite(windowMs) || windowMs < 0)
    return new UuidSlugError(
      "invalid_timestamp",
      "windowMs must be a finite, nonnegative number of milliseconds.",
    );
  if (typeof now !== "function")
    return new UuidSlugError("invalid_timestamp", "now must be a function.");
  const reading = readClock(now);
  if (reading instanceof Error) return reading;
  if (!Number.isFinite(reading))
    return new UuidSlugError(
      "invalid_timestamp",
      "now must return a finite number of Unix milliseconds.",
    );
  if (timestamp < reading - windowMs || timestamp > reading + windowMs)
    return new UuidSlugError("stale_uuid", "UUIDv7 timestamp is outside the accepted window.");
  return undefined;
}

export function validateUuidV7SlugFresh(
  slug: string,
  options?: FreshValidationOptions,
): UuidV7Slug | UuidSlugError {
  const bytes = parseUuidSlug(slug);
  if (bytes instanceof Error) return bytes;
  const valid = validateFreshBytes(bytes, options);
  return valid instanceof Error ? valid : (slug as UuidV7Slug);
}
