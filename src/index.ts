// SPDX-License-Identifier: Apache-2.0

export { decodeBase64Url, encodeBase64Url, isBase64Url } from "./base64url";
export {
  UUID_V7_SENTINEL_DEFINITIONS,
  createUuidSlugCodec,
  defaultCodec,
  validateUuidV7Fresh,
  validateUuidV7SlugFresh,
} from "./codec";
export { UUID_SLUG_ERROR_CODES, UuidRuntimeError, UuidSlugError } from "./errors";
/**
 * Exported because `UuidSlugError.code` is public and the README tells consumers to branch on it.
 * The type was emitted into the declarations and left out of the export list, so the property had
 * a type no consumer could name — a switch over it could not be written without restating the
 * literals by hand, which is exactly the duplication `UUID_SLUG_ERROR_CODES` exists to prevent.
 */
export type { UuidSlugErrorCode } from "./errors";
export { DEFAULT_MASK_SCHEMA, createMaskSchema, createMaskSchemaAsync } from "./schema";
export type {
  AsyncMaskSchemaOptions,
  Base64UrlString,
  FreshValidationOptions,
  MaskSchema,
  MaskSchemaOptions,
  MigrationFormat,
  MaskedUuidSlug,
  MaskedUuidV7Slug,
  PublicUuidV7Slug,
  SentinelUuidV7Slug,
  UuidBytes,
  UuidSlug,
  UuidSlugCodec,
  UuidSlugCodecOptions,
  UuidSlugMigration,
  UuidSlugMigrationOptions,
  UuidString,
  UuidV4Slug,
  UuidV4String,
  UuidV7Generator,
  UuidV7Sentinel,
  UuidV7SentinelDefinition,
  UuidV7Slug,
  UuidV7String,
} from "./types";
export {
  extractUuidV7Timestamp,
  formatUuid,
  formatUuidSlug,
  hasUuidV7Entropy,
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
/** Runtime selection is internal; codecs create the matching generator when none is supplied. */
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
