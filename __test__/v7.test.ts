// SPDX-License-Identifier: Apache-2.0

/**
 * The portable v7 state machine is driven through its internal `readUnixMs` and `fillRandom` controls,
 * so every case below runs the real algorithm with no substitute for any part of it. What varies is the input, and the inputs chosen are the
 * hostile ones: a readUnixMs that stands still or runs backwards, and randomness that is entirely
 * zeroes or entirely ones, which are exactly the seeds that drive the counter to its bounds.
 *
 * Counter cases protect the created-generator ordering contract. Version, variant, bounds and valid
 * state transitions must survive hostile readUnixMs and entropy inputs.
 */
import { describe, expect, it } from "vitest";

import { UuidSlugError } from "../src/index";
import type { UuidV7Instant } from "../src/index";
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

const expectAfter = (later: Uint8Array, earlier: Uint8Array) => {
  expect(Buffer.compare(later, earlier)).toBeGreaterThan(0);
};

const timestampOf = (bytes: Uint8Array): number =>
  bytes.slice(0, 6).reduce((total, byte) => total * 256 + byte, 0);

const payloadPrefixOf = (bytes: Uint8Array): number =>
  ((bytes[6] ?? 0) & 0x0f) * 2 ** 38 +
  (bytes[7] ?? 0) * 2 ** 30 +
  ((bytes[8] ?? 0) & 0x3f) * 2 ** 24 +
  (bytes[9] ?? 0) * 2 ** 16 +
  (bytes[10] ?? 0) * 2 ** 8 +
  (bytes[11] ?? 0);

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

describe("uuidv7 sequence state", () => {
  it.each([1, 6, 12])("places %i clock-fraction bits before the counter", (fractionBits) => {
    const generator = createUuidV7Generator({
      readUnixMs: fixedClock(1_700_000_000_000.75),
      fillRandom: constantFill(0),
      subMillisecondFractionBits: fractionBits,
    });
    const bytes = bytesOf(generator);
    const prefix = payloadPrefixOf(bytes);
    expect(generator.payloadLayout).toEqual({
      subMillisecondFractionBits: fractionBits,
      counterBits: 42 - fractionBits,
    });
    expect(Math.floor(prefix / 2 ** (42 - fractionBits))).toBe(
      Math.floor(0.75 * 2 ** fractionBits),
    );
  });

  it("sorts after the prior UUID when the clock advances within one millisecond", () => {
    let now = 100.25;
    const generator = createUuidV7Generator({
      readUnixMs: () => now,
      fillRandom: constantFill(0),
      subMillisecondFractionBits: 12,
    });
    const first = bytesOf(generator);
    now = 100.75;
    const second = bytesOf(generator);
    expect(timestampOf(second)).toBe(100);
    expectAfter(second, first);
  });

  it("sorts after the prior UUID when the fractional clock reading moves backward", () => {
    let now = 100.75;
    const generator = createUuidV7Generator({
      readUnixMs: () => now,
      fillRandom: constantFill(0),
      subMillisecondFractionBits: 12,
    });
    const first = bytesOf(generator);
    now = 100.25;
    const second = bytesOf(generator);
    expect(timestampOf(second)).toBe(100);
    expectAfter(second, first);
  });

  it("advances logical time when a fraction bucket exhausts its counter", () => {
    const generator = createUuidV7Generator({
      readUnixMs: fixedClock(100.25),
      fillRandom: constantFill(0xff),
      subMillisecondFractionBits: 12,
    });
    const first = bytesOf(generator);
    const second = bytesOf(generator);
    expect(timestampOf(second)).toBe(100);
    expect(Math.floor(payloadPrefixOf(second) / 2 ** 30)).toBe(
      Math.floor(payloadPrefixOf(first) / 2 ** 30) + 1,
    );
  });

  it("borrows the next millisecond when the last fraction bucket exhausts", () => {
    const generator = createUuidV7Generator({
      readUnixMs: fixedClock(100 + (2 ** 12 - 1) / 2 ** 12),
      fillRandom: constantFill(0xff),
      subMillisecondFractionBits: 12,
    });
    const first = bytesOf(generator);
    const second = bytesOf(generator);
    expect(timestampOf(first)).toBe(100);
    expect(timestampOf(second)).toBe(101);
    expectAfter(second, first);
  });

  it("strictly increases while the readUnixMs stands still", () => {
    const generator = createUuidV7Generator({
      readUnixMs: fixedClock(1_700_000_000_000),
      fillRandom: constantFill(0x00),
    });
    let previous = bytesOf(generator);
    for (let i = 0; i < 1_000; i += 1) {
      const current = bytesOf(generator);
      expectAfter(current, previous);
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
    expectAfter(after, before);
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
    expectAfter(recovered, first);
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
    expectAfter(second, first);
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
    const bytes = generator.generateUuidV7Bytes({ at: ms });
    if (bytes instanceof Error) throw bytes;
    expect(timestampOf(bytes)).toBe(ms);
  });

  it("uses the best fraction the selected payload layout can represent", () => {
    const generator = createUuidV7Generator({
      readUnixMs: fixedClock(1),
      fillRandom: constantFill(0x00),
      subMillisecondFractionBits: 12,
    });
    const bytes = generator.generateUuidV7Bytes({ at: 1.75 });
    if (bytes instanceof Error) throw bytes;
    expect(timestampOf(bytes)).toBe(1);
    expect(Math.floor(payloadPrefixOf(bytes) / 2 ** 30)).toBe(Math.floor(0.75 * 2 ** 12));
  });

  it.each<[UuidV7Instant, number, number]>([
    [1.5, 1, 2048],
    [0.244_140_624_999_999_97, 0, 999],
    [0.244_140_625, 0, 1000],
    [{ epochMilliseconds: 1.25 }, 1, 1024],
    [{ epochNanoseconds: 1_999_999n }, 1, 4095],
    [{ seconds: 0, nanoseconds: 244_140 }, 0, 999],
    [{ seconds: 0, nanoseconds: 244_141 }, 0, 1000],
    ["1970-01-01T00:00:00.000244140625Z", 0, 1000],
    ["1970-01-01T00:00:00.000244141Z", 0, 1000],
    ["1970-01-01T00:00:00.000244140624999999999Z", 0, 999],
    ["1970-01-01T01:00:00.000244141+01:00", 0, 1000],
    [new Date(1), 1, 0],
  ])("normalizes %o to millisecond %d and fraction bucket %d", (at, unixMs, fraction) => {
    const generator = createUuidV7Generator({
      fillRandom: constantFill(0x00),
      subMillisecondFractionBits: 12,
    });
    const bytes = generator.generateUuidV7Bytes({ at });
    if (bytes instanceof Error) throw bytes;
    expect(timestampOf(bytes)).toBe(unixMs);
    expect(Math.floor(payloadPrefixOf(bytes) / 2 ** 30)).toBe(fraction);
  });

  // NaN and Infinity matter because runtime-native validation is not this portable contract. Bun
  // rejects them today, but runtime behavior is re-probed on update rather than assumed here.
  it.each([-1, NaN, Infinity, 2 ** 48])("rejects the instant %d", (ms) => {
    const generator = createUuidV7Generator({
      readUnixMs: fixedClock(1),
      fillRandom: constantFill(0x00),
    });
    expect(generator.generateUuidV7({ at: ms })).toBeInstanceOf(Error);
  });

  it("joins explicit instants to the created generator's ordered sequence", () => {
    const generator = createUuidV7Generator({
      readUnixMs: fixedClock(1_700_000_000_000),
      fillRandom: constantFill(0x00),
      subMillisecondFractionBits: 12,
    });
    const instants = [
      { epochNanoseconds: 100_250_000n },
      { epochNanoseconds: 100_250_000n },
      { epochNanoseconds: 100_750_000n },
      { epochNanoseconds: 99_500_000n },
    ] as const;
    const generated = instants.map((at) => {
      const bytes = generator.generateUuidV7Bytes({ at });
      if (bytes instanceof Error) throw bytes;
      return bytes;
    });
    for (let index = 1; index < generated.length; index += 1)
      expectAfter(generated[index] as Uint8Array, generated[index - 1] as Uint8Array);
  });

  it("does not coordinate explicit instants when sequential generation is disabled", () => {
    const generator = createUuidV7Generator({
      coordinateExplicitInstants: false,
      fillRandom: constantFill(0x00),
      subMillisecondFractionBits: 12,
    });
    const at = { epochNanoseconds: 100_750_000n } as const;
    const first = generator.generateUuidV7Bytes({ at });
    const second = generator.generateUuidV7Bytes({ at });
    if (first instanceof Error) throw first;
    if (second instanceof Error) throw second;
    expect(second).toEqual(first);
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
  it("accepts an empty options object and identifies unknown option names", () => {
    const generator = createUuidV7Generator({
      readUnixMs: fixedClock(1),
      fillRandom: constantFill(0x00),
    });
    expect(generator.generateUuidV7Bytes({})).toBeInstanceOf(Uint8Array);
    expect(
      Reflect.apply(generator.generateUuidV7Bytes, undefined, [{ outputOffsetTypo: 0 }]),
    ).toMatchObject({
      code: "invalid_options",
      message: "Unknown UUIDv7 byte generation option: outputOffsetTypo.",
    });
  });

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
