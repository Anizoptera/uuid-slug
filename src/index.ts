// SPDX-License-Identifier: Apache-2.0

export { createUuidV7SlugCodec } from "./codec.ts";
export { validateUuidV7Timestamp } from "./timestamp.ts";
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
export { SEEDED_MASK_FORMAT, DIRECT_SLUG_FORMAT, FIXED_MASK_FORMAT } from "./types.ts";
export type {
  AsyncUuidV7MaskOptions,
  CustomUuidV7MaskOptions,
  GeneratedUuidV7,
  UuidV7TimestampWindow,
  UuidV7Mask,
  UuidV7MaskOptions,
  UuidSlugMigrationFormat,
  MaskedUuidV7Slug,
  UuidV7CodecSlug,
  SentinelUuidV7Slug,
  UuidBytes,
  UuidV4Bytes,
  DirectUuidSlug,
  UuidSlugMigrationDecoder,
  UuidSlugMigrationOptions,
  UuidString,
  DirectUuidV4Slug,
  UuidV4String,
  UuidV7Generator,
  UuidV7SlugCodec,
  UuidV7SlugCodecOptions,
  UuidV7Bytes,
  UuidV7Sentinel,
  UuidV7SentinelConfig,
  DirectUuidV7Slug,
  UuidV7String,
} from "./types.ts";
export {
  bytesToUuidString,
  isUuidBytes,
  isUuidV4Bytes,
  isUuidV4String,
  isUuidV7Bytes,
  isUuidV7String,
  isUuidString,
  uuidStringToBytes,
} from "./uuid.ts";
export {
  uuidBytesToDirectSlug,
  extractUuidV7UnixMs,
  isDirectUuidSlug,
  isDirectUuidV4Slug,
  isDirectUuidV7Slug,
  slugToUuidBytes,
  slugToUuidString,
  uuidStringToDirectSlug,
  validateDirectUuidV7SlugUnixMs,
} from "./slug.ts";
export type { SlugAlphabet } from "./slug.ts";
export { createUuidV7Generator } from "./keyless.ts";
export type { UuidV7GeneratorOptions } from "./keyless.ts";

/* Keyless operations stay module-level and avoid codec setup. Masking and sentinels stay on the
 * codec because their meaning depends on its seed and sentinel table. */
export {
  generateUuidV4,
  generateUuidV4Bytes,
  generateDirectUuidV4Slug,
  generateUuidV7,
  generateUuidV7AtUnixMs,
  generateUuidV7Bytes,
  generateUuidV7BytesAtUnixMs,
  generateDirectUuidV7Slug,
  generateUuidV7WithDirectSlug,
} from "./keyless.ts";
