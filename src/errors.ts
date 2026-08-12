// SPDX-License-Identifier: Apache-2.0

/**
 * An array rather than a bare union, so the set of codes exists at runtime and can be checked
 * against. A union alone is invisible after compilation, which is how the README came to document
 * eight of the ten: nothing could compare the two, and reading both is not a check. Consumers also
 * get an exhaustive list to validate or switch over without restating it.
 */
export const UUID_SLUG_ERROR_CODES = [
  "invalid_base32",
  "invalid_base64url",
  "invalid_buffer",
  "invalid_mask_schema",
  "invalid_timestamp",
  "invalid_uuid",
  "invalid_uuid_slug",
  "invalid_uuid_version",
  "rng_unavailable",
  "stale_uuid",
] as const;

export type UuidSlugErrorCode = (typeof UUID_SLUG_ERROR_CODES)[number];

export class UuidSlugError extends Error {
  readonly code: UuidSlugErrorCode;

  constructor(code: UuidSlugErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "UuidSlugError";
    this.code = code;
  }
}

export class UuidRuntimeError extends UuidSlugError {
  constructor(message: string, options?: ErrorOptions) {
    super("rng_unavailable", message, options);
    this.name = "UuidRuntimeError";
  }
}
