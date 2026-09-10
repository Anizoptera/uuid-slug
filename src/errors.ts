// SPDX-License-Identifier: Apache-2.0

/** Consumers can enumerate error codes at runtime without duplicating the type's vocabulary. */
const ERROR_CODES = [
  "aborted",
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

export const UUID_SLUG_ERROR_CODES: typeof ERROR_CODES = Object.freeze(ERROR_CODES);

export type UuidSlugErrorCode = (typeof UUID_SLUG_ERROR_CODES)[number];

const ERROR_CODE_SET: ReadonlySet<unknown> = new Set(ERROR_CODES);

export class UuidSlugError extends Error {
  readonly code: UuidSlugErrorCode;

  constructor(code: UuidSlugErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "UuidSlugError";
    this.code = code;
  }
}

/** Recognize package errors across realms and duplicate package copies without trusting them. */
export function isUuidSlugError(value: unknown): value is UuidSlugError {
  if (typeof value !== "object" || value === null) return false;
  try {
    // instanceof can invoke a proxy's prototype trap, just like the property reads below.
    if (value instanceof UuidSlugError) return ERROR_CODE_SET.has(Reflect.get(value, "code"));
    return (
      Object.prototype.toString.call(value) === "[object Error]" &&
      (Reflect.get(value, "name") === "UuidSlugError" ||
        Reflect.get(value, "name") === "UuidRuntimeError") &&
      ERROR_CODE_SET.has(Reflect.get(value, "code"))
    );
  } catch {
    return false;
  }
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
): undefined | UuidSlugError {
  try {
    fill(bytes);
    return undefined;
  } catch (cause) {
    return new UuidSlugError("rng_unavailable", "Random byte generation failed.", { cause });
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
