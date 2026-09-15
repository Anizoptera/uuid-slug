import { describe, expect, it } from "vitest";
import { runInNewContext } from "node:vm";
import {
  uuidBytesToPlainSlug,
  bytesToUuidString,
  MAX_UUID,
  NIL_UUID,
  UUID_TEXT_LOWERCASE,
  UUID_TEXT_UPPERCASE,
  createCustomUuidV7Mask,
  deriveUuidV7Mask,
  createUuidV7MaskingCodec as createCodec,
  extractUuidV7Payload,
  extractUuidV7UnixMs,
  extractUuidVersion,
  parseUuid,
  isPlainUuidV7Slug,
  isUuidString,
  isUuidText,
  isUuidV4Text,
  isUuidV4String,
  isUuidV7String,
  isUuidV7Text,
  isUuidSlugError,
  plainSlugToUuidBytes,
  plainSlugToUuidString,
  uuidStringToBytes,
  UUID_V7_TEST_MASK,
  uuidToString,
  uuidToBytes,
  uuidToPlainSlug,
  uuidStringToPlainSlug,
  generateUuidV4Bytes,
  generateUuidV4,
  generateUuidV4WithRandomFill,
  generatePlainUuidV4Slug,
  generateUuidV7Bytes,
  generateUuidV7,
  generateUuidV7Value,
  uuidV7Bounds,
  uuidV7ByteBounds,
  createUuidV7Generator,
  createUuidV7GeneratorWithRandomFill,
  generatePlainUuidV7Slug,
  generateUuidV7WithPlainSlug,
  INVALID_UUID_VERSION,
  UuidSlugError,
  validateUuidV7Timestamp,
  validatePlainUuidV7SlugUnixMs,
} from "../src/index";
import type { SlugAlphabet, UuidV7MaskingCodecOptions } from "../src/index";
import { unwrap } from "../dev/unwrap";
import { TEST_SENTINELS } from "./sentinel-fixtures";

const SAMPLE_V7_A = "01987008-ef3e-7f69-b677-22ec1a5bbdb2";
const SAMPLE_V7_B = "01987bbb-178b-7858-93e8-fc5e5444913b";
const SAMPLE_V4 = "b1ba599d-4844-4bb0-a1ee-ac0aeb8875f5";
const FILL_WITH_ZEROS = (bytes: Uint8Array) => {
  bytes.fill(0);
};
const BOXED_VALID_NIL_UUID_STRING = new String(NIL_UUID);
const revokedInput = Proxy.revocable({}, {});
revokedInput.revoke();
const REJECTED_UUID_INPUTS = [
  undefined,
  null,
  false,
  0,
  -1,
  1.5,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  0n,
  Symbol("uuid"),
  {},
  { length: 16 },
  Object.create(null),
  {
    [Symbol.toPrimitive]: () => {
      throw new Error("must not coerce input");
    },
  },
  [],
  [0],
  () => SAMPLE_V7_A,
  /uuid/,
  new Date(0),
  new Map([["uuid", SAMPLE_V7_A]]),
  new Set([SAMPLE_V7_A]),
  Promise.resolve(SAMPLE_V7_A),
  new Error(SAMPLE_V7_A),
  BOXED_VALID_NIL_UUID_STRING,
  new SharedArrayBuffer(16),
  new Int8Array(16),
  new Uint16Array(8),
  new Float64Array(2),
  new Uint8Array(15),
  new Uint8Array(17),
  revokedInput.proxy,
  "",
  " ",
  "not-a-uuid",
  "g".repeat(32),
  "00000000-0000-0000-0000-00000000000g",
  "!".repeat(22),
  "!".repeat(26),
  "!".repeat(27),
  "AAAAAAAAAAAAAAAAAAAAA=",
];

const createUuidV7MaskingCodec = (options: UuidV7MaskingCodecOptions) =>
  unwrap(createCodec(options));

describe("UUID byte inputs", () => {
  it("accepts complete buffers and declared DataView ranges without mutation", () => {
    const bytes = unwrap(uuidStringToBytes(SAMPLE_V7_A));
    const backing = new ArrayBuffer(24);
    new Uint8Array(backing, 4, 16).set(bytes);
    const view = new DataView(backing, 4, 16);
    const before = new Uint8Array(backing).slice();
    const codec = createUuidV7MaskingCodec({ mask: UUID_V7_TEST_MASK });

    expect(bytesToUuidString(new Uint8Array(bytes).buffer)).toBe(SAMPLE_V7_A);
    expect(bytesToUuidString(view)).toBe(SAMPLE_V7_A);
    expect(uuidBytesToPlainSlug(view)).toBe(uuidBytesToPlainSlug(bytes));
    expect(uuidToString(view)).toBe(SAMPLE_V7_A);
    expect(uuidToBytes(view)).toEqual(bytes);
    expect(uuidToPlainSlug(view)).toBe(uuidToPlainSlug(bytes));
    expect(codec.uuidToMaskedSlug(view)).toBe(codec.uuidToMaskedSlug(bytes));
    expect(extractUuidV7UnixMs(view)).toBe(extractUuidV7UnixMs(bytes));
    expect(new Uint8Array(backing)).toEqual(before);
  });

  it("recognizes cross-realm inputs and rejects inexact, detached, or unrelated containers", () => {
    const bytes = unwrap(uuidStringToBytes(SAMPLE_V7_A));
    const foreign = runInNewContext(
      `(() => {
        const buffer = new ArrayBuffer(20);
        new Uint8Array(buffer, 2, 16).set([${[...bytes].join(",")}]);
        return { buffer: buffer.slice(2, 18), view: new DataView(buffer, 2, 16) };
      })()`,
    ) as { buffer: ArrayBuffer; view: DataView };
    const detached = bytes.buffer.slice(0);
    structuredClone(detached, { transfer: [detached] });

    expect(bytesToUuidString(foreign.buffer)).toBe(SAMPLE_V7_A);
    expect(bytesToUuidString(foreign.view)).toBe(SAMPLE_V7_A);
    for (const input of [
      new ArrayBuffer(15),
      new ArrayBuffer(17),
      new DataView(new ArrayBuffer(17)),
      new SharedArrayBuffer(16),
      new Uint16Array(8),
      detached,
    ]) {
      expect(uuidToString(input as never)).toMatchObject({ code: "invalid_buffer" });
    }
  });
});

describe("error classification", () => {
  it("accepts package errors across realms without accepting lookalike data or throwing", () => {
    const foreign = runInNewContext(
      'Object.assign(new Error("failure"), { name: "UuidSlugError", code: "invalid_uuid" })',
    ) as UuidSlugError;
    expect(isUuidSlugError(new UuidSlugError("invalid_uuid", "bad UUID"))).toBe(true);
    expect(isUuidSlugError(foreign)).toBe(true);
    const shadowed = new UuidSlugError("invalid_uuid", "shadowed marker");
    Object.defineProperty(shadowed, "__failure", {
      get() {
        throw new Error("marker blocked");
      },
    });
    expect(isUuidSlugError(shadowed)).toBe(true);
    expect(
      isUuidSlugError(
        Object.assign(new Error("legacy"), { name: "UuidRuntimeError", code: "invalid_uuid" }),
      ),
    ).toBe(false);
    expect(isUuidSlugError({ name: "UuidSlugError", code: "invalid_uuid" })).toBe(false);
    expect(
      isUuidSlugError(
        new Proxy(new Error("hostile"), {
          get() {
            throw new Error("getter failed");
          },
        }),
      ),
    ).toBe(false);
  });

  it("recognizes the package marker first and preserves failures through compatible calls", () => {
    const failure = new UuidSlugError("invalid_uuid", "stop here");
    expect(failure["__failure"]).toBe(true);
    expect(isUuidSlugError({ __failure: true })).toBe(true);

    const output = new Uint8Array(32).fill(0x5a);
    expect(uuidStringToPlainSlug(failure)).toBe(failure);
    expect(uuidToString(failure)).toBe(failure);
    expect(uuidBytesToPlainSlug(failure)).toBe(failure);
    expect(bytesToUuidString(failure)).toBe(failure);
    expect(uuidStringToBytes(failure, output, 8)).toBe(failure);
    expect(plainSlugToUuidBytes(failure, output, 8)).toBe(failure);
    expect(output.every((byte) => byte === 0x5a)).toBe(true);

    const codec = createCodec({ mask: UUID_V7_TEST_MASK });
    if (isUuidSlugError(codec)) throw codec;
    expect(createCodec({ mask: failure })).toBe(failure);
    expect(createCodec({ mask: UUID_V7_TEST_MASK, previousMasks: [failure] })).toBe(failure);
    expect(codec.uuidToMaskedSlug(failure)).toBe(failure);
    expect(codec.uuidToString(failure)).toBe(failure);
    expect(codec.uuidToBytes(failure, output, 8)).toBe(failure);
    expect(codec.extractMaskedUuidV7UnixMs(failure)).toBe(failure);
    expect(codec.validateMaskedUuidV7SlugUnixMs(failure, { maxTimestampDeltaMs: 0 })).toBe(failure);
    expect(codec.createUuidSlugMigrationDecoder().uuidToString(failure)).toBe(failure);
    expect(codec.createUuidSlugMigrationDecoder().uuidToStringCandidates(failure)).toBe(failure);
    expect(output.every((byte) => byte === 0x5a)).toBe(true);
  });

  it("does not inspect the error marker on a valid byte input", () => {
    const bytes = unwrap(uuidStringToBytes(SAMPLE_V7_A));
    Object.defineProperty(bytes, "__failure", {
      get() {
        throw new Error("success reached the error detector");
      },
    });
    const codec = createUuidV7MaskingCodec({ mask: UUID_V7_TEST_MASK });
    expect(codec.uuidToMaskedSlug(bytes)).toBe(codec.uuidToMaskedSlug(SAMPLE_V7_A));
  });
});

/** Compared with `<` because that is what a database index or a sorted listing does to these. */
const ascending = (slugs: readonly string[]) =>
  slugs.every((slug, i) => i === 0 || (slugs[i - 1] as string) < slug);

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
    expect(uuidV7Bounds(0)).toEqual({
      startInclusive: "00000000-0000-7000-8000-000000000000",
      endInclusive: "00000000-0000-7fff-bfff-ffffffffffff",
    });
    expect(uuidV7Bounds(1, 2)).toEqual({
      startInclusive: "00000000-0001-7000-8000-000000000000",
      endInclusive: "00000000-0002-7fff-bfff-ffffffffffff",
    });
    expect(uuidV7Bounds(0xffff_ffff_ffff)).toEqual({
      startInclusive: "ffffffff-ffff-7000-8000-000000000000",
      endInclusive: "ffffffff-ffff-7fff-bfff-ffffffffffff",
    });
    expect(uuidV7Bounds(0, UUID_TEXT_UPPERCASE)).toEqual({
      startInclusive: "00000000-0000-7000-8000-000000000000",
      endInclusive: "00000000-0000-7FFF-BFFF-FFFFFFFFFFFF",
    });
  });

  it("owns byte bounds and rejects invalid or inverted intervals", () => {
    const bounds = unwrap(uuidV7ByteBounds(0));
    expect(bytesToUuidString(bounds.startInclusive)).toBe("00000000-0000-7000-8000-000000000000");
    expect(bytesToUuidString(bounds.endInclusive)).toBe("00000000-0000-7fff-bfff-ffffffffffff");
    expect(bounds.startInclusive).not.toBe(bounds.endInclusive);
    for (const [start, end] of [[-1], [1.5], [0, 0x1_0000_0000_0000], [2, 1]]) {
      const result =
        end === undefined ? uuidV7Bounds(start as number) : uuidV7Bounds(start as number, end);
      expect(result).toMatchObject({ code: "invalid_timestamp" });
    }
    expect(uuidV7Bounds(0, "titlecase" as never)).toMatchObject({ code: "invalid_options" });
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

describe("plain UUID slugs", () => {
  it("preserves the full UUID space without masked timestamp limits", () => {
    for (const uuid of [
      "ffffffff-ffff-7fff-bfff-ffffffffffff",
      "ffffffff-ffff-4fff-bfff-ffffffffffff",
      "ffffffff-ffff-8fff-ffff-ffffffffffff",
      NIL_UUID,
    ])
      for (const alphabet of ["base64url", "base32hex"] as const) {
        const slug = unwrap(uuidStringToPlainSlug(uuid, alphabet));
        expect(uuidToString(slug)).toBe(uuid);
        expect(uuidBytesToPlainSlug(unwrap(uuidStringToBytes(uuid)), alphabet)).toBe(slug);
      }
  });

  it("exports canonical nil and max UUID values without assigning a UUID version", () => {
    expect(NIL_UUID).toBe("00000000-0000-0000-0000-000000000000");
    expect(MAX_UUID).toBe("ffffffff-ffff-ffff-ffff-ffffffffffff");
    const codec = createUuidV7MaskingCodec({ mask: UUID_V7_TEST_MASK });

    for (const uuid of [NIL_UUID, MAX_UUID]) {
      expect(uuidToString(uuid)).toBe(uuid);
      for (const alphabet of ["base64url", "base32hex"] as const) {
        const slug = unwrap(uuidToPlainSlug(uuid, alphabet));
        expect(plainSlugToUuidString(slug)).toBe(uuid);
      }
      expect(codec.uuidToMaskedSlug(uuid)).toMatchObject({ code: INVALID_UUID_VERSION });
    }
  });

  it("matches stable plain vectors", () => {
    expect(uuidStringToPlainSlug(SAMPLE_V7_A)).toBe("AZhwCO8-f2m2dyLsGlu9sg");
    expect(uuidStringToPlainSlug(SAMPLE_V7_B)).toBe("AZh7uxeLeFiT6PxeVESROw");
    expect(uuidStringToPlainSlug(SAMPLE_V4)).toBe("sbpZnUhES7Ch7qwK64h19Q");
    expect(uuidToString("sbpZnUhES7Ch7qwK64h19Q")).toBe(SAMPLE_V4);
  });

  it("returns UUID text and a plain slug for one generated value", () => {
    const generated = unwrap(generateUuidV7WithPlainSlug("base32hex"));
    expect(uuidToString(generated.slug)).toBe(generated.uuid);
  });

  it("preserves every byte value at every UUID position", () => {
    const bytes = new Uint8Array(16);
    for (let sample = 0; sample < 256; sample += 1) {
      for (let position = 0; position < bytes.length; position += 1)
        bytes[position] = (sample + position * 17) & 255;
      const uuid = unwrap(bytesToUuidString(bytes));
      for (const alphabet of ["base64url", "base32hex"] as const)
        expect(uuidStringToPlainSlug(uuid, alphabet)).toBe(uuidBytesToPlainSlug(bytes, alphabet));
    }
  });

  it("accepts and recognizes mixed-case hyphenated and compact UUID input", () => {
    const mixed = SAMPLE_V7_A.toUpperCase().replace("58B8", "58b8");
    const compact = mixed.replaceAll("-", "");
    expect(bytesToUuidString(unwrap(uuidStringToBytes(mixed)))).toBe(SAMPLE_V7_A);
    expect(bytesToUuidString(unwrap(uuidStringToBytes(compact)))).toBe(SAMPLE_V7_A);
    expect(uuidStringToPlainSlug(compact)).toBe(uuidStringToPlainSlug(SAMPLE_V7_A));
    expect(extractUuidV7UnixMs(mixed)).toBe(extractUuidV7UnixMs(SAMPLE_V7_A));
    expect(
      validateUuidV7Timestamp(compact, {
        maxTimestampDeltaMs: 0,
        referenceUnixMs: unwrap(extractUuidV7UnixMs(SAMPLE_V7_A)),
      }),
    ).toBe(SAMPLE_V7_A);
    expect(isUuidString(mixed)).toBe(false);
    expect(isUuidText(mixed)).toBe(true);
    expect(isUuidV7String(mixed)).toBe(false);
    expect(isUuidV7Text(mixed)).toBe(true);
    expect(isUuidV7Text(compact)).toBe(true);
    expect(isUuidV4String(compact)).toBe(false);
  });

  it("accepts UUID URNs and brace-wrapped UUID text through universal UUID inputs", () => {
    const mixed = SAMPLE_V7_A.toUpperCase().replace("58B8", "58b8");
    const accepted = [`UrN:UuId:${mixed}`, `{${mixed}}`];
    const codec = createUuidV7MaskingCodec({ mask: UUID_V7_TEST_MASK });

    for (const value of accepted) {
      expect(bytesToUuidString(unwrap(uuidStringToBytes(value)))).toBe(SAMPLE_V7_A);
      expect(uuidToString(value)).toBe(SAMPLE_V7_A);
      expect(uuidStringToPlainSlug(value)).toBe(uuidStringToPlainSlug(SAMPLE_V7_A));
      expect(extractUuidV7UnixMs(value)).toBe(extractUuidV7UnixMs(SAMPLE_V7_A));
      expect(isUuidText(value)).toBe(true);
      expect(isUuidV7Text(value)).toBe(true);
      expect(isUuidString(value)).toBe(false);
      expect(isUuidV7String(value)).toBe(false);
      expect(codec.uuidToString(value)).toBe(SAMPLE_V7_A);
    }
    expect(isUuidV4Text(`urn:uuid:${SAMPLE_V4.toUpperCase()}`)).toBe(true);
    expect(isUuidV7Text(`{${SAMPLE_V4}}`)).toBe(false);
    expect(uuidToString(`urn:uuid:${NIL_UUID}`)).toBe(NIL_UUID);
    expect(uuidToString(`{${MAX_UUID}}`)).toBe(MAX_UUID);
  });

  it("keeps UUID wrappers strict and source-specific slug inputs unchanged", () => {
    const compact = SAMPLE_V7_A.replaceAll("-", "");
    const invalid = [
      `urn:uuid:${compact}`,
      `{${compact}}`,
      `{urn:uuid:${SAMPLE_V7_A}}`,
      `urn:uuid:{${SAMPLE_V7_A}}`,
      `{{${SAMPLE_V7_A}}}`,
      `{${SAMPLE_V7_A}`,
      `${SAMPLE_V7_A}}`,
      `uuid:${SAMPLE_V7_A}`,
      ` urn:uuid:${SAMPLE_V7_A}`,
      `urn:uuid:${SAMPLE_V7_A} `,
    ];

    for (const value of invalid) {
      expect(uuidStringToBytes(value)).toBeInstanceOf(UuidSlugError);
      expect(isUuidText(value)).toBe(false);
      expect(isUuidV7Text(value)).toBe(false);
    }
    expect(plainSlugToUuidString(`urn:uuid:${SAMPLE_V7_A}`)).toBeInstanceOf(UuidSlugError);
    expect(plainSlugToUuidString(`{${SAMPLE_V7_A}}`)).toBeInstanceOf(UuidSlugError);
  });

  it("formats UUID bytes with built-in lowercase and uppercase presets", () => {
    const bytes = unwrap(uuidStringToBytes(SAMPLE_V7_A));
    const wrapped = new Uint8Array(20);
    wrapped.set(bytes, 2);
    expect(bytesToUuidString(bytes)).toBe(SAMPLE_V7_A);
    expect(bytesToUuidString(bytes, UUID_TEXT_LOWERCASE)).toBe(SAMPLE_V7_A);
    expect(bytesToUuidString(bytes, UUID_TEXT_UPPERCASE)).toBe(SAMPLE_V7_A.toUpperCase());
    expect(bytesToUuidString(wrapped, 2, UUID_TEXT_UPPERCASE)).toBe(SAMPLE_V7_A.toUpperCase());
    expect(bytesToUuidString(bytes, Symbol("titlecase") as never)).toMatchObject({
      code: "invalid_options",
    });
    expect(bytesToUuidString(bytes, "titlecase" as never)).toMatchObject({
      code: "invalid_options",
    });
  });

  it("applies one UUID text-case choice across generation, decoding, codecs, and validation", () => {
    const plain = unwrap(uuidStringToPlainSlug(SAMPLE_V7_A));
    expect(uuidToString(plain, UUID_TEXT_UPPERCASE)).toBe(SAMPLE_V7_A.toUpperCase());
    expect(
      validateUuidV7Timestamp(
        SAMPLE_V7_A.toUpperCase(),
        {
          maxTimestampDeltaMs: 0,
          referenceUnixMs: unwrap(extractUuidV7UnixMs(SAMPLE_V7_A)),
        },
        UUID_TEXT_LOWERCASE,
      ),
    ).toBe(SAMPLE_V7_A);

    expect(unwrap(generateUuidV4(UUID_TEXT_UPPERCASE))).toMatch(/^[0-9A-F-]+$/);
    expect(unwrap(generateUuidV7(UUID_TEXT_UPPERCASE))).toMatch(/^[0-9A-F-]+$/);
    expect(unwrap(generateUuidV7({ at: 0, textCase: UUID_TEXT_UPPERCASE }))).toMatch(
      /^[0-9A-F-]+$/,
    );
    expect(unwrap(generateUuidV7WithPlainSlug(UUID_TEXT_UPPERCASE)).uuid).toMatch(/^[0-9A-F-]+$/);

    const codec = createUuidV7MaskingCodec({
      mask: UUID_V7_TEST_MASK,
      sentinels: [{ name: "sample", uuid: SAMPLE_V7_A.toUpperCase().replaceAll("-", "") }],
    });
    const sentinelSlug = codec.sentinels[0]?.slug;
    if (sentinelSlug === undefined) throw new Error("Expected sentinel fixture.");
    expect(codec.uuidToString(sentinelSlug, UUID_TEXT_UPPERCASE)).toBe(SAMPLE_V7_A.toUpperCase());
    expect(unwrap(codec.generateUuidV7WithMaskedSlug(UUID_TEXT_UPPERCASE)).uuid).toMatch(
      /^[0-9A-F-]+$/,
    );
    const migration = codec.createUuidSlugMigrationDecoder({ acceptPlainSlug: true });
    expect(migration.uuidToString(plain, UUID_TEXT_UPPERCASE)).toBe(SAMPLE_V7_A.toUpperCase());
    expect(migration.uuidToStringCandidates(plain, UUID_TEXT_UPPERCASE)).toContain(
      SAMPLE_V7_A.toUpperCase(),
    );
  });

  it("generates UUIDv7 at a Date without caller normalization", () => {
    const instant = new Date("2026-09-15T12:34:56.789Z");
    const uuid = generateUuidV7({ at: instant });

    expect(extractUuidV7UnixMs(uuid)).toBe(instant.getTime());
  });

  it("generates UUIDv7 at bigint Unix milliseconds without caller conversion", () => {
    expect(extractUuidV7UnixMs(generateUuidV7({ at: 1_789_475_696_789n }))).toBe(1_789_475_696_789);
  });

  it("generates UUIDv7 from precise zoned timestamp text", () => {
    const expected = Date.parse("2026-09-15T12:34:56.789Z");

    expect(extractUuidV7UnixMs(generateUuidV7({ at: "2026-09-15T12:34:56.789Z" }))).toBe(expected);
    expect(extractUuidV7UnixMs(generateUuidV7({ at: "2026-09-15T13:34:56.789+01:00" }))).toBe(
      expected,
    );
    expect(generateUuidV7({ at: "2026-09-15T12:34:56" })).toMatchObject({
      code: "invalid_timestamp",
    });
    expect(extractUuidV7UnixMs(generateUuidV7({ at: "2026-09-15T12:34:56.789001Z" }))).toBe(
      expected,
    );
  });

  it("generates UUIDv7 from cross-realm and structural instant values", () => {
    const unixMs = 1_789_475_696_789;
    const crossRealmDate = runInNewContext(`new Date(${unixMs})`) as Date;
    const inputs = [
      crossRealmDate,
      { epochMilliseconds: BigInt(unixMs) },
      { epochNanoseconds: BigInt(unixMs) * 1_000_000n },
      { seconds: 1_789_475_696n, nanoseconds: 789_000_000 },
    ] as const;

    for (const at of inputs) expect(extractUuidV7UnixMs(generateUuidV7({ at }))).toBe(unixMs);
    expect(extractUuidV7UnixMs(generateUuidV7({ at: { epochNanoseconds: 1n } }))).toBe(0);
  });

  it.each([
    new Date(NaN),
    "2026-09-15T12:34:56",
    "2026-02-29T00:00:00Z",
    "2026-09-15T24:00:00Z",
    "2026-09-15T12:34:60Z",
    "2026-09-15T12:34:56-00:00",
    { epochMilliseconds: 1.5, epochNanoseconds: 1_600_000n },
    { epochMilliseconds: 1, seconds: 2 },
    { nanoseconds: 1 },
    { seconds: 0, nanoseconds: 1_000_000_000 },
  ])("rejects ambiguous or invalid instant %o", (at) => {
    expect(generateUuidV7({ at: at as never })).toMatchObject({ code: "invalid_timestamp" });
  });

  it("uses one at option across keyless UUIDv7 representations", () => {
    const at = new Date("2026-09-15T12:34:56.789Z");
    const expected = at.getTime();
    const output = new Uint8Array(20);
    const bytes = generateUuidV7Bytes({ at, output, outputOffset: 2 });
    const slug = generatePlainUuidV7Slug({ at, alphabet: "base32hex" });
    const pair = generateUuidV7WithPlainSlug({ at, textCase: UUID_TEXT_UPPERCASE });

    expect(bytes).toBe(output);
    expect(extractUuidV7UnixMs(output.subarray(2, 18))).toBe(expected);
    expect(extractUuidV7UnixMs(slug)).toBe(expected);
    expect(extractUuidV7UnixMs(pair instanceof Error ? pair : pair.uuid)).toBe(expected);
    expect(pair instanceof Error ? pair : pair.uuid).toMatch(/^[0-9A-F-]+$/);
  });

  it("rejects an unknown UUID text case before generation work", () => {
    const invalid = Symbol("titlecase") as never;
    let clockReads = 0;
    const generator = createUuidV7Generator({ readUnixMs: () => ++clockReads });
    expect(generator.generateUuidV7(invalid)).toMatchObject({ code: "invalid_options" });
    expect(generator.generateUuidV7({ at: 0, textCase: invalid })).toMatchObject({
      code: "invalid_options",
    });
    expect(clockReads).toBe(0);
    expect(generateUuidV4(invalid)).toMatchObject({ code: "invalid_options" });
    expect(generatePlainUuidV4Slug("base36" as never)).toMatchObject({ code: "invalid_options" });
    expect(generatePlainUuidV7Slug("base36" as never)).toMatchObject({ code: "invalid_options" });
    expect(generateUuidV7WithPlainSlug("base64url", invalid)).toMatchObject({
      code: "invalid_options",
    });
    expect(uuidToString(unwrap(uuidStringToPlainSlug(SAMPLE_V7_A)), invalid)).toMatchObject({
      code: "invalid_options",
    });
  });

  it("uses custom entropy only through explicitly named generation calls", () => {
    const first = generateUuidV4WithRandomFill(FILL_WITH_ZEROS);
    const second = generateUuidV4WithRandomFill(FILL_WITH_ZEROS);
    expect(first).toBe(second);
    expect(isUuidV4String(first)).toBe(true);

    const generator = createUuidV7GeneratorWithRandomFill(FILL_WITH_ZEROS, {
      readUnixMs: () => 123,
    });
    expect(extractUuidV7UnixMs(generator.generateUuidV7())).toBe(123);
    expect(createUuidV7Generator({ fillRandom: FILL_WITH_ZEROS } as never)).toMatchObject({
      code: "invalid_options",
    });
    expect(createUuidV7Generator({ subMillisecondFractionBits: 13 })).toMatchObject({
      code: "invalid_options",
      message: "Generator subMillisecondFractionBits must be a whole number from 0 through 12.",
    });
    expect(createUuidV7GeneratorWithRandomFill(null as never)).toMatchObject({
      code: "invalid_options",
    });
    let nestedV4: unknown;
    const outerV4 = generateUuidV4WithRandomFill((bytes) => {
      nestedV4 = generateUuidV4WithRandomFill(FILL_WITH_ZEROS);
      bytes.fill(0);
    });
    expect(outerV4).not.toBeInstanceOf(Error);
    expect(nestedV4).toMatchObject({ code: "rng_unavailable" });

    let reentrantGenerator!: ReturnType<typeof createUuidV7GeneratorWithRandomFill>;
    let nestedV7: unknown;
    reentrantGenerator = createUuidV7GeneratorWithRandomFill(
      (bytes) => {
        nestedV7 = reentrantGenerator.generateUuidV7();
        bytes.fill(0);
      },
      { readUnixMs: () => 123 },
    );
    expect(reentrantGenerator.generateUuidV7()).not.toBeInstanceOf(Error);
    expect(nestedV7).toMatchObject({ code: "rng_unavailable" });
  });

  it("rejects malformed clock rollback policies before reading the clock", () => {
    let clockReads = 0;
    const readUnixMs = () => ++clockReads;
    const invalidPolicies = [
      null,
      "preserve",
      { action: "preserve", toleranceMs: 0 },
      { action: "reset" },
      { action: "error", toleranceMs: -1 },
      { action: "error", toleranceMs: 0.5 },
      { action: "error", toleranceMs: Number.MAX_SAFE_INTEGER + 1 },
      { action: "continue" },
      { action: "reset", toleranceMs: 0, extra: true },
      revokedInput.proxy,
    ];
    for (const clockRollback of invalidPolicies)
      expect(createUuidV7Generator({ clockRollback, readUnixMs } as never)).toMatchObject({
        code: "invalid_options",
      });
    expect(clockReads).toBe(0);
  });

  it("extracts the UUID version field from every unmasked representation", () => {
    for (const value of [
      SAMPLE_V4,
      unwrap(uuidStringToBytes(SAMPLE_V4)),
      unwrap(uuidStringToPlainSlug(SAMPLE_V4)),
    ])
      expect(extractUuidVersion(value)).toBe(4);
    expect(extractUuidVersion(NIL_UUID)).toBe(0);
    expect(extractUuidVersion(MAX_UUID)).toBe(15);
    expect(extractUuidVersion("not-a-uuid")).toMatchObject({ code: "invalid_uuid" });
  });

  it("parses one immutable UUID for repeated inspection and conversion", () => {
    const uuid = unwrap(parseUuid(SAMPLE_V7_A));
    expect(Object.isFrozen(uuid)).toBe(true);
    expect(uuid.version).toBe(7);
    expect(uuid.inspect()).toEqual({
      uuid: SAMPLE_V7_A,
      version: 7,
      variant: "rfc",
      unixMs: 1754226290494,
      isNil: false,
      isMax: false,
    });
    expect(uuid.toString()).toBe(SAMPLE_V7_A);
    expect(uuid.toString(UUID_TEXT_UPPERCASE)).toBe(SAMPLE_V7_A.toUpperCase());
    expect(uuid.toPlainSlug()).toBe(uuidStringToPlainSlug(SAMPLE_V7_A));
    expect(uuidToString(uuid)).toBe(SAMPLE_V7_A);
    expect(uuidToPlainSlug(uuid)).toBe(uuid.toPlainSlug());
    expect(extractUuidVersion(uuid)).toBe(7);
    expect(JSON.stringify(uuid)).toBe(JSON.stringify(SAMPLE_V7_A));
  });

  it("keeps parsed UUID bytes private and caller-owned writes atomic", () => {
    const source = unwrap(uuidStringToBytes(SAMPLE_V4));
    const uuid = unwrap(parseUuid(source));
    source.fill(0);
    expect(uuid.toString()).toBe(SAMPLE_V4);

    const copy = uuid.toBytes();
    copy.fill(0);
    expect(uuid.toString()).toBe(SAMPLE_V4);

    const output = new Uint8Array(20).fill(0x5a);
    expect(uuid.toBytes(output, 2)).toBe(output);
    expect(bytesToUuidString(output, 2)).toBe(SAMPLE_V4);
    const before = output.slice();
    expect(uuid.toBytes(output, 5)).toMatchObject({ code: "invalid_buffer" });
    expect(output).toEqual(before);
  });

  it("diagnoses nil, max, and non-RFC layouts without inventing timestamps", () => {
    expect(unwrap(parseUuid(NIL_UUID)).inspect()).toMatchObject({
      version: 0,
      variant: "ncs",
      unixMs: undefined,
      isNil: true,
    });
    expect(unwrap(parseUuid(MAX_UUID)).inspect()).toMatchObject({
      version: 15,
      variant: "future",
      unixMs: undefined,
      isMax: true,
    });
    const bytes = unwrap(uuidStringToBytes(SAMPLE_V7_A));
    bytes[8] = 0;
    expect(unwrap(parseUuid(bytes)).inspect()).toMatchObject({
      version: 7,
      variant: "ncs",
      unixMs: undefined,
    });
  });

  it("keeps top-level and masking-codec parsing behavior symmetric", () => {
    const codec = unwrap(createCodec({ mask: UUID_V7_TEST_MASK }));
    const masked = unwrap(codec.uuidToMaskedSlug(SAMPLE_V7_A));
    const direct = unwrap(parseUuid(masked, codec));
    const owned = unwrap(codec.parseUuid(masked));
    expect(direct.toString()).toBe(SAMPLE_V7_A);
    expect(owned.toString()).toBe(SAMPLE_V7_A);
    expect(direct.toMaskedSlug()).toBe(masked);
    expect(owned.toMaskedSlug()).toBe(masked);
    expect(uuidToString(owned)).toBe(SAMPLE_V7_A);
    expect(codec.uuidToMaskedSlug(owned)).toBe(masked);
  });

  it("retains generated layout and an explicit codec without retaining generator state", () => {
    const codec = unwrap(createCodec({ mask: UUID_V7_TEST_MASK }));
    const generator = createUuidV7GeneratorWithRandomFill(FILL_WITH_ZEROS, {
      readUnixMs: () => 123.5,
      subMillisecondFractionBits: 12,
    });
    const generated = unwrap(generateUuidV7Value({ at: 123, generator, maskingCodec: codec }));
    expect(generated.version).toBe(7);
    expect(generated.toMaskedSlug()).not.toBeInstanceOf(Error);
    expect(unwrap(generated.extractV7Payload())).toMatchObject({
      unixMs: 123,
      subMillisecondFraction: { value: 0, bits: 12 },
    });
    expect(Object.keys(generated)).not.toContain("generator");
    expect(Object.keys(generated)).not.toContain("payloadLayout");

    const fromGenerator = unwrap(generator.generateUuidV7Value({ at: 124 }));
    const fromCodec = unwrap(codec.generateUuidV7Value({ at: 124, generator }));
    expect(fromCodec.toString() > fromGenerator.toString()).toBe(true);
    expect(unwrap(fromGenerator.extractV7Payload()).unixMs).toBe(124);
    expect(unwrap(fromCodec.extractV7Payload()).unixMs).toBe(124);
    expect(fromCodec.toMaskedSlug()).not.toBeInstanceOf(Error);

    const control = createUuidV7GeneratorWithRandomFill(FILL_WITH_ZEROS, {
      readUnixMs: () => 200,
    });
    const observed = createUuidV7GeneratorWithRandomFill(FILL_WITH_ZEROS, {
      readUnixMs: () => 200,
    });
    unwrap(control.generateUuidV7Value());
    unwrap(observed.generateUuidV7Value());
    unwrap(observed.generateUuidV7Value({ at: 100 }));
    expect(
      unwrap(observed.generateUuidV7Value()).toString() >
        unwrap(control.generateUuidV7Value()).toString(),
    ).toBe(true);
  });

  it("returns typed failures for malformed JavaScript UUID-value calls", () => {
    expect(Reflect.apply(parseUuid, undefined, [SAMPLE_V7_A, {}])).toMatchObject({
      code: "invalid_options",
    });
    const uuid = unwrap(parseUuid(SAMPLE_V7_A));
    // @ts-expect-error JavaScript can pass a text case that TypeScript rejects.
    expect(uuid.toString("mixed")).toMatchObject({
      code: "invalid_options",
    });
    // @ts-expect-error JavaScript can omit a codec that TypeScript requires.
    expect(uuid.toMaskedSlug()).toMatchObject({
      code: "invalid_options",
    });
    expect(Reflect.apply(generateUuidV7Value, undefined, [{ nope: true }])).toMatchObject({
      code: "invalid_options",
    });
    expect(Reflect.apply(generateUuidV7Value, undefined, [{ generator: 1 }])).toMatchObject({
      code: "invalid_options",
    });
    expect(
      Reflect.apply(generateUuidV7Value, undefined, [
        {
          generator: {
            payloadLayout: { subMillisecondFractionBits: 0, counterBits: 42 },
            generateUuidV7Bytes: () => new Uint8Array(16),
          },
        },
      ]),
    ).toMatchObject({ code: "invalid_uuid_version" });
    expect(Reflect.apply(generateUuidV7Value, undefined, [{ maskingCodec: {} }])).toMatchObject({
      code: "invalid_options",
    });
  });

  it("accepts uppercase base32hex input and returns canonical lowercase output", () => {
    const canonical = unwrap(uuidStringToPlainSlug(SAMPLE_V7_A, "base32hex"));
    expect(uuidToString(canonical.toUpperCase())).toBe(SAMPLE_V7_A);
    expect(isPlainUuidV7Slug(canonical.toUpperCase())).toBe(false);
  });

  it("keeps parser diagnostics on every invalid UUID hex position", () => {
    for (let index = 0; index < SAMPLE_V7_A.length; index += 1) {
      if (SAMPLE_V7_A[index] === "-") continue;
      const invalid = `${SAMPLE_V7_A.slice(0, index)}!${SAMPLE_V7_A.slice(index + 1)}`;
      for (const alphabet of ["base64url", "base32hex"] as const)
        expect(uuidStringToPlainSlug(invalid, alphabet)).toEqual(uuidStringToBytes(invalid));
    }
    const compact = SAMPLE_V7_A.replaceAll("-", "");
    const output = new Uint8Array(16).fill(0x5a);
    for (let index = 0; index < compact.length; index += 1) {
      const invalid = `${compact.slice(0, index)}!${compact.slice(index + 1)}`;
      expect(uuidStringToBytes(invalid, output)).toBeInstanceOf(Error);
      expect(output.every((byte) => byte === 0x5a)).toBe(true);
    }
    for (const invalid of [
      compact.slice(1),
      `${compact}0`,
      SAMPLE_V7_A.replace("-", "0"),
      `[${SAMPLE_V7_A}]`,
    ]) {
      expect(uuidStringToBytes(invalid, output)).toBeInstanceOf(Error);
      expect(output.every((byte) => byte === 0x5a)).toBe(true);
    }
    expect(extractUuidV7UnixMs(SAMPLE_V4.replaceAll("-", ""))).toMatchObject({
      code: "invalid_uuid_version",
    });
  });

  // A UUIDv7 leads with its 48-bit timestamp, so slugs sort by creation time exactly when the
  // alphabet's characters are in value order. That is the whole reason base32hex is offered.
  it("sorts base32hex slugs by creation time, which base64url cannot do", () => {
    // Spread across the encodable range so the ordering is decided by timestamp characters at
    // several positions rather than by one lucky byte. Tails are constant: this is a claim about
    // the timestamp prefix, and random tails would only add noise to it.
    //
    // The last instant is deliberate. base64url runs `A-Za-z0-9-_`, which is monotonic for its
    // first 52 values — `A` < `z` in ASCII too — and only inverts once a 6-bit group reaches 52
    // and encodes as `0`, which sorts BELOW `A`. 0x034000000000 is the smallest round instant
    // whose second character does that. Without it every base64url slug here sorts correctly and
    // the contrast below proves nothing.
    const instants = [1, 2 ** 12, 2 ** 20, 2 ** 26, 2 ** 31, 2 ** 34, 2 ** 38, 0x034000000000];
    const uuids = instants.map((ms) => {
      const hex = ms.toString(16).padStart(12, "0");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-7000-8000-000000000000`;
    });
    const slugsIn = (alphabet: SlugAlphabet) =>
      uuids.map((uuid) => {
        const slug = uuidStringToPlainSlug(uuid, alphabet);
        if (slug instanceof Error) throw slug;
        return String(slug);
      });

    expect(ascending(slugsIn("base32hex"))).toBe(true);
    // The falsifier. Without it this case passes against an implementation that ignores the
    // alphabet argument and returns base64url both times, which is precisely the way wiring a new
    // option fails.
    expect(ascending(slugsIn("base64url"))).toBe(false);
  });

  it("selects plain and masked slug alphabets independently", () => {
    // The option's boundary is the point of this case. Sentinels are matched against masked input,
    // and masked slugs are base64url by ruling, so a codec-wide alphabet that leaked into either
    // would make sentinels unrecognisable exactly where they are used.
    const codec = createUuidV7MaskingCodec({
      mask: { seed: "alpha-test-seed-0000" },
      sentinels: TEST_SENTINELS,
    });
    const base32Codec = createUuidV7MaskingCodec({
      mask: { seed: "alpha-test-seed-0000" },
      maskedSlugAlphabet: "base32hex",
      sentinels: TEST_SENTINELS,
    });
    expect(generatePlainUuidV7Slug("base32hex")).toHaveLength(26);
    expect(generatePlainUuidV4Slug("base32hex")).toHaveLength(26);
    expect(codec.generateMaskedUuidV7Slug()).toHaveLength(22);
    expect(codec.sentinels[0]?.slug).toHaveLength(22);
    expect(base32Codec.generateMaskedUuidV7Slug()).toHaveLength(27);
    expect(base32Codec.sentinels[0]?.slug).toHaveLength(26);
  });

  it("answers rather than crashing when JavaScript passes an alphabet name TypeScript forbids", () => {
    // The union makes this unreachable from TypeScript, so the cast is the only way to reach the
    // branch — and the branch exists because a JS caller would otherwise index `undefined`.
    expect(uuidStringToPlainSlug(SAMPLE_V4, "base16" as SlugAlphabet)).toBeInstanceOf(Error);
  });

  it("reads either alphabet back without being told which", () => {
    // Decoding takes no alphabet because the two lengths are disjoint. That is what lets a system
    // change alphabet without invalidating a single slug it has already handed out.
    for (const uuid of [SAMPLE_V7_A, SAMPLE_V4])
      for (const [alphabet, length] of [
        ["base64url", 22],
        ["base32hex", 26],
      ] as const) {
        const slug = uuidStringToPlainSlug(uuid, alphabet);
        if (slug instanceof Error) throw slug;
        expect(slug).toHaveLength(length);
        expect(uuidToString(String(slug))).toBe(uuid);
        expect(uuidToPlainSlug(slug, alphabet)).toBe(slug);
        expect(uuidToBytes(slug)).toEqual(uuidStringToBytes(uuid));
      }
  });

  it("rejects arbitrary JavaScript values at the keyless conversion boundary", () => {
    for (const convert of [uuidToString, uuidToBytes, uuidToPlainSlug])
      for (const input of REJECTED_UUID_INPUTS)
        expect(Reflect.apply(convert, undefined, [input])).toBeInstanceOf(UuidSlugError);

    const output = new Uint8Array(18).fill(0x5a);
    expect(uuidToBytes("not-a-uuid", output, 1)).toBeInstanceOf(UuidSlugError);
    expect(output).toEqual(new Uint8Array(18).fill(0x5a));
  });
});

describe("masked UUID slugs", () => {
  it("converts every supported UUID form without caller-managed intermediate values", () => {
    const codec = createUuidV7MaskingCodec({
      mask: { seed: "conversion-test-seed-0000" },
      sentinels: TEST_SENTINELS,
    });
    const plain = unwrap(uuidStringToPlainSlug(SAMPLE_V7_A));
    const masked = unwrap(codec.plainToMaskedUuidSlug(plain));
    const bytes = unwrap(uuidStringToBytes(SAMPLE_V7_A));

    for (const input of [SAMPLE_V7_A.toUpperCase(), bytes, plain, masked]) {
      expect(codec.uuidToString(input)).toBe(SAMPLE_V7_A);
      expect(codec.uuidToPlainSlug(input)).toBe(plain);
      expect(codec.uuidToMaskedSlug(input)).toBe(masked);
      expect(codec.uuidToBytes(input)).toEqual(bytes);
    }

    expect(codec.maskedToPlainUuidSlug(masked)).toBe(plain);
    expect(codec.maskedToPlainUuidSlug(masked, "base32hex")).toBe(
      uuidStringToPlainSlug(SAMPLE_V7_A, "base32hex"),
    );
    const sentinel = codec.sentinels[1];
    if (!sentinel) throw new Error("sentinel setup failed");
    expect(codec.plainToMaskedUuidSlug(sentinel.slug)).toBe(sentinel.slug);

    const failure = uuidStringToPlainSlug("not a UUID");
    expect(codec.plainToMaskedUuidSlug(failure)).toBe(failure);
    expect(codec.maskedToPlainUuidSlug(failure)).toBe(failure);
    expect(codec.plainToMaskedUuidSlug(uuidStringToPlainSlug(SAMPLE_V4))).toMatchObject({
      code: INVALID_UUID_VERSION,
    });

    for (const convert of [
      codec.uuidToString,
      codec.uuidToBytes,
      codec.uuidToPlainSlug,
      codec.uuidToMaskedSlug,
    ])
      for (const input of REJECTED_UUID_INPUTS)
        expect(Reflect.apply(convert, undefined, [input])).toBeInstanceOf(UuidSlugError);

    const output = new Uint8Array(18).fill(0x5a);
    expect(codec.uuidToBytes("not-a-uuid", output, 1)).toBeInstanceOf(UuidSlugError);
    expect(output).toEqual(new Uint8Array(18).fill(0x5a));
  });

  it("rejects a dual-valid base64url slug unless the requested result resolves its meaning", () => {
    const codec = createUuidV7MaskingCodec({ mask: { seed: "conversion-test-seed-0000" } });
    const ambiguousSlug = "EowJ-XN_V-JgtHXZUhgArg";

    expect(codec.uuidToString(ambiguousSlug)).toBeInstanceOf(UuidSlugError);
    expect(codec.uuidToBytes(ambiguousSlug)).toBeInstanceOf(UuidSlugError);
    expect(codec.uuidToPlainSlug(ambiguousSlug)).toBe(ambiguousSlug);
    expect(codec.uuidToMaskedSlug(ambiguousSlug)).toBe(ambiguousSlug);
    expect(plainSlugToUuidString(ambiguousSlug)).toBe("128c09f9-737f-57e2-60b4-75d9521800ae");
    expect(codec.maskedSlugToUuidString(ambiguousSlug)).toBe(
      "01987008-ef3e-7f69-b677-00000000000a",
    );
  });

  it("uses plain precomputed sentinel slugs for sentinel transmission", () => {
    // Sentinels stay readable by eye on purpose, so a masked codec is what makes the assertion
    // mean anything: it proves masking is bypassed for them rather than merely absent.
    const codec = createUuidV7MaskingCodec({
      mask: { seed: "sentinel-bypass-test-seed-0000" },
      sentinels: TEST_SENTINELS,
    });
    const [, anonymousUser, unknownUser] = codec.sentinels;
    if (!anonymousUser || !unknownUser) throw new Error("sentinel setup failed");
    expect(codec.sentinels.map((item) => item.slug)).toEqual([
      "AAAAAAAAcACAAAAAAAAAAA",
      "AAAAAAABcACAAAAAAAAAAA",
      "AAAAAAACcACAAAAAAAAAAA",
    ]);
    expect(codec.uuidToMaskedSlug(anonymousUser.uuid)).toBe("AAAAAAABcACAAAAAAAAAAA");
    expect(uuidToString(anonymousUser.slug)).toBe(anonymousUser.uuid);
    expect(uuidToPlainSlug(anonymousUser.slug)).toBe(anonymousUser.slug);
    expect(uuidToBytes(anonymousUser.slug)).toEqual(uuidStringToBytes(anonymousUser.uuid));
    expect(codec.uuidToString("AAAAAAACcACAAAAAAAAAAA")).toBe(unknownUser.uuid);
  });

  it("rejects a wrong mask unless the caller listed it as a previous one", () => {
    const first = deriveUuidV7Mask({ seed: "project-a-test-seed-0000" });
    const second = deriveUuidV7Mask({ seed: "project-b-test-seed-0000" });
    const third = deriveUuidV7Mask({ seed: "project-c-test-seed-0000" });
    if (first instanceof Error || second instanceof Error || third instanceof Error)
      throw new Error("mask creation failed");
    const a = createUuidV7MaskingCodec({ mask: first });
    const b = createUuidV7MaskingCodec({ mask: second });
    const slug = a.uuidToMaskedSlug(SAMPLE_V7_A);
    if (slug instanceof Error) throw slug;
    expect(b.uuidToString(slug)).toBeInstanceOf(Error);
    expect(
      createUuidV7MaskingCodec({
        mask: second,
        previousMasks: [third, first],
      }).uuidToString(slug),
    ).toBe(SAMPLE_V7_A);
  });

  it("validates timestamps against the codec's OWN key, not the package's published one", () => {
    // This case fails if timestamp validation uses any mask other than the codec's selected key.
    const ids = createUuidV7MaskingCodec({
      mask: { seed: "not-the-published-one-test-seed-0000" },
    });
    const slug = ids.uuidToMaskedSlug(SAMPLE_V7_A);
    if (slug instanceof Error) throw slug;
    // `now` is pinned to the sample's own instant so the window, not the clock, decides.
    const at = extractUuidV7UnixMs(uuidStringToBytes(SAMPLE_V7_A) as Uint8Array) as number;
    expect(
      ids.validateMaskedUuidV7SlugUnixMs(slug, {
        maxTimestampDeltaMs: 86_400_000,
        referenceUnixMs: at,
      }),
    ).toBe(slug);
    expect(
      ids.validateMaskedUuidV7SlugUnixMs(slug, {
        maxTimestampDeltaMs: 86_400_000,
        referenceUnixMs: at + 86_400_001,
      }),
    ).toBeInstanceOf(Error);
    // Both edges exactly, because the README says an id is refused when it sits OUTSIDE the
    // window — so the boundary itself is inside it, and nothing else says which. Relaxing either
    // comparison to its non-strict form left the suite green (measured 2026-08-12); an off-by-one
    // here silently expires ids a day early, or accepts ones a day stale.
    expect(
      ids.validateMaskedUuidV7SlugUnixMs(slug, {
        maxTimestampDeltaMs: 86_400_000,
        referenceUnixMs: at + 86_400_000,
      }),
    ).toBe(slug);
    expect(
      ids.validateMaskedUuidV7SlugUnixMs(slug, {
        maxTimestampDeltaMs: 86_400_000,
        referenceUnixMs: at - 86_400_000,
      }),
    ).toBe(slug);
  });

  it("rotates a seed without making the caller build a mask for the old one", () => {
    // Rotation is the whole reason the list exists, so listing a previous SEED must cost what
    // naming the current one costs. It used to demand a constructor and an error branch.
    const before = createUuidV7MaskingCodec({ mask: { seed: "key-v1-test-seed-0000" } });
    const slug = before.uuidToMaskedSlug(SAMPLE_V7_A);
    if (slug instanceof Error) throw slug;
    const after = createUuidV7MaskingCodec({
      mask: { seed: "key-v2-test-seed-0000" },
      previousMasks: [{ seed: "key-v1-test-seed-0000" }],
    });
    expect(after.uuidToString(slug)).toBe(SAMPLE_V7_A);
    // And the rotation actually rotated: new ids are issued under v2, not v1.
    expect(after.uuidToMaskedSlug(SAMPLE_V7_A)).not.toBe(slug);
  });

  it("refuses a caller's mask that does not reverse its own mixing step", () => {
    // A custom mask is the only extension point, and getting the inverse wrong is silent: encoding still
    // produces a slug, and every id issued under it is unreadable forever. So it must fail at
    // construction. Two distinct ways to get it wrong, because one probe cannot see both.
    const ignoresDirection = createCustomUuidV7Mask({
      diagnosticLabel: "one-way",
      mask: (input) => input.map((byte) => (byte + 1) & 0xff),
      unmask: (input) => input.map((byte) => (byte + 1) & 0xff),
    });
    // Reorders identically in both directions — the classic permutation-table mistake, and the
    // reason an all-zero probe alone is not enough: zeroes survive any reordering unchanged.
    const reordersBothWays = createCustomUuidV7Mask({
      diagnosticLabel: "same-both-ways",
      mask: (input) => input.map((_, i) => input[(i + 5) % 16] as number),
      unmask: (input) => input.map((_, i) => input[(i + 5) % 16] as number),
    });
    expect(ignoresDirection).toMatchObject({ code: "invalid_mask" });
    expect(reordersBothWays).toMatchObject({ code: "invalid_mask" });
    expect(createCodec({ mask: { seed: "fine-test-seed-0000" } })).not.toBeInstanceOf(Error);
  });

  it("refuses unknown custom-mask options instead of ignoring caller intent", () => {
    const result = Reflect.apply(createCustomUuidV7Mask, undefined, [
      {
        diagnosticLabel: "typo",
        mask: (input: Uint8Array) => input,
        unmask: (input: Uint8Array) => input,
        verifyInverse: true,
      },
    ]);
    expect(result).toMatchObject({ code: "invalid_mask" });
  });

  // Both are CALLER-input checks whose absence is silent: a short seed masks nothing while every
  // round-trip still passes, and a bad iteration count either derives a different key or hangs
  // construction with no output to read.
  it.each([
    ["empty seed", { seed: "" }],
    ["seed under the 16-byte floor", { seed: "fifteen-bytes!" }],
    [
      "fractional keyDerivationIterations",
      { seed: "long-enough-seed-here", keyDerivationIterations: 1.5 },
    ],
    ["zero keyDerivationIterations", { seed: "long-enough-seed-here", keyDerivationIterations: 0 }],
    [
      "keyDerivationIterations past the ceiling",
      { seed: "long-enough-seed-here", keyDerivationIterations: 2 ** 30 },
    ],
  ])("refuses a %s", (_label, options) => {
    expect(deriveUuidV7Mask(options)).toBeInstanceOf(Error);
  });

  it("derives a different key for a different iteration count, and the same one for a repeat", () => {
    // keyDerivationIterations is part of the key, not a tuning knob: this is what makes the wire-format
    // warning on it true rather than merely cautious.
    const uuid = "019ff19b-58b8-7000-9b1b-df713bd5562c";
    const slugAt = (keyDerivationIterations: number) => {
      const handle = deriveUuidV7Mask({
        seed: "rotation-seed-long-enough",
        keyDerivationIterations,
      });
      if (handle instanceof Error) throw handle;
      return createUuidV7MaskingCodec({ mask: handle }).uuidToMaskedSlug(uuid);
    };
    expect(slugAt(1)).not.toBe(slugAt(2));
    expect(slugAt(3)).toBe(slugAt(3));
  });
});

describe("plain-slug migration", () => {
  // Nothing pinned this flag before, which is how a decode path got deleted as a "duplicate"
  // and how a mask combination that silently returns WRONG uuids went unnoticed. The cases
  // below are chosen to fail loudly if either recurs.
  it("keeps wrong-key diagnosis out of an explicitly enabled plain migration", () => {
    // Ordinary decoding owns current masked identifiers and must report the wrong key. A separate
    // migration reader with `acceptPlainSlug: true` deliberately adds the overlapping plain interpretation;
    // it must return that candidate instead of changing ordinary codec behavior.
    const mine = deriveUuidV7Mask({
      diagnosticLabel: "feistel-only",
      seed: "the-key-in-use-test-seed-0000",
    });
    const theirs = deriveUuidV7Mask({
      diagnosticLabel: "feistel-only",
      seed: "a-different-key-test-seed-0000",
    });
    if (mine instanceof Error) throw mine;
    if (theirs instanceof Error) throw theirs;
    const foreign = String(
      createUuidV7MaskingCodec({ mask: theirs }).uuidToMaskedSlug(SAMPLE_V7_A),
    );

    const codec = createUuidV7MaskingCodec({ mask: mine });
    const failure = codec.uuidToString(foreign);
    expect(failure).toBeInstanceOf(UuidSlugError);
    expect((failure as UuidSlugError).code).toBe("invalid_uuid_slug");
    expect(
      codec.createUuidSlugMigrationDecoder({ acceptPlainSlug: true }).uuidToString(foreign),
    ).toBe("1f04e7f5-c0c6-4044-b5a3-6278bb77ffb4");
  });

  it("returns a base32hex slug it accepted as itself, not as a base64url one", () => {
    // Plain migration accepts both plain alphabets. Returning the original spelling preserves
    // storage identity; the packed type fixture separately proves that the input type is retained.
    const legacy = String(uuidStringToPlainSlug(SAMPLE_V7_A, "base32hex"));
    expect(legacy).toHaveLength(26);
    // `now` pinned to the sample's own instant, so the timestamp window is satisfied and the case
    // is about the returned VALUE rather than about the clock.
    const minted = extractUuidV7UnixMs(uuidStringToBytes(SAMPLE_V7_A) as Uint8Array) as number;
    expect(
      validatePlainUuidV7SlugUnixMs(legacy, {
        maxTimestampDeltaMs: 86_400_000,
        referenceUnixMs: minted,
      }),
    ).toBe(legacy);
  });
});

describe("sentinel definitions", () => {
  it("refuses a sentinel that is not a UUIDv7", () => {
    expect(
      createCodec({
        mask: UUID_V7_TEST_MASK,
        sentinels: [{ name: "v4-sentinel", uuid: SAMPLE_V4 }],
      }),
    ).toMatchObject({ code: "invalid_uuid_version" });
  });

  it("refuses two sentinels sharing one UUID, which would collapse silently", () => {
    expect(
      createCodec({
        mask: UUID_V7_TEST_MASK,
        sentinels: [
          { name: "first", uuid: SAMPLE_V7_A },
          { name: "second", uuid: SAMPLE_V7_A },
        ],
      }),
    ).toMatchObject({
      code: "invalid_sentinel",
      message: 'Sentinel "second" repeats the UUID of an earlier sentinel.',
    });
  });
});

// The v7 generator is pinned from several directions — `__test__/v7.test.ts` for the bit layout and
// the buffer bounds, `__test__/entropy.test.ts` for conformance across 2000 draws. The v4 path shares
// neither, and had no case of its own: measured 2026-08-12 by mutation, moving its version stamp
// to byte 7, its variant stamp to byte 9, or relaxing its bounds guard to `&&` each left the whole
// suite green.
describe("UUIDv4 generation", () => {
  it("stamps version 4 and the RFC variant, in exactly sixteen bytes", () => {
    // README §Guarantees promises correct version and variant bits for EVERY generated id. This is
    // the only case that holds that promise for a v4. The length is asserted with them because the
    // same line decides it, and a 17-byte "UUID" fails no other case here.
    const bytes = generateUuidV4Bytes();
    if (bytes instanceof Error) throw bytes;
    expect(bytes).toHaveLength(16);
    expect((bytes[6] as number) >> 4).toBe(0x4);
    expect((bytes[8] as number) >> 6).toBe(0b10);
  });

  it("refuses a buffer it cannot fit rather than writing past the end", () => {
    // Both arms of the guard, matching the v7 case: past the end once the offset is added, and a
    // negative offset that stays inside the length. A short write is silent — the bytes past the
    // end are dropped and the id comes back truncated with no error anywhere.
    expect(generateUuidV4Bytes(new Uint8Array(16), 1)).toBeInstanceOf(Error);
    expect(generateUuidV4Bytes(new Uint8Array(16), -1)).toBeInstanceOf(Error);
  });
});
