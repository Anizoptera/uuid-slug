// SPDX-License-Identifier: Apache-2.0

import { checkByteRange, checkRange, fillRandomBytes, readClock, UuidSlugError } from "./errors";
import type { UuidV7Bytes, UuidV7Generator, UuidV7String } from "./types";
import { formatUuid } from "./uuid";
import type { Runtime } from "./runtime/types";

export interface UuidV7GeneratorOptions {
  readonly clock?: () => number;
  readonly fillRandom: (bytes: Uint8Array<ArrayBuffer>) => void;
}

function writeTimestamp(bytes: Uint8Array, ms: number, offset: number) {
  let value = Math.trunc(ms);
  for (let i = 5; i >= 0; i -= 1) {
    bytes[offset + i] = value & 0xff;
    value = Math.floor(value / 256);
  }
}

/**
 * Writes the 42-bit sequence RFC 9562 §6.2 allows in `rand_a` plus the top of `rand_b`, along
 * with the version and variant bits that bracket it.
 *
 * The sequence is carried as a 10-bit high half and a 32-bit low half rather than one 42-bit
 * BigInt, so every operation here is a 32-bit integer op the JIT emits directly. Measured on the
 * increment-and-write step alone: 9.99M ops/s (Bun) and 11.8M (Node) as a BigInt, against 252M
 * and 149M in this form. The bit layout is unchanged, so the ids are identical either way.
 */
function writeCounter(bytes: Uint8Array, hi: number, lo: number, offset: number) {
  bytes[offset + 6] = 0x70 | ((hi >>> 6) & 0x0f);
  bytes[offset + 7] = (((hi & 0x3f) << 2) | (lo >>> 30)) & 0xff;
  bytes[offset + 8] = 0x80 | ((lo >>> 24) & 0x3f);
  bytes[offset + 9] = (lo >>> 16) & 0xff;
  bytes[offset + 10] = (lo >>> 8) & 0xff;
  bytes[offset + 11] = lo & 0xff;
}

/** The 48 bits RFC 9562 gives the timestamp; beyond it the value cannot be represented. */
const MAX_TIMESTAMP = 0xffff_ffff_ffff;

/** Reject fractions and out-of-range values before runtime-specific generators can coerce them. */
const isValidUuidV7Timestamp = (ms: number): boolean =>
  Number.isInteger(ms) && ms >= 0 && ms <= MAX_TIMESTAMP;

/**
 * The one check and the one message for a caller-supplied instant. Both the portable generator and
 * the runtime-backed one call it, and the runtime-backed one calls it BEFORE delegating: a native
 * generator may accept what we reject and answer wrongly rather than fail.
 */
const rejectInstant = (ms: number): undefined | UuidSlugError =>
  isValidUuidV7Timestamp(ms)
    ? undefined
    : new UuidSlugError(
        "invalid_timestamp",
        `UUIDv7 timestamp must be a whole number of milliseconds in 0..${MAX_TIMESTAMP}.`,
      );

/**
 * Both string forms differ only in where the instant comes from, so the byte-or-error result is
 * carried through here rather than unwrapped twice. The narrowing is an assertion because
 * `formatUuid` is version-agnostic: the v7-ness is established by the caller having produced the
 * bytes, not by anything the formatter can check.
 */
const formatUuidV7 = (result: Uint8Array | UuidSlugError): UuidV7String | UuidSlugError =>
  result instanceof Error ? result : (formatUuid(result) as UuidV7String | UuidSlugError);

/** Keep both failed implementations inspectable when graceful fallback also fails. */
function failedFallback(nativeCause: unknown, fallback: UuidSlugError): UuidSlugError {
  return new UuidSlugError(fallback.code, fallback.message, {
    cause: new AggregateError(
      [nativeCause, fallback],
      "Native and portable UUIDv7 generation failed.",
    ),
  });
}

/**
 * Seeds the sequence from the same six random bytes and the same bit positions as before, split
 * across the two halves: byte 0 and the top 2 bits of byte 1 form the high half, the rest the
 * low half. Starting each millisecond at a random point rather than zero is what stops the
 * sequence leaking how many ids were issued in the previous millisecond.
 */
const seedHi = (bytes: Uint8Array) => (((bytes[0] ?? 0) << 2) | ((bytes[1] ?? 0) >>> 6)) & 0x3ff;

const seedLo = (bytes: Uint8Array) =>
  ((((bytes[1] ?? 0) & 0x3f) << 26) |
    ((bytes[2] ?? 0) << 18) |
    ((bytes[3] ?? 0) << 10) |
    ((bytes[4] ?? 0) << 2) |
    ((bytes[5] ?? 0) & 0x03)) >>>
  0;

export function createUuidV7Generator(options: UuidV7GeneratorOptions): UuidV7Generator {
  if (typeof options !== "object" || options === null || Array.isArray(options))
    throw new TypeError("Generator options must be an object.");
  const clock = options.clock ?? Date.now;
  const fill = options.fillRandom;
  if (typeof clock !== "function") throw new TypeError("Generator clock must be a function.");
  if (typeof fill !== "function") throw new TypeError("Generator fillRandom must be a function.");
  const random = new Uint8Array(16);
  /**
   * Below every timestamp the clock check admits, which is what makes it the uninitialised
   * sentinel rather than a value: `now > lastMs` alone therefore takes the reseed branch on the
   * first call, and no separate "have we started" flag is needed. The coupling is deliberate and
   * is why the clock is validated before this is compared against — an unvalidated clock returning
   * a negative millisecond would make `lastMs` stay below it forever, so the monotonic counter
   * would never be used and every call would reseed.
   */
  let lastMs = -1;
  let counterHi = 0;
  let counterLo = 0;

  function reseed(ms: number) {
    const failed = fillRandomBytes(fill, random);
    if (failed) return failed;
    lastMs = ms;
    counterHi = seedHi(random);
    counterLo = seedLo(random);
    return undefined;
  }

  function writeBytes(
    target: Uint8Array,
    offset: number,
    ms: number,
    sequenceHi: number,
    sequenceLo: number,
  ) {
    writeTimestamp(target, ms, offset);
    writeCounter(target, sequenceHi, sequenceLo, offset);
    for (let i = 12; i < 16; i += 1) target[offset + i] = random[i] as number;
    return target;
  }

  function bytes(out?: Uint8Array, offset = 0): Uint8Array | UuidSlugError {
    const target = out ?? new Uint8Array(16);
    const badRange =
      out === undefined ? checkRange(16, offset, 16) : checkByteRange(out, offset, 16);
    if (badRange) return badRange;
    // Truncated THEN validated, in that order and not the other. A clock is allowed to be
    // fractional — `performance.timeOrigin + performance.now()` is, and is a perfectly good one —
    // so rejecting non-integers here would refuse a legitimate caller, unlike `rejectInstant`,
    // where the fraction is in an argument the caller wrote out. What must not survive is a
    // truncated value the format cannot carry: `writeTimestamp` keeps the low 48 bits of whatever
    // it is handed, so NaN and 2**48 both silently produced the 1970 prefix and a negative
    // millisecond produced the year 10889 by two's-complement wrap. All three now report.
    // The raw reading is kept for the message rather than calling `clock()` again: a second call
    // is a second reading, and the message would name a value other than the one refused.
    const reading = readClock(clock);
    if (reading instanceof Error) return reading;
    const now = typeof reading === "number" ? Math.trunc(reading) : NaN;
    if (typeof reading !== "number" || reading < 0 || !isValidUuidV7Timestamp(now))
      return new UuidSlugError(
        "invalid_timestamp",
        `Clock returned ${String(reading)}, which is not a millisecond in 0..${MAX_TIMESTAMP}.`,
      );
    if (now > lastMs) {
      const failed = reseed(now);
      if (failed) return failed;
    } else {
      const nextLo = (counterLo + 1) >>> 0;
      const nextHi = counterHi + (nextLo === 0 ? 1 : 0);
      // Past 42 bits the sequence no longer fits `rand_a` plus the borrowed `rand_b` bits.
      // Borrowing the next millisecond keeps ids ordered and unique rather than wrapping into
      // values this millisecond has already issued.
      if (nextHi > 0x3ff) {
        // At the ceiling there is no next millisecond to borrow: `writeTimestamp` truncates to
        // six bytes, so `lastMs + 1` wraps to 0 and the generator restarts in 1970 — ordering
        // broken permanently, and silently, from that call onward. Unreachable on a real clock
        // until the year 10889; reachable now from any clock that lands near the ceiling, which
        // is why refusing is not theoretical.
        if (lastMs >= MAX_TIMESTAMP)
          return new UuidSlugError(
            "invalid_timestamp",
            `Sequence exhausted at the last representable millisecond (${MAX_TIMESTAMP}).`,
          );
        const failed = reseed(lastMs + 1);
        if (failed) return failed;
      } else {
        const failed = fillRandomBytes(fill, random);
        if (failed) return failed;
        // Commit only after entropy succeeds; a failed draw must not consume sequence state.
        counterLo = nextLo;
        counterHi = nextHi;
      }
    }
    return writeBytes(target, offset, lastMs, counterHi, counterLo);
  }

  function bytesAt(timestamp: number, out?: Uint8Array, offset = 0): Uint8Array | UuidSlugError {
    const target = out ?? new Uint8Array(16);
    const badRange =
      out === undefined ? checkRange(16, offset, 16) : checkByteRange(out, offset, 16);
    if (badRange) return badRange;
    const invalid = rejectInstant(timestamp);
    if (invalid) return invalid;
    const failed = fillRandomBytes(fill, random);
    if (failed) return failed;
    // A supplied instant takes a random sequence and leaves current-time state untouched.
    return writeBytes(target, offset, timestamp, seedHi(random), seedLo(random));
  }

  function uuidV7Bytes(): UuidV7Bytes | UuidSlugError;
  function uuidV7Bytes<T extends Uint8Array>(out: T, offset?: number): T | UuidSlugError;
  function uuidV7Bytes(out?: Uint8Array, offset?: number): Uint8Array | UuidSlugError {
    return bytes(out, offset);
  }

  function uuidV7BytesAt(timestamp: number): UuidV7Bytes | UuidSlugError;
  function uuidV7BytesAt<T extends Uint8Array>(
    timestamp: number,
    out: T,
    offset?: number,
  ): T | UuidSlugError;
  function uuidV7BytesAt(
    timestamp: number,
    out?: Uint8Array,
    offset?: number,
  ): Uint8Array | UuidSlugError {
    return bytesAt(timestamp, out, offset);
  }

  return {
    uuidV7: () => formatUuidV7(bytes()),
    uuidV7At: (timestamp) => formatUuidV7(bytesAt(timestamp)),
    uuidV7Bytes,
    uuidV7BytesAt,
  };
}

export function createRuntimeGenerator(runtime: Runtime): UuidV7Generator {
  const fallback = createUuidV7Generator({ fillRandom: runtime.fillRandom });
  const fallbackUuidV7Bytes = fallback.uuidV7Bytes as (
    out?: Uint8Array,
    offset?: number,
  ) => Uint8Array | UuidSlugError;
  const fallbackUuidV7BytesAt = fallback.uuidV7BytesAt as (
    timestamp: number,
    out?: Uint8Array,
    offset?: number,
  ) => Uint8Array | UuidSlugError;
  function uuidV7() {
    if (!runtime.uuidV7) return fallback.uuidV7();
    try {
      return runtime.uuidV7();
    } catch (cause) {
      const result = fallback.uuidV7();
      return result instanceof Error ? failedFallback(cause, result) : result;
    }
  }

  function uuidV7Bytes(): UuidV7Bytes | UuidSlugError;
  function uuidV7Bytes<T extends Uint8Array>(out: T, offset?: number): T | UuidSlugError;
  function uuidV7Bytes(out?: Uint8Array, offset = 0): Uint8Array | UuidSlugError {
    // The range is checked BEFORE delegating for the same reason the instant is: a native writer
    // is handed the caller's buffer and offset directly, and answers differently from the portable
    // path. Measured on Bun 1.3.14, `out.set(bytes, offset)` coerces a NaN offset to 0 and writes
    // at the wrong place reporting success, while a fractional one throws a RangeError that the
    // catch below would relabel `rng_unavailable` — blaming the entropy source for a caller's
    // argument. Checking here is what makes every runtime give the one answer.
    // Guarded only on the branch that leaves this package: the fallback checks the same range
    // itself, so checking before the branch would pay for it twice on every Node call.
    if (!runtime.uuidV7Bytes) return fallbackUuidV7Bytes(out, offset);
    const badRange =
      out === undefined ? checkRange(16, offset, 16) : checkByteRange(out, offset, 16);
    if (badRange) return badRange;
    try {
      return runtime.uuidV7Bytes(out, offset);
    } catch (cause) {
      const result = fallbackUuidV7Bytes(out, offset);
      return result instanceof Error ? failedFallback(cause, result) : result;
    }
  }

  function uuidV7At(timestamp: number) {
    // Validate before delegation because native generators may coerce invalid timestamps.
    if (!runtime.uuidV7At) return fallback.uuidV7At(timestamp);
    const invalid = rejectInstant(timestamp);
    if (invalid) return invalid;
    try {
      return runtime.uuidV7At(timestamp);
    } catch (cause) {
      const result = fallback.uuidV7At(timestamp);
      return result instanceof Error ? failedFallback(cause, result) : result;
    }
  }

  function uuidV7BytesAt(timestamp: number): UuidV7Bytes | UuidSlugError;
  function uuidV7BytesAt<T extends Uint8Array>(
    timestamp: number,
    out: T,
    offset?: number,
  ): T | UuidSlugError;
  function uuidV7BytesAt(
    timestamp: number,
    out?: Uint8Array,
    offset = 0,
  ): Uint8Array | UuidSlugError {
    if (!runtime.uuidV7BytesAt) return fallbackUuidV7BytesAt(timestamp, out, offset);
    const invalid = rejectInstant(timestamp);
    if (invalid) return invalid;
    const badRange =
      out === undefined ? checkRange(16, offset, 16) : checkByteRange(out, offset, 16);
    if (badRange) return badRange;
    try {
      return runtime.uuidV7BytesAt(timestamp, out, offset);
    } catch (cause) {
      const result = fallbackUuidV7BytesAt(timestamp, out, offset);
      return result instanceof Error ? failedFallback(cause, result) : result;
    }
  }

  return {
    uuidV7,
    uuidV7Bytes,
    uuidV7At,
    uuidV7BytesAt,
  };
}
