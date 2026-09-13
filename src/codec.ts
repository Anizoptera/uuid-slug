// SPDX-License-Identifier: Apache-2.0

import { checkByteRange, isUuidSlugError, isUint8Array, UuidSlugError } from "./errors.ts";
import { generateUuidV7Bytes as generateDefaultUuidV7Bytes } from "./v7-keyless.ts";
import { ownedUuidV7BytesToMaskedSlug, decodeMaskedSlug } from "./payload.ts";
import { createMigration } from "./migration.ts";
import { isMaskHandle } from "./mask-handle.ts";
import { createUuidV7Mask } from "./mask.ts";
import { validateTimestampBytes } from "./timestamp.ts";
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
  UuidV7Sentinel,
  UuidV7String,
} from "./types.ts";
import { resolveSlugAlphabet, bytesToUuidSlug, extractUuidV7Timestamp } from "./slug.ts";
import { bytesToUuidString, isUuidV7Bytes, uuidStringToBytes } from "./uuid.ts";
import type { UuidV7TimestampWindow, UuidV7SentinelConfig } from "./types.ts";
import type { SlugAlphabet } from "./slug.ts";

type EncodedSentinel = { bytes: Uint8Array; slug: SentinelUuidV7Slug };
type EncodedSentinelIndex = {
  readonly fingerprints: Uint32Array;
  readonly positions: Uint32Array;
  readonly mask: number;
};

type SentinelState = {
  readonly bySlug: ReadonlyMap<string, { uuid: UuidV7String; bytes: Uint8Array }>;
  readonly byUuid: ReadonlyMap<string, SentinelUuidV7Slug>;
  readonly encoded: readonly EncodedSentinel[];
  readonly encodedByFingerprint: EncodedSentinelIndex | undefined;
  readonly sentinels: readonly UuidV7Sentinel[];
};

const EMPTY_SENTINELS: readonly UuidV7Sentinel[] = Object.freeze([]);
const EMPTY_ENCODED_SENTINELS: readonly EncodedSentinel[] = Object.freeze([]);
const EMPTY_SENTINEL_STATE: SentinelState = Object.freeze({
  bySlug: new Map(),
  byUuid: new Map(),
  encoded: EMPTY_ENCODED_SENTINELS,
  encodedByFingerprint: undefined,
  sentinels: EMPTY_SENTINELS,
});

function maskFromOption(
  mask: UuidV7Mask | UuidV7MaskOptions | UuidSlugError,
): UuidV7Mask | UuidSlugError {
  if (isUuidSlugError(mask)) return mask;
  if (isMaskHandle(mask)) return mask;
  if (typeof mask !== "object" || mask === null)
    return new UuidSlugError(
      "invalid_mask",
      "Pass a mask from createUuidV7Mask or mask options containing a private seed.",
    );
  return createUuidV7Mask(mask);
}

/*#__NO_SIDE_EFFECTS__*/
function sentinelFingerprint(bytes: Uint8Array): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < 16; index += 1)
    hash = Math.imul(hash ^ (bytes[index] as number), 0x01000193);
  return hash >>> 0;
}

// Fingerprints select candidates only. Full equality is mandatory because callers control sentinel
// values and can produce collisions deliberately or accidentally.
/*#__NO_SIDE_EFFECTS__*/
function findIndexedByteSentinel(
  encoded: readonly EncodedSentinel[],
  encodedByFingerprint: EncodedSentinelIndex,
  bytes: Uint8Array,
): SentinelUuidV7Slug | undefined {
  const fingerprint = sentinelFingerprint(bytes);
  let slot = fingerprint & encodedByFingerprint.mask;
  let position = encodedByFingerprint.positions[slot] as number;
  while (position !== 0) {
    if (encodedByFingerprint.fingerprints[slot] === fingerprint) {
      const indexed = encoded[position] as EncodedSentinel;
      let index = 0;
      while (index < 16 && indexed.bytes[index] === bytes[index]) index += 1;
      if (index === 16) return indexed.slug;
    }
    slot = (slot + 1) & encodedByFingerprint.mask;
    position = encodedByFingerprint.positions[slot] as number;
  }
  return undefined;
}

function createSentinels(
  definitions: readonly UuidV7SentinelConfig[],
  alphabet: SlugAlphabet,
): SentinelState | UuidSlugError {
  const sentinels: UuidV7Sentinel[] = [];
  const names = new Set<string>();
  const byUuid = new Map<string, SentinelUuidV7Slug>();
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
    const bytes = uuidStringToBytes(definition.uuid);
    if (isUuidSlugError(bytes)) return bytes;
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
    const slug = bytesToUuidSlug(bytes, alphabet);
    if (isUuidSlugError(slug)) return slug;
    const sentinel = Object.freeze({
      name: definition.name,
      // `bytesToUuidSlug` returns the version-agnostic brand; the v7-ness comes
      // from the check above.
      slug: slug as SentinelUuidV7Slug,
      uuid: definition.uuid as UuidV7String,
    });
    sentinels.push(sentinel);
    names.add(definition.name);
    byUuid.set(definition.uuid, sentinel.slug);
    encoded.push({ bytes, slug: sentinel.slug });
    bySlug.set(sentinel.slug, { uuid: sentinel.uuid, bytes });
    const alternate = bytesToUuidSlug(bytes, alphabet === "base64url" ? "base32hex" : "base64url");
    if (isUuidSlugError(alternate)) return alternate;
    bySlug.set(alternate, { uuid: sentinel.uuid, bytes });
  }
  let encodedByFingerprint: EncodedSentinelIndex | undefined;
  // Small sets are faster and smaller as a linear scan. Larger sets amortize one immutable index;
  // excluding the first entry reserves zero as the empty-slot marker without another bitmap.
  if (encoded.length >= 16) {
    let capacity = 1;
    while (capacity < (encoded.length - 1) * 2) capacity *= 2;
    const fingerprints = new Uint32Array(capacity);
    const positions = new Uint32Array(capacity);
    const mask = capacity - 1;
    for (let index = 1; index < encoded.length; index += 1) {
      const sentinel = encoded[index] as EncodedSentinel;
      const fingerprint = sentinelFingerprint(sentinel.bytes);
      let slot = fingerprint & mask;
      while (positions[slot] !== 0) slot = (slot + 1) & mask;
      fingerprints[slot] = fingerprint;
      positions[slot] = index;
    }
    encodedByFingerprint = { fingerprints, positions, mask };
  }
  return {
    bySlug,
    byUuid,
    encoded,
    encodedByFingerprint,
    sentinels: Object.freeze(sentinels),
  };
}

/**
 * Build an immutable UUIDv7 codec with an explicit writer mask. It reads the writer first, then
 * `previousMasks` in caller order. Invalid masks, sentinels, options, or callbacks return
 * `UuidSlugError`; no implicit public mask is selected.
 *
 * @param options - Writer mask plus optional reader masks, sentinels, and output spelling.
 * @returns The codec, or `UuidSlugError` when its configuration cannot form a valid codec.
 */
export function createUuidV7SlugCodec(
  options: UuidV7SlugCodecOptions,
): UuidV7SlugCodec | UuidSlugError {
  try {
    return buildUuidSlugCodec(options, generateDefaultUuidV7Bytes);
  } catch (cause) {
    return new UuidSlugError("invalid_mask", "Codec construction failed.", { cause });
  }
}

/** Internal seam for exercising generator failures without weakening public generation. */
export function createUuidV7SlugCodecWithGenerator(
  options: UuidV7SlugCodecOptions,
  generateUuidV7Bytes: (this: void) => Uint8Array | UuidSlugError,
): UuidV7SlugCodec | UuidSlugError {
  try {
    return buildUuidSlugCodec(options, generateUuidV7Bytes);
  } catch (cause) {
    return new UuidSlugError("invalid_mask", "Codec construction failed.", { cause });
  }
}

function buildUuidSlugCodec(
  options: UuidV7SlugCodecOptions,
  generateBytes: (this: void) => Uint8Array | UuidSlugError,
): UuidV7SlugCodec | UuidSlugError {
  const mask = typeof options === "object" && options !== null ? options.mask : undefined;
  if (mask === undefined || mask === null)
    return new UuidSlugError(
      "invalid_mask",
      "Pass { mask: { seed } } for private masking or { mask: UUID_V7_TEST_MASK } for public examples.",
    );
  const maskResult = maskFromOption(mask);
  if (isUuidSlugError(maskResult)) return maskResult;
  const handle = maskResult;
  // Decode tries exactly the caller's masks in order. Every added mask increases false
  // acceptance, and the first passing mask decides the result, so no fallback is added here.
  const previousMasks: UuidV7Mask[] = [];
  const previousMaskOptions = options.previousMasks ?? [];
  if (!Array.isArray(previousMaskOptions))
    return new UuidSlugError(
      "invalid_mask",
      "previousMasks must be an array of masks or mask options.",
    );
  for (const previousOption of previousMaskOptions) {
    const previous = maskFromOption(previousOption);
    if (isUuidSlugError(previous)) return previous;
    previousMasks.push(previous);
  }
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
  // Borrowed-byte encoding is synchronous. Built-in masks call no user code, and custom masks
  // isolate callbacks with an input copy, so nested codec calls cannot observe this shared block.
  const encodeScratch = new Uint8Array(16);

  function encodeMasked(bytes: Uint8Array, owned = false): UuidV7CodecSlug | UuidSlugError {
    if (!isUuidV7Bytes(bytes))
      return new UuidSlugError(
        "invalid_uuid_version",
        "Masked UUID slugs require 16 UUIDv7 bytes.",
      );
    if (sentinels.encodedByFingerprint) {
      const first = sentinels.encoded[0] as EncodedSentinel;
      let index = 0;
      while (index < 16 && first.bytes[index] === bytes[index]) index += 1;
      if (index === 16) return first.slug;
      const sentinel = findIndexedByteSentinel(
        sentinels.encoded,
        sentinels.encodedByFingerprint,
        bytes,
      );
      if (sentinel) return sentinel;
    } else {
      for (const sentinel of sentinels.encoded) {
        let index = 0;
        while (index < 16 && sentinel.bytes[index] === bytes[index]) index += 1;
        if (index === 16) return sentinel.slug;
      }
    }
    // Branch after common validation so ordinary callers retain one direct borrowed-byte route.
    // Split guard helpers slowed that Bun route; reconsider only with packed mixed-workload evidence.
    if (owned) return ownedUuidV7BytesToMaskedSlug(bytes, handle, outputAlphabet, sentinels.bySlug);
    encodeScratch.set(bytes);
    return ownedUuidV7BytesToMaskedSlug(encodeScratch, handle, outputAlphabet, sentinels.bySlug);
  }

  function encodeString(uuid: string): UuidV7CodecSlug | UuidSlugError {
    // A canonical string miss cannot match the same sentinel set after parsing, so a second byte scan
    // adds only work. Keep byte inputs on the scan because their identity has no canonical map key.
    const sentinel = sentinels.byUuid.get(uuid);
    if (sentinel) return sentinel;
    const bytes = uuidStringToBytes(uuid);
    if (isUuidSlugError(bytes)) return bytes;
    if (!isUuidV7Bytes(bytes))
      return new UuidSlugError(
        "invalid_uuid_version",
        "Masked UUID slugs require 16 UUIDv7 bytes.",
      );
    return ownedUuidV7BytesToMaskedSlug(bytes, handle, outputAlphabet, sentinels.bySlug);
  }

  function uuidStringToSlug(uuid: string | UuidSlugError): UuidV7CodecSlug | UuidSlugError {
    return isUuidSlugError(uuid) ? uuid : encodeString(uuid);
  }

  function uuidBytesToSlug(uuid: Uint8Array | UuidSlugError): UuidV7CodecSlug | UuidSlugError {
    return isUint8Array(uuid)
      ? encodeMasked(uuid)
      : isUuidSlugError(uuid)
        ? uuid
        : new UuidSlugError("invalid_buffer", "UUID bytes must be a Uint8Array.");
  }

  function uuidSlugToString(slug: string | UuidSlugError): UuidV7String | UuidSlugError {
    if (isUuidSlugError(slug)) return slug;
    const sentinel = sentinels.bySlug.get(slug);
    if (sentinel) return sentinel.uuid;
    const decoded = decodeMaskedSlug(slug, handle, previousMasks);
    if (isUuidSlugError(decoded)) return decoded;
    return bytesToUuidString(decoded) as UuidV7String | UuidSlugError;
  }

  function uuidSlugToBytes(slug: string | UuidSlugError): UuidV7Bytes | UuidSlugError;
  function uuidSlugToBytes<Output extends Uint8Array>(
    slug: string | UuidSlugError,
    output: Output,
    outputOffset?: number,
  ): Output | UuidSlugError;
  function uuidSlugToBytes(
    slug: string | UuidSlugError,
    output?: Uint8Array,
    outputOffset = 0,
  ): Uint8Array | UuidSlugError {
    if (isUuidSlugError(slug)) return slug;
    const badRange = output === undefined ? undefined : checkByteRange(output, outputOffset, 16);
    if (badRange) return badRange;
    const sentinelBytes = sentinels.bySlug.get(slug)?.bytes;
    const decoded = sentinelBytes ?? decodeMaskedSlug(slug, handle, previousMasks);
    if (isUuidSlugError(decoded)) return decoded;
    if (output) {
      output.set(decoded, outputOffset);
      return output;
    }
    return sentinelBytes ? new Uint8Array(sentinelBytes) : decoded;
  }

  function generateUuidSlug(): UuidV7CodecSlug | UuidSlugError {
    try {
      const bytes = generateBytes();
      return isUuidSlugError(bytes) ? bytes : encodeMasked(bytes, true);
    } catch (cause) {
      return new UuidSlugError("rng_unavailable", "UUIDv7 byte generation failed.", { cause });
    }
  }

  function extractUuidSlugTimestamp(slug: string | UuidSlugError): number | UuidSlugError {
    if (isUuidSlugError(slug)) return slug;
    const bytes =
      sentinels.bySlug.get(slug)?.bytes ?? decodeMaskedSlug(slug, handle, previousMasks);
    return isUuidSlugError(bytes) ? bytes : extractUuidV7Timestamp(bytes);
  }

  function createMigrationDecoder<const Options extends UuidSlugMigrationOptions = {}>(
    migrationOptions?: Options,
  ): UuidSlugMigrationDecoder<EnabledMigrationFormat<Options>>;
  function createMigrationDecoder<const Options extends UuidSlugMigrationOptions = {}>(
    migrationOptions?: Options,
  ): UuidSlugMigrationDecoder<EnabledMigrationFormat<Options>> | UuidSlugError {
    return createMigration([handle, ...previousMasks], sentinels.bySlug, migrationOptions);
  }

  function validateUuidSlugTimestamp<Input extends string | UuidSlugError>(
    slug: Input,
    window: UuidV7TimestampWindow,
  ): (Input & UuidV7CodecSlug) | UuidSlugError {
    if (isUuidSlugError(slug)) return slug;
    const bytes =
      sentinels.bySlug.get(slug)?.bytes ?? decodeMaskedSlug(slug, handle, previousMasks);
    if (isUuidSlugError(bytes)) return bytes;
    if (!isUuidV7Bytes(bytes))
      return new UuidSlugError("invalid_uuid_version", "Decoded UUID is not UUIDv7.");
    const valid = validateTimestampBytes(bytes, window);
    return isUuidSlugError(valid) ? valid : (slug as Input & UuidV7CodecSlug);
  }

  const codec: UuidV7SlugCodec = {
    sentinels: sentinels.sentinels,
    createMigrationDecoder,
    generateUuidSlug,
    uuidStringToSlug,
    uuidBytesToSlug,
    uuidSlugToString,
    uuidSlugToBytes,
    extractUuidSlugTimestamp,
    validateUuidSlugTimestamp,
  };
  return Object.freeze(codec);
}
