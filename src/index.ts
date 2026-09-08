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
/**
 * `createRuntimeGenerator` is NOT exported (Art's ruling, 2026-08-12), pending the whole-API-shape
 * review. It takes a `Runtime`, which is not exported either, so no consumer could construct an
 * argument for it — a public function nobody could call. The capability it provides is already
 * applied: every codec built without an explicit `generator` gets one.
 */
export { createUuidV7Generator } from "./v7";
export type { UuidV7GeneratorOptions } from "./v7";

/*
 * The keyless shortcuts. They come from `keyless.ts`, which builds them from a bare generator and
 * never touches a codec — see that file for the measured cost of the alternative. They were once
 * bound here as `export const uuidV7 = defaultCodec.uuidV7`, and that spelling is the defect: a
 * property read at module scope evaluates the singleton, so every consumer of ANY export in this
 * barrel carried the cipher, the mask schema and the sentinel table whether or not it masked.
 *
 * The MASKED methods are deliberately absent, and must stay absent (Art's ruling, 2026-08-12).
 * Everything below is keyless — the same value whoever calls it — so a bare function is an honest
 * shape for it. Masking is keyed, and the only key a bare function could carry is `defaultCodec`'s,
 * which is derived from a seed published in this package's source. Exported that way, the
 * easiest-to-reach spelling of the headline feature was the one that obfuscates nothing, and a
 * README paragraph was the only thing standing between a caller and it.
 *
 * Reach masking through a codec you built with your own seed: `createUuidSlugCodec({ mask: {
 * seed } })`. Sentinels went with them for the same reason — a sentinel exists to be matched
 * against masked input, so a sentinel list has no meaning apart from the codec that masks.
 */
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
