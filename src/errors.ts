// SPDX-License-Identifier: Apache-2.0

/** Stable runtime vocabulary for branching on package failures. */
const ERROR_CODES = [
  "aborted",
  "invalid_base32",
  "invalid_base64url",
  "invalid_buffer",
  "invalid_mask_schema",
  "invalid_sentinel",
  "invalid_timestamp",
  "invalid_uuid",
  "invalid_uuid_slug",
  "invalid_uuid_version",
  "rng_unavailable",
  "timestamp_outside_window",
] as const;

export const UUID_SLUG_ERROR_CODES: typeof ERROR_CODES = Object.freeze(ERROR_CODES);

/** A stable recovery code carried by every `UuidSlugError`. */
export type UuidSlugErrorCode = (typeof UUID_SLUG_ERROR_CODES)[number];

const ERROR_CODE_SET: ReadonlySet<unknown> = new Set(UUID_SLUG_ERROR_CODES);

const typedArrayTagDescriptor = Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(Uint8Array.prototype) as object,
  Symbol.toStringTag,
);

/** Expected package failure with a stable code and an optional original cause. */
export class UuidSlugError extends Error {
  /** Stable recovery category; use `message` and `cause` for diagnostics. */
  readonly code: UuidSlugErrorCode;

  constructor(code: UuidSlugErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "UuidSlugError";
    this.code = code;
  }
}

/** Classify package errors across realms and duplicate copies; this does not authenticate input. */
export function isUuidSlugError(value: unknown): value is UuidSlugError {
  if (typeof value !== "object" || value === null) return false;
  try {
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

/** Return the exact success value or throw a recognized package error unchanged. */
export function unwrapUuidSlug<Value>(value: Value): Exclude<Value, UuidSlugError> {
  if (isUuidSlugError(value)) throw value;
  return value as Exclude<Value, UuidSlugError>;
}

/** Use fast local identity, then an unspoofable intrinsic brand for cross-realm Uint8Array values. */
export function isUint8Array(value: unknown): value is Uint8Array {
  return (
    ArrayBuffer.isView(value) &&
    (value instanceof Uint8Array || typedArrayTagDescriptor?.get?.call(value) === "Uint8Array")
  );
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

/** Reject alien views and objects before range checks can mistake them for byte storage. */
export function checkByteRange(
  bytes: unknown,
  offset: number,
  need: number,
): undefined | UuidSlugError {
  if (!isUint8Array(bytes))
    return new UuidSlugError("invalid_buffer", "Buffer must be a Uint8Array.");
  return checkRange(bytes.length, offset, need);
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

/** Keep both failed implementations inspectable when an optional native shortcut also fails. */
export function failedFallback(
  nativeCause: unknown,
  fallback: UuidSlugError,
  message: string,
): UuidSlugError {
  return new UuidSlugError(fallback.code, fallback.message, {
    cause: new AggregateError([nativeCause, fallback], message),
  });
}

/** Publish a native result only after validating it, otherwise preserve portable fallback errors. */
export function nativeOrFallback<Native, Result>(
  native: () => unknown,
  accepts: (value: unknown) => value is Native,
  use: (value: Native) => Result,
  fallback: () => Result | UuidSlugError,
  operation: string,
): Result | UuidSlugError {
  let nativeCause: unknown;
  try {
    const value = native();
    if (accepts(value)) return use(value);
    nativeCause = new TypeError(`Native ${operation} returned an invalid value.`);
  } catch (cause) {
    nativeCause = cause;
  }
  const result = fallback();
  return result instanceof Error
    ? failedFallback(nativeCause, result, `Native and portable ${operation} failed.`)
    : result;
}

/** Read once so a failing clock keeps its original cause and successful clocks have one observation. */
export function readClock(clock: () => number): number | UuidSlugError {
  try {
    return clock();
  } catch (cause) {
    return new UuidSlugError("invalid_timestamp", "Clock reading failed.", { cause });
  }
}
