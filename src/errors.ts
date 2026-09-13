// SPDX-License-Identifier: Apache-2.0

const ABORTED = "aborted";
const INVALID_BASE32HEX = "invalid_base32hex";
const INVALID_BASE64URL = "invalid_base64url";
const INVALID_BUFFER = "invalid_buffer";
const INVALID_MASK = "invalid_mask";
const INVALID_OPTIONS = "invalid_options";
const INVALID_SENTINEL = "invalid_sentinel";
const INVALID_TIMESTAMP = "invalid_timestamp";
const INVALID_UUID = "invalid_uuid";
const INVALID_UUID_SLUG = "invalid_uuid_slug";
const INVALID_UUID_VERSION = "invalid_uuid_version";
const RNG_UNAVAILABLE = "rng_unavailable";
const TIMESTAMP_OUTSIDE_WINDOW = "timestamp_outside_window";

const ERROR_CODES = [
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
] as const;

/** All stable `UuidSlugError.code` values, for validation and exhaustive handlers. */
export const UUID_SLUG_ERROR_CODES: readonly [
  "aborted",
  "invalid_base32hex",
  "invalid_base64url",
  "invalid_buffer",
  "invalid_mask",
  "invalid_options",
  "invalid_sentinel",
  "invalid_timestamp",
  "invalid_uuid",
  "invalid_uuid_slug",
  "invalid_uuid_version",
  "rng_unavailable",
  "timestamp_outside_window",
] = /*#__PURE__*/ Object.freeze(ERROR_CODES);

/** One stable `UuidSlugError.code`; branch on this value and use `message` for diagnostics. */
export type UuidSlugErrorCode = (typeof UUID_SLUG_ERROR_CODES)[number];

const ERROR_CODE_SET: ReadonlySet<unknown> = /*#__PURE__*/ new Set(UUID_SLUG_ERROR_CODES);
const ERROR_NAME = "UuidSlugError";
const ERROR_MARKER = "__failure";
const OBJECT_TYPE = "object";
const ERROR_TAG = "[object Error]";
const BUFFER_TYPE_MESSAGE = "Buffer must be a Uint8Array.";
const RANDOM_FAILURE_MESSAGE = "Random byte generation failed.";
const nativeIsError = (Error as { isError?: (value: unknown) => boolean }).isError;

const typedArrayTagDescriptor = /*#__PURE__*/ Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(Uint8Array.prototype) as object,
  Symbol.toStringTag,
);

/**
 * An expected failure returned by package operations. Branch on `code`; `message` explains the
 * failed input or operation, and `cause` retains an underlying runtime or callback failure.
 */
export class UuidSlugError extends Error {
  /** Stable cross-realm marker used by `isUuidSlugError` and composable package operations. */
  declare readonly __failure: true;
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
    this.name = ERROR_NAME;
    this.code = code;
  }
}

// One immutable prototype property avoids adding storage to every error while preserving the same
// marker across realms and duplicate package copies. Remeasure if supported engines change their
// prototype-property access or Error layout; benchmark evidence belongs in bench/PERFORMANCE.md.
Object.defineProperty(UuidSlugError.prototype, ERROR_MARKER, { value: true });

/**
 * Narrow a returned value to `UuidSlugError`, including errors from another realm or package copy.
 * The package marker is the primary protocol. Existing unmarked package errors use local Error
 * identity before native or portable cross-realm recognition. This does not authenticate data.
 */
/*#__NO_SIDE_EFFECTS__*/
export function isUuidSlugError(value: unknown): value is UuidSlugError {
  if (typeof value !== OBJECT_TYPE || value === null) return false;
  const candidate = value as object;
  try {
    if ((candidate as { readonly __failure?: unknown })[ERROR_MARKER] === true) return true;
    // Local identity avoids the costlier cross-realm primitive for the common unmarked Error case;
    // the second branch retains duplicate-package and realm compatibility.
    const recognizedError =
      candidate instanceof Error ||
      (nativeIsError
        ? nativeIsError(candidate)
        : Object.prototype.toString.call(candidate) === ERROR_TAG);
    return (
      recognizedError &&
      Reflect.get(candidate, "name") === ERROR_NAME &&
      ERROR_CODE_SET.has(Reflect.get(candidate, "code"))
    );
  } catch {
    return false;
  }
}

/** Recognize local Errors first, then use native or portable cross-realm recognition. */
/*#__NO_SIDE_EFFECTS__*/
export function isError(value: unknown): value is Error {
  if (typeof value !== OBJECT_TYPE || value === null) return false;
  const candidate = value as object;
  try {
    return (
      candidate instanceof Error ||
      (nativeIsError
        ? nativeIsError(candidate)
        : Object.prototype.toString.call(candidate) === ERROR_TAG)
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
      INVALID_BUFFER,
      `Buffer offset must be a whole number, got ${typeof offset} ${String(offset)}.`,
    );
  if (offset < 0 || offset + need > capacity)
    return new UuidSlugError(
      INVALID_BUFFER,
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
  if (!isUint8Array(bytes)) {
    if (isUuidSlugError(bytes)) return bytes;
    return new UuidSlugError(INVALID_BUFFER, BUFFER_TYPE_MESSAGE);
  }
  return checkRange(bytes.length, offset, need);
}

/** Return an existing package failure or explain why a value cannot be used as byte storage. */
/*#__NO_SIDE_EFFECTS__*/
export function invalidByteInput(value: unknown): UuidSlugError {
  return isUuidSlugError(value) ? value : new UuidSlugError(INVALID_BUFFER, BUFFER_TYPE_MESSAGE);
}

/** Preserve a preceding failure or reject an untyped value that is not UUID text. */
/*#__NO_SIDE_EFFECTS__*/
export function invalidUuidStringInput(value: unknown): UuidSlugError {
  return isUuidSlugError(value)
    ? value
    : new UuidSlugError(INVALID_UUID, "UUID must be canonical text.");
}

/** Preserve a preceding failure or reject an untyped value that is not a UUID slug. */
/*#__NO_SIDE_EFFECTS__*/
export function invalidUuidSlugInput(value: unknown): UuidSlugError {
  return isUuidSlugError(value)
    ? value
    : new UuidSlugError(INVALID_UUID_SLUG, "UUID slug must be a string.");
}

/** Preserve failures from an injected or platform entropy source without changing successful draws. */
export const randomFailure = /* @__NO_SIDE_EFFECTS__ */ (
  value: unknown,
): undefined | UuidSlugError => {
  if (value === undefined) return undefined;
  if (isUuidSlugError(value)) return value;
  return isError(value)
    ? new UuidSlugError(RNG_UNAVAILABLE, RANDOM_FAILURE_MESSAGE, { cause: value })
    : undefined;
};

export function fillRandomBytes(
  fill: (bytes: Uint8Array<ArrayBuffer>) => unknown,
  bytes: Uint8Array<ArrayBuffer>,
): undefined | UuidSlugError {
  try {
    return randomFailure(fill(bytes));
  } catch (cause) {
    return new UuidSlugError(RNG_UNAVAILABLE, RANDOM_FAILURE_MESSAGE, { cause });
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
    return new UuidSlugError(INVALID_TIMESTAMP, "Clock reading failed.", { cause });
  }
}
