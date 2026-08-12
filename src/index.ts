// SPDX-License-Identifier: Apache-2.0

export { BASE32HEX, BASE64URL } from "./alphabet";
export type { Alphabet } from "./alphabet";
export { decodeBase64Url, encodeBase64Url, isBase64Url } from "./base64url";
export {
  UUID_V7_SENTINEL_DEFINITIONS,
  createUuidSlugCodec,
  defaultCodec,
  validateMaskedUuidV7SlugFresh,
  validateUuidV7Fresh,
  validateUuidV7SlugFresh,
} from "./codec";
export { UUID_SLUG_ERROR_CODES, UuidRuntimeError, UuidSlugError } from "./errors";
export { DEFAULT_MASK_SCHEMA, createMaskSchema } from "./schema";
export type {
  Base64UrlString,
  FreshValidationOptions,
  MaskSchema,
  MaskSchemaOptions,
  MaskedUuidSlug,
  MaskedUuidV7Slug,
  PublicUuidV7Slug,
  SentinelUuidV7Slug,
  UuidBytes,
  UuidSlug,
  UuidSlugCodec,
  UuidSlugCodecOptions,
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
export { createRuntimeGenerator, createUuidV7Generator } from "./v7";

import { defaultCodec } from "./codec";

export const uuidV4 = defaultCodec.uuidV4;
export const uuidV7 = defaultCodec.uuidV7;
export const uuidV4Bytes = defaultCodec.uuidV4Bytes;
export const uuidV7Bytes = defaultCodec.uuidV7Bytes;
export const uuidV7At = defaultCodec.uuidV7At;
export const uuidV7BytesAt = defaultCodec.uuidV7BytesAt;
export const uuidV4Slug = defaultCodec.uuidV4Slug;
export const uuidV7Slug = defaultCodec.uuidV7Slug;
export const uuidV7MaskedSlug = defaultCodec.uuidV7MaskedSlug;
export const uuidV7ToMaskedSlug = defaultCodec.uuidV7ToMaskedSlug;
export const maskedSlugToUuid = defaultCodec.maskedSlugToUuid;
export const maskedSlugToUuidV7 = defaultCodec.maskedSlugToUuidV7;
export const UUID_V7_SENTINELS = defaultCodec.sentinels;
