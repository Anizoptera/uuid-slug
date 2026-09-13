// SPDX-License-Identifier: Apache-2.0

const ERROR_CODES = [
  "aborted",
  "invalid_base32",
  "invalid_base64url",
  "invalid_buffer",
  "invalid_mask_schema",
  "invalid_options",
  "invalid_sentinel",
  "invalid_timestamp",
  "invalid_uuid",
  "invalid_uuid_slug",
  "invalid_uuid_version",
  "rng_unavailable",
  "timestamp_outside_window",
] as const;

/** All stable `UuidSlugError.code` values, for validation and exhaustive handlers. */
export const UUID_SLUG_ERROR_CODES: typeof ERROR_CODES = /*#__PURE__*/ Object.freeze(ERROR_CODES);

/** One stable `UuidSlugError.code`; branch on this value and use `message` for diagnostics. */
export type UuidSlugErrorCode = (typeof UUID_SLUG_ERROR_CODES)[number];

const ERROR_CODE_SET: ReadonlySet<unknown> = /*#__PURE__*/ new Set(UUID_SLUG_ERROR_CODES);

const typedArrayTagDescriptor = /*#__PURE__*/ Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(Uint8Array.prototype) as object,
  Symbol.toStringTag,
);

/**
 * An expected failure returned by package operations. Branch on `code`; `message` explains the
 * failed input or operation, and `cause` retains an underlying runtime or callback failure.
 */
export class UuidSlugError extends Error {
  /** Stable recovery category; use `message` and `cause` for diagnostics. */
  readonly code: UuidSlugErrorCode;

  /**
   * Create an expected package error.
   *
   * @param code - Stable recovery category.
   * @param message - Input- or operation-specific diagnostic.
   * @param options - Standard error options; use `cause` to retain the underlying failure.
   */
  constructor(code: UuidSlugErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "UuidSlugError";
    this.code = code;
  }
}

/**
 * Narrow a returned value to `UuidSlugError`, including errors from another realm or package copy.
 * This checks the public error shape and code; it does not authenticate untrusted data.
 */
export function isUuidSlugError(value: unknown): value is UuidSlugError {
  if (typeof value !== "object" || value === null) return false;
  try {
    return (
      Object.prototype.toString.call(value) === "[object Error]" &&
      Reflect.get(value, "name") === "UuidSlugError" &&
      ERROR_CODE_SET.has(Reflect.get(value, "code"))
    );
  } catch {
    return false;
  }
}

/** Use fast local identity, then an unspoofable intrinsic brand for cross-realm Uint8Array values. */
/*#__NO_SIDE_EFFECTS__*/
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
/*#__NO_SIDE_EFFECTS__*/
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
/*#__NO_SIDE_EFFECTS__*/
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
export const randomFailure = /* @__NO_SIDE_EFFECTS__ */ (
  value: unknown,
): undefined | UuidSlugError => {
  if (value instanceof UuidSlugError) return value;
  return value instanceof Error
    ? new UuidSlugError("rng_unavailable", "Random byte generation failed.", { cause: value })
    : undefined;
};

export function fillRandomBytes(
  fill: (bytes: Uint8Array<ArrayBuffer>) => unknown,
  bytes: Uint8Array<ArrayBuffer>,
): undefined | UuidSlugError {
  try {
    return randomFailure(fill(bytes));
  } catch (cause) {
    return new UuidSlugError("rng_unavailable", "Random byte generation failed.", { cause });
  }
}

/** Keep both failed implementations inspectable when an optional native shortcut also fails. */
/*#__NO_SIDE_EFFECTS__*/
export function failedFallback(
  nativeCause: unknown,
  fallback: UuidSlugError,
  message: string,
): UuidSlugError {
  return new UuidSlugError(fallback.code, fallback.message, {
    cause: new AggregateError([nativeCause, fallback], message),
  });
}

/**
 * Publish a valid native result without portable work; otherwise run the fallback exactly once.
 * Validation costs one predicate but prevents a fast host shortcut from weakening package output,
 * while aggregating dual failures preserves both causes without exception-driven success control.
 */
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
