// SPDX-License-Identifier: Apache-2.0

export {
  UUID_V7_SENTINEL_DEFINITIONS,
  createUuidSlugCodec,
  validateUuidV7Fresh,
  validateUuidV7SlugFresh,
} from "./codec";
export { UUID_SLUG_ERROR_CODES, UuidSlugError, isUuidSlugError, unwrapUuidSlug } from "./errors";
/** Export the code type so consumers can write exhaustive handlers without copying its literals. */
export type { UuidSlugErrorCode } from "./errors";
export { PUBLIC_MASK_SCHEMA, createMaskSchema, createMaskSchemaAsync } from "./schema";
export { createCustomMaskSchema } from "./schema-handle";
export type {
  AsyncMaskSchemaOptions,
  CustomMaskSchemaOptions,
  FreshValidationOptions,
  MaskSchema,
  MaskSchemaOptions,
  MigrationFormat,
  MaskedUuidV7Slug,
  PublicUuidV7Slug,
  SentinelUuidV7Slug,
  UuidBytes,
  UuidV4Bytes,
  UuidSlug,
  UuidSlugCodec,
  UuidSlugCodecOptions,
  UuidSlugMigration,
  UuidSlugMigrationOptions,
  UuidString,
  UuidV4Slug,
  UuidV4String,
  UuidV7Generator,
  UuidV7BytesSource,
  UuidV7Bytes,
  UuidV7Sentinel,
  UuidV7SentinelDefinition,
  UuidV7Slug,
  UuidV7String,
} from "./types";
export {
  extractUuidV7Timestamp,
  formatUuid,
  formatUuidSlug,
  isUuidSlug,
  isUuidV4Slug,
  isUuidV4String,
  isUuidV7Bytes,
  isUuidV7Slug,
  isUuidV7String,
  isUuidString,
  parseUuid,
  parseUuidSlug,
  slugToUuid,
  uuidToSlug,
} from "./uuid";
export type { SlugAlphabet } from "./uuid";
export { createUuidV7Generator } from "./v7";
export type { UuidV7GeneratorOptions } from "./v7";

/* Keyless operations stay module-level and avoid codec setup. Masking and sentinels stay on the
 * codec because their meaning depends on its seed and sentinel table. */
export {
  uuidV4,
  uuidV4Bytes,
  uuidV4Slug,
  uuidV7,
  uuidV7At,
  uuidV7Bytes,
  uuidV7BytesAt,
  uuidV7Slug,
} from "./keyless";
