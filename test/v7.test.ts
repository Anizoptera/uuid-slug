// SPDX-License-Identifier: Apache-2.0

/**
 * The v7 generator is driven here through the seams it already exposes — `clock` and
 * `fillRandom` are constructor options, so every case below runs the real generator with no
 * substitute for any part of it. What varies is the input, and the inputs chosen are the
 * hostile ones: a clock that stands still or runs backwards, and randomness that is entirely
 * zeroes or entirely ones, which are exactly the seeds that drive the counter to its bounds.
 *
 * These properties are what make a v7 safe to use as a database key. RFC 9562 §6.2 requires
 * that values never go backwards within a generator, which is what a reader of a sorted index
 * relies on, and the version and variant bits must survive whatever the entropy source
 * returned or the value is not a v7 at all.
 */
import { describe, expect, it } from "vitest";

import { createUuidV7Generator, parseUuid, uuidV7At } from "../src/index";

/** Fills with one repeated byte, so the counter seed lands on a known bound. */
const constantFill = (byte: number) => (bytes: Uint8Array<ArrayBuffer>) => {
  bytes.fill(byte);
};

/** A clock the test moves by hand; `Date.now` would make every case below a race. */
const fixedClock = (ms: number) => () => ms;

const bytesOf = (generator: ReturnType<typeof createUuidV7Generator>): Uint8Array => {
  const result = generator.uuidV7Bytes();
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
      createUuidV7Generator({ clock: fixedClock(1), fillRandom: constantFill(fill) }),
    );
    expect((bytes[6] ?? 0) >> 4).toBe(0x7);
    expect((bytes[8] ?? 0) >> 6).toBe(0b10);
  });
});

describe("uuidv7 monotonicity", () => {
  it("never repeats or goes backwards while the clock stands still", () => {
    const generator = createUuidV7Generator({
      clock: fixedClock(1_700_000_000_000),
      fillRandom: constantFill(0x00),
    });
    let previous = bytesOf(generator);
    for (let i = 0; i < 1_000; i += 1) {
      const current = bytesOf(generator);
      expect(compare(previous, current)).toBeLessThan(0);
      previous = current;
    }
  });

  it("does not emit an earlier timestamp when the clock jumps backwards", () => {
    // An NTP correction or a leap adjustment moves a wall clock backwards. Emitting the
    // earlier time would break the ordering of an index already holding the later one.
    let now = 1_700_000_000_000;
    const generator = createUuidV7Generator({
      clock: () => now,
      fillRandom: constantFill(0x00),
    });
    const before = bytesOf(generator);
    now -= 60_000;
    const after = bytesOf(generator);
    expect(timestampOf(after)).toBe(timestampOf(before));
    expect(compare(before, after)).toBeLessThan(0);
  });

  it("advances the timestamp instead of wrapping when the counter is exhausted", () => {
    // 0xff fill seeds all 42 counter bits high, so the very next value overflows. Wrapping
    // would hand out a value below one already emitted for the same millisecond.
    const generator = createUuidV7Generator({
      clock: fixedClock(1_700_000_000_000),
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
      clock: fixedClock(1),
      fillRandom: constantFill(0x00),
    });
    const bytes = generator.uuidV7BytesAt(ms);
    if (bytes instanceof Error) throw bytes;
    expect(timestampOf(bytes)).toBe(ms);
  });

  // 1.5 is the case that motivated the check: the write path truncates, so a fractional instant
  // silently became 1 while the error message promised a whole number of milliseconds. NaN and
  // Infinity matter because a native generator need not reject them — measured 2026-08-12,
  // `Bun.randomUUIDv7("hex", NaN)` returns the 1970 prefix rather than throwing.
  it.each([1.5, -1, NaN, Infinity, 2 ** 48])("rejects the instant %d", (ms) => {
    const generator = createUuidV7Generator({
      clock: fixedClock(1),
      fillRandom: constantFill(0x00),
    });
    expect(generator.uuidV7At(ms)).toBeInstanceOf(Error);
  });

  it("does not disturb the counter the untimestamped path is ordering", () => {
    // A supplied instant takes a random sequence and must leave `lastMs` and the counter alone:
    // routing it through the same reseed would either restart the sequence mid-millisecond or
    // move `lastMs` to the supplied instant, and both hand out a value below one already issued.
    // Nothing else observes that, because the two paths share every other line.
    const generator = createUuidV7Generator({
      clock: fixedClock(1_700_000_000_000),
      fillRandom: constantFill(0x00),
    });
    let previous = bytesOf(generator);
    for (let i = 0; i < 100; i += 1) {
      expect(generator.uuidV7At(1_500_000_000_000)).not.toBeInstanceOf(Error);
      const current = bytesOf(generator);
      expect(compare(previous, current)).toBeLessThan(0);
      previous = current;
    }
  });

  it("is reachable from the package entry point", () => {
    // Not a smoke test: these two entry points were implemented in `v7.ts`, declared on `Runtime`
    // and given a native Bun path, yet `createRuntimeGenerator` dropped the argument and the codec
    // never forwarded them, so nothing a consumer can call reached any of it. This asserts the
    // whole chain — top-level binding, codec forwarding, and the runtime generator's own
    // validate-then-delegate — against a value only the supplied instant can produce.
    const uuid = uuidV7At(1_700_000_000_000);
    if (uuid instanceof Error) throw uuid;
    const bytes = parseUuid(uuid);
    if (bytes instanceof Error) throw bytes;
    expect(timestampOf(bytes)).toBe(1_700_000_000_000);
  });
});

describe("uuidv7 buffer handling", () => {
  it("writes exactly its own sixteen bytes and leaves the rest of the buffer alone", () => {
    const generator = createUuidV7Generator({
      clock: fixedClock(1),
      fillRandom: constantFill(0x00),
    });
    const target = new Uint8Array(32).fill(0xab);
    const result = generator.uuidV7Bytes(target, 8);
    expect(result).toBe(target);
    // Spread, not `slice` alone: `Uint8Array.prototype.slice` returns a Uint8Array, and `toEqual`
    // treats that as unequal to a plain array however identical the contents.
    expect([...target.slice(0, 8)]).toEqual(Array.from<number>({ length: 8 }).fill(0xab));
    expect([...target.slice(24)]).toEqual(Array.from<number>({ length: 8 }).fill(0xab));
  });

  it("reports a buffer it cannot fit rather than writing past the end", () => {
    const generator = createUuidV7Generator({
      clock: fixedClock(1),
      fillRandom: constantFill(0x00),
    });
    expect(generator.uuidV7Bytes(new Uint8Array(16), 1)).toBeInstanceOf(Error);
    expect(generator.uuidV7Bytes(new Uint8Array(16), -1)).toBeInstanceOf(Error);
  });
});

describe("uuidv7 entropy use", () => {
  it("draws fresh randomness for every value inside one millisecond", () => {
    // The counter guarantees order; the trailing bytes are what make a value unguessable.
    // Reusing the same draw for a whole millisecond would make consecutive values differ only
    // by an increment an observer can extrapolate.
    let draw = 0;
    const generator = createUuidV7Generator({
      clock: fixedClock(1_700_000_000_000),
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
