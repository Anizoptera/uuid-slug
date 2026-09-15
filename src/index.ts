// SPDX-License-Identifier: Apache-2.0

export { createUuidV7MaskingCodec } from "./masking-codec.ts";
export { MAX_MASKED_UUID_V7_TIMESTAMP_OFFSET_MS } from "./payload.ts";
export { validateUuidV7StringUnixMs } from "./timestamp.ts";
export {
  ABORTED,
  INVALID_BASE32HEX,
  INVALID_BASE64URL,
  INVALID_BUFFER,
  INVALID_MASK,
  INVALID_OPTIONS,
  INVALID_SENTINEL,
  INVALID_TIMESTAMP,
  INVALID_UUID,
  INVALID_UUID_SLUG,
  INVALID_UUID_VERSION,
  RNG_UNAVAILABLE,
  TIMESTAMP_OUTSIDE_WINDOW,
  UuidSlugError,
  isUuidSlugError,
} from "./errors.ts";
export { BASE32HEX_NAME as BASE32HEX, BASE64URL_NAME as BASE64URL } from "./alphabet.ts";
/** Export the code type so consumers can write exhaustive handlers without copying its literals. */
export type { UuidSlugErrorCode } from "./errors.ts";
export { UUID_V7_TEST_MASK, deriveUuidV7Mask, deriveUuidV7MaskAsync } from "./mask.ts";
export { createCustomUuidV7Mask } from "./mask-handle.ts";
export {
  SEEDED_MASK_FORMAT,
  PLAIN_SLUG_FORMAT,
  FIXED_MASK_FORMAT,
  UUID_TEXT_LOWERCASE,
  UUID_TEXT_UPPERCASE,
  UUID_V7_ROLLBACK_ERROR,
  UUID_V7_ROLLBACK_PRESERVE,
  UUID_V7_ROLLBACK_RESET,
  UUID_VARIANT_NCS,
  UUID_VARIANT_RFC,
  UUID_VARIANT_MICROSOFT,
  UUID_VARIANT_FUTURE,
} from "./types.ts";
export type {
  AsyncUuidV7MaskOptions,
  CustomUuidV7MaskOptions,
  GeneratedUuidV7,
  GeneratePlainUuidV7SlugOptions,
  GenerateUuidV7BytesIntoOptions,
  GenerateUuidV7BytesOptions,
  GenerateUuidV7Options,
  GenerateUuidV7WithMaskedSlugOptions,
  GenerateUuidV7WithPlainSlugOptions,
  UuidV7TimestampWindow,
  UuidV7Mask,
  UuidV7MaskOptions,
  UuidSlugMigrationFormat,
  MaskedUuidV7Slug,
  MaskedOrSentinelUuidV7Slug,
  SentinelUuidV7Slug,
  UuidBytes,
  UuidByteInput,
  UuidInput,
  UuidStringResult,
  UuidBytesResult,
  PlainUuidSlugResult,
  UuidV4Bytes,
  PlainUuidSlug,
  UuidSlugMigrationDecoder,
  UuidSlugMigrationOptions,
  UuidString,
  UuidText,
  UppercaseUuidString,
  UppercaseUuidV4String,
  UppercaseUuidV7String,
  UuidStringFor,
  UuidV4StringFor,
  UuidV7StringFor,
  UuidTextCase,
  UuidVersion,
  UuidVariant,
  UuidInspection,
  Uuid,
  PlainUuidV4Slug,
  UuidV4String,
  UuidV4Text,
  UuidV7Generator,
  UuidV7Instant,
  UuidV7GeneratorValueOptions,
  UuidV7ValueOptions,
  UuidV7ClockRollbackPolicy,
  UuidRandomFill,
  UuidV7MaskingCodec,
  UuidV7MaskingCodecValueOptions,
  UuidV7MaskingCodecOptions,
  UuidV7PreviousMask,
  UuidV7Bytes,
  UuidV7Bounds,
  UuidV7Payload,
  UuidV7PayloadLayout,
  UuidV7Sentinel,
  UuidV7SentinelConfig,
  PlainUuidV7Slug,
  UuidV7String,
  UuidV7Text,
} from "./types.ts";
export { uuidV7StringBounds, uuidV7ByteBounds } from "./v7-bounds.ts";
export {
  MAX_UUID,
  NIL_UUID,
  bytesToUuidString,
  isUuidBytes,
  isUuidV4Bytes,
  isUuidV4String,
  isUuidV4Text,
  isUuidV7Bytes,
  isUuidV7String,
  isUuidV7Text,
  isUuidString,
  isUuidText,
  uuidStringToBytes,
} from "./uuid.ts";
export {
  uuidBytesToPlainSlug,
  extractUuidV7UnixMs,
  extractUuidV7Payload,
  extractUuidVersion,
  isPlainUuidSlug,
  isPlainUuidV4Slug,
  isPlainUuidV7Slug,
  plainSlugToUuidBytes,
  plainSlugToUuidString,
  uuidToString,
  uuidToBytes,
  uuidToPlainSlug,
  uuidStringToPlainSlug,
  validatePlainUuidV7SlugUnixMs,
} from "./slug.ts";
export { parseUuid } from "./uuid-value.ts";
export type { SlugAlphabet } from "./slug.ts";
export { createUuidV7Generator, createUuidV7GeneratorWithRandomFill } from "./v7-generator.ts";
export type { UuidV7GeneratorOptions } from "./v7-generator.ts";

/* Keyless operations stay module-level and avoid codec setup. Masking and sentinels stay on the
 * codec because their meaning depends on its seed and sentinel table. */
export {
  generateUuidV4,
  generateUuidV4WithRandomFill,
  generateUuidV4Bytes,
  generatePlainUuidV4Slug,
  generateUuidV7,
  generateUuidV7Bytes,
  generatePlainUuidV7Slug,
  generateUuidV7WithPlainSlug,
} from "./keyless.ts";
export { generateUuidV7Value } from "./v7-value.ts";
