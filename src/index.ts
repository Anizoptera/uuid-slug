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
export type { SlugAlphabet } from "./uuid";
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

/*
 * The MASKED methods are deliberately absent from this list, and must stay absent (Art's ruling,
 * 2026-08-12). Everything bound above is keyless — the same value whoever calls it — so a bare
 * function is an honest shape for it. Masking is keyed, and the only key a bare function could
 * carry is `defaultCodec`'s, which is derived from a seed published in this package's source.
 * Exported that way, the easiest-to-reach spelling of the headline feature was the one that
 * obfuscates nothing, and a README paragraph was the only thing standing between a caller and it.
 *
 * Reach masking through a codec you built with your own seed: `createUuidSlugCodec({ mask: {
 * seed } })`. Sentinels went with them for the same reason — a sentinel exists to be matched
 * against masked input, so a sentinel list has no meaning apart from the codec that masks.
 */
