import { UuidSlugError } from "./errors";
import type { UuidV7Generator, UuidV7String } from "./types";
import { formatUuid } from "./uuid";
import type { Runtime } from "./runtime/types";

export interface UuidV7GeneratorOptions {
  readonly clock?: () => number;
  readonly fillRandom: (bytes: Uint8Array) => void;
}

function writeTimestamp(bytes: Uint8Array, ms: number) {
  let value = Math.trunc(ms);
  for (let i = 5; i >= 0; i -= 1) {
    bytes[i] = value & 0xff;
    value = Math.floor(value / 256);
  }
}

function writeCounter(bytes: Uint8Array, counter: bigint) {
  bytes[6] = 0x70 | Number((counter >> 38n) & 0x0fn);
  bytes[7] = Number((counter >> 30n) & 0xffn);
  bytes[8] = 0x80 | Number((counter >> 24n) & 0x3fn);
  bytes[9] = Number((counter >> 16n) & 0xffn);
  bytes[10] = Number((counter >> 8n) & 0xffn);
  bytes[11] = Number(counter & 0xffn);
}

function readCounterSeed(bytes: Uint8Array) {
  return (
    (BigInt(bytes[0] ?? 0) << 34n) |
    (BigInt(bytes[1] ?? 0) << 26n) |
    (BigInt(bytes[2] ?? 0) << 18n) |
    (BigInt(bytes[3] ?? 0) << 10n) |
    (BigInt(bytes[4] ?? 0) << 2n) |
    (BigInt(bytes[5] ?? 0) & 0x03n)
  );
}

export function createUuidV7Generator(
  options: UuidV7GeneratorOptions,
): UuidV7Generator {
  const clock = options.clock ?? Date.now;
  const random = new Uint8Array(16);
  let lastMs = -1;
  let counter = 0n;

  function reseed(ms: number) {
    options.fillRandom(random);
    lastMs = ms;
    counter = readCounterSeed(random);
  }

  function bytes(out?: Uint8Array, offset = 0): Error | Uint8Array {
    const target = out ?? new Uint8Array(16);
    if (offset < 0 || offset + 16 > target.length)
      return new UuidSlugError("invalid_buffer", "Output buffer is too small.");
    const now = Math.trunc(clock());
    if (lastMs < 0 || now > lastMs) reseed(now);
    else {
      counter += 1n;
      if (counter > 0x3ffffffffffn) reseed(lastMs + 1);
      else options.fillRandom(random);
    }
    const uuid = target.subarray(offset, offset + 16);
    writeTimestamp(uuid, lastMs);
    writeCounter(uuid, counter);
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
        return new UuidSlugError(
          "rng_unavailable",
          "Runtime UUIDv7 byte generation failed.",
          { cause },
        );
      }
    },
  };
}
