// SPDX-License-Identifier: Apache-2.0

import { UuidSlugError } from "./errors";
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

export const isValidUuidV7Timestamp = (ms: number): boolean =>
  Number.isFinite(ms) && ms >= 0 && ms <= MAX_TIMESTAMP;

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
    if (offset < 0 || offset + 16 > target.length)
      return new UuidSlugError("invalid_buffer", "Output buffer is too small.");
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
      if (!isValidUuidV7Timestamp(timestamp))
        return new UuidSlugError(
          "invalid_timestamp",
          `UUIDv7 timestamp must be a whole number of milliseconds in 0..${MAX_TIMESTAMP}.`,
        );
      options.fillRandom(random);
      ms = Math.trunc(timestamp);
      sequenceHi = seedHi(random);
      sequenceLo = seedLo(random);
    } else {
      const now = Math.trunc(clock());
      if (lastMs < 0 || now > lastMs) reseed(now);
      else {
        counterLo = (counterLo + 1) >>> 0;
        if (counterLo === 0) counterHi += 1;
        // Past 42 bits the sequence no longer fits `rand_a` plus the borrowed `rand_b` bits.
        // Borrowing the next millisecond keeps ids ordered and unique rather than wrapping into
        // values this millisecond has already issued.
        if (counterHi > 0x3ff) reseed(lastMs + 1);
        else options.fillRandom(random);
      }
      ms = lastMs;
      sequenceHi = counterHi;
      sequenceLo = counterLo;
    }
    const uuid = target.subarray(offset, offset + 16);
    writeTimestamp(uuid, ms);
    writeCounter(uuid, sequenceHi, sequenceLo);
    target[offset + 12] = random[12] ?? 0;
    target[offset + 13] = random[13] ?? 0;
    target[offset + 14] = random[14] ?? 0;
    target[offset + 15] = random[15] ?? 0;
    return target;
  }

  return {
    uuidV7() {
      const result = bytes();
      if (result instanceof Error) throw result;
      const formatted = formatUuid(result);
      if (formatted instanceof Error) throw formatted;
      return formatted as UuidV7String;
    },
    uuidV7Bytes: bytes,
  };
}

export function createRuntimeGenerator(runtime: Runtime): UuidV7Generator {
  const fallback = createUuidV7Generator({ fillRandom: runtime.fillRandom });
  return {
    uuidV7() {
      if (!runtime.uuidV7) return fallback.uuidV7();
      try {
        return runtime.uuidV7() as UuidV7String;
      } catch {
        return fallback.uuidV7();
      }
    },
    uuidV7Bytes(out?: Uint8Array, offset = 0) {
      if (!runtime.uuidV7Bytes) return fallback.uuidV7Bytes(out, offset);
      try {
        return runtime.uuidV7Bytes(out, offset);
      } catch (cause) {
        return new UuidSlugError("rng_unavailable", "Runtime UUIDv7 byte generation failed.", {
          cause,
        });
      }
    },
  };
}
