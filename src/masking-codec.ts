// SPDX-License-Identifier: Apache-2.0

import {
  checkByteRange,
  findUnknownOption,
  INVALID_BUFFER,
  INVALID_MASK,
  INVALID_SENTINEL,
  INVALID_UUID,
  INVALID_UUID_SLUG,
  INVALID_UUID_VERSION,
  RNG_UNAVAILABLE,
  invalidUuidSlugInput,
  isUuidSlugError,
  isUint8Array,
  UuidSlugError,
} from "./errors.ts";
import { BASE32HEX_NAME, BASE64URL_NAME } from "./alphabet.ts";
import { generateUuidV7Bytes as generateDefaultUuidV7Bytes } from "./v7-keyless.ts";
import { ownedUuidV7BytesToMaskedSlug, decodeMaskedSlug } from "./payload.ts";
import { createMigration } from "./migration.ts";
import { isMaskHandle } from "./mask-handle.ts";
import { deriveUuidV7Mask } from "./mask.ts";
import { validateTimestampBytes } from "./timestamp.ts";
import type {
  EnabledMigrationFormat,
  GeneratedUuidV7,
  UuidV7Mask,
  UuidV7MaskOptions,
  MaskedOrSentinelUuidV7Slug,
  SentinelUuidV7Slug,
  UuidSlugMigrationDecoder,
  UuidSlugMigrationOptions,
  UuidV7MaskingCodec,
  UuidV7MaskingCodecOptions,
  UuidV7Bytes,
  UuidBytes,
  PlainUuidV7Slug,
  PlainUuidSlug,
  UuidV7Sentinel,
  UuidV7String,
  UuidStringFor,
  UuidInput,
  UuidStringResult,
  UuidBytesResult,
  PlainUuidSlugResult,
  UuidTextCase,
  UuidV7StringFor,
} from "./types.ts";
import { UUID_TEXT_LOWERCASE } from "./types.ts";
import {
  resolveSlugAlphabet,
  plainSlugToUuidBytes as decodePlainSlugToBytes,
  uuidBytesToPlainSlug,
  extractUuidV7UnixMs,
} from "./slug.ts";
import {
  formatUuidBytesUnchecked,
  bytesToUuidString,
  invalidUuidTextCase,
  isUuidBytes,
  isUuidTextCase,
  isUuidV7Bytes,
  uuidStringToBytes,
} from "./uuid.ts";
import type { UuidV7TimestampWindow, UuidV7SentinelConfig } from "./types.ts";
import type { SlugAlphabet } from "./slug.ts";

type EncodedSentinel = { bytes: Uint8Array; slug: SentinelUuidV7Slug };

function sameUuidBytes(left: Uint8Array, right: Uint8Array): boolean {
  for (let index = 0; index < 16; index += 1) if (left[index] !== right[index]) return false;
  return true;
}

const CODEC_CONSTRUCTION_FAILED = "UUIDv7 masking-codec construction failed.";
const UUID_V7_GENERATION_FAILED = "UUIDv7 byte generation failed.";
const INVALID_MASKED_UUID_BYTES = "Masked UUID slugs require 16 UUIDv7 bytes.";
const PLAIN_SLUG_MEANING = "plain";
const MASKED_SLUG_MEANING = "masked";
type SlugMeaning = typeof PLAIN_SLUG_MEANING | typeof MASKED_SLUG_MEANING;
const CODEC_OPTIONS = {
  mask: true,
  maskedSlugAlphabet: true,
  previousMasks: true,
  sentinels: true,
} as const satisfies Record<keyof UuidV7MaskingCodecOptions, true>;
const SENTINEL_OPTIONS = {
  name: true,
  uuid: true,
} as const satisfies Record<keyof UuidV7SentinelConfig, true>;
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
      INVALID_MASK,
      "Pass a mask from deriveUuidV7Mask or mask options containing a private seed.",
    );
  return deriveUuidV7Mask(mask);
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
        INVALID_SENTINEL,
        "Each sentinel must have a name and UUIDv7 string.",
      );
    const unknown = findUnknownOption(definition, SENTINEL_OPTIONS);
    if (unknown !== undefined)
      return new UuidSlugError(INVALID_SENTINEL, `Unknown sentinel option: ${unknown}.`);
    if (definition.name.length === 0)
      return new UuidSlugError(INVALID_SENTINEL, "Sentinel names must not be empty.");
    if (names.has(definition.name))
      return new UuidSlugError(
        INVALID_SENTINEL,
        `Sentinel name "${definition.name}" must be unique within a UUIDv7 masking codec.`,
      );
    // Sentinel configuration accepts raw strings so callers do not need casts before reaching the
    // validating seam. Check each value here, while a bad definition is still a constructor error
    // rather than a codec that fails on every later decode.
    const bytes = uuidStringToBytes(definition.uuid);
    if (bytes instanceof Error) return bytes;
    if (!isUuidV7Bytes(bytes))
      return new UuidSlugError(
        INVALID_UUID_VERSION,
        `Sentinel "${definition.name}" must be a UUIDv7, got ${definition.uuid}.`,
      );
    const uuid = formatUuidBytesUnchecked(bytes) as UuidV7String;
    // Reject duplicate UUIDs before the array and lookup maps can disagree about which exposed
    // sentinel owns the reserved value.
    if (byUuid.has(uuid))
      return new UuidSlugError(
        INVALID_UUID,
        `Sentinel "${definition.name}" repeats the UUID of an earlier sentinel.`,
      );
    // Sentinels remain raw UUIDs; only their writer follows the masked alphabet selection.
    const slug = uuidBytesToPlainSlug(bytes, alphabet);
    if (slug instanceof Error) return slug;
    const sentinel = Object.freeze({
      name: definition.name,
      // Both brands come from the UUIDv7 byte check above.
      slug: slug as SentinelUuidV7Slug,
      uuid,
    });
    sentinels.push(sentinel);
    names.add(definition.name);
    byUuid.set(uuid, sentinel.slug);
    encoded.push({ bytes, slug: sentinel.slug });
    bySlug.set(sentinel.slug, { uuid: sentinel.uuid, bytes });
    const alternate = uuidBytesToPlainSlug(
      bytes,
      alphabet === BASE64URL_NAME ? BASE32HEX_NAME : BASE64URL_NAME,
    );
    if (alternate instanceof Error) return alternate;
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
 * Build an immutable UUIDv7 masking codec with an explicit writer mask. It reads the writer first, then
 * `previousMasks` in caller order. Invalid masks, sentinels, options, or callbacks return
 * `UuidSlugError`; no implicit public mask is selected. Masked writers return `invalid_timestamp`
 * for UUIDv7 timestamps after `MAX_MASKED_UUID_V7_UNIX_MS`; registered sentinels remain plain.
 *
 * @param options - Writer mask plus optional reader masks, sentinels, and output spelling.
 * @returns The masking codec, or `UuidSlugError` when its configuration is invalid.
 */
export function createUuidV7MaskingCodec(
  options: UuidV7MaskingCodecOptions,
): UuidV7MaskingCodec | UuidSlugError {
  try {
    return buildUuidSlugCodec(options, generateDefaultUuidV7Bytes);
  } catch (cause) {
    return new UuidSlugError(INVALID_MASK, CODEC_CONSTRUCTION_FAILED, { cause });
  }
}

/** Internal seam for exercising generator failures without weakening public generation. */
export function createUuidV7MaskingCodecWithGenerator(
  options: UuidV7MaskingCodecOptions,
  generateUuidV7Bytes: (this: void) => Uint8Array | UuidSlugError,
): UuidV7MaskingCodec | UuidSlugError {
  try {
    return buildUuidSlugCodec(options, generateUuidV7Bytes);
  } catch (cause) {
    return new UuidSlugError(INVALID_MASK, CODEC_CONSTRUCTION_FAILED, { cause });
  }
}

function buildUuidSlugCodec(
  options: UuidV7MaskingCodecOptions,
  generateBytes: (this: void) => Uint8Array | UuidSlugError,
): UuidV7MaskingCodec | UuidSlugError {
  const validOptions = typeof options === "object" && options !== null && !Array.isArray(options);
  const mask = validOptions ? options.mask : undefined;
  if (mask === undefined || mask === null)
    return new UuidSlugError(
      INVALID_MASK,
      "Pass { mask: { seed } } for private masking or { mask: UUID_V7_TEST_MASK } for public examples.",
    );
  const unknown = findUnknownOption(options, CODEC_OPTIONS);
  if (unknown !== undefined)
    return new UuidSlugError(INVALID_MASK, `Unknown UUIDv7 masking-codec option: ${unknown}.`);
  const maskResult = maskFromOption(mask);
  if (isUuidSlugError(maskResult)) return maskResult;
  const handle = maskResult;
  // Decode tries exactly the caller's masks in order. Every added mask increases false
  // acceptance, and the first passing mask decides the result, so no fallback is added here.
  const previousMasks: UuidV7Mask[] = [];
  const previousMaskOptions = options.previousMasks ?? [];
  if (!Array.isArray(previousMaskOptions))
    return new UuidSlugError(
      INVALID_MASK,
      "previousMasks must be an array of masks or mask options.",
    );
  for (const previousOption of previousMaskOptions) {
    const previous = maskFromOption(previousOption);
    if (isUuidSlugError(previous)) return previous;
    previousMasks.push(previous);
  }
  const maskedSlugAlphabet = options.maskedSlugAlphabet ?? BASE64URL_NAME;
  const maskedSlugAlphabetResult = resolveSlugAlphabet(maskedSlugAlphabet);
  if (maskedSlugAlphabetResult instanceof Error) return maskedSlugAlphabetResult;
  const sentinelDefinitions = options.sentinels ?? EMPTY_SENTINELS;
  if (!Array.isArray(sentinelDefinitions))
    return new UuidSlugError(
      INVALID_SENTINEL,
      "sentinels must be an array of named UUIDv7 values.",
    );
  const sentinelState =
    sentinelDefinitions.length === 0
      ? EMPTY_SENTINEL_STATE
      : createSentinels(sentinelDefinitions, maskedSlugAlphabet);
  if (sentinelState instanceof Error) return sentinelState;
  const sentinels = sentinelState;
  // Borrowed-byte encoding is synchronous. Built-in masks call no user code, and custom masks
  // isolate callbacks with an input copy, so nested codec calls cannot observe this shared block.
  const encodeScratch = new Uint8Array(16);

  function decodeUuid(uuid: unknown, preferredSlug?: SlugMeaning): Uint8Array | UuidSlugError {
    if (isUint8Array(uuid))
      return isUuidBytes(uuid)
        ? uuid
        : new UuidSlugError(INVALID_BUFFER, "UUID bytes must contain exactly 16 bytes.");
    if (typeof uuid !== "string")
      return isUuidSlugError(uuid)
        ? uuid
        : new UuidSlugError(INVALID_UUID, "UUID must be text, bytes, or a UUID slug.");
    if (uuid.length === 32 || uuid.length === 36) return uuidStringToBytes(uuid);
    const sentinel = sentinels.bySlug.get(uuid)?.bytes;
    if (sentinel) return sentinel;
    if (uuid.length === 26) return decodePlainSlugToBytes(uuid);
    if (uuid.length === 27) return decodeMaskedSlug(uuid, handle, previousMasks);
    if (uuid.length !== 22) return invalidUuidSlugInput(uuid);
    const plain = decodePlainSlugToBytes(uuid);
    if (plain instanceof Error) return decodeMaskedSlug(uuid, handle, previousMasks);
    const masked = decodeMaskedSlug(uuid, handle, previousMasks);
    if (masked instanceof Error)
      return isUuidSlugError(masked) && masked.code === INVALID_UUID_SLUG ? plain : masked;
    if (sameUuidBytes(plain, masked)) return plain;
    if (preferredSlug === PLAIN_SLUG_MEANING) return plain;
    if (preferredSlug === MASKED_SLUG_MEANING) return masked;
    return new UuidSlugError(
      INVALID_UUID_SLUG,
      "This 22-character slug is valid as both plain and masked but resolves to different UUIDs; use an explicit plain or masked conversion.",
    );
  }

  function encodeMasked(
    bytes: Uint8Array,
    owned = false,
  ): MaskedOrSentinelUuidV7Slug | UuidSlugError {
    if (!isUuidV7Bytes(bytes))
      return new UuidSlugError(INVALID_UUID_VERSION, INVALID_MASKED_UUID_BYTES);
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
    // Branch after common validation so ordinary callers retain one plain borrowed-byte route.
    // Split guard helpers slowed that Bun route; reconsider only with packed mixed-workload evidence.
    if (owned)
      return ownedUuidV7BytesToMaskedSlug(bytes, handle, maskedSlugAlphabet, sentinels.bySlug);
    encodeScratch.set(bytes);
    return ownedUuidV7BytesToMaskedSlug(
      encodeScratch,
      handle,
      maskedSlugAlphabet,
      sentinels.bySlug,
    );
  }

  function uuidToString<
    Input extends UuidInput,
    Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE,
  >(uuid: Input, textCase?: Case): UuidStringResult<Input, Case>;
  function uuidToString<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
    uuid: unknown,
    textCase: Case = UUID_TEXT_LOWERCASE as Case,
  ): UuidStringFor<Case> | UuidSlugError {
    if (!isUuidTextCase(textCase)) return invalidUuidTextCase();
    if (typeof uuid === "string") {
      const sentinel = sentinels.bySlug.get(uuid);
      if (sentinel)
        return (
          textCase === UUID_TEXT_LOWERCASE
            ? sentinel.uuid
            : formatUuidBytesUnchecked(sentinel.bytes, 0, textCase)
        ) as UuidStringFor<Case>;
    }
    const bytes = decodeUuid(uuid);
    return bytes instanceof Error ? bytes : bytesToUuidString(bytes, textCase);
  }

  function uuidToBytes<Input extends UuidInput>(uuid: Input): UuidBytesResult<Input>;
  function uuidToBytes<Output extends Uint8Array>(
    uuid: UuidInput,
    output: Output,
    outputOffset?: number,
  ): Output | UuidSlugError;
  function uuidToBytes(
    uuid: unknown,
    output?: unknown,
    outputOffset = 0,
  ): UuidBytes | Uint8Array | UuidSlugError {
    const badRange = output === undefined ? undefined : checkByteRange(output, outputOffset, 16);
    if (badRange) return badRange;
    const destination = output as Uint8Array | undefined;
    const bytes = decodeUuid(uuid);
    if (bytes instanceof Error) return bytes;
    if (destination) {
      destination.set(bytes, outputOffset);
      return destination;
    }
    return new Uint8Array(bytes);
  }

  function uuidToPlainSlug<Input extends UuidInput>(
    uuid: Input,
    alphabet?: SlugAlphabet,
  ): PlainUuidSlugResult<Input>;
  function uuidToPlainSlug(
    uuid: unknown,
    alphabet: SlugAlphabet = BASE64URL_NAME,
  ): PlainUuidSlug | UuidSlugError {
    const bytes = decodeUuid(uuid, PLAIN_SLUG_MEANING);
    return bytes instanceof Error ? bytes : uuidBytesToPlainSlug(bytes, alphabet);
  }

  function uuidToMaskedSlug(uuid: unknown): MaskedOrSentinelUuidV7Slug | UuidSlugError {
    const bytes = decodeUuid(uuid, MASKED_SLUG_MEANING);
    return bytes instanceof Error ? bytes : encodeMasked(bytes);
  }

  function plainToMaskedUuidSlug(
    plainUuidSlug: string | UuidSlugError,
  ): MaskedOrSentinelUuidV7Slug | UuidSlugError {
    const bytes = decodePlainSlugToBytes(plainUuidSlug, encodeScratch);
    return bytes instanceof Error ? bytes : encodeMasked(encodeScratch, true);
  }

  function maskedSlugToUuidString<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
    maskedUuidSlug: string | UuidSlugError,
    textCase: Case = UUID_TEXT_LOWERCASE as Case,
  ): UuidV7StringFor<Case> | UuidSlugError {
    if (typeof maskedUuidSlug !== "string") return invalidUuidSlugInput(maskedUuidSlug);
    if (!isUuidTextCase(textCase)) return invalidUuidTextCase();
    const sentinel = sentinels.bySlug.get(maskedUuidSlug);
    if (sentinel)
      return (
        textCase === UUID_TEXT_LOWERCASE
          ? sentinel.uuid
          : formatUuidBytesUnchecked(sentinel.bytes, 0, textCase)
      ) as UuidV7StringFor<Case>;
    const decoded = decodeMaskedSlug(maskedUuidSlug, handle, previousMasks);
    if (decoded instanceof Error) return decoded;
    return formatUuidBytesUnchecked(decoded, 0, textCase) as UuidV7StringFor<Case>;
  }

  function maskedSlugToUuidBytes(
    maskedUuidSlug: string | UuidSlugError,
  ): UuidV7Bytes | UuidSlugError;
  function maskedSlugToUuidBytes<Output extends Uint8Array>(
    maskedUuidSlug: string | UuidSlugError,
    output: Output,
    outputOffset?: number,
  ): Output | UuidSlugError;
  function maskedSlugToUuidBytes(
    maskedUuidSlug: string | UuidSlugError,
    output?: Uint8Array,
    outputOffset = 0,
  ): Uint8Array | UuidSlugError {
    if (typeof maskedUuidSlug !== "string") return invalidUuidSlugInput(maskedUuidSlug);
    const badRange = output === undefined ? undefined : checkByteRange(output, outputOffset, 16);
    if (badRange) return badRange;
    const sentinelBytes = sentinels.bySlug.get(maskedUuidSlug)?.bytes;
    const decoded = sentinelBytes ?? decodeMaskedSlug(maskedUuidSlug, handle, previousMasks);
    if (decoded instanceof Error) return decoded;
    if (output) {
      output.set(decoded, outputOffset);
      return output;
    }
    return sentinelBytes ? new Uint8Array(sentinelBytes) : decoded;
  }

  function generateMaskedUuidV7Slug(): MaskedOrSentinelUuidV7Slug | UuidSlugError {
    try {
      const bytes = generateBytes();
      if (isUint8Array(bytes)) return encodeMasked(bytes, true);
      if (isUuidSlugError(bytes)) return bytes;
      return new UuidSlugError(INVALID_UUID_VERSION, INVALID_MASKED_UUID_BYTES);
    } catch (cause) {
      return new UuidSlugError(RNG_UNAVAILABLE, UUID_V7_GENERATION_FAILED, { cause });
    }
  }

  function maskedToPlainUuidSlug(
    maskedUuidSlug: string | UuidSlugError,
    alphabet: SlugAlphabet = BASE64URL_NAME,
  ): PlainUuidV7Slug | UuidSlugError {
    const bytes = maskedSlugToUuidBytes(maskedUuidSlug, encodeScratch);
    if (bytes instanceof Error) return bytes;
    return uuidBytesToPlainSlug(encodeScratch, alphabet) as PlainUuidV7Slug | UuidSlugError;
  }

  function generateUuidV7WithMaskedSlug<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
    textCase: Case = UUID_TEXT_LOWERCASE as Case,
  ): GeneratedUuidV7<MaskedOrSentinelUuidV7Slug, Case> | UuidSlugError {
    if (!isUuidTextCase(textCase)) return invalidUuidTextCase();
    try {
      const bytes = generateBytes();
      if (!isUint8Array(bytes))
        return isUuidSlugError(bytes)
          ? bytes
          : new UuidSlugError(INVALID_UUID_VERSION, INVALID_MASKED_UUID_BYTES);
      const uuid = formatUuidBytesUnchecked(bytes, 0, textCase) as UuidV7StringFor<Case>;
      const slug = encodeMasked(bytes, true);
      return slug instanceof Error ? slug : { uuid, slug };
    } catch (cause) {
      return new UuidSlugError(RNG_UNAVAILABLE, UUID_V7_GENERATION_FAILED, { cause });
    }
  }

  function extractMaskedUuidV7UnixMs(
    maskedUuidSlug: string | UuidSlugError,
  ): number | UuidSlugError {
    if (typeof maskedUuidSlug !== "string") return invalidUuidSlugInput(maskedUuidSlug);
    const bytes =
      sentinels.bySlug.get(maskedUuidSlug)?.bytes ??
      decodeMaskedSlug(maskedUuidSlug, handle, previousMasks);
    return bytes instanceof Error ? bytes : extractUuidV7UnixMs(bytes);
  }

  function createUuidSlugMigrationDecoder<const Options extends UuidSlugMigrationOptions = {}>(
    migrationOptions?: Options,
  ): UuidSlugMigrationDecoder<EnabledMigrationFormat<Options>>;
  function createUuidSlugMigrationDecoder<const Options extends UuidSlugMigrationOptions = {}>(
    migrationOptions?: Options,
  ): UuidSlugMigrationDecoder<EnabledMigrationFormat<Options>> | UuidSlugError {
    return createMigration([handle, ...previousMasks], sentinels.bySlug, migrationOptions);
  }

  function validateMaskedUuidV7SlugUnixMs<Input extends string | UuidSlugError>(
    maskedUuidSlug: Input,
    window: UuidV7TimestampWindow,
  ): (Input & MaskedOrSentinelUuidV7Slug) | UuidSlugError {
    if (typeof maskedUuidSlug !== "string") return invalidUuidSlugInput(maskedUuidSlug);
    const bytes =
      sentinels.bySlug.get(maskedUuidSlug)?.bytes ??
      decodeMaskedSlug(maskedUuidSlug, handle, previousMasks);
    if (bytes instanceof Error) return bytes;
    if (!isUuidV7Bytes(bytes))
      return new UuidSlugError(INVALID_UUID_VERSION, "Decoded UUID is not UUIDv7.");
    const valid = validateTimestampBytes(bytes, window);
    return valid instanceof Error ? valid : (maskedUuidSlug as Input & MaskedOrSentinelUuidV7Slug);
  }

  const maskingCodec: UuidV7MaskingCodec = {
    sentinels: sentinels.sentinels,
    uuidToString,
    uuidToBytes,
    uuidToPlainSlug,
    createUuidSlugMigrationDecoder,
    generateMaskedUuidV7Slug,
    generateUuidV7WithMaskedSlug,
    uuidToMaskedSlug,
    plainToMaskedUuidSlug,
    maskedToPlainUuidSlug,
    maskedSlugToUuidString,
    maskedSlugToUuidBytes,
    extractMaskedUuidV7UnixMs,
    validateMaskedUuidV7SlugUnixMs,
  };
  return Object.freeze(maskingCodec);
}
