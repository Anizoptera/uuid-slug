// SPDX-License-Identifier: Apache-2.0

export {
  createUuidV7SlugCodec,
  validateUuidV7Timestamp,
  validateUuidV7SlugTimestamp,
} from "./codec";
export { UUID_SLUG_ERROR_CODES, UuidSlugError, isUuidSlugError, unwrapUuidSlug } from "./errors";
/** Export the code type so consumers can write exhaustive handlers without copying its literals. */
export type { UuidSlugErrorCode } from "./errors";
export { UUID_V7_TEST_MASK, createUuidV7Mask, createUuidV7MaskAsync } from "./schema";
export { createCustomUuidV7Mask } from "./schema-handle";
export { UUID_SLUG_MIGRATION_FORMATS } from "./types";
export type {
  AsyncUuidV7MaskOptions,
  CustomUuidV7MaskOptions,
  UuidV7TimestampWindow,
  UuidV7Mask,
  UuidV7MaskOptions,
  UuidSlugMigrationFormat,
  MaskedUuidV7Slug,
  UuidV7CodecSlug,
  SentinelUuidV7Slug,
  UuidBytes,
  UuidV4Bytes,
  UuidSlug,
  UuidSlugMigrationDecoder,
  UuidSlugMigrationOptions,
  UuidString,
  UuidV4Slug,
  UuidV4String,
  UuidV7Generator,
  UuidV7SlugCodec,
  UuidV7SlugCodecOptions,
  UuidV7Bytes,
  UuidV7Sentinel,
  UuidV7SentinelConfig,
  UuidV7Slug,
  UuidV7String,
} from "./types";
export {
  bytesToUuid,
  extractUuidV7Timestamp,
  bytesToSlug,
  isUuidSlug,
  isUuidBytes,
  isUuidV4Bytes,
  isUuidV4Slug,
  isUuidV4String,
  isUuidV7Bytes,
  isUuidV7Slug,
  isUuidV7String,
  isUuidString,
  UUID_SLUG_ALPHABETS,
  slugToBytes,
  slugToUuid,
  uuidToSlug,
  uuidToBytes,
} from "./uuid";
export type { SlugAlphabet } from "./uuid";
export { createUuidV7Generator } from "./v7";
export type { UuidV7GeneratorOptions } from "./v7";

/* Keyless operations stay module-level and avoid codec setup. Masking and sentinels stay on the
 * codec because their meaning depends on its seed and sentinel table. */
export {
  generateUuidV4,
  generateUuidV4Bytes,
  generateUuidV4Slug,
  generateUuidV7,
  generateUuidV7At,
  generateUuidV7Bytes,
  generateUuidV7BytesAt,
  generateUuidV7Slug,
} from "./keyless";
