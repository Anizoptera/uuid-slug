// SPDX-License-Identifier: Apache-2.0

import {
  checkByteRange,
  checkRange,
  fillRandomBytes,
  INVALID_TIMESTAMP,
  RNG_UNAVAILABLE,
  isUuidSlugError,
  readClock,
  UuidSlugError,
} from "./errors.ts";
import { UUID_TEXT_LOWERCASE, UUID_V7_ROLLBACK_ERROR } from "./types.ts";
import type {
  UuidTextCase,
  UuidV7Bytes,
  UuidV7ClockRollbackPolicy,
  UuidV7Generator,
  UuidV7StringFor,
} from "./types.ts";
import { formatUuidBytesUnchecked, invalidUuidTextCase, isUuidTextCase } from "./uuid.ts";
import { MAX_UUID_V7_UNIX_MS, isValidUuidV7UnixMs, rejectUuidV7UnixMs } from "./v7-timestamp.ts";

/** Internal controls for exercising the portable UUIDv7 state machine. */
interface PortableUuidV7GeneratorOptions {
  /** Return Unix milliseconds; selected fraction bits consume the fractional part. */
  readonly readUnixMs?: () => number;
  /** Fill every byte. Returned or thrown failures are contained by generation. */
  readonly fillRandom: (bytes: Uint8Array<ArrayBuffer>) => unknown;
  /** Policy already validated at the public seam. */
  readonly clockRollback?: Extract<UuidV7ClockRollbackPolicy, { readonly toleranceMs: number }>;
  /** Number of leading payload bits assigned to the clock fraction. */
  readonly subMillisecondFractionBits?: number;
}

export type PortableUuidV7Generator = Omit<UuidV7Generator, "generateUuidV7Value">;

function writeTimestampWords(bytes: Uint8Array, ms: number, offset: number) {
  // Split the fixed 48-bit field once: JavaScript bitwise operators keep the low 32 bits, while
  // division supplies the independent high 16 bits without BigInt or six iterative divisions.
  const high = Math.floor(ms / 0x1_0000_0000);
  bytes[offset] = high >>> 8;
  bytes[offset + 1] = high;
  bytes[offset + 2] = ms >>> 24;
  bytes[offset + 3] = ms >>> 16;
  bytes[offset + 4] = ms >>> 8;
  bytes[offset + 5] = ms;
}

function writeTimestampLoop(bytes: Uint8Array, ms: number, offset: number) {
  let value = ms;
  for (let index = 5; index >= 0; index -= 1) {
    bytes[offset + index] = value & 0xff;
    value = Math.floor(value / 256);
  }
}

// Measured Bun favors the loop while Node and Chromium favor fixed writes; select once so generation
// pays no per-call branch. bench/PERFORMANCE.md owns the measurements and replacement condition.
const writeTimestamp = (globalThis as { Bun?: object }).Bun
  ? writeTimestampLoop
  : writeTimestampWords;

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

/**
 * The one check and the one message for a caller-supplied instant. Both the portable generator and
 * the runtime-backed one call it, and the runtime-backed one calls it BEFORE delegating: a native
 * generator may accept what we reject and answer wrongly rather than fail.
 */
const rejectInstant = rejectUuidV7UnixMs;

/**
 * Both string forms differ only in where the instant comes from, so the byte-or-error result is
 * carried through here rather than unwrapped twice. The narrowing is an assertion because
 * `bytesToUuidString` is version-agnostic: the v7-ness is established by the caller having produced the
 * bytes, not by anything the formatter can check.
 */
const formatUuidV7 = /* @__NO_SIDE_EFFECTS__ */ <Case extends UuidTextCase>(
  result: Uint8Array | UuidSlugError,
  textCase: Case,
): UuidV7StringFor<Case> | UuidSlugError =>
  result instanceof Error
    ? result
    : (formatUuidBytesUnchecked(result, 0, textCase) as UuidV7StringFor<Case>);

const reenteredGeneration = /* @__NO_SIDE_EFFECTS__ */ () =>
  new UuidSlugError(
    RNG_UNAVAILABLE,
    "UUIDv7 generation cannot be reentered from its readUnixMs or entropy callback.",
  );

/**
 * Seeds the sequence from the same six random bytes and the same bit positions as before, split
 * across the two halves: byte 0 and the top 2 bits of byte 1 form the high half, the rest the
 * low half. Starting each millisecond at a random point rather than zero is what stops the
 * sequence leaking how many ids were issued in the previous millisecond.
 */
const seedHi = /* @__NO_SIDE_EFFECTS__ */ (bytes: Uint8Array) =>
  (((bytes[0] ?? 0) << 2) | ((bytes[1] ?? 0) >>> 6)) & 0x3ff;

const seedLo = /* @__NO_SIDE_EFFECTS__ */ (bytes: Uint8Array) =>
  ((((bytes[1] ?? 0) & 0x3f) << 26) |
    ((bytes[2] ?? 0) << 18) |
    ((bytes[3] ?? 0) << 10) |
    ((bytes[4] ?? 0) << 2) |
    ((bytes[5] ?? 0) & 0x03)) >>>
  0;

/**
 * Create a stateful UUIDv7 generator from package-owned, statically checked dependencies.
 * Clock and entropy failures return `UuidSlugError`; reentrant calls preserve sequence state.
 */
export function createPortableUuidV7Generator(
  options: PortableUuidV7GeneratorOptions,
): PortableUuidV7Generator {
  const readUnixMs = options.readUnixMs ?? Date.now;
  const fill = options.fillRandom;
  const rollback = options.clockRollback;
  const fractionBits = options.subMillisecondFractionBits ?? 0;
  const counterBits = 42 - fractionBits;
  const counterModulus = 2 ** counterBits;
  const payloadLayout = Object.freeze({
    subMillisecondFractionBits: fractionBits,
    counterBits,
  });
  // The sequence seed consumes six bytes and the UUID tail consumes four. Drawing a full UUID
  // block would copy six bytes that version, variant, timestamp, and sequence fields replace.
  const random = new Uint8Array(10);
  // Continuations retain the sequence seed, so expose only the four bytes their UUID tail consumes.
  const randomTail = random.subarray(6);
  /**
   * Below every timestamp the readUnixMs check admits, which is what makes it the uninitialised
   * sentinel rather than a value: `now > lastMs` alone therefore takes the reseed branch on the
   * first call, and no separate "have we started" flag is needed. The coupling is deliberate and
   * is why the readUnixMs is validated before this is compared against — an unvalidated readUnixMs returning
   * a negative millisecond would make `lastMs` stay below it forever, so the monotonic counter
   * would never be used and every call would reseed.
   */
  let lastMs = -1;
  let clockHighWaterMs = -1;
  let counterHi = 0;
  let counterLo = 0;
  let generating = false;
  const textBytes = new Uint8Array(16);

  function reseed(ms: number, fraction: number) {
    const failed = fillRandomBytes(fill, random);
    if (failed) return failed;
    const seededCounter = (seedHi(random) * 0x1_0000_0000 + seedLo(random)) % counterModulus;
    const payloadPrefix = fraction * counterModulus + seededCounter;
    lastMs = ms;
    counterHi = Math.floor(payloadPrefix / 0x1_0000_0000);
    counterLo = payloadPrefix >>> 0;
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
    for (let i = 12; i < 16; i += 1) target[offset + i] = randomTail[i - 12] as number;
    return target;
  }

  function bytes(out?: Uint8Array, offset = 0): Uint8Array | UuidSlugError {
    if (generating) return reenteredGeneration();
    generating = true;
    try {
      const target = out ?? new Uint8Array(16);
      const badRange =
        target === textBytes
          ? undefined
          : out === undefined
            ? checkRange(16, offset, 16)
            : checkByteRange(out, offset, 16);
      if (badRange) return badRange;
      // Split THEN validated, in that order and not the other. A readUnixMs is allowed to be
      // fractional — `performance.timeOrigin + performance.now()` is, and is a perfectly good one —
      // so rejecting non-integers here would refuse a legitimate caller, unlike `rejectInstant`,
      // where the fraction is in an argument the caller wrote out. What must not survive is a
      // truncated value the format cannot carry: `writeTimestamp` keeps the low 48 bits of whatever
      // it is handed, so NaN and 2**48 both silently produced the 1970 prefix and a negative
      // millisecond produced the year 10889 by two's-complement wrap. All three now report.
      // The raw reading is kept for the message rather than calling `readUnixMs()` again: a second call
      // is a second reading, and the message would name a value other than the one refused.
      const reading = readClock(readUnixMs);
      if (isUuidSlugError(reading)) return reading;
      const now = typeof reading === "number" ? Math.trunc(reading) : NaN;
      if (typeof reading !== "number" || reading < 0 || !isValidUuidV7UnixMs(now))
        return new UuidSlugError(
          INVALID_TIMESTAMP,
          `Clock returned ${String(reading)}, which is not a millisecond in 0..${MAX_UUID_V7_UNIX_MS}.`,
        );
      const fraction =
        fractionBits === 0
          ? 0
          : Math.min(2 ** fractionBits - 1, Math.floor((reading - now) * 2 ** fractionBits));
      const rollbackMs = rollback === undefined ? 0 : clockHighWaterMs - now;
      if (rollback !== undefined && rollbackMs > rollback.toleranceMs) {
        if (rollback.action === UUID_V7_ROLLBACK_ERROR)
          return new UuidSlugError(
            INVALID_TIMESTAMP,
            `Clock moved backward by ${rollbackMs} milliseconds; clockRollback allows ${rollback.toleranceMs}. Increase tolerance or choose reset/preserve if this rollback is acceptable.`,
          );
        const failed = reseed(now, fraction);
        if (failed) return failed;
        clockHighWaterMs = now;
      } else if (
        now > lastMs ||
        (now === lastMs &&
          fraction > Math.floor((counterHi * 0x1_0000_0000 + counterLo) / counterModulus))
      ) {
        const failed = reseed(now, fraction);
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
          // broken permanently, and silently, from that call onward. Unreachable on a real readUnixMs
          // until the year 10889; reachable now from any readUnixMs that lands near the ceiling, which
          // is why refusing is not theoretical.
          if (lastMs >= MAX_UUID_V7_UNIX_MS)
            return new UuidSlugError(
              INVALID_TIMESTAMP,
              `UUIDv7 sequence exhausted at Unix millisecond ${MAX_UUID_V7_UNIX_MS}; another UUID would exceed the 48-bit timestamp.`,
            );
          const failed = reseed(lastMs + 1, 0);
          if (failed) return failed;
        } else {
          const failed = fillRandomBytes(fill, randomTail);
          if (failed) return failed;
          // Commit only after entropy succeeds; a failed draw must not consume sequence state.
          counterLo = nextLo;
          counterHi = nextHi;
        }
      }
      if (rollback !== undefined && now > clockHighWaterMs) clockHighWaterMs = now;
      return writeBytes(target, offset, lastMs, counterHi, counterLo);
    } finally {
      generating = false;
    }
  }

  function bytesAt(timestamp: number, out?: Uint8Array, offset = 0): Uint8Array | UuidSlugError {
    if (generating) return reenteredGeneration();
    generating = true;
    try {
      const target = out ?? new Uint8Array(16);
      const badRange =
        out === undefined ? checkRange(16, offset, 16) : checkByteRange(out, offset, 16);
      if (badRange) return badRange;
      const invalid = rejectInstant(timestamp);
      if (invalid) return invalid;
      const failed = fillRandomBytes(fill, random);
      if (failed) return failed;
      // A supplied instant takes a random sequence and leaves current-time state untouched.
      const seededCounter = (seedHi(random) * 0x1_0000_0000 + seedLo(random)) % counterModulus;
      return writeBytes(
        target,
        offset,
        timestamp,
        Math.floor(seededCounter / 0x1_0000_0000),
        seededCounter >>> 0,
      );
    } finally {
      generating = false;
    }
  }

  function generateUuidV7Bytes(): UuidV7Bytes | UuidSlugError;
  function generateUuidV7Bytes<Output extends Uint8Array>(
    out: Output,
    offset?: number,
  ): Output | UuidSlugError;
  function generateUuidV7Bytes(out?: Uint8Array, offset?: number): Uint8Array | UuidSlugError {
    return bytes(out, offset);
  }

  function generateUuidV7BytesAtUnixMs(timestamp: number): UuidV7Bytes | UuidSlugError;
  function generateUuidV7BytesAtUnixMs<Output extends Uint8Array>(
    timestamp: number,
    out: Output,
    offset?: number,
  ): Output | UuidSlugError;
  function generateUuidV7BytesAtUnixMs(
    timestamp: number,
    out?: Uint8Array,
    offset?: number,
  ): Uint8Array | UuidSlugError {
    return bytesAt(timestamp, out, offset);
  }

  function generateUuidV7<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
    textCase: Case = UUID_TEXT_LOWERCASE as Case,
  ): UuidV7StringFor<Case> | UuidSlugError {
    if (!isUuidTextCase(textCase)) return invalidUuidTextCase();
    return formatUuidV7(bytes(textBytes), textCase);
  }

  function generateUuidV7AtUnixMs<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
    timestamp: number,
    textCase: Case = UUID_TEXT_LOWERCASE as Case,
  ): UuidV7StringFor<Case> | UuidSlugError {
    if (!isUuidTextCase(textCase)) return invalidUuidTextCase();
    return formatUuidV7(bytesAt(timestamp, textBytes), textCase);
  }

  return {
    // Text formatting consumes bytes synchronously, so one generator-owned buffer removes an
    // allocation without exposing mutable storage. The reentrancy guard protects it while readUnixMs
    // and entropy callbacks run.
    payloadLayout,
    generateUuidV7,
    generateUuidV7AtUnixMs,
    generateUuidV7Bytes,
    generateUuidV7BytesAtUnixMs,
  };
}
