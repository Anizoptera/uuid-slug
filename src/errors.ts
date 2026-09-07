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

/**
 * The bridge from this package's `Error | T` return convention to the generator convention, where
 * a failure throws. Shared rather than repeated because every module that has both conventions
 * meeting in it needs exactly this, and a local copy is one `instanceof` away from being written
 * as a truthiness test that swallows a legitimate falsy result.
 */
export function errorOrThrow<T>(value: UuidSlugError | T): T {
  if (value instanceof Error) throw value;
  return value;
}

/**
 * The one range check for every entry point that reads or writes a caller's buffer at an offset.
 *
 * `Number.isInteger` is the load-bearing half and the reason this is shared rather than repeated.
 * The obvious spelling — `offset < 0 || offset + need > capacity` — passes a fractional or
 * NaN offset, because both of its comparisons are false for NaN and neither notices `0.5`. What
 * follows is worse than a wrong answer: `bytes[0.5] = x` is not a store, so the write SILENTLY does
 * nothing while the guard reports success, and an id can come back half-written with the caller's
 * stale bytes in the rest of it. A string offset defeats the same test from the other side, by
 * concatenation: `"4" + 16` is `"416"`, which is not greater than any plausible length.
 *
 * Seven near-identical copies of that test existed across this package and not one checked
 * integrality — the copying is why. One copy is what stops the class returning.
 */
export function checkRange(
  capacity: number,
  offset: number,
  need: number,
): undefined | UuidSlugError {
  if (!Number.isInteger(offset))
    return new UuidSlugError(
      "invalid_buffer",
      `Buffer offset must be a whole number, got ${typeof offset} ${String(offset)}.`,
    );
  if (offset < 0 || offset + need > capacity)
    return new UuidSlugError(
      "invalid_buffer",
      `Buffer needs ${need} bytes at offset ${offset}, but holds ${capacity}.`,
    );
  return undefined;
}

/** Preserve failures from an injected or platform entropy source without changing successful draws. */
export function fillRandomBytes(
  fill: (bytes: Uint8Array<ArrayBuffer>) => void,
  bytes: Uint8Array<ArrayBuffer>,
): UuidRuntimeError | undefined {
  try {
    fill(bytes);
    return undefined;
  } catch (cause) {
    return new UuidRuntimeError("Random byte generation failed.", { cause });
  }
}

/** Read once so a failing clock keeps its original cause and successful clocks have one observation. */
export function readClock(clock: () => number): number | UuidSlugError {
  try {
    return clock();
  } catch (cause) {
    return new UuidSlugError("invalid_timestamp", "Clock reading failed.", { cause });
  }
}
