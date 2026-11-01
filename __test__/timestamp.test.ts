import { describe, expect, it } from "vitest";
import {
  extractUuidV7Payload,
  UUID_V7_TEST_MASK,
  uuidV7StringBounds,
  uuidV7ByteBounds,
  bytesToUuidString,
  UUID_TEXT_UPPERCASE,
  uuidStringToBytes,
  extractUuidV7UnixMs,
  generateUuidV7Bytes,
  uuidBytesToPlainSlug,
  createUuidV7MaskingCodec as createCodec,
} from "../src/index";
import type { UuidV7MaskingCodecOptions } from "../src/index";
import { unwrap } from "../dev/unwrap";
import { TEST_SENTINELS } from "./sentinel-fixtures";
import { SAMPLE_V7_A, SAMPLE_V4 } from "./uuid-input-fixtures";

const createUuidV7MaskingCodec = (options: UuidV7MaskingCodecOptions) =>
  unwrap(createCodec(options));

/** Zeroed but for the version and variant bytes, placed so a v7 appears to begin at `offset`. */
const v7PatternAt = (length: number, offset: number) => {
  const bytes = new Uint8Array(length);
  bytes[offset + 6] = 0x70;
  bytes[offset + 8] = 0x80;
  return bytes;
};

const uuidV7WithPayload = (unixMs: number, payload: bigint) => {
  const bytes = unwrap(generateUuidV7Bytes({ at: unixMs }));
  bytes[6] = 0x70 | Number((payload >> 70n) & 0x0fn);
  bytes[7] = Number((payload >> 62n) & 0xffn);
  bytes[8] = 0x80 | Number((payload >> 56n) & 0x3fn);
  for (let index = 9; index < 16; index++)
    bytes[index] = Number((payload >> BigInt((15 - index) * 8)) & 0xffn);
  return bytes;
};

describe("UUIDv7 timestamp extraction", () => {
  it("interprets only the caller-declared payload fields and preserves the rest", () => {
    const fraction = 0xa5bn;
    const counter = 0x2a55n;
    const remaining = 0x1234_5678_9abcn;
    const payload = (fraction << 62n) | (counter << 48n) | remaining;
    const uuid = uuidV7WithPayload(1_700_000_000_123, payload);
    const layout = { subMillisecondFractionBits: 12, counterBits: 14 };

    expect(extractUuidV7Payload(uuid, layout)).toEqual({
      unixMs: 1_700_000_000_123,
      subMillisecondFraction: { value: 0xa5b, bits: 12 },
      counter: { value: 0x2a55n, bits: 14 },
      remaining: { value: remaining, bits: 48 },
    });
    expect(extractUuidV7Payload(uuid, { subMillisecondFractionBits: 0, counterBits: 0 })).toEqual({
      unixMs: 1_700_000_000_123,
      subMillisecondFraction: undefined,
      counter: undefined,
      remaining: { value: payload, bits: 74 },
    });
    const codec = createUuidV7MaskingCodec({ mask: UUID_V7_TEST_MASK });
    expect(codec.extractMaskedUuidV7Payload(unwrap(codec.uuidToMaskedSlug(uuid)), layout)).toEqual(
      extractUuidV7Payload(uuid, layout),
    );

    for (let bit = 0n; bit < 74n; bit++) {
      const oneBit = 1n << bit;
      expect(
        unwrap(
          extractUuidV7Payload(uuidV7WithPayload(0, oneBit), {
            subMillisecondFractionBits: 0,
            counterBits: 0,
          }),
        ).remaining.value,
      ).toBe(oneBit);
    }
  });

  it("rejects layouts that cannot fit the UUIDv7 payload", () => {
    const uuid = uuidV7WithPayload(0, 0n);
    expect(
      extractUuidV7Payload(uuid, { subMillisecondFractionBits: 13, counterBits: 0 }),
    ).toMatchObject({
      code: "invalid_options",
      message: "subMillisecondFractionBits must be a whole number from 0 through 12; got 13.",
    });
    expect(
      extractUuidV7Payload(uuid, { subMillisecondFractionBits: 12, counterBits: 63 }),
    ).toMatchObject({
      code: "invalid_options",
      message:
        "counterBits must be a whole number from 0 through 62 when subMillisecondFractionBits is 12; got 63.",
    });
  });

  it("constructs inclusive UUIDv7 bounds without generating identifiers", () => {
    expect(uuidV7StringBounds(0)).toEqual({
      startInclusive: "00000000-0000-7000-8000-000000000000",
      endInclusive: "00000000-0000-7fff-bfff-ffffffffffff",
    });
    // Every timestamp byte differs, so a swapped, dropped, or unmasked byte changes the text.
    expect(uuidV7StringBounds(1, 0x0123_4567_89ab)).toEqual({
      startInclusive: "00000000-0001-7000-8000-000000000000",
      endInclusive: "01234567-89ab-7fff-bfff-ffffffffffff",
    });
    expect(uuidV7StringBounds(0xffff_ffff_ffff)).toEqual({
      startInclusive: "ffffffff-ffff-7000-8000-000000000000",
      endInclusive: "ffffffff-ffff-7fff-bfff-ffffffffffff",
    });
    expect(uuidV7StringBounds(0, UUID_TEXT_UPPERCASE)).toEqual({
      startInclusive: "00000000-0000-7000-8000-000000000000",
      endInclusive: "00000000-0000-7FFF-BFFF-FFFFFFFFFFFF",
    });
  });

  it("owns byte bounds and rejects invalid or inverted intervals", () => {
    const bounds = unwrap(uuidV7ByteBounds(0));
    expect(bytesToUuidString(bounds.startInclusive)).toBe("00000000-0000-7000-8000-000000000000");
    expect(bytesToUuidString(bounds.endInclusive)).toBe("00000000-0000-7fff-bfff-ffffffffffff");
    const next = unwrap(uuidV7ByteBounds(0));
    bounds.startInclusive.fill(0);
    expect(bytesToUuidString(bounds.endInclusive)).toBe("00000000-0000-7fff-bfff-ffffffffffff");
    bounds.endInclusive.fill(0);
    expect(bytesToUuidString(next.startInclusive)).toBe("00000000-0000-7000-8000-000000000000");
    expect(bytesToUuidString(next.endInclusive)).toBe("00000000-0000-7fff-bfff-ffffffffffff");
    for (const [start, end] of [[-1], [1.5], [0, 0x1_0000_0000_0000], [2, 1]]) {
      const result =
        end === undefined
          ? uuidV7StringBounds(start as number)
          : uuidV7StringBounds(start as number, end);
      expect(result).toMatchObject({ code: "invalid_timestamp" });
    }
    expect(uuidV7StringBounds(0, "titlecase" as never)).toMatchObject({
      code: "invalid_options",
    });
  });

  // The defect this pins is silent rather than loud: a v4's first six bytes are random, so the
  // old signature returned a confident date drawn from the next nine thousand years instead of
  // reporting the wrong version. Anything built on it — a timestamp window, an audit trail —
  // accepted or rejected by coin flip while every type checked out.
  it("refuses a UUIDv4 rather than reading its random bytes as a date", () => {
    const v4 = uuidStringToBytes(SAMPLE_V4);
    if (v4 instanceof Error) throw v4;
    expect(extractUuidV7UnixMs(v4)).toBeInstanceOf(Error);
  });

  it("refuses a buffer too short to hold a UUID at the given offset", () => {
    // Every buffer here carries a valid version and variant AT THE OFFSET ASKED FOR, so the bounds
    // check is the only thing that can reject it. That matters: an all-zero buffer is rejected by
    // the version check instead, which is how the first draft of this test passed unchanged against
    // an implementation carrying no bounds check at all — proved by deleting the check and watching
    // it stay green. The three cases are three distinct branches: past the end, past the end only
    // once the offset is added, and a negative offset that stays inside the length.
    expect(extractUuidV7UnixMs(v7PatternAt(15, 0))).toBeInstanceOf(Error);
    expect(extractUuidV7UnixMs(v7PatternAt(16, 1), 1)).toBeInstanceOf(Error);
    expect(extractUuidV7UnixMs(v7PatternAt(16, -1), -1)).toBeInstanceOf(Error);
  });

  it("reads back the exact instant a UUID was minted at, at any offset", () => {
    // Explicit-time generation is the independent oracle: the instant is chosen here, not read back from
    // whatever the generator happened to produce, so the two must agree on the 48-bit layout.
    const instant = 1_700_000_000_123;
    const buffer = new Uint8Array(32);
    const written = generateUuidV7Bytes({ at: instant, output: buffer, outputOffset: 16 });
    if (written instanceof Error) throw written;
    expect(extractUuidV7UnixMs(buffer, 16)).toBe(instant);
  });

  it("reads the same instant from UUID text and both plain slug spellings", () => {
    const instant = 1_700_000_000_123;
    const uuid = unwrap(generateUuidV7Bytes({ at: instant }));
    const text = unwrap(bytesToUuidString(uuid));
    expect(extractUuidV7UnixMs(text)).toBe(instant);
    expect(extractUuidV7UnixMs(unwrap(uuidBytesToPlainSlug(uuid)))).toBe(instant);
    expect(extractUuidV7UnixMs(unwrap(uuidBytesToPlainSlug(uuid, "base32hex")))).toBe(instant);
  });

  it("uses the codec key to read masked and sentinel timestamps", () => {
    const codec = createUuidV7MaskingCodec({
      mask: UUID_V7_TEST_MASK,
      sentinels: TEST_SENTINELS,
    });
    const instant = unwrap(extractUuidV7UnixMs(TEST_SENTINELS[0].uuid));
    const masked = unwrap(codec.uuidToMaskedSlug(SAMPLE_V7_A));
    const epoch = unwrap(codec.uuidToMaskedSlug("00000000-0000-7000-8000-000000000000"));
    const sentinel = codec.sentinels[0];
    if (!sentinel) throw new Error("Expected configured sentinel");
    expect(codec.extractMaskedUuidV7UnixMs(masked)).toBe(extractUuidV7UnixMs(SAMPLE_V7_A));
    expect(codec.extractMaskedUuidV7UnixMs(epoch)).toBe(0);
    expect(codec.extractMaskedUuidV7UnixMs(sentinel.slug)).toBe(instant);
  });
});
