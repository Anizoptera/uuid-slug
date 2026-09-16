// SPDX-License-Identifier: Apache-2.0

/** The operation was cancelled through its `AbortSignal`. */
export const ABORTED = "aborted";
/** The input is not a canonical base32hex UUID slug. */
export const INVALID_BASE32HEX = "invalid_base32hex";
/** The input is not a canonical base64url UUID slug. */
export const INVALID_BASE64URL = "invalid_base64url";
/** A byte buffer or offset cannot satisfy the requested operation. */
export const INVALID_BUFFER = "invalid_buffer";
/** A mask is missing, malformed, or failed its reversible transform. */
export const INVALID_MASK = "invalid_mask";
/** An options object or one of its values is invalid. */
export const INVALID_OPTIONS = "invalid_options";
/** A sentinel definition is invalid or conflicts with another sentinel. */
export const INVALID_SENTINEL = "invalid_sentinel";
/** A timestamp is invalid or outside the selected operation's range. */
export const INVALID_TIMESTAMP = "invalid_timestamp";
/** The input is not valid UUID text or a valid UUID byte payload. */
export const INVALID_UUID = "invalid_uuid";
/** The input is not a canonical plain or codec-owned UUID slug. */
export const INVALID_UUID_SLUG = "invalid_uuid_slug";
/** The UUID version does not satisfy the requested operation. */
export const INVALID_UUID_VERSION = "invalid_uuid_version";
/** The runtime could not provide cryptographically secure random bytes. */
export const RNG_UNAVAILABLE = "rng_unavailable";
/** The UUIDv7 timestamp falls outside the caller's validation window. */
export const TIMESTAMP_OUTSIDE_WINDOW = "timestamp_outside_window";

/** One stable `UuidSlugError.code`; branch on this value and use `message` for diagnostics. */
export type UuidSlugErrorCode =
  | typeof ABORTED
  | typeof INVALID_BASE32HEX
  | typeof INVALID_BASE64URL
  | typeof INVALID_BUFFER
  | typeof INVALID_MASK
  | typeof INVALID_OPTIONS
  | typeof INVALID_SENTINEL
  | typeof INVALID_TIMESTAMP
  | typeof INVALID_UUID
  | typeof INVALID_UUID_SLUG
  | typeof INVALID_UUID_VERSION
  | typeof RNG_UNAVAILABLE
  | typeof TIMESTAMP_OUTSIDE_WINDOW;

export const ERROR_CODES: readonly UuidSlugErrorCode[] = /*#__PURE__*/ Object.freeze([
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
]);

const ERROR_CODE_SET: ReadonlySet<unknown> = /*#__PURE__*/ new Set(ERROR_CODES);
const ERROR_NAME = "UuidSlugError";
const ERROR_MARKER = "__failure";
const OBJECT_TYPE = "object";
const ERROR_TAG = "[object Error]";
const BYTE_LENGTH_PROPERTY = "byteLength";
const BUFFER_TYPE_MESSAGE = "Buffer must be a Uint8Array.";
const RANDOM_FAILURE_MESSAGE = "Random byte generation failed.";
const nativeIsError = (Error as { isError?: (value: unknown) => boolean }).isError;

const typedArrayTagDescriptor = /*#__PURE__*/ Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(Uint8Array.prototype) as object,
  Symbol.toStringTag,
);
const dataViewByteLengthDescriptor = /*#__PURE__*/ Object.getOwnPropertyDescriptor(
  DataView.prototype,
  BYTE_LENGTH_PROPERTY,
);
const dataViewByteOffsetDescriptor = /*#__PURE__*/ Object.getOwnPropertyDescriptor(
  DataView.prototype,
  "byteOffset",
);
const dataViewBufferDescriptor = /*#__PURE__*/ Object.getOwnPropertyDescriptor(
  DataView.prototype,
  "buffer",
);
const arrayBufferByteLengthDescriptor = /*#__PURE__*/ Object.getOwnPropertyDescriptor(
  ArrayBuffer.prototype,
  BYTE_LENGTH_PROPERTY,
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

// Keep local identity before the costlier cross-realm capability, but isolate the probes: a proxy
// that blocks one operation must not suppress a later independent one. Remeasure if Error branding
// or inlining changes in a supported engine; results and statistical limits live in PERFORMANCE.md.
/*#__NO_SIDE_EFFECTS__*/
function hasErrorBrand(candidate: object): boolean {
  try {
    if (candidate instanceof Error) return true;
  } catch {
    // A proxy may block local identity while a native cross-realm check can still recognize it.
  }
  try {
    return nativeIsError
      ? nativeIsError(candidate)
      : Object.prototype.toString.call(candidate) === ERROR_TAG;
  } catch {
    return false;
  }
}

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
  } catch {
    // A hostile marker does not suppress the independent Error-brand fallback.
  }
  if (!hasErrorBrand(candidate)) return false;
  try {
    return (
      Reflect.get(candidate, "name") === ERROR_NAME &&
      ERROR_CODE_SET.has(Reflect.get(candidate, "code"))
    );
  } catch {
    return false;
  }
}

/**
 * Universal conversions otherwise recognize the same local bytes before and after dispatch. Keep
 * this shortcut exact; views and cross-realm arrays need the general path. Remeasure if dispatch
 * stops repeating byte recognition.
 */
/*#__NO_SIDE_EFFECTS__*/
export function exactLocalUuidBytes(value: unknown): Uint8Array | undefined {
  try {
    return value instanceof Uint8Array && value.length === 16 ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Recognize local Errors first, then use native or portable cross-realm recognition. */
/*#__NO_SIDE_EFFECTS__*/
export function isError(value: unknown): value is Error {
  if (typeof value !== OBJECT_TYPE || value === null) return false;
  return hasErrorBrand(value as object);
}

/** Read primitive or genuine boxed text without invoking caller-defined coercion hooks. */
/*#__NO_SIDE_EFFECTS__*/
export function stringInput(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value !== "object" || value === null) return undefined;
  try {
    return String.prototype.valueOf.call(value);
  } catch {
    return undefined;
  }
}

/** Normalize UUID string input while preserving a preceding package failure. */
export function normalizeUuidStringInput(value: unknown): string | UuidSlugError {
  if (typeof value === "string") return value;
  if (isUuidSlugError(value)) return value;
  return stringInput(value) ?? invalidUuidStringInput(value);
}

/** Normalize slug input while preserving a preceding package failure. */
export function normalizeUuidSlugInput(value: unknown): string | UuidSlugError {
  if (typeof value === "string") return value;
  if (isUuidSlugError(value)) return value;
  return stringInput(value) ?? invalidUuidSlugInput(value);
}

/** Use fast local identity, then an unspoofable intrinsic brand for cross-realm Uint8Array values. */
/*#__NO_SIDE_EFFECTS__*/
export function isUint8Array(value: unknown): value is Uint8Array {
  return (
    ArrayBuffer.isView(value) &&
    (value instanceof Uint8Array || typedArrayTagDescriptor?.get?.call(value) === "Uint8Array")
  );
}

/** Borrow bytes from supported local or cross-realm input without copying or accepting other views. */
export function uuidByteView(value: unknown): Uint8Array | undefined {
  if (isUint8Array(value)) return value;
  try {
    if (ArrayBuffer.isView(value) && dataViewByteLengthDescriptor?.get?.call(value) !== undefined) {
      return new Uint8Array(
        dataViewBufferDescriptor?.get?.call(value) as ArrayBuffer,
        dataViewByteOffsetDescriptor?.get?.call(value) as number,
        dataViewByteLengthDescriptor.get.call(value) as number,
      );
    }
    if (arrayBufferByteLengthDescriptor?.get?.call(value) !== undefined)
      return new Uint8Array(value as ArrayBuffer);
  } catch {
    // Detached buffers and hostile objects are invalid byte inputs.
  }
  return undefined;
}

/** Return the first unsupported enumerable own string key in a package-owned options object. */
/*#__NO_SIDE_EFFECTS__*/
export function findUnknownOption(
  options: object,
  accepted: Readonly<Record<string, true>>,
): string | undefined {
  for (const option of Object.keys(options)) if (!Object.hasOwn(accepted, option)) return option;
  return undefined;
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

/** Preserve a preceding failure or reject an untyped value that is not UUID text. */
/*#__NO_SIDE_EFFECTS__*/
export function invalidUuidStringInput(value: unknown): UuidSlugError {
  return isUuidSlugError(value) ? value : new UuidSlugError(INVALID_UUID, "UUID must be text.");
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
