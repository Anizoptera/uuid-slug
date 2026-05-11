export type UuidSlugErrorCode =
  | "invalid_base64url"
  | "invalid_buffer"
  | "invalid_mask_schema"
  | "invalid_uuid"
  | "invalid_uuid_slug"
  | "invalid_uuid_version"
  | "rng_unavailable"
  | "stale_uuid";

export class UuidSlugError extends Error {
  readonly code: UuidSlugErrorCode;

  constructor(
    code: UuidSlugErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
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
