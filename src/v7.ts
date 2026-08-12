// SPDX-License-Identifier: Apache-2.0

import { checkRange, UuidSlugError } from "./errors";
import type { UuidV7Generator, UuidV7String } from "./types";
import { formatUuid } from "./uuid";
import type { Runtime } from "./runtime/types";

export interface UuidV7GeneratorOptions {
  readonly clock?: () => number;
  readonly fillRandom: (bytes: Uint8Array<ArrayBuffer>) => void;
}

function writeTimestamp(bytes: Uint8Array, ms: number) {
  let value = Math.trunc(ms);
  for (let i = 5; i >= 0; i -= 1) {
    bytes[i] = value & 0xff;
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
function writeCounter(bytes: Uint8Array, hi: number, lo: number) {
  bytes[6] = 0x70 | ((hi >>> 6) & 0x0f);
  bytes[7] = (((hi & 0x3f) << 2) | (lo >>> 30)) & 0xff;
  bytes[8] = 0x80 | ((lo >>> 24) & 0x3f);
  bytes[9] = (lo >>> 16) & 0xff;
  bytes[10] = (lo >>> 8) & 0xff;
  bytes[11] = lo & 0xff;
}

/** The 48 bits RFC 9562 gives the timestamp; beyond it the value cannot be represented. */
const MAX_TIMESTAMP = 0xffff_ffff_ffff;

/**
 * `Number.isInteger` rather than `isFinite`, because the error message promises a WHOLE number of
 * milliseconds and `Math.trunc` on the write path would otherwise honour that promise silently:
 * 1.5 became 1 with nothing reported. It also rejects NaN and Infinity, which matters because a
 * native generator need not — measured 2026-08-12, `Bun.randomUUIDv7("hex", NaN)` and the same
 * call at 2^48 both return the 1970 prefix `000000000000` without throwing, while -1 and 1.5 do
 * throw. Validating here rather than trusting the platform is what makes the two agree.
 */
const isValidUuidV7Timestamp = (ms: number): boolean =>
  Number.isInteger(ms) && ms >= 0 && ms <= MAX_TIMESTAMP;

/**
 * The one check and the one message for a caller-supplied instant. Both the portable generator and
 * the runtime-backed one call it, and the runtime-backed one calls it BEFORE delegating: a native
 * generator may accept what we reject and answer wrongly rather than fail.
 */
const rejectInstant = (ms: number): Error | undefined =>
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
const formatUuidV7 = (result: Error | Uint8Array): Error | UuidV7String =>
  result instanceof Error ? result : (formatUuid(result) as Error | UuidV7String);

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
  const clock = options.clock ?? Date.now;
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
    options.fillRandom(random);
    lastMs = ms;
    counterHi = seedHi(random);
    counterLo = seedLo(random);
  }

  function bytes(out?: Uint8Array, offset = 0, timestamp?: number): Error | Uint8Array {
    const target = out ?? new Uint8Array(16);
    const badRange = checkRange(target, offset, 16);
    if (badRange) return badRange;
    // The two modes differ only in where the millisecond and the 42-bit sequence come from, so
    // they share one write path. A caller-supplied instant takes a RANDOM sequence rather than
    // the monotonic counter, and leaves `lastMs`/`counter` untouched: that counter orders values
    // issued inside the CURRENT millisecond, and a caller naming an arbitrary instant is not
    // extending that sequence. Feeding a supplied timestamp through it would be worse than
    // useless — an older instant fails the `now > lastMs` test and the value would carry the
    // clock's millisecond instead of the requested one.
    let ms: number;
    let sequenceHi: number;
    let sequenceLo: number;
    if (timestamp !== undefined) {
      const invalid = rejectInstant(timestamp);
      if (invalid) return invalid;
      options.fillRandom(random);
      ms = Math.trunc(timestamp);
      sequenceHi = seedHi(random);
      sequenceLo = seedLo(random);
    } else {
      // Truncated THEN validated, in that order and not the other. A clock is allowed to be
      // fractional — `performance.timeOrigin + performance.now()` is, and is a perfectly good one —
      // so rejecting non-integers here would refuse a legitimate caller, unlike `rejectInstant`,
      // where the fraction is in an argument the caller wrote out. What must not survive is a
      // truncated value the format cannot carry: `writeTimestamp` keeps the low 48 bits of whatever
      // it is handed, so NaN and 2**48 both silently produced the 1970 prefix and a negative
      // millisecond produced the year 10889 by two's-complement wrap. All three now report.
      // The raw reading is kept for the message rather than calling `clock()` again: a second call
      // is a second reading, and the message would name a value other than the one refused.
      const reading = clock();
      const now = Math.trunc(reading);
      if (!isValidUuidV7Timestamp(now))
        return new UuidSlugError(
          "invalid_timestamp",
          `Clock returned ${String(reading)}, which is not a millisecond in 0..${MAX_TIMESTAMP}.`,
        );
      if (now > lastMs) reseed(now);
      else {
        counterLo = (counterLo + 1) >>> 0;
        if (counterLo === 0) counterHi += 1;
        // Past 42 bits the sequence no longer fits `rand_a` plus the borrowed `rand_b` bits.
        // Borrowing the next millisecond keeps ids ordered and unique rather than wrapping into
        // values this millisecond has already issued.
        if (counterHi > 0x3ff) {
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
          reseed(lastMs + 1);
        } else options.fillRandom(random);
      }
      ms = lastMs;
      sequenceHi = counterHi;
      sequenceLo = counterLo;
    }
    // Every one of the sixteen bytes is written through the same view. It used to be split —
    // `subarray` for the first twelve, `target[offset + n]` for the random tail — and the two
    // disagree about a non-integer offset: `subarray` truncates it, direct indexing is a silent
    // no-op. That produced an id whose random tail was whatever the caller's buffer already held,
    // returned as success. `checkRange` now refuses such an offset, so the split can no longer
    // diverge; writing through one view is what keeps it that way.
    const uuid = target.subarray(offset, offset + 16);
    writeTimestamp(uuid, ms);
    writeCounter(uuid, sequenceHi, sequenceLo);
    for (let i = 12; i < 16; i += 1) uuid[i] = random[i] as number;
    return target;
  }

  return {
    uuidV7() {
      const formatted = formatUuidV7(bytes());
      // Throws rather than returns, because this signature promises a string: the two ways it can
      // fail — entropy, and a `clock` that returns something the format cannot carry — are both
      // configuration the caller cannot act on per call. `uuidV7At` returns its Error instead,
      // because there the failure is a value the caller passed in at the call site.
      if (formatted instanceof Error) throw formatted;
      return formatted;
    },
    uuidV7At: (timestamp) => formatUuidV7(bytes(undefined, 0, timestamp)),
    uuidV7Bytes: (out, offset) => bytes(out, offset),
    uuidV7BytesAt: (timestamp, out, offset) => bytes(out, offset, timestamp),
  };
}

export function createRuntimeGenerator(runtime: Runtime): UuidV7Generator {
  const fallback = createUuidV7Generator({ fillRandom: runtime.fillRandom });
  return {
    uuidV7() {
      if (!runtime.uuidV7) return fallback.uuidV7();
      try {
        return runtime.uuidV7();
      } catch {
        return fallback.uuidV7();
      }
    },
    // The range is checked BEFORE delegating for the same reason the instant is: a native writer
    // is handed the caller's buffer and offset directly, and answers differently from the portable
    // path. Measured on Bun 1.3.14, `out.set(bytes, offset)` coerces a NaN offset to 0 and writes
    // at the wrong place reporting success, while a fractional one throws a RangeError that the
    // catch below would relabel `rng_unavailable` — blaming the entropy source for a caller's
    // argument. Checking here is what makes every runtime give the one answer.
    uuidV7Bytes(out?: Uint8Array, offset = 0) {
      // Guarded only on the branch that leaves this package: the fallback checks the same range
      // itself, so checking before the branch would pay for it twice on every Node call.
      if (!runtime.uuidV7Bytes) return fallback.uuidV7Bytes(out, offset);
      if (out) {
        const badRange = checkRange(out, offset, 16);
        if (badRange) return badRange;
      }
      try {
        return runtime.uuidV7Bytes(out, offset);
      } catch (cause) {
        return new UuidSlugError("rng_unavailable", "Runtime UUIDv7 byte generation failed.", {
          cause,
        });
      }
    },
    // Both timestamped paths reject the instant BEFORE reaching the platform, because a native
    // generator that accepts it may answer wrongly instead of failing: measured 2026-08-12,
    // `Bun.randomUUIDv7("hex", NaN)` and the same call at 2^48 both return the 1970 prefix
    // `000000000000` silently, while -1 and 1.5 throw. Each then mirrors its untimestamped
    // sibling on a platform failure — fall back for the string form, report for the byte form —
    // so the four entry points behave predictably in pairs.
    uuidV7At(timestamp: number) {
      const invalid = rejectInstant(timestamp);
      if (invalid) return invalid;
      if (!runtime.uuidV7At) return fallback.uuidV7At(timestamp);
      try {
        return runtime.uuidV7At(timestamp);
      } catch {
        return fallback.uuidV7At(timestamp);
      }
    },
    uuidV7BytesAt(timestamp: number, out?: Uint8Array, offset = 0) {
      const invalid = rejectInstant(timestamp);
      if (invalid) return invalid;
      if (!runtime.uuidV7BytesAt) return fallback.uuidV7BytesAt(timestamp, out, offset);
      if (out) {
        const badRange = checkRange(out, offset, 16);
        if (badRange) return badRange;
      }
      try {
        return runtime.uuidV7BytesAt(timestamp, out, offset);
      } catch (cause) {
        return new UuidSlugError("rng_unavailable", "Runtime UUIDv7 byte generation failed.", {
          cause,
        });
      }
    },
  };
}
