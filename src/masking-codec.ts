// SPDX-License-Identifier: Apache-2.0

import {
  checkByteRange,
  exactLocalUuidBytes,
  findUnknownOption,
  INVALID_MASK,
  INVALID_OPTIONS,
  INVALID_SENTINEL,
  INVALID_TIMESTAMP,
  INVALID_UUID_VERSION,
  RNG_UNAVAILABLE,
  isUuidSlugError,
  isUint8Array,
  normalizeUuidSlugInput,
  stringInput,
  UuidSlugError,
} from "./errors.ts";
import { BASE32HEX_NAME, BASE64URL_NAME } from "./alphabet.ts";
import {
  uuidV7BytesFor as generateDefaultUuidV7Bytes,
  uuidV7DefaultPayloadLayout,
} from "./v7-keyless.ts";
import {
  MAX_MASKED_UUID_V7_TIMESTAMP_OFFSET_MS,
  ownedUuidV7BytesToMaskedSlug,
  noMaskedSlugMatch,
  unmaskSlug,
} from "./payload.ts";
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
  UuidV7PreviousMask,
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
  UuidV7Payload,
  UuidV7PayloadLayout,
  UuidV7MaskingCodecValueOptions,
  GenerateUuidV7WithMaskedSlugOptions,
  GenerateUuidV7BytesOptions,
  UuidV7Instant,
} from "./types.ts";
import { UUID_TEXT_LOWERCASE } from "./types.ts";
import {
  resolveSlugAlphabet,
  plainSlugToUuidBytes as decodePlainSlugToBytes,
  readObjectUuidInput,
  uuidBytesToPlainSlug,
  extractUuidV7UnixMs,
  extractUuidV7Payload,
  uuidToBytes as keylessUuidToBytes,
  uuidToPlainSlug as keylessUuidToPlainSlug,
  uuidToString as keylessUuidToString,
} from "./slug.ts";
import {
  formatUuidBytesUnchecked,
  bytesToUuidString,
  resolveUuidTextCase,
  isUuidV7Bytes,
  uuidStringToBytes,
} from "./uuid.ts";
import type { UuidV7TimestampWindow, UuidV7SentinelConfig } from "./types.ts";
import type { SlugAlphabet } from "./slug.ts";
import { createUuidValue, parseUuidWithCodec } from "./uuid-value.ts";
import { generateUuidV7ValueWithGenerator, readUuidV7ValueOptions } from "./v7-value-options.ts";
import { generateUuidV7BytesWithGenerator, readUuidV7Generator } from "./v7-generator-input.ts";
import { readGenerationOptions } from "./generation-options.ts";

type EncodedSentinel = { bytes: Uint8Array; slug: SentinelUuidV7Slug };

const CODEC_CONSTRUCTION_FAILED = "UUIDv7 masking-codec construction failed.";
const UUID_V7_GENERATION_FAILED = "generateUuidV7Bytes threw while generating UUIDv7 bytes.";
const INVALID_MASKED_UUID_BYTES = "Masking requires exactly 16 RFC-variant UUIDv7 bytes.";
const INVALID_SENTINEL_SHAPE = "Each sentinel must have a name and UUIDv7 string.";
const AT_OPTION = "at";
const CODEC_OPTIONS = {
  mask: true,
  maskedSlugAlphabet: true,
  maskSeed: true,
  previousMasks: true,
  sentinels: true,
  timestampRangeStartUnixMs: true,
} as const satisfies Record<keyof UuidV7MaskingCodecOptions, true>;
const UUID_V7_MASKING_CODEC_VALUE_OPTIONS = {
  at: true,
  generator: true,
} as const satisfies Record<keyof UuidV7MaskingCodecValueOptions, true>;
const PREVIOUS_MASK_OPTIONS = {
  mask: true,
  timestampRangeStartUnixMs: true,
} as const satisfies Record<keyof UuidV7PreviousMask, true>;
const SENTINEL_OPTIONS = {
  name: true,
  uuid: true,
} as const satisfies Record<keyof UuidV7SentinelConfig, true>;
const MASKED_PAIR_GENERATION_OPTIONS = {
  at: true,
  generator: true,
  textCase: true,
} as const satisfies Record<keyof GenerateUuidV7WithMaskedSlugOptions, true>;
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

function invalidGeneratedUuidV7Bytes(value: unknown): UuidSlugError {
  if (!isUint8Array(value) || value.length !== 16)
    return new UuidSlugError(
      INVALID_OPTIONS,
      `generateUuidV7Bytes must return exactly 16 UUID bytes or UuidSlugError; got ${isUint8Array(value) ? `${value.length} bytes` : typeof value}.`,
    );
  return new UuidSlugError(
    INVALID_UUID_VERSION,
    "generateUuidV7Bytes returned 16 bytes that are not an RFC-variant UUIDv7.",
  );
}

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

const MAX_UUID_V7_UNIX_MS = 2 ** 48 - 1;
const MAX_TIMESTAMP_RANGE_START_UNIX_MS =
  MAX_UUID_V7_UNIX_MS - MAX_MASKED_UUID_V7_TIMESTAMP_OFFSET_MS;

function timestampRangeStart(value: unknown, option: string): number | UuidSlugError {
  if (value === undefined) return 0;
  if (
    Number.isSafeInteger(value) &&
    (value as number) >= 0 &&
    (value as number) <= MAX_TIMESTAMP_RANGE_START_UNIX_MS
  )
    return value as number;
  const received = typeof value === "number" || value === null ? `${value}` : typeof value;
  return new UuidSlugError(
    INVALID_TIMESTAMP,
    `${option} must be an integer from 0 through ${MAX_TIMESTAMP_RANGE_START_UNIX_MS}; got ${received}.`,
  );
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
    if (typeof definition !== "object" || definition === null)
      return new UuidSlugError(INVALID_SENTINEL, INVALID_SENTINEL_SHAPE);
    const name = stringInput(definition.name);
    if (name === undefined) return new UuidSlugError(INVALID_SENTINEL, INVALID_SENTINEL_SHAPE);
    const uuidInput =
      typeof definition.uuid === "string" ? definition.uuid : stringInput(definition.uuid);
    if (uuidInput === undefined) return new UuidSlugError(INVALID_SENTINEL, INVALID_SENTINEL_SHAPE);
    const unknown = findUnknownOption(definition, SENTINEL_OPTIONS);
    if (unknown !== undefined)
      return new UuidSlugError(INVALID_SENTINEL, `Unknown sentinel option: ${unknown}.`);
    if (name.length === 0)
      return new UuidSlugError(INVALID_SENTINEL, "Sentinel names must not be empty.");
    if (names.has(name))
      return new UuidSlugError(
        INVALID_SENTINEL,
        `Sentinel name "${name}" must be unique within a UUIDv7 masking codec.`,
      );
    // Sentinel configuration accepts raw strings so callers do not need casts before reaching the
    // validating seam. Check each value here, while a bad definition is still a constructor error
    // rather than a codec that fails on every later decode.
    const bytes = uuidStringToBytes(uuidInput);
    if (bytes instanceof Error) return bytes;
    if (!isUuidV7Bytes(bytes))
      return new UuidSlugError(
        INVALID_UUID_VERSION,
        `Sentinel "${name}" must be a UUIDv7, got ${uuidInput}.`,
      );
    const uuid = formatUuidBytesUnchecked(bytes) as UuidV7String;
    // Reject duplicate UUIDs before the array and lookup maps can disagree about which exposed
    // sentinel owns the reserved value.
    if (byUuid.has(uuid))
      return new UuidSlugError(
        INVALID_SENTINEL,
        `Sentinel "${name}" repeats the UUID of an earlier sentinel.`,
      );
    // Sentinels remain raw UUIDs; only their writer follows the masked alphabet selection.
    const slug = uuidBytesToPlainSlug(bytes, alphabet);
    if (slug instanceof Error) return slug;
    const sentinel = Object.freeze({
      name,
      // Both brands come from the UUIDv7 byte check above.
      slug: slug as SentinelUuidV7Slug,
      uuid,
    });
    sentinels.push(sentinel);
    names.add(name);
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
 * Build an immutable UUIDv7 masking codec from a private `maskSeed`, or from an explicit `mask` when
 * it is derived elsewhere or needs a label or work factor. It reads the writer first, then
 * `previousMasks` in caller order. Invalid masks, sentinels, options, or callbacks return
 * `UuidSlugError`; no implicit public mask is selected. Masked writers return `invalid_timestamp`
 * outside the configured inclusive timestamp range; registered sentinels remain plain.
 *
 * @param options - The writer mask as `maskSeed` or `mask`, exactly one of the two, plus the
 * optional timestamp range, readers, sentinels, and output spelling.
 * @returns The masking codec, or `UuidSlugError` when its configuration is invalid.
 */
export function createUuidV7MaskingCodec(
  options: UuidV7MaskingCodecOptions,
): UuidV7MaskingCodec | UuidSlugError {
  try {
    // Codec generation keeps every failure as a value: a configured timestamp range can reject
    // the current time, so no codec generation call is free of fallible input.
    return buildUuidSlugCodec(options, generateDefaultUuidV7Bytes);
  } catch (cause) {
    return new UuidSlugError(INVALID_MASK, CODEC_CONSTRUCTION_FAILED, { cause });
  }
}

/** Internal seam for exercising generator failures without weakening public generation. */
export function createUuidV7MaskingCodecWithGenerator(
  options: UuidV7MaskingCodecOptions,
  generateUuidV7Bytes: (
    this: void,
    options?: GenerateUuidV7BytesOptions,
  ) => Uint8Array | UuidSlugError,
): UuidV7MaskingCodec | UuidSlugError {
  try {
    return buildUuidSlugCodec(options, generateUuidV7Bytes);
  } catch (cause) {
    return new UuidSlugError(INVALID_MASK, CODEC_CONSTRUCTION_FAILED, { cause });
  }
}

function buildUuidSlugCodec(
  options: UuidV7MaskingCodecOptions,
  generateBytes: (this: void, options?: GenerateUuidV7BytesOptions) => Uint8Array | UuidSlugError,
): UuidV7MaskingCodec | UuidSlugError {
  const validOptions = typeof options === "object" && options !== null && !Array.isArray(options);
  const mask = validOptions ? options.mask : undefined;
  const maskSeed = validOptions ? options.maskSeed : undefined;
  // Both keys reach the same derivation, so accepting both would leave the writer mask ambiguous.
  const hasMask = mask !== undefined && mask !== null;
  const hasSeed = maskSeed !== undefined && maskSeed !== null;
  if (hasMask === hasSeed)
    return new UuidSlugError(
      INVALID_MASK,
      hasMask
        ? "Pass maskSeed for private key material or mask for a derived mask, never both."
        : "Pass { maskSeed } for private masking or { mask: UUID_V7_TEST_MASK } for public examples.",
    );
  const unknown = findUnknownOption(options, CODEC_OPTIONS);
  if (unknown !== undefined)
    return new UuidSlugError(INVALID_MASK, `Unknown UUIDv7 masking-codec option: ${unknown}.`);
  const maskResult = maskFromOption(hasMask ? mask : { seed: maskSeed as string | Uint8Array });
  if (isUuidSlugError(maskResult)) return maskResult;
  const handle = maskResult;
  const currentTimestampRangeStartResult = timestampRangeStart(
    options.timestampRangeStartUnixMs,
    "timestampRangeStartUnixMs",
  );
  if (typeof currentTimestampRangeStartResult !== "number") return currentTimestampRangeStartResult;
  const currentTimestampRangeStart = currentTimestampRangeStartResult;
  const current = { mask: handle, timestampRangeStartUnixMs: currentTimestampRangeStart };
  // Decode tries exactly the caller's masks in order. Every added mask increases false
  // acceptance, and the first passing mask decides the result, so no fallback is added here.
  const previousMasks: { mask: UuidV7Mask; timestampRangeStartUnixMs: number }[] = [];
  const previousMaskOptions = options.previousMasks ?? [];
  if (!Array.isArray(previousMaskOptions))
    return new UuidSlugError(
      INVALID_MASK,
      "previousMasks must be an array of masks, mask options, or retained mask-and-range objects.",
    );
  for (const previousOption of previousMaskOptions) {
    const configured =
      typeof previousOption === "object" &&
      previousOption !== null &&
      !isUuidSlugError(previousOption) &&
      "mask" in previousOption;
    if (configured) {
      const unknownPrevious = findUnknownOption(previousOption, PREVIOUS_MASK_OPTIONS);
      if (unknownPrevious !== undefined)
        return new UuidSlugError(INVALID_MASK, `Unknown previous-mask option: ${unknownPrevious}.`);
    }
    const previous = maskFromOption(configured ? previousOption.mask : previousOption);
    if (isUuidSlugError(previous)) return previous;
    const start = timestampRangeStart(
      configured ? previousOption.timestampRangeStartUnixMs : undefined,
      "previousMasks[].timestampRangeStartUnixMs",
    );
    if (typeof start !== "number") return start;
    previousMasks.push({ mask: previous, timestampRangeStartUnixMs: start });
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

  // Package-created decode failures are local Errors. A caller-owned cross-realm package error is
  // the only failure arm that can bypass `instanceof`, and this function returns it unchanged;
  // identity keeps marker recognition off successful conversion paths.
  function decodeUuid(uuid: unknown): Uint8Array | UuidSlugError {
    let text: string;
    if (typeof uuid === "string") text = uuid;
    else {
      const input = readObjectUuidInput(uuid);
      if (typeof input !== "string") return input;
      text = input;
    }
    const sentinel = sentinels.bySlug.get(text)?.bytes;
    if (sentinel) return sentinel;
    if (text.length === 26) return decodePlainSlugToBytes(text);
    if (text.length === 27) return unmaskSlug(text, current, previousMasks) ?? noMaskedSlugMatch();
    if (text.length !== 22) return uuidStringToBytes(text);
    // One masked base64url slug in 16 is also the canonical plain slug of a different UUID, so the
    // codec's check is the only evidence of meaning: a slug that passes it under any configured
    // mask is masked, and the plain reading is used only once every mask has rejected the text.
    // Alphabet errors and mask-callback failures are returned as they are; only a failed check
    // falls through to the plain reading.
    const masked = unmaskSlug(text, current, previousMasks);
    if (masked !== undefined) return masked;
    const plain = decodePlainSlugToBytes(text);
    return plain instanceof Error ? noMaskedSlugMatch() : plain;
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
      return ownedUuidV7BytesToMaskedSlug(
        bytes,
        handle,
        maskedSlugAlphabet,
        sentinels.bySlug,
        currentTimestampRangeStart,
      );
    encodeScratch.set(bytes);
    return ownedUuidV7BytesToMaskedSlug(
      encodeScratch,
      handle,
      maskedSlugAlphabet,
      sentinels.bySlug,
      currentTimestampRangeStart,
    );
  }

  function uuidToString<
    Input extends UuidInput,
    Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE,
  >(uuid: Input, textCase?: Case): UuidStringResult<Input, Case>;
  function uuidToString<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
    uuid: Uint8Array,
    byteOffset: number,
    textCase?: Case,
  ): UuidStringResult<Uint8Array, Case>;
  function uuidToString<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
    uuid: unknown,
    byteOffsetOrCase: number | Case = UUID_TEXT_LOWERCASE as Case,
    caseAfterOffset?: Case,
  ): UuidStringFor<Case> | UuidSlugError {
    // Bytes at an offset carry no masked spelling, so the keyless reader owns every offset read and
    // its rejection of an offset beside another form. Zero is the spelling of "no offset", so it
    // stays here: sending a masked slug to the keyless reader would spell out a different UUID.
    let textCase: Case;
    if (typeof byteOffsetOrCase === "number") {
      if (isUint8Array(uuid) || byteOffsetOrCase !== 0)
        return keylessUuidToString(uuid as Uint8Array, byteOffsetOrCase, caseAfterOffset);
      textCase = caseAfterOffset ?? (UUID_TEXT_LOWERCASE as Case);
    } else textCase = byteOffsetOrCase;
    const selectedCase = resolveUuidTextCase(textCase);
    if (selectedCase instanceof Error) return selectedCase;
    const localBytes = exactLocalUuidBytes(uuid);
    if (localBytes)
      return formatUuidBytesUnchecked(localBytes, 0, selectedCase) as UuidStringFor<Case>;
    if (typeof uuid === "string") {
      const sentinel = sentinels.bySlug.get(uuid);
      if (sentinel)
        return (
          selectedCase === UUID_TEXT_LOWERCASE
            ? sentinel.uuid
            : formatUuidBytesUnchecked(sentinel.bytes, 0, selectedCase)
        ) as UuidStringFor<Case>;
    }
    const bytes = decodeUuid(uuid);
    if (bytes instanceof Error || (bytes === uuid && isUuidSlugError(bytes))) return bytes;
    return bytesToUuidString(bytes, selectedCase) as UuidStringFor<Case> | UuidSlugError;
  }

  function uuidToBytes<Input extends UuidInput>(uuid: Input): UuidBytesResult<Input>;
  function uuidToBytes<Output extends Uint8Array>(
    uuid: UuidInput,
    output: Output,
    outputOffset?: number,
  ): Output | UuidSlugError;
  function uuidToBytes(uuid: Uint8Array, byteOffset: number): UuidBytesResult<Uint8Array>;
  function uuidToBytes<Output extends Uint8Array>(
    uuid: Uint8Array,
    byteOffset: number,
    output: Output,
    outputOffset?: number,
  ): Output | UuidSlugError;
  function uuidToBytes(
    uuid: unknown,
    outputOrByteOffset?: unknown,
    outputOrOutputOffset?: unknown,
    offsetAfterOutput = 0,
  ): UuidBytes | Uint8Array | UuidSlugError {
    // Bytes at an offset carry no masked spelling, so the keyless reader owns every offset read and
    // its rejection of an offset beside another form. Zero is the spelling of "no offset", so it
    // stays here: sending a masked slug to the keyless reader would decode a different UUID.
    const readsAtOffset = typeof outputOrByteOffset === "number";
    if (readsAtOffset && (isUint8Array(uuid) || outputOrByteOffset !== 0))
      return outputOrOutputOffset === undefined
        ? keylessUuidToBytes(uuid as Uint8Array, outputOrByteOffset)
        : keylessUuidToBytes(
            uuid as Uint8Array,
            outputOrByteOffset,
            outputOrOutputOffset as Uint8Array,
            offsetAfterOutput,
          );
    const output = readsAtOffset ? outputOrOutputOffset : outputOrByteOffset;
    const outputOffset = readsAtOffset
      ? offsetAfterOutput
      : ((outputOrOutputOffset as number | undefined) ?? 0);
    const badRange = output === undefined ? undefined : checkByteRange(output, outputOffset, 16);
    if (badRange) return badRange;
    const destination = output as Uint8Array | undefined;
    const localBytes = exactLocalUuidBytes(uuid);
    if (localBytes) {
      if (destination) {
        destination.set(localBytes, outputOffset);
        return destination;
      }
      return new Uint8Array(localBytes);
    }
    const bytes = decodeUuid(uuid);
    if (bytes instanceof Error || (bytes === uuid && isUuidSlugError(bytes))) return bytes;
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
    uuid: Uint8Array,
    byteOffset: number,
    alphabet?: SlugAlphabet,
  ): PlainUuidSlugResult<Uint8Array>;
  function uuidToPlainSlug(
    uuid: unknown,
    byteOffsetOrAlphabet: number | SlugAlphabet = BASE64URL_NAME,
    alphabetAfterOffset?: SlugAlphabet,
  ): PlainUuidSlug | UuidSlugError {
    // Bytes at an offset carry no masked spelling, so the keyless reader owns every offset read and
    // its rejection of an offset beside another form. Zero is the spelling of "no offset", so it
    // stays here: sending a masked slug to the keyless reader would return it unchanged as plain.
    let alphabet: SlugAlphabet;
    if (typeof byteOffsetOrAlphabet === "number") {
      if (isUint8Array(uuid) || byteOffsetOrAlphabet !== 0)
        return keylessUuidToPlainSlug(
          uuid as Uint8Array,
          byteOffsetOrAlphabet,
          alphabetAfterOffset,
        );
      alphabet = alphabetAfterOffset ?? BASE64URL_NAME;
    } else alphabet = byteOffsetOrAlphabet;
    const localBytes = exactLocalUuidBytes(uuid);
    if (localBytes) return uuidBytesToPlainSlug(localBytes, alphabet);
    const bytes = decodeUuid(uuid);
    if (bytes instanceof Error || (bytes === uuid && isUuidSlugError(bytes))) return bytes;
    return uuidBytesToPlainSlug(bytes, alphabet);
  }

  function uuidToMaskedSlug(uuid: unknown): MaskedOrSentinelUuidV7Slug | UuidSlugError {
    const localBytes = exactLocalUuidBytes(uuid);
    if (localBytes) return encodeMasked(localBytes);
    const bytes = decodeUuid(uuid);
    if (bytes instanceof Error || (bytes === uuid && isUuidSlugError(bytes))) return bytes;
    return encodeMasked(bytes);
  }

  function plainToMaskedUuidSlug(
    plainUuidSlug: string | UuidSlugError,
  ): MaskedOrSentinelUuidV7Slug | UuidSlugError {
    const slug = normalizeUuidSlugInput(plainUuidSlug);
    if (typeof slug !== "string") return slug;
    const bytes = decodePlainSlugToBytes(slug, encodeScratch);
    return bytes instanceof Error ? bytes : encodeMasked(encodeScratch, true);
  }

  function maskedSlugToUuidString<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
    maskedUuidSlug: string | UuidSlugError,
    textCase: Case = UUID_TEXT_LOWERCASE as Case,
  ): UuidV7StringFor<Case> | UuidSlugError {
    const slug = normalizeUuidSlugInput(maskedUuidSlug);
    if (typeof slug !== "string") return slug;
    const selectedCase = resolveUuidTextCase(textCase);
    if (selectedCase instanceof Error) return selectedCase;
    const sentinel = sentinels.bySlug.get(slug);
    if (sentinel)
      return (
        selectedCase === UUID_TEXT_LOWERCASE
          ? sentinel.uuid
          : formatUuidBytesUnchecked(sentinel.bytes, 0, selectedCase)
      ) as UuidV7StringFor<Case>;
    const decoded = unmaskSlug(slug, current, previousMasks) ?? noMaskedSlugMatch();
    if (decoded instanceof Error) return decoded;
    return formatUuidBytesUnchecked(decoded, 0, selectedCase) as UuidV7StringFor<Case>;
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
    const slug = normalizeUuidSlugInput(maskedUuidSlug);
    if (typeof slug !== "string") return slug;
    const badRange = output === undefined ? undefined : checkByteRange(output, outputOffset, 16);
    if (badRange) return badRange;
    const sentinelBytes = sentinels.bySlug.get(slug)?.bytes;
    const decoded =
      sentinelBytes ?? unmaskSlug(slug, current, previousMasks) ?? noMaskedSlugMatch();
    if (decoded instanceof Error) return decoded;
    if (output) {
      output.set(decoded, outputOffset);
      return output;
    }
    return sentinelBytes ? new Uint8Array(sentinelBytes) : decoded;
  }

  function generateCodecBytesFromValues(values: {
    readonly at?: unknown;
    readonly generator?: unknown;
  }): UuidV7Bytes | UuidSlugError {
    const generator = readUuidV7Generator(values.generator);
    if (generator instanceof Error) return generator;
    try {
      const bytes = generator
        ? generateUuidV7BytesWithGenerator(generator, values)
        : Object.hasOwn(values, AT_OPTION)
          ? generateBytes({ at: values.at as UuidV7Instant })
          : generateBytes();
      if (!isUint8Array(bytes) || !isUuidV7Bytes(bytes))
        return isUuidSlugError(bytes) ? bytes : invalidGeneratedUuidV7Bytes(bytes);
      return bytes;
    } catch (cause) {
      return new UuidSlugError(RNG_UNAVAILABLE, UUID_V7_GENERATION_FAILED, { cause });
    }
  }

  function generateCodecBytes(generationOptions?: unknown): UuidV7Bytes | UuidSlugError {
    const values = readUuidV7ValueOptions(generationOptions, UUID_V7_MASKING_CODEC_VALUE_OPTIONS);
    return values instanceof Error ? values : generateCodecBytesFromValues(values);
  }

  function generateMaskedUuidV7Slug(
    generationOptions?: UuidV7MaskingCodecValueOptions,
  ): MaskedOrSentinelUuidV7Slug | UuidSlugError {
    const bytes = generateCodecBytes(generationOptions);
    return isUuidSlugError(bytes) ? bytes : encodeMasked(bytes, true);
  }

  function maskedToPlainUuidSlug(
    maskedUuidSlug: string | UuidSlugError,
    alphabet: SlugAlphabet = BASE64URL_NAME,
  ): PlainUuidV7Slug | UuidSlugError {
    const bytes = maskedSlugToUuidBytes(maskedUuidSlug, encodeScratch);
    if (isUuidSlugError(bytes)) return bytes;
    return uuidBytesToPlainSlug(encodeScratch, alphabet) as PlainUuidV7Slug | UuidSlugError;
  }

  function generateUuidV7WithMaskedSlug<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
    textCase?: Case,
  ): GeneratedUuidV7<MaskedOrSentinelUuidV7Slug, Case> | UuidSlugError;
  function generateUuidV7WithMaskedSlug<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
    options: GenerateUuidV7WithMaskedSlugOptions<Case>,
  ): GeneratedUuidV7<MaskedOrSentinelUuidV7Slug, Case> | UuidSlugError;
  function generateUuidV7WithMaskedSlug<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
    textCaseOrOptions:
      | Case
      | GenerateUuidV7WithMaskedSlugOptions<Case> = UUID_TEXT_LOWERCASE as Case,
  ): GeneratedUuidV7<MaskedOrSentinelUuidV7Slug, Case> | UuidSlugError {
    let directTextCase = typeof textCaseOrOptions === "string";
    let values =
      typeof textCaseOrOptions === "string"
        ? { textCase: textCaseOrOptions }
        : readGenerationOptions(
            textCaseOrOptions,
            MASKED_PAIR_GENERATION_OPTIONS,
            "masked UUIDv7 pair generation",
          );
    if (values instanceof Error) {
      const wrappedCase = stringInput(textCaseOrOptions);
      if (wrappedCase !== undefined) {
        directTextCase = true;
        values = { textCase: wrappedCase };
      }
    }
    if (values instanceof Error) return values;
    const textCase = resolveUuidTextCase(values.textCase ?? UUID_TEXT_LOWERCASE);
    if (textCase instanceof Error) return textCase;
    const bytes = directTextCase ? generateCodecBytes() : generateCodecBytesFromValues(values);
    if (bytes instanceof Error) return bytes;
    const uuid = formatUuidBytesUnchecked(bytes, 0, textCase) as UuidV7StringFor<Case>;
    const slug = encodeMasked(bytes, true);
    return slug instanceof Error ? slug : { uuid, slug };
  }

  function extractMaskedUuidV7UnixMs(
    maskedUuidSlug: string | UuidSlugError,
  ): number | UuidSlugError {
    const slug = normalizeUuidSlugInput(maskedUuidSlug);
    if (typeof slug !== "string") return slug;
    const bytes =
      sentinels.bySlug.get(slug)?.bytes ??
      unmaskSlug(slug, current, previousMasks) ??
      noMaskedSlugMatch();
    return bytes instanceof Error ? bytes : extractUuidV7UnixMs(bytes);
  }

  function extractMaskedUuidV7Payload(
    maskedUuidSlug: string | UuidSlugError,
    layout: UuidV7PayloadLayout,
  ): UuidV7Payload | UuidSlugError {
    const slug = normalizeUuidSlugInput(maskedUuidSlug);
    if (typeof slug !== "string") return slug;
    const bytes =
      sentinels.bySlug.get(slug)?.bytes ??
      unmaskSlug(slug, current, previousMasks) ??
      noMaskedSlugMatch();
    return bytes instanceof Error ? bytes : extractUuidV7Payload(bytes, layout);
  }

  function createUuidSlugMigrationDecoder<const Options extends UuidSlugMigrationOptions = {}>(
    migrationOptions?: Options,
  ): UuidSlugMigrationDecoder<EnabledMigrationFormat<Options>>;
  function createUuidSlugMigrationDecoder<const Options extends UuidSlugMigrationOptions = {}>(
    migrationOptions?: Options,
  ): UuidSlugMigrationDecoder<EnabledMigrationFormat<Options>> | UuidSlugError {
    return createMigration([current, ...previousMasks], sentinels.bySlug, migrationOptions);
  }

  function validateMaskedUuidV7SlugUnixMs<Input extends string | UuidSlugError>(
    maskedUuidSlug: Input,
    window: UuidV7TimestampWindow,
  ): (Input & MaskedOrSentinelUuidV7Slug) | UuidSlugError {
    const slug = normalizeUuidSlugInput(maskedUuidSlug);
    if (typeof slug !== "string") return slug;
    const bytes =
      sentinels.bySlug.get(slug)?.bytes ??
      unmaskSlug(slug, current, previousMasks) ??
      noMaskedSlugMatch();
    if (bytes instanceof Error) return bytes;
    if (!isUuidV7Bytes(bytes))
      return new UuidSlugError(
        INVALID_UUID_VERSION,
        "Timestamp validation requires an RFC-variant UUIDv7.",
      );
    const valid = validateTimestampBytes(bytes, window);
    return valid instanceof Error ? valid : (slug as Input & MaskedOrSentinelUuidV7Slug);
  }

  function generateUuidV7Value(valueOptions?: UuidV7MaskingCodecValueOptions) {
    const values = readUuidV7ValueOptions(valueOptions, UUID_V7_MASKING_CODEC_VALUE_OPTIONS);
    if (values instanceof Error) return values;
    const generator = readUuidV7Generator(values.generator);
    if (generator instanceof Error) return generator;
    if (generator) return generateUuidV7ValueWithGenerator(generator, values, maskingCodec);
    const generated = !Object.hasOwn(values, AT_OPTION)
      ? generateDefaultUuidV7Bytes()
      : generateDefaultUuidV7Bytes({ at: values.at as UuidV7Instant });
    return generated instanceof Error
      ? generated
      : createUuidValue<7, true, true>(generated, maskingCodec, uuidV7DefaultPayloadLayout());
  }

  const maskingCodec: UuidV7MaskingCodec = {
    sentinels: sentinels.sentinels,
    generateUuidV7Value,
    parseUuid: (uuid) => parseUuidWithCodec(uuid, maskingCodec),
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
    extractMaskedUuidV7Payload,
    validateMaskedUuidV7SlugUnixMs,
  };
  return Object.freeze(maskingCodec);
}
