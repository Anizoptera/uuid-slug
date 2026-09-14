// SPDX-License-Identifier: Apache-2.0

/**
 * The portable v7 state machine is driven through its internal `readUnixMs` and `fillRandom` controls,
 * so every case below runs the real algorithm with no substitute for any part of it. What varies is the input, and the inputs chosen are the
 * hostile ones: a readUnixMs that stands still or runs backwards, and randomness that is entirely
 * zeroes or entirely ones, which are exactly the seeds that drive the counter to its bounds.
 *
 * Counter cases constrain this portable implementation, not the runtime-independent API.
 * Native generators may choose different within-millisecond strategies. Version, variant,
 * bounds and valid state transitions must survive hostile readUnixMs and entropy inputs.
 */
import { describe, expect, it } from "vitest";

import { UuidSlugError } from "../src/index";
import { createPortableUuidV7Generator as createUuidV7Generator } from "../src/v7";

/** Fills with one repeated byte, so the counter seed lands on a known bound. */
const constantFill = (byte: number) => (bytes: Uint8Array<ArrayBuffer>) => {
  bytes.fill(byte);
};

/** A readUnixMs the test moves by hand; `Date.now` would make every case below a race. */
const fixedClock = (ms: number) => () => ms;

const bytesOf = (generator: ReturnType<typeof createUuidV7Generator>): Uint8Array => {
  const result = generator.generateUuidV7Bytes();
  if (result instanceof Error) throw result;
  return result;
};

/** Lexicographic order over the 16 bytes is exactly the sort order a database index gives. */
const compare = (left: Uint8Array, right: Uint8Array): number => {
  for (let i = 0; i < 16; i += 1) {
    const difference = (left[i] ?? 0) - (right[i] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
};

const timestampOf = (bytes: Uint8Array): number =>
  bytes.slice(0, 6).reduce((total, byte) => total * 256 + byte, 0);

describe("uuidv7 bit layout", () => {
  // The version and variant occupy bits the entropy source also writes to, so an
  // implementation that masks them wrongly produces a well-formed-looking value that is not a
  // v7. All-ones is the input that catches a missing mask; all-zeroes catches a missing set.
  it.each([0x00, 0xff])("stamps version 7 and variant 0b10 over random fill 0x%s", (fill) => {
    const bytes = bytesOf(
      createUuidV7Generator({ readUnixMs: fixedClock(1), fillRandom: constantFill(fill) }),
    );
    expect((bytes[6] ?? 0) >> 4).toBe(0x7);
    expect((bytes[8] ?? 0) >> 6).toBe(0b10);
  });
});

/**
 * Asserting intra-millisecond order here does NOT contradict README §Guarantees' "NOT ordered
 * within a millisecond", and this block must not be deleted for looking like it does. That
 * guarantee is about ids the package HANDS BACK, which on most runtimes come from a native
 * generator whose intra-ms behaviour we neither control nor probe. These cases drive
 * `createUuidV7Generator` with an injected readUnixMs and fill, which never delegates — so what is
 * pinned is our own 42-bit sequence, not a promise about anyone else's.
 *
 * The ordering assertion also reaches duplicate prevention in the portable state machine.
 * `constantFill` makes every reseed identical, so the counter is the only thing separating
 * consecutive ids: break it and this emits the same UUID a thousand times.
 */
describe("uuidv7 monotonicity", () => {
  it("never repeats or goes backwards while the readUnixMs stands still", () => {
    const generator = createUuidV7Generator({
      readUnixMs: fixedClock(1_700_000_000_000),
      fillRandom: constantFill(0x00),
    });
    let previous = bytesOf(generator);
    for (let i = 0; i < 1_000; i += 1) {
      const current = bytesOf(generator);
      expect(compare(previous, current)).toBeLessThan(0);
      previous = current;
    }
  });

  it("does not emit an earlier timestamp when the readUnixMs jumps backwards", () => {
    // An NTP correction or a leap adjustment moves a wall readUnixMs backwards. Emitting the
    // earlier time would break the ordering of an index already holding the later one.
    let now = 1_700_000_000_000;
    const generator = createUuidV7Generator({
      readUnixMs: () => now,
      fillRandom: constantFill(0x00),
    });
    const before = bytesOf(generator);
    now -= 60_000;
    const after = bytesOf(generator);
    expect(timestampOf(after)).toBe(timestampOf(before));
    expect(compare(before, after)).toBeLessThan(0);
  });

  it("resets to wall time only after the selected rollback tolerance", () => {
    let now = 100;
    const generator = createUuidV7Generator({
      clockRollback: { action: "reset", toleranceMs: 5 },
      readUnixMs: () => now,
      fillRandom: constantFill(0),
    });
    expect(timestampOf(bytesOf(generator))).toBe(100);
    now = 96;
    expect(timestampOf(bytesOf(generator))).toBe(100);
    now = 94;
    expect(timestampOf(bytesOf(generator))).toBe(94);
  });

  it("returns a typed failure beyond rollback tolerance and recovers without changing state", () => {
    let now = 100;
    const generator = createUuidV7Generator({
      clockRollback: { action: "error", toleranceMs: 0 },
      readUnixMs: () => now,
      fillRandom: constantFill(0),
    });
    const first = bytesOf(generator);
    now = 99;
    expect(generator.generateUuidV7Bytes()).toMatchObject({ code: "invalid_timestamp" });
    now = 100;
    const recovered = bytesOf(generator);
    expect(compare(first, recovered)).toBeLessThan(0);
  });

  it("advances the timestamp instead of wrapping when the counter is exhausted", () => {
    // 0xff fill seeds all 42 counter bits high, so the very next value overflows. Wrapping
    // would hand out a value below one already emitted for the same millisecond.
    const generator = createUuidV7Generator({
      readUnixMs: fixedClock(1_700_000_000_000),
      fillRandom: constantFill(0xff),
    });
    const first = bytesOf(generator);
    const second = bytesOf(generator);
    expect(timestampOf(second)).toBe(timestampOf(first) + 1);
    expect(compare(first, second)).toBeLessThan(0);
  });
});

describe("uuidv7 at a caller-supplied instant", () => {
  // The layout is a 48-bit big-endian field written by repeated division, so the cases that can
  // fail are the ones a 32-bit shift would truncate. `2 ** 48 - 1` is RFC 9562's own bound
  // rederived here rather than imported, so the test disagrees with the implementation if either
  // moves; `timestampOf` reads the field back by an independent reduction.
  it.each([0, 2 ** 32, 2 ** 40 + 12_345, 2 ** 48 - 1])("writes the instant %d exactly", (ms) => {
    const generator = createUuidV7Generator({
      readUnixMs: fixedClock(1),
      fillRandom: constantFill(0x00),
    });
    const bytes = generator.generateUuidV7BytesAtUnixMs(ms);
    if (bytes instanceof Error) throw bytes;
    expect(timestampOf(bytes)).toBe(ms);
  });

  // 1.5 is the case that motivated the check: the write path truncates, so a fractional instant
  // silently became 1 while the error message promised a whole number of milliseconds. NaN and
  // Infinity matter because runtime-native validation is not this portable contract. Bun 1.4.2
  // rejects NaN, but runtime behavior is re-probed on update rather than assumed here.
  it.each([1.5, -1, NaN, Infinity, 2 ** 48])("rejects the instant %d", (ms) => {
    const generator = createUuidV7Generator({
      readUnixMs: fixedClock(1),
      fillRandom: constantFill(0x00),
    });
    expect(generator.generateUuidV7AtUnixMs(ms)).toBeInstanceOf(Error);
  });

  it("does not disturb the counter the untimestamped path is ordering", () => {
    // A supplied instant takes a random sequence and must leave `lastMs` and the counter alone:
    // routing it through the same reseed would either restart the sequence mid-millisecond or
    // move `lastMs` to the supplied instant, and both hand out a value below one already issued.
    // Nothing else observes that, because the two paths share every other line.
    const generator = createUuidV7Generator({
      readUnixMs: fixedClock(1_700_000_000_000),
      fillRandom: constantFill(0x00),
    });
    let previous = bytesOf(generator);
    for (let i = 0; i < 100; i += 1) {
      expect(generator.generateUuidV7AtUnixMs(1_500_000_000_000)).not.toBeInstanceOf(Error);
      const current = bytesOf(generator);
      expect(compare(previous, current)).toBeLessThan(0);
      previous = current;
    }
  });
});

describe("uuidv7 readUnixMs contract", () => {
  // The mirror of the supplied-instant cases above, and for a long time the half that was missing:
  // `rejectInstant` guarded `uuidV7At` while `readUnixMs()` went straight to a write path that keeps the
  // low 48 bits of whatever it is handed. Each value below produced a confident, well-formed,
  // WRONG id rather than an error — NaN and 2**48 the 1970 prefix, a negative millisecond the year
  // 10889 by two's-complement wrap.
  it.each([NaN, Infinity, -1000, 2 ** 48])("refuses a readUnixMs reading of %d", (ms) => {
    const generator = createUuidV7Generator({
      readUnixMs: fixedClock(ms),
      fillRandom: constantFill(0x00),
    });
    expect(generator.generateUuidV7Bytes()).toBeInstanceOf(Error);
    const failure = generator.generateUuidV7();
    expect(failure).toBeInstanceOf(UuidSlugError);
    expect(failure instanceof UuidSlugError && failure.code).toBe("invalid_timestamp");
  });

  it("accepts a fractional readUnixMs, which a monotonic time source legitimately is", () => {
    // The distinction the refusals above must not swallow: `performance.timeOrigin +
    // performance.now()` is fractional and is a perfectly good readUnixMs, so the reading is truncated
    // and then checked, never checked for integrality.
    const generator = createUuidV7Generator({
      readUnixMs: fixedClock(1_700_000_000_000.75),
      fillRandom: constantFill(0x00),
    });
    expect(timestampOf(bytesOf(generator))).toBe(1_700_000_000_000);
  });

  it("refuses to borrow past the last representable millisecond instead of wrapping to 1970", () => {
    // All-ones fill seeds the 42-bit sequence at its maximum — `seedHi` 0x3ff and `seedLo`
    // 0xffffffff — so the second call increments into the borrow branch. At the ceiling there is
    // no millisecond to borrow: `writeTimestamp` truncates to six bytes, so `lastMs + 1` wrapped
    // to 0 and every id after it carried a 1970 timestamp, below every id already issued.
    const atCeiling = createUuidV7Generator({
      readUnixMs: fixedClock(2 ** 48 - 1),
      fillRandom: constantFill(0xff),
    });
    expect(timestampOf(bytesOf(atCeiling))).toBe(2 ** 48 - 1);
    expect(atCeiling.generateUuidV7Bytes()).toBeInstanceOf(Error);

    // The control that proves the refusal is about the ceiling and not about the borrow itself:
    // one millisecond lower, the same sequence borrows and lands ON the ceiling.
    const belowCeiling = createUuidV7Generator({
      readUnixMs: fixedClock(2 ** 48 - 2),
      fillRandom: constantFill(0xff),
    });
    expect(timestampOf(bytesOf(belowCeiling))).toBe(2 ** 48 - 2);
    expect(timestampOf(bytesOf(belowCeiling))).toBe(2 ** 48 - 1);
  });
});

describe("uuidv7 buffer handling", () => {
  it("writes exactly its own sixteen bytes and leaves the rest of the buffer alone", () => {
    const generator = createUuidV7Generator({
      readUnixMs: fixedClock(1),
      fillRandom: constantFill(0x00),
    });
    const target = new Uint8Array(32).fill(0xab);
    const result = generator.generateUuidV7Bytes(target, 8);
    expect(result).toBe(target);
    // Spread, not `slice` alone: `Uint8Array.prototype.slice` returns a Uint8Array, and `toEqual`
    // treats that as unequal to a plain array however identical the contents.
    expect([...target.slice(0, 8)]).toEqual(Array.from<number>({ length: 8 }).fill(0xab));
    expect([...target.slice(24)]).toEqual(Array.from<number>({ length: 8 }).fill(0xab));
  });

  it("reports a buffer it cannot fit rather than writing past the end", () => {
    const generator = createUuidV7Generator({
      readUnixMs: fixedClock(1),
      fillRandom: constantFill(0x00),
    });
    expect(generator.generateUuidV7Bytes(new Uint8Array(16), 1)).toBeInstanceOf(Error);
    expect(generator.generateUuidV7Bytes(new Uint8Array(16), -1)).toBeInstanceOf(Error);
  });
});

describe("uuidv7 entropy use", () => {
  it.each([0x00, 0xff])("retries a failed draw without consuming sequence state (%d)", (byte) => {
    let fail = false;
    const generator = createUuidV7Generator({
      readUnixMs: fixedClock(10),
      fillRandom: (bytes) => {
        if (fail) return new Error("entropy unavailable");
        bytes.fill(byte);
        return undefined;
      },
    });
    const control = createUuidV7Generator({
      readUnixMs: fixedClock(10),
      fillRandom: constantFill(byte),
    });
    expect(bytesOf(generator)).toEqual(bytesOf(control));
    fail = true;
    expect(generator.generateUuidV7Bytes()).toBeInstanceOf(Error);
    fail = false;
    expect(bytesOf(generator)).toEqual(bytesOf(control));
  });

  it("draws fresh randomness for every value inside one millisecond", () => {
    // The counter guarantees order; the trailing bytes are what make a value unguessable.
    // Reusing the same draw for a whole millisecond would make consecutive values differ only
    // by an increment an observer can extrapolate.
    let draw = 0;
    const generator = createUuidV7Generator({
      readUnixMs: fixedClock(1_700_000_000_000),
      fillRandom: (bytes) => {
        draw += 1;
        bytes.fill(draw & 0xff);
      },
    });
    const first = bytesOf(generator);
    const second = bytesOf(generator);
    expect(second.slice(12)).not.toEqual(first.slice(12));
  });
});
