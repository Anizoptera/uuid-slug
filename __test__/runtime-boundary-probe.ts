// SPDX-License-Identifier: Apache-2.0

import { nativeUuidV7CapabilityCanary } from "./native-v7-capability-fixture";

import { strict as assert } from "node:assert";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { command } from "../scripts/command";
import vm from "node:vm";
import nodeCrypto from "node:crypto";
import { POOL_BYTES, pooledFill } from "../src/runtime/pool";
import { INVALID_TIMESTAMP } from "../src/errors";
import { runtime } from "#runtime";
import { unwrap } from "../dev/unwrap";
import {
  createUuidV7Generator as createSecureUuidV7Generator,
  createUuidV7MaskingCodec,
  createCustomUuidV7Mask,
  UUID_V7_TEST_MASK,
  extractUuidV7UnixMs,
  bytesToUuidString,
  UUID_TEXT_UPPERCASE,
  UUID_TEXT_LOWERCASE,
  uuidV7StringBounds,
  uuidBytesToPlainSlug,
  isUuidV4String,
  isUuidV7Bytes,
  isPlainUuidV7Slug,
  isUuidV7String,
  isUuidV7Text,
  isUuidSlugError,
  uuidStringToBytes,
  plainSlugToUuidBytes,
  uuidToString,
  UuidSlugError,
  uuidStringToPlainSlug,
  generateUuidV4,
  generateUuidV4Bytes,
  generatePlainUuidV4Slug,
  generateUuidV7,
  generateUuidV7Value,
  validateUuidV7StringUnixMs,
  validatePlainUuidV7SlugUnixMs,
  generateUuidV7Bytes,
  generatePlainUuidV7Slug,
  generateUuidV7WithPlainSlug,
  generateUuidV4WithRandomFill,
  BASE32HEX,
  BASE64URL,
  createUuidV7GeneratorWithRandomFill,
  parseUuid,
} from "../src/index";
import { createPortableUuidV7Generator as createUuidV7Generator } from "../src/v7";
import { createUuidV7MaskingCodecWithGenerator } from "../src/masking-codec";
import { NIL_TEST_SENTINEL } from "./sentinel-fixtures";
import {
  BASE32HEX as BASE32HEX_ALPHABET,
  BASE64URL as BASE64URL_ALPHABET,
  encode,
} from "../src/alphabet";

/** Capture what a call throws; a call that returns instead fails the probe. */
function thrownBy(call: () => unknown): unknown {
  try {
    call();
  } catch (error) {
    return error;
  }
  throw new Error("expected the call to throw");
}

const drawUuidV4Text = () => generateUuidV4();
const NATIVE_UUID_V7_DEFAULTS_CASE =
  "native UUIDv7 defaults preserve payload, configured clocks and fallback causes";
const drawOwnedUuidV4Bytes = () => generateUuidV4Bytes();
const drawUuidV4Slug = () => generatePlainUuidV4Slug();
const drawCallerUuidV4Bytes = () => {
  const output = new Uint8Array(20);
  const result = generateUuidV4Bytes(output, 4);
  if (result instanceof Error) throw result;
  return output.subarray(4);
};

const timestamp = 1_234_567_890_000;
const uuid = "011f71fb-0450-7121-8848-484a12121212";
const makeGenerator = () =>
  createUuidV7Generator({ readUnixMs: () => timestamp, fillRandom: (bytes) => bytes.fill(0x12) });
const compareBytes = (left: Uint8Array, right: Uint8Array) => {
  for (let index = 0; index < left.length; index += 1) {
    const difference = (left[index] as number) - (right[index] as number);
    if (difference !== 0) return difference;
  }
  return 0;
};
const hasCause = (value: unknown, target: unknown): boolean =>
  value === target ||
  (value instanceof AggregateError && value.errors.some((cause) => hasCause(cause, target))) ||
  (value instanceof Error && hasCause(value.cause, target));

export const runtimeBoundaryCases: { name: string; run(this: void): void | Promise<void> }[] = [
  {
    name: "custom entropy preserves recognized failures and leaves caller storage and sequence untouched",
    run(this: void) {
      const markedFailure = Object.freeze({
        __failure: true,
        name: "UuidSlugError",
        code: "rng_unavailable",
        message: "Entropy source refused the draw",
      });
      const foreignFailure: unknown = vm.runInNewContext(
        'Object.assign(new Error("Entropy source refused the draw"), { name: "UuidSlugError", code: "rng_unavailable" })',
      );
      const byteFailure = Object.assign(unwrap(uuidStringToBytes(uuid)), markedFailure);
      const viewFailure = Object.assign(new DataView(new ArrayBuffer(16)), markedFailure);
      for (const failure of [markedFailure, foreignFailure, byteFailure, viewFailure]) {
        assert.ok(isUuidSlugError(failure));
        assert.equal(
          generateUuidV4WithRandomFill(() => failure),
          failure,
        );
        let refused = true;
        const generator = unwrap(
          createUuidV7GeneratorWithRandomFill(
            (bytes) => {
              bytes.fill(0);
              return refused ? failure : undefined;
            },
            { readUnixMs: () => 100 },
          ),
        );
        const output = new Uint8Array(24).fill(0x55);
        assert.equal(generator.generateUuidV7Bytes(output, 4), failure);
        assert.ok(output.every((byte) => byte === 0x55));
        const codec = unwrap(createUuidV7MaskingCodec({ mask: UUID_V7_TEST_MASK }));
        const calls = [
          () => generator.generateUuidV7(),
          () => generator.generateUuidV7({ at: 100, textCase: UUID_TEXT_UPPERCASE }),
          () => generator.generateUuidV7Value(),
          () => generator.generatePlainUuidV7Slug(),
          () => generator.generatePlainUuidV7Slug(BASE32HEX),
          () => generator.generateUuidV7WithPlainSlug(),
          () => generateUuidV7({ generator }),
          () => generateUuidV7({ generator, at: 100, textCase: UUID_TEXT_UPPERCASE }),
          () => generateUuidV7Value({ generator }),
          () => generatePlainUuidV7Slug({ generator }),
          () => generateUuidV7WithPlainSlug({ generator }),
          () => codec.generateMaskedUuidV7Slug({ generator }),
          () => codec.generateUuidV7WithMaskedSlug({ generator }),
          () => codec.generateUuidV7Value({ generator }),
        ];
        for (const call of calls) assert.equal(call(), failure);
        refused = false;
        const control = unwrap(
          createUuidV7GeneratorWithRandomFill(
            (bytes) => {
              bytes.fill(0);
            },
            { readUnixMs: () => 100 },
          ),
        );
        assert.equal(generator.generateUuidV7(), control.generateUuidV7());
      }
    },
  },
  {
    name: "validated generator bytes remain usable when a failure marker cannot be read",
    run(this: void) {
      const expected = unwrap(uuidStringToBytes(uuid));
      const generator = {
        payloadLayout: unwrap(createSecureUuidV7Generator()).payloadLayout,
        generateUuidV7Bytes(output: Uint8Array) {
          output.set(expected);
          Object.defineProperty(output, "__failure", {
            get() {
              throw new Error("Marker is inaccessible");
            },
          });
          return output;
        },
      };
      // Recognition must fall through to the independent byte validator, rather than invent failure.
      assert.equal(Reflect.apply(generateUuidV7, undefined, [{ generator }]), uuid);
      const codec = unwrap(createUuidV7MaskingCodec({ mask: UUID_V7_TEST_MASK }));
      const pair = unwrap(
        Reflect.apply(codec.generateUuidV7WithMaskedSlug, undefined, [{ generator }]) as ReturnType<
          typeof codec.generateUuidV7WithMaskedSlug
        >,
      );
      assert.equal(pair.uuid, uuid);
      assert.equal(codec.maskedSlugToUuidString(pair.slug), uuid);
    },
  },
  {
    name: "plain slug conversion validates offsets even on an exact UUID payload",
    run(this: void) {
      const bytes = Uint8Array.from({ length: 16 }, (_, index) => index);
      for (const alphabet of [BASE64URL, BASE32HEX] as const) {
        const expected = encode(
          bytes,
          alphabet === BASE64URL ? BASE64URL_ALPHABET : BASE32HEX_ALPHABET,
        );
        assert.equal(uuidBytesToPlainSlug(bytes, 0, alphabet), expected);
        const padded = new Uint8Array(20);
        padded.set(bytes, 4);
        assert.equal(uuidBytesToPlainSlug(padded, 4, alphabet), expected);
        // An exact payload proves capacity, but cannot make an invalid offset valid.
        for (const offset of [1, -1, 0.5, NaN, Infinity]) {
          const result = uuidBytesToPlainSlug(bytes, offset, alphabet);
          assert.ok(result instanceof UuidSlugError);
          assert.equal(result.code, "invalid_buffer");
        }
      }
    },
  },
  {
    name: "preserves owned module-default UUIDv7 bytes and every random tail bit",
    run(this: void) {
      // The created-generator corpus does not reach the module's cached default draw.
      // Keep an early result alive to distinguish private output from reused scratch storage.
      const first = generateUuidV7Bytes();
      const snapshot = Uint8Array.from(first);
      assert.equal(first.constructor, Uint8Array);
      let seenOnes = 0;
      let alwaysOnes = -1;
      for (let draw = 0; draw < 256; draw += 1) {
        const bytes = generateUuidV7Bytes();
        assert.equal(bytes.constructor, Uint8Array);
        assert.notEqual(bytes.buffer, first.buffer);
        const tail =
          ((bytes[12] as number) << 24) |
          ((bytes[13] as number) << 16) |
          ((bytes[14] as number) << 8) |
          (bytes[15] as number);
        seenOnes |= tail;
        alwaysOnes &= tail;
      }
      assert.deepEqual(first, snapshot);
      // A fixed bit has probability 2^-255 under independent unbiased draws. This detects
      // lost bits, not bias, independence or cryptographic quality.
      assert.equal(seenOnes ^ alwaysOnes, -1, "owned module bytes lost tail entropy");
    },
  },
  {
    name: "keeps every random tail bit changing in module-default slugs and pairs",
    run(this: void) {
      // Created-generator fixtures bypass the module draw. Exercise its real entropy and both
      // encodings so a pinned tail cannot hide behind otherwise valid, distinct identifiers.
      // Under independent unbiased draws, a particular bit stays fixed with probability 2^-255;
      // this detects stuck bits, not bias, correlation or cryptographic source quality.
      for (const alphabet of [BASE64URL, BASE32HEX] as const) {
        for (const paired of [false, true]) {
          let seenOnes = 0;
          let alwaysOnes = -1;
          for (let draw = 0; draw < 256; draw += 1) {
            const slug = paired
              ? generateUuidV7WithPlainSlug(alphabet).slug
              : generatePlainUuidV7Slug(alphabet);
            const bytes = unwrap(plainSlugToUuidBytes(slug));
            const tail =
              ((bytes[12] as number) << 24) |
              ((bytes[13] as number) << 16) |
              ((bytes[14] as number) << 8) |
              (bytes[15] as number);
            seenOnes |= tail;
            alwaysOnes &= tail;
          }
          assert.equal(
            seenOnes ^ alwaysOnes,
            -1,
            `${alphabet} ${paired ? "pair" : "slug"} lost tail entropy`,
          );
        }
      }
    },
  },
  {
    name: "UUIDv7 text preserves byte generation across timestamp and counter boundaries",
    run(this: void) {
      // Separate generators receive identical clocks and entropy. The unchanged byte writer
      // supplies the expected payload; ordinary hexadecimal conversion is an independent encoder.
      for (const time of [0, 0xffff, 0xffffffff, 0x1_0000_0000, timestamp, 2 ** 48 - 1]) {
        for (const fractionBits of [0, 1, 6, 12]) {
          for (const seed of [0x12, 0xed, 0xff]) {
            for (const textCase of [UUID_TEXT_LOWERCASE, UUID_TEXT_UPPERCASE] as const) {
              let now = time;
              const options = {
                readUnixMs: () => now,
                subMillisecondFractionBits: fractionBits,
                fillRandom: (bytes: Uint8Array) => bytes.fill(seed),
              };
              const byteGenerator = createUuidV7Generator(options);
              const textGenerator = createUuidV7Generator(options);
              // Equal clocks exercise continuation and carry; rollback and advance reuse state.
              for (const reading of [
                time,
                time,
                Math.max(0, time - 1),
                time,
                Math.min(2 ** 48 - 1, time + 1),
              ]) {
                now = reading;
                const expected = byteGenerator.generateUuidV7Bytes();
                // A conversion may share formatter storage with generation; it must not leave
                // cached generator characters valid after writing a different UUID into it.
                bytesToUuidString(new Uint8Array(16), 0, textCase);
                const actual = textGenerator.generateUuidV7(textCase);
                if (expected instanceof Error) {
                  assert.ok(actual instanceof Error);
                  assert.equal(actual.code, expected.code);
                  continue;
                }
                const hex = [...expected]
                  .map((byte) => byte.toString(16).padStart(2, "0"))
                  .join("");
                const text =
                  hex.slice(0, 8) +
                  "-" +
                  hex.slice(8, 12) +
                  "-" +
                  hex.slice(12, 16) +
                  "-" +
                  hex.slice(16, 20) +
                  "-" +
                  hex.slice(20);
                assert.equal(actual, textCase === UUID_TEXT_UPPERCASE ? text.toUpperCase() : text);
              }
            }
          }
        }
      }
    },
  },
  {
    name: "preserves every fresh UUIDv7 tail byte across output forms",
    run(this: void) {
      // Distinct bytes and their complements expose displaced, duplicated and pinned entropy bits.
      for (const tail of [
        [0x12, 0x34, 0x56, 0x78],
        [0xed, 0xcb, 0xa9, 0x87],
      ]) {
        const generator = createUuidV7Generator({
          readUnixMs: () => timestamp,
          fillRandom: (bytes) => {
            bytes.fill(0);
            bytes.set(tail, bytes.length - tail.length);
          },
        });
        assert.deepEqual([...unwrap(generator.generateUuidV7Bytes()).slice(12)], tail);
        const output = new Uint8Array(24).fill(0xee);
        assert.equal(generator.generateUuidV7Bytes(output, 4), output);
        assert.deepEqual([...output.slice(16, 20)], tail);
        assert.deepEqual([...output.slice(0, 4)], [0xee, 0xee, 0xee, 0xee]);
        assert.deepEqual([...output.slice(20)], [0xee, 0xee, 0xee, 0xee]);
        const text = unwrap(generator.generateUuidV7());
        assert.deepEqual([...unwrap(uuidStringToBytes(text)).slice(12)], tail);
        const explicit = unwrap(generator.generateUuidV7Bytes({ at: timestamp + 1 }));
        assert.deepEqual([...explicit.slice(12)], tail);
      }
    },
  },
  {
    name: "UUIDv7 timestamp text validates the full payload in either case",
    run(this: void) {
      for (const valid of [uuid, uuid.toUpperCase()]) {
        assert.equal(isUuidV7Text(valid), true);
        assert.equal(extractUuidV7UnixMs(valid), timestamp);
        // A timestamp prefix alone cannot establish a valid UUID payload.
        for (let index = 0; index < valid.length; index += 1) {
          const invalid = valid.slice(0, index) + "g" + valid.slice(index + 1);
          assert.equal(isUuidV7Text(invalid), false);
          assert.ok(extractUuidV7UnixMs(invalid) instanceof UuidSlugError);
        }
        for (const [index, digit] of [
          [14, "4"],
          [19, "c"],
        ] as const) {
          const invalid = valid.slice(0, index) + digit + valid.slice(index + 1);
          assert.equal(isUuidV7Text(invalid), false);
          assert.ok(extractUuidV7UnixMs(invalid) instanceof UuidSlugError);
        }
      }
    },
  },
  {
    name: "preserves UUIDv7 bounds across timestamp byte carries and both text cases",
    run: () => {
      const timestamps = [0, 1, 0x0123_4567_89ab, 0xffff_ffff_ffff];
      for (const bits of [8, 16, 24, 32, 40])
        timestamps.push(2 ** bits - 1, 2 ** bits, 2 ** bits + 1);
      for (const boundUnixMs of timestamps)
        for (const textCase of [UUID_TEXT_LOWERCASE, UUID_TEXT_UPPERCASE] as const) {
          const hex = boundUnixMs.toString(16).padStart(12, "0");
          const prefix = `${hex.slice(0, 8)}-${hex.slice(8)}`;
          const expected = {
            startInclusive: `${prefix}-7000-8000-000000000000`,
            endInclusive: `${prefix}-7fff-bfff-ffffffffffff`,
          };
          if (textCase === UUID_TEXT_UPPERCASE) {
            expected.startInclusive = expected.startInclusive.toUpperCase();
            expected.endInclusive = expected.endInclusive.toUpperCase();
          }
          assert.deepEqual(uuidV7StringBounds(boundUnixMs, textCase), expected);
          assert.equal(extractUuidV7UnixMs(expected.startInclusive), boundUnixMs);
          assert.equal(extractUuidV7UnixMs(expected.endInclusive), boundUnixMs);
        }
    },
  },
  {
    name: "preserves UUID byte positions, text case and every slug check tail against independent encoders",
    run: () => {
      for (let seed = 0; seed < 64; seed += 1) {
        const bytes = Uint8Array.from({ length: 16 }, (_, index) =>
          Math.imul(seed + 1, index * 197 + 131),
        );
        const hex = Buffer.from(bytes).toString("hex");
        const expected = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
        const storage = new Uint8Array(24);
        storage.set(bytes, 3);
        assert.equal(bytesToUuidString(storage, 3), expected);
        assert.equal(bytesToUuidString(storage, 3, UUID_TEXT_UPPERCASE), expected.toUpperCase());
        assert.equal(encode(bytes, BASE64URL_ALPHABET), Buffer.from(bytes).toString("base64url"));
        for (const [alphabet, widths] of [
          [BASE32HEX_ALPHABET, [0, 2, 4]],
          [BASE64URL_ALPHABET, [0, 4]],
        ] as const)
          for (const tailBits of widths) {
            for (let tail = 0; tail < 1 << tailBits; tail += 1) {
              let bits = 0n;
              for (const byte of bytes) bits = (bits << 8n) | BigInt(byte);
              bits = (bits << BigInt(tailBits)) | BigInt(tail);
              const width = alphabet.bitsPerChar;
              const mask = (1n << BigInt(width)) - 1n;
              const length = Math.ceil((128 + tailBits) / width);
              bits <<= BigInt(length * width - 128 - tailBits);
              let text = "";
              for (let digit = length - 1; digit >= 0; digit -= 1)
                text += alphabet.chars[Number((bits >> BigInt(digit * width)) & mask)];
              assert.equal(encode(bytes, alphabet, tail, tailBits), text);
            }
          }
      }
    },
  },
  {
    name: "contains structural codec callbacks without exposing immutable UUID storage",
    run(this: void) {
      const codec = unwrap(createUuidV7MaskingCodec({ mask: UUID_V7_TEST_MASK }));
      const value = unwrap(parseUuid(uuid));
      let retained: Uint8Array | undefined;
      const external = { ...codec };
      Object.defineProperty(external, "uuidToMaskedSlug", {
        value(bytes: Uint8Array) {
          retained = bytes;
          const result = codec.uuidToMaskedSlug(bytes);
          bytes.fill(0);
          return result;
        },
      });
      assert.equal(value.toMaskedSlug(external), codec.uuidToMaskedSlug(uuid));
      retained?.fill(255);
      assert.equal(value.toString(), uuid);
      const cause = new Error("external codec failed");
      const throwing = {
        ...codec,
        uuidToMaskedSlug() {
          throw cause;
        },
      };
      const failure = value.toMaskedSlug(throwing);
      assert.ok(failure instanceof UuidSlugError);
      assert.equal(failure.cause, cause);
      for (const result of [null, "wrong", uuid, new Uint8Array(16)]) {
        const malformed = { ...codec };
        Object.defineProperty(malformed, "uuidToMaskedSlug", { value: () => result });
        assert.ok(value.toMaskedSlug(malformed) instanceof UuidSlugError);
      }
      const v4 = unwrap(parseUuid("ffffffff-ffff-4fff-bfff-ffffffffffff"));
      let calls = 0;
      const unexpected = {
        ...codec,
        uuidToMaskedSlug() {
          calls += 1;
          return codec.uuidToMaskedSlug(uuid);
        },
        uuidToBytes() {
          calls += 1;
          return new Uint8Array(16);
        },
      };
      const rejected = Reflect.apply(Reflect.get(v4, "toMaskedSlug"), v4, [unexpected]);
      assert.ok(rejected instanceof UuidSlugError);
      assert.equal(rejected.code, "invalid_uuid_version");
      assert.equal(Reflect.apply(parseUuid, undefined, [failure, unexpected]), failure);
      assert.equal(calls, 0);
      for (const result of [null, new Uint8Array(0), new Uint8Array(17), "wrong"]) {
        assert.ok(
          Reflect.apply(parseUuid, undefined, [
            uuid,
            { ...codec, uuidToBytes: () => result },
          ]) instanceof UuidSlugError,
        );
      }
      const borrowed = unwrap(uuidStringToBytes(uuid));
      const parsed = unwrap(
        Reflect.apply(parseUuid, undefined, [uuid, { ...codec, uuidToBytes: () => borrowed }]),
      );
      borrowed.fill(0);
      assert.equal(parsed.toString(), uuid);
    },
  },
  {
    name: "reads equivalent base32hex sentinels before masked decoding and migration",
    run() {
      const codec = unwrap(
        createUuidV7MaskingCodec({
          mask: UUID_V7_TEST_MASK,
          maskedSlugAlphabet: BASE32HEX,
          sentinels: [{ name: "reserved", uuid }],
        }),
      );
      const entry = codec.sentinels[0];
      assert.ok(entry);
      const upper = entry.slug.toUpperCase();
      assert.equal(unwrap(codec.maskedSlugToUuidString(upper)), entry.uuid);
      assert.equal(unwrap(codec.uuidToString(upper)), entry.uuid);
      assert.deepEqual(
        unwrap(codec.maskedSlugToUuidBytes(upper)),
        unwrap(uuidStringToBytes(entry.uuid)),
      );
      assert.equal(
        unwrap(codec.createUuidSlugMigrationDecoder().uuidSlugToUuidString(upper)),
        entry.uuid,
      );
    },
  },
  {
    name: "normalizes boxed selectors without reading tags or reentering scratch conversion",
    run() {
      const other = "ffffffff-ffff-4fff-bfff-ffffffffffff";
      let tags = 0;
      for (const wrapped of [
        new String(BASE64URL),
        vm.runInNewContext('new String("base64url")'),
      ]) {
        Object.defineProperty(wrapped, Symbol.toStringTag, {
          get() {
            tags += 1;
            uuidStringToPlainSlug(other);
            throw new Error("tag must not be read");
          },
        });
        assert.equal(
          Reflect.apply(uuidStringToPlainSlug, undefined, [uuid, wrapped]),
          uuidStringToPlainSlug(uuid),
        );
      }
      assert.equal(tags, 0);
      const prototype = vm.runInNewContext(
        'String.prototype[Symbol.toStringTag] = "Other"; new String("base32hex")',
      );
      assert.equal(
        Reflect.apply(uuidStringToPlainSlug, undefined, [uuid, prototype]),
        uuidStringToPlainSlug(uuid, BASE32HEX),
      );
    },
  },
  {
    name: "accepts mixed-case base32hex in transactional caller-buffer and masked conversions",
    run() {
      const slug = unwrap(uuidStringToPlainSlug(uuid, BASE32HEX));
      const codec = unwrap(createUuidV7MaskingCodec({ mask: UUID_V7_TEST_MASK }));
      for (const spelling of [
        slug,
        slug.toUpperCase(),
        slug.replace(/[a-v]/g, (char, offset) => (offset % 2 ? char.toUpperCase() : char)),
      ]) {
        const output = new Uint8Array(20).fill(0xee);
        assert.equal(plainSlugToUuidBytes(spelling, output, 2), output);
        assert.equal(bytesToUuidString(output, 2), uuid);
        assert.equal(output[1], 0xee);
        assert.equal(output[18], 0xee);
        assert.equal(codec.maskedSlugToUuidString(codec.plainToMaskedUuidSlug(spelling)), uuid);
      }
      for (const invalid of [slug.slice(0, 25) + "1", slug.slice(0, 12) + "!" + slug.slice(13)]) {
        const output = new Uint8Array(20).fill(0xee);
        assert.ok(plainSlugToUuidBytes(invalid, output, 2) instanceof UuidSlugError);
        assert.ok(output.every((byte) => byte === 0xee));
      }
    },
  },
  {
    name: "captures normalized boxed codec alphabets",
    run() {
      for (const alphabet of [BASE64URL, BASE32HEX] as const) {
        const primitive = unwrap(
          createUuidV7MaskingCodec({ mask: UUID_V7_TEST_MASK, maskedSlugAlphabet: alphabet }),
        );
        const boxed = unwrap(
          Reflect.apply(createUuidV7MaskingCodec, undefined, [
            { mask: UUID_V7_TEST_MASK, maskedSlugAlphabet: new String(alphabet) },
          ]),
        );
        assert.equal(boxed.uuidToMaskedSlug(uuid), primitive.uuidToMaskedSlug(uuid));
      }
    },
  },
  {
    name: "rejects generator presets before observing clocks or consuming entropy and sequence",
    run() {
      let clocks = 0;
      let draws = 0;
      const generator = unwrap(
        createUuidV7GeneratorWithRandomFill(
          (bytes) => {
            draws += 1;
            bytes.fill(0);
          },
          {
            readUnixMs: () => {
              clocks += 1;
              return 100;
            },
          },
        ),
      );
      const control = unwrap(
        createUuidV7GeneratorWithRandomFill(
          (bytes) => {
            bytes.fill(0);
          },
          { readUnixMs: () => 100 },
        ),
      );
      const error = Reflect.apply(generator.generateUuidV7, undefined, ["garbage"]);
      assert.ok(error instanceof UuidSlugError);
      assert.equal(error.code, "invalid_options");
      assert.equal(clocks, 0);
      assert.equal(draws, 0);
      assert.equal(generator.generateUuidV7(), control.generateUuidV7());
    },
  },
  {
    name: "rejects host and class generator options while accepting plain records from any realm",
    run() {
      class Options {
        readonly marker = true;
      }
      for (const options of [new Date(), new Options()]) {
        const error = Reflect.apply(createSecureUuidV7Generator, undefined, [options]);
        assert.ok(error instanceof UuidSlugError);
        assert.equal(error.code, "invalid_options");
      }
      for (const options of [{}, Object.create(null), vm.runInNewContext("({})")]) {
        assert.ok(
          !(Reflect.apply(createSecureUuidV7Generator, undefined, [options]) instanceof Error),
        );
      }
    },
  },
  {
    name: "rejects hostile diagnostic values without invoking their coercion",
    run() {
      let coercions = 0;
      const hostile = {
        [Symbol.toPrimitive]() {
          coercions += 1;
          throw new Error("coercion must not run");
        },
      };
      const output = new Uint8Array(16).fill(0xee);
      const error = Reflect.apply(uuidStringToBytes, undefined, [uuid, output, hostile]);
      assert.ok(error instanceof UuidSlugError);
      assert.equal(error.code, "invalid_buffer");
      assert.ok(output.every((byte) => byte === 0xee));
      const generator = Reflect.apply(createUuidV7Generator, undefined, [
        {
          readUnixMs: () => hostile,
          fillRandom: (bytes: Uint8Array) => bytes.fill(0),
        },
      ]);
      assert.ok(generator.generateUuidV7() instanceof UuidSlugError);
      const codec = unwrap(createUuidV7MaskingCodec({ mask: UUID_V7_TEST_MASK }));
      const decoder = codec.createUuidSlugMigrationDecoder();
      assert.ok(
        Reflect.apply(decoder.uuidSlugToUuidString, undefined, [
          uuidStringToPlainSlug(uuid),
          hostile,
        ]) instanceof UuidSlugError,
      );
      assert.equal(coercions, 0);
    },
  },
  {
    name: "orders successful current-time calls across one created generator's output forms",
    run(this: void) {
      const generator = unwrap(createSecureUuidV7Generator({ readUnixMs: () => timestamp }));
      const first = unwrap(uuidStringToBytes(generator.generateUuidV7()));
      const second = unwrap(generator.generateUuidV7Bytes());
      assert.ok(compareBytes(second, first) > 0);
      assert.ok(Object.isFrozen(generator));
      assert.deepEqual(Reflect.ownKeys(generator), [
        "payloadLayout",
        "generateUuidV7",
        "generateUuidV7Bytes",
        "generatePlainUuidV7Slug",
        "generateUuidV7WithPlainSlug",
        "generateUuidV7Value",
      ]);
    },
  },
  {
    name: "codec-generated values retain the counter their preset layout describes",
    run(this: void) {
      const codec = unwrap(createUuidV7MaskingCodec({ mask: UUID_V7_TEST_MASK }));
      {
        // Only values carrying a generator layout need this sequence witness; ordinary default
        // UUID bytes and text have no corresponding ordering or counter promise.
        let first = unwrap(unwrap(codec.generateUuidV7Value()).extractV7Payload());
        assert.ok(first.counter);
        assert.equal(first.counter.bits, 42);
        let comparisons = 0;
        // The module generator captures its clock before this test. Observe equal timestamps
        // rather than pretending that replacing Date.now changes an already captured function.
        for (let index = 0; index < 64; index++) {
          const second = unwrap(unwrap(codec.generateUuidV7Value()).extractV7Payload());
          assert.ok(first.counter);
          assert.ok(second.counter);
          assert.equal(second.counter.bits, 42);
          if (second.unixMs === first.unixMs && first.counter.value !== (1n << 42n) - 1n) {
            assert.equal(second.counter.value, first.counter.value + 1n);
            comparisons++;
          }
          first = second;
        }
        assert.ok(comparisons > 0, "the burst must reach the same-millisecond counter witness");
      }
    },
  },
  {
    name: "detaches selected generators and isolates their retained output",
    run(this: void) {
      const source = makeGenerator();
      const valid = unwrap(source.generateUuidV7Bytes());
      let retained: Uint8Array | undefined;
      const generator = {
        payloadLayout: source.payloadLayout,
        generateUuidV7Bytes(this: void, output: Uint8Array) {
          assert.equal(this, undefined);
          retained = output;
          output.set(valid);
          return output;
        },
      };

      const result = unwrap(generateUuidV7Bytes({ generator: generator as never }));
      retained?.fill(0xff);
      assert.equal(result.constructor, Uint8Array);
      assert.deepEqual(result, valid);

      const codec = unwrap(createUuidV7MaskingCodec({ mask: UUID_V7_TEST_MASK }));
      for (const generate of [generateUuidV7Value, codec.generateUuidV7Value]) {
        const value = unwrap(generate({ generator: generator as never }));
        retained?.fill(0xff);
        assert.deepEqual(value.toBytes(), valid);
      }
    },
  },
  {
    name: "public generators reject caller-supplied entropy",
    run(this: void) {
      const originalFill = runtime.fillRandom;
      let runtimeDraws = 0;
      runtime.fillRandom = (bytes) => {
        runtimeDraws += 1;
        originalFill(bytes);
      };
      const options = {
        readUnixMs: () => timestamp,
        get fillRandom(): never {
          throw new Error("untrusted entropy was read");
        },
      };
      try {
        const generator = Reflect.apply(createSecureUuidV7Generator, undefined, [options]);
        assert.ok(generator instanceof UuidSlugError);
        assert.equal(generator.code, "invalid_options");
        assert.equal(runtimeDraws, 0);
      } finally {
        runtime.fillRandom = originalFill;
      }
    },
  },
  {
    name: "generation rejects exotic option objects through every public owner",
    run(this: void) {
      const generator = unwrap(createSecureUuidV7Generator());
      const codec = unwrap(createUuidV7MaskingCodec({ mask: UUID_V7_TEST_MASK }));
      const calls = [
        (options: never) => generateUuidV7(options),
        (options: never) => generatePlainUuidV7Slug(options),
        (options: never) => generateUuidV7Value(options),
        (options: never) => generator.generateUuidV7Value(options),
        (options: never) => codec.generateUuidV7Value(options),
      ];
      const exoticOptions = [
        new Date(0),
        new Map(),
        /options/,
        new (class Options {
          readonly marker = true;
        })(),
      ];
      for (const options of exoticOptions) {
        for (const call of calls) {
          const result = call(options as never);
          assert.equal(result instanceof UuidSlugError && result.code, "invalid_options");
        }
      }
    },
  },
  {
    name: "public generators fail atomically when platform entropy is unavailable",
    run(this: void) {
      // Fail the platform primitive itself rather than `runtime.fillRandom`: module-level UUIDv7
      // generation binds the pooled fill once, so only the primitive reaches every public route.
      // Emptying the pool first makes the very next draw refill through the failing primitive.
      const cause = new Error("platform entropy unavailable");
      const webCrypto = globalThis.crypto;
      // eslint-disable-next-line typescript/unbound-method -- saved for restoration, never called
      const originalWebFill = webCrypto.getRandomValues;
      // eslint-disable-next-line typescript/unbound-method -- saved for restoration, never called
      const originalNodeFill = nodeCrypto.randomFillSync;
      const originalV7 = runtime.uuidV7;
      const originalV7Slug = runtime.uuidV7Slug;
      const failing = (): never => {
        throw cause;
      };
      assert.equal(runtime.fillRandom(new Uint8Array(POOL_BYTES)), undefined);
      webCrypto.getRandomValues = failing;
      nodeCrypto.randomFillSync = failing;
      const out = new Uint8Array(24).fill(0xa5);
      const assertEntropyFailure = (failure: unknown) => {
        assert.ok(failure instanceof UuidSlugError);
        assert.equal(failure.code, "rng_unavailable");
        assert.equal(failure.cause, cause);
      };
      try {
        // Native text has its own entropy source. Select the portable branch explicitly;
        // the native success/fallback/dual-failure witness below covers the other branch.
        delete runtime.uuidV7;
        delete runtime.uuidV7Slug;
        const generator = createSecureUuidV7Generator({ readUnixMs: () => timestamp });
        assert.ok(!(generator instanceof Error));
        const maskingCodec = unwrap(createUuidV7MaskingCodec({ mask: UUID_V7_TEST_MASK }));
        assertEntropyFailure(generator.generateUuidV7Bytes(out, 4));
        assert.deepEqual(out, new Uint8Array(24).fill(0xa5));
        // Calls whose typed inputs cannot fail carry no error union, so the defect is thrown.
        // UUIDv4 text is absent here because a native host shortcut can bypass the byte draw;
        // the native-plus-portable failure case below covers its thrown form.
        const throwing: readonly (() => unknown)[] = [
          () => generateUuidV4Bytes(),
          () => generatePlainUuidV4Slug(),
          () => generatePlainUuidV4Slug("base32hex"),
          () => generateUuidV7(),
          () => generateUuidV7(UUID_TEXT_UPPERCASE),
          () => generateUuidV7Bytes(),
          () => generatePlainUuidV7Slug(),
          () => generatePlainUuidV7Slug("base32hex"),
          () => generateUuidV7WithPlainSlug(),
          () => generateUuidV7WithPlainSlug("base32hex", UUID_TEXT_UPPERCASE),
          () => generateUuidV7Value(),
        ];
        for (const call of throwing) assertEntropyFailure(thrownBy(call));
        // Every form with a fallible input keeps the error value, even when that input is absent.
        const returning: readonly (() => unknown)[] = [
          () => generateUuidV4Bytes(out, 4),
          () =>
            generateUuidV4WithRandomFill((bytes) =>
              runtime.fillRandom(bytes as Uint8Array<ArrayBuffer>),
            ),
          () => generateUuidV7({}),
          () => generateUuidV7({ at: timestamp }),
          () => generateUuidV7Bytes(out, 4),
          () => generateUuidV7Bytes({}),
          () => generateUuidV7Bytes({ at: timestamp, output: out, outputOffset: 4 }),
          () => generatePlainUuidV7Slug({}),
          () => generateUuidV7WithPlainSlug({ at: timestamp }),
          () => generateUuidV7Value({}),
          () => generator.generateUuidV7(),
          () => generator.generateUuidV7Bytes(),
          () => maskingCodec.generateMaskedUuidV7Slug(),
          () => maskingCodec.generateUuidV7Value(),
        ];
        for (const call of returning) assertEntropyFailure(call());
        assert.deepEqual(out, new Uint8Array(24).fill(0xa5));
        // Untyped misuse on an argument-free form is still a caller-caused error value.
        const misuse = Reflect.apply(generateUuidV7, undefined, ["sideways"]);
        assert.equal(isUuidSlugError(misuse) && misuse.code, "invalid_options");
      } finally {
        webCrypto.getRandomValues = originalWebFill;
        nodeCrypto.randomFillSync = originalNodeFill;
        if (originalV7) runtime.uuidV7 = originalV7;
        if (originalV7Slug) runtime.uuidV7Slug = originalV7Slug;
      }
      assert.equal(isUuidV7String(generateUuidV7()), true);
    },
  },
  {
    name: "distinguishes native UUIDv4 and portable generation failures by output route",
    run(this: void) {
      const saved = { ...runtime };
      const portableCause = new Error("portable route failed");
      const nativeCause = new Error("native route failed");
      let failPortable = false;
      let nativeCalls = 0;
      runtime.fillRandom = (bytes) => {
        if (failPortable) throw portableCause;
        saved.fillRandom(bytes);
      };
      const native = (value: string) => () => {
        nativeCalls += 1;
        return value;
      };
      const assertDualFailure = (result: unknown) => {
        assert.ok(result instanceof UuidSlugError);
        assert.equal(hasCause(result, nativeCause), true);
        assert.equal(hasCause(result, portableCause), true);
      };
      const assertPortableFailure = (result: unknown) => {
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.cause, portableCause);
      };
      try {
        runtime.uuidV4 = native("123e4567-e89b-42d3-a456-426614174000");
        assert.equal(generateUuidV4(), "123e4567-e89b-42d3-a456-426614174000");
        assert.equal(generateUuidV4(UUID_TEXT_UPPERCASE), "123E4567-E89B-42D3-A456-426614174000");
        assert.equal(isUuidV4String(bytesToUuidString(unwrap(generateUuidV4Bytes()))), true);
        assert.equal(typeof generatePlainUuidV4Slug(), "string");
        assert.equal(isUuidV7String(generateUuidV7()), true);
        const uppercaseV7 = unwrap(generateUuidV7(UUID_TEXT_UPPERCASE));
        assert.equal(isUuidV7String(uppercaseV7.toLowerCase()), true);
        // Normalizing before inspection must not conceal a writer ignoring its requested case.
        assert.equal(uppercaseV7, uppercaseV7.toUpperCase());
        const explicitV7 = generateUuidV7({ at: timestamp });
        assert.equal(isUuidV7String(explicitV7), true);
        assert.equal(extractUuidV7UnixMs(explicitV7), timestamp);
        const thirdV7 = unwrap(generateUuidV7Bytes());
        assert.equal(isUuidV7Bytes(thirdV7), true);
        assert.equal(isUuidV7Bytes(generateUuidV7Bytes({ at: timestamp })), true);
        const currentOut = new Uint8Array(24).fill(0x55);
        const explicitOut = new Uint8Array(24).fill(0x55);
        assert.equal(generateUuidV7Bytes(currentOut, 4), currentOut);
        assert.equal(
          generateUuidV7Bytes({ at: timestamp, output: explicitOut, outputOffset: 4 }),
          explicitOut,
        );
        assert.equal(isPlainUuidV7Slug(generatePlainUuidV7Slug()), true);
        assert.equal(unwrap(generatePlainUuidV7Slug("base32hex")).length, 26);
        assert.equal(nativeCalls, 2);

        delete runtime.uuidV4;
        assert.equal(isUuidV4String(generateUuidV4()), true);
        assert.equal(isUuidV7String(generateUuidV7()), true);
        assert.equal(isUuidV7String(generateUuidV7({ at: timestamp })), true);
        assert.equal(isUuidV7Bytes(generateUuidV7Bytes()), true);
        assert.equal(isUuidV7Bytes(generateUuidV7Bytes({ at: timestamp })), true);
        assert.equal(isPlainUuidV7Slug(generatePlainUuidV7Slug()), true);
        assert.equal(unwrap(generatePlainUuidV7Slug("base32hex")).length, 26);
        assert.equal(nativeCalls, 2);

        // A native function that later throws still falls back, and joins a portable failure.
        let throwTrusted = false;
        runtime.uuidV4 = () => {
          if (throwTrusted) throw nativeCause;
          return "123e4567-e89b-42d3-a456-426614174000";
        };
        assert.equal(generateUuidV4(), "123e4567-e89b-42d3-a456-426614174000");
        throwTrusted = true;
        assert.equal(isUuidV4String(generateUuidV4()), true);
        failPortable = true;
        assertDualFailure(thrownBy(() => generateUuidV4()));
        failPortable = false;

        const throwNative = (): never => {
          throw nativeCause;
        };
        runtime.uuidV4 = throwNative;
        failPortable = true;
        assertDualFailure(thrownBy(() => generateUuidV4()));
        assertPortableFailure(thrownBy(() => generateUuidV4Bytes()));
        assertPortableFailure(thrownBy(() => generatePlainUuidV4Slug()));
        failPortable = false;
        assert.equal(isUuidV7String(generateUuidV7()), true);
      } finally {
        failPortable = false;
        for (const key of Object.keys(runtime) as (keyof typeof runtime)[]) delete runtime[key];
        Object.assign(runtime, saved);
      }
    },
  },
  {
    name: NATIVE_UUID_V7_DEFAULTS_CASE,
    async run(this: void) {
      if (process.env.UUID_SLUG_NATIVE_V7_PROBE !== "1") {
        // The fixture exposes capability before public imports; cached selection needs a fresh host.
        const root = fileURLToPath(new URL("..", import.meta.url));
        const directory = await mkdtemp(join(tmpdir(), "uuid-slug-runtime-boundary-"));
        const executable = join(directory, "probe.mjs");
        let passed = false;
        try {
          await command(
            "bun",
            [
              "build",
              fileURLToPath(new URL("./runtime-boundary-host.ts", import.meta.url)),
              `--target=${process.versions.bun ? "bun" : "node"}`,
              "--outfile",
              executable,
            ],
            root,
          );
          await command(process.execPath, [executable, NATIVE_UUID_V7_DEFAULTS_CASE], root, {
            UUID_SLUG_NATIVE_V7_PROBE: "1",
          });
          passed = true;
        } finally {
          // Preserve failed bundles for the exact command in the diagnostic.
          if (passed) await rm(directory, { recursive: true, force: true });
        }
        return;
      }
      assert.equal(runtime.uuidV7, nativeUuidV7CapabilityCanary);
      assert.equal(runtime.uuidV7Slug, nativeUuidV7CapabilityCanary);
      const saved = { ...runtime };
      const nativeValue = "ffffffff-ffff-7fff-bfff-ffffffffffff";
      const nativeSlugValue = unwrap(uuidStringToPlainSlug(nativeValue));
      const nativeCause = new Error("native v7 failed");
      const portableCause = new Error("portable v7 failed");
      let nativeCalls = 0;
      let nativeSlugCalls = 0;
      let failNative = false;
      const native = () => {
        nativeCalls += 1;
        if (failNative) throw nativeCause;
        return nativeValue;
      };
      try {
        runtime.uuidV7 = native;
        runtime.uuidV7Slug = () => {
          nativeSlugCalls += 1;
          if (failNative) throw nativeCause;
          return nativeSlugValue;
        };
        assert.equal(generatePlainUuidV7Slug(), nativeSlugValue);
        assert.equal(generatePlainUuidV7Slug(BASE64URL), nativeSlugValue);
        assert.equal(extractUuidV7UnixMs(generatePlainUuidV7Slug({ at: timestamp })), timestamp);
        assert.equal(isPlainUuidV7Slug(generatePlainUuidV7Slug(BASE32HEX)), true);
        assert.equal(nativeSlugCalls, 2);
        assert.equal(generateUuidV7(), nativeValue);
        assert.equal(generateUuidV7(UUID_TEXT_UPPERCASE), nativeValue.toUpperCase());
        assert.equal(
          Reflect.apply(generateUuidV7, undefined, [new String(UUID_TEXT_LOWERCASE)]),
          nativeValue,
        );
        assert.equal(nativeCalls, 3);
        // Native logical time is deliberately unrelated to the requested explicit clock here:
        // delegation or clock repair would fail this independent timestamp oracle.
        assert.equal(extractUuidV7UnixMs(generateUuidV7({ at: timestamp })), timestamp);
        const generator = unwrap(createSecureUuidV7Generator({ readUnixMs: () => timestamp }));
        assert.equal(extractUuidV7UnixMs(generatePlainUuidV7Slug({ generator })), timestamp);
        assert.equal(nativeSlugCalls, 2);
        assert.equal(extractUuidV7UnixMs(generateUuidV7({ generator })), timestamp);
        assert.equal(nativeCalls, 3);
        const badPreset = Reflect.apply(generateUuidV7, undefined, ["sideways"]);
        assert.equal(isUuidSlugError(badPreset) && badPreset.code, "invalid_options");
        assert.equal(nativeCalls, 3);

        failNative = true;
        assert.equal(isPlainUuidV7Slug(generatePlainUuidV7Slug()), true);
        assert.equal(isUuidV7String(generateUuidV7()), true);
        const upper = generateUuidV7(UUID_TEXT_UPPERCASE);
        assert.equal(upper, upper.toUpperCase());
        // Module portable generators capture fillRandom when created; fail the platform draw
        // after exhausting its pool so an already-created fallback is reached too.
        // eslint-disable-next-line typescript/unbound-method -- saved for restoration, never called
        const webFill = globalThis.crypto.getRandomValues;
        const nodeFill = nodeCrypto.randomFillSync;
        assert.equal(runtime.fillRandom(new Uint8Array(POOL_BYTES)), undefined);
        globalThis.crypto.getRandomValues = () => {
          throw portableCause;
        };
        nodeCrypto.randomFillSync = () => {
          throw portableCause;
        };
        let dual: unknown;
        let dualSlug: unknown;
        try {
          dual = thrownBy(() => generateUuidV7());
          dualSlug = thrownBy(() => generatePlainUuidV7Slug());
        } finally {
          globalThis.crypto.getRandomValues = webFill;
          nodeCrypto.randomFillSync = nodeFill;
        }
        assert.ok(dual instanceof UuidSlugError);
        assert.equal(hasCause(dual, nativeCause), true);
        assert.equal(hasCause(dual, portableCause), true);
        assert.ok(dualSlug instanceof UuidSlugError);
        assert.equal(hasCause(dualSlug, nativeCause), true);
        assert.equal(hasCause(dualSlug, portableCause), true);
        runtime.fillRandom = saved.fillRandom;

        // Native output is trusted directly; replacement functions must not trigger validation.
        for (const invalid of ["not-a-uuid", "123e4567-e89b-42d3-a456-426614174000"]) {
          runtime.uuidV7 = () => invalid;
          for (let call = 0; call < 3; call += 1) assert.equal(generateUuidV7(), invalid);
        }
        delete runtime.uuidV7;
        assert.equal(isUuidV7String(generateUuidV7()), true);
        // The default slug path likewise publishes native output without stronger guarantees.
        for (const invalid of [
          nativeSlugValue.slice(0, -1) + "x",
          unwrap(uuidStringToPlainSlug("123e4567-e89b-42d3-a456-426614174000")),
          unwrap(uuidStringToPlainSlug(nativeValue, BASE32HEX)),
        ]) {
          runtime.uuidV7Slug = () => invalid;
          assert.equal(generatePlainUuidV7Slug(), invalid);
        }
        delete runtime.uuidV7Slug;
        assert.equal(isPlainUuidV7Slug(generatePlainUuidV7Slug()), true);
        assert.equal(runtime.fillRandom(new Uint8Array(POOL_BYTES)), undefined);
        globalThis.crypto.getRandomValues = () => {
          throw portableCause;
        };
        nodeCrypto.randomFillSync = () => {
          throw portableCause;
        };
        let absent: unknown;
        let absentSlug: unknown;
        try {
          absent = thrownBy(() => generateUuidV7());
          absentSlug = thrownBy(() => generatePlainUuidV7Slug());
        } finally {
          globalThis.crypto.getRandomValues = webFill;
          nodeCrypto.randomFillSync = nodeFill;
        }
        assert.ok(absent instanceof UuidSlugError);
        assert.equal(absent.cause, portableCause);
        assert.ok(absentSlug instanceof UuidSlugError);
        assert.equal(absentSlug.cause, portableCause);
      } finally {
        for (const key of Object.keys(runtime) as (keyof typeof runtime)[]) delete runtime[key];
        Object.assign(runtime, saved);
      }
    },
  },
  {
    name: "falls back when optional native UUIDv4 generation throws",
    run(this: void) {
      const nativeCause = new Error("native string generator failed");
      const originalV4 = runtime.uuidV4;
      runtime.uuidV4 = () => {
        throw nativeCause;
      };
      try {
        assert.equal(isUuidV4String(generateUuidV4()), true);
      } finally {
        if (originalV4) runtime.uuidV4 = originalV4;
        else delete runtime.uuidV4;
      }
    },
  },
  {
    name: "trusts native UUIDv4 output without additional validation",
    run(this: void) {
      const originalV4 = runtime.uuidV4;
      runtime.uuidV4 = () => "not-a-uuid";
      try {
        // Restoring native-result validation must fail on the first and subsequent calls.
        for (let call = 0; call < 3; call += 1) assert.equal(generateUuidV4(), "not-a-uuid");
      } finally {
        if (originalV4) runtime.uuidV4 = originalV4;
        else delete runtime.uuidV4;
      }
    },
  },
  {
    name: "accepts cross-realm UUID byte containers and rejects detached buffers",
    run(this: void) {
      const bytes = vm.runInNewContext("new Uint8Array(16)") as Uint8Array;
      const buffer = vm.runInNewContext("new ArrayBuffer(16)") as ArrayBuffer;
      const view = vm.runInNewContext("new DataView(new ArrayBuffer(20), 2, 16)") as DataView;
      assert.equal(bytesToUuidString(bytes), "00000000-0000-0000-0000-000000000000");
      assert.equal(bytesToUuidString(buffer), "00000000-0000-0000-0000-000000000000");
      assert.equal(bytesToUuidString(view), "00000000-0000-0000-0000-000000000000");
      // The object tag selects the slot probe, and a caller can set its own, so a genuine container
      // that hides its tag must still be read rather than dismissed by the cheaper check.
      for (const source of ["new ArrayBuffer(16)", "new DataView(new ArrayBuffer(16))"]) {
        // Their prototype tag is non-writable, so shadowing it takes a property definition.
        const retagged = vm.runInNewContext(
          `Object.defineProperty(${source}, Symbol.toStringTag, { value: "Spoofed" })`,
        ) as ArrayBuffer;
        assert.equal(bytesToUuidString(retagged), "00000000-0000-0000-0000-000000000000");
      }
      const transferred = structuredClone(buffer, { transfer: [buffer] });
      assert.equal(bytesToUuidString(transferred), "00000000-0000-0000-0000-000000000000");
      assert.equal(isUuidSlugError(bytesToUuidString(buffer)), true);
    },
  },
  {
    name: "accepts cross-realm Uint8Array custom transform results",
    run(this: void) {
      const copy = vm.runInNewContext("(input) => new Uint8Array(input)") as (
        input: Uint8Array,
      ) => Uint8Array;
      const handle = createCustomUuidV7Mask({
        diagnosticLabel: "cross-realm-output",
        mask: copy,
        unmask: copy,
      });
      assert.ok(!(handle instanceof Error));
      const codec = unwrap(createUuidV7MaskingCodec({ mask: handle }));
      const slug = unwrap(codec.uuidToMaskedSlug(uuid));
      assert.equal(codec.uuidToString(slug), uuid);
    },
  },
  {
    name: "byte interfaces reject ambiguous inputs and non-Uint8Array outputs",
    run(this: void) {
      const slug = "AR9x-wRQcSGISEhKEhISEg";
      const generator = makeGenerator();
      const calls = [
        (value: unknown) => Reflect.apply(bytesToUuidString, undefined, [value]),
        (value: unknown) => Reflect.apply(uuidBytesToPlainSlug, undefined, [value]),
        (value: unknown) => Reflect.apply(extractUuidV7UnixMs, undefined, [value]),
        (value: unknown) => Reflect.apply(uuidStringToBytes, undefined, [uuid, value]),
        (value: unknown) => Reflect.apply(plainSlugToUuidBytes, undefined, [slug, value]),
        (value: unknown) => Reflect.apply(generateUuidV4Bytes, undefined, [value]),
        (value: unknown) =>
          Reflect.apply(generator.generateUuidV7Bytes, undefined, [
            { at: timestamp, output: value },
          ]),
      ];
      const inputs = [
        Array.from({ length: 16 }, () => 0),
        { length: 16 },
        Object.defineProperty(new Uint16Array(16), Symbol.toStringTag, { value: "Uint8Array" }),
      ];
      for (const value of inputs) {
        for (const call of calls.slice(0, 3)) {
          const result = call(value);
          assert.ok(isUuidSlugError(result));
          assert.equal(result.code, "invalid_buffer");
        }
      }
      for (const value of [...inputs, new DataView(new ArrayBuffer(16))]) {
        for (const call of calls.slice(3)) {
          const result = call(value);
          assert.ok(isUuidSlugError(result));
          assert.equal(result.code, "invalid_buffer");
        }
      }
      const invalidDestinations = [inputs[0], inputs[2], new DataView(new ArrayBuffer(16))];
      for (const value of invalidDestinations) {
        const result = Reflect.apply(generator.generateUuidV7Bytes, undefined, [value]);
        assert.ok(isUuidSlugError(result));
        assert.equal(result.code, "invalid_buffer");
      }
      const invalidOptions = Reflect.apply(generator.generateUuidV7Bytes, undefined, [inputs[1]]);
      assert.ok(isUuidSlugError(invalidOptions));
      assert.equal(invalidOptions.code, "invalid_options");
    },
  },
  {
    name: "uses the marker protocol before validating unmarked legacy errors",
    run(this: void) {
      const invalid = Reflect.construct(UuidSlugError, ["unknown_code", "invalid code"]);
      assert.equal(isUuidSlugError(invalid), true);

      const mutated = new UuidSlugError("invalid_uuid", "mutated code");
      Reflect.set(mutated, "code", "unknown_code");
      assert.equal(isUuidSlugError(mutated), true);

      const unmarked = Object.assign(new Error("unmarked"), {
        name: "UuidSlugError",
        code: "unknown_code",
      });
      assert.equal(isUuidSlugError(unmarked), false);
    },
  },
  {
    name: "preserves a generator error from another realm",
    run(this: void) {
      const foreignError = vm.runInNewContext(
        `Object.assign(new Error("foreign generator failed"), {
          name: "UuidSlugError",
          code: "rng_unavailable",
          cause: "foreign cause",
        })`,
      ) as UuidSlugError;
      assert.equal(foreignError instanceof Error, false);
      assert.equal(isUuidSlugError(foreignError), true);
      const codec = createUuidV7MaskingCodecWithGenerator(
        { mask: { seed: "cross-realm-generator" } },
        () => foreignError,
      );
      assert.ok(!(codec instanceof Error));
      assert.equal(codec.generateMaskedUuidV7Slug(), foreignError);
    },
  },
  {
    name: "preserves all portable v7 payload bits without merging input bits",
    run(this: void) {
      // Module draws and created generators may use different writers; both must retain every bit.
      for (const [explicit, coordinateExplicitInstants] of [
        [false, true],
        [true, true],
        [false, false],
        [true, false],
      ] as const) {
        for (const textCase of [undefined, UUID_TEXT_LOWERCASE, UUID_TEXT_UPPERCASE] as const) {
          let entropyBytes = 0;
          const generate = (input?: Uint8Array) => {
            const generator = createUuidV7Generator({
              coordinateExplicitInstants,
              // Module text writers supply their private scratch; created-generator-only calls
              // cannot prove a specialized draw preserves each entropy bit independently.
              ...(coordinateExplicitInstants ? {} : { textScratch: new Uint8Array(16) }),
              readUnixMs: () => 0,
              fillRandom: (bytes) => {
                entropyBytes = bytes.length;
                if (input) bytes.set(input);
              },
            });
            if (textCase !== undefined) {
              const text = explicit
                ? generator.generateUuidV7({ at: 0, textCase })
                : generator.generateUuidV7(textCase);
              assert.equal(typeof text, "string");
              assert.ok(typeof text === "string");
              return BigInt("0x" + text.replaceAll("-", ""));
            }
            const bytes = explicit
              ? generator.generateUuidV7Bytes({ at: 0 })
              : generator.generateUuidV7Bytes();
            assert.ok(bytes instanceof Uint8Array);
            return bytes.reduce((bits, byte) => (bits << 8n) | BigInt(byte), 0n);
          };
          const baseline = generate();
          let seen = 0n;
          for (let bit = 0; bit < entropyBytes * 8; bit += 1) {
            const input = new Uint8Array(entropyBytes);
            input[bit >> 3] = 1 << (bit & 7);
            const changed = generate(input) ^ baseline;
            assert.equal(changed & (changed - 1n), 0n, "one input bit changed multiple bits");
            assert.equal(seen & changed, 0n, "input bits merged into one output bit");
            seen |= changed;
          }
          const structural = (15n << 76n) | (3n << 62n);
          assert.equal(seen, ((1n << 80n) - 1n) & ~structural);
        }
      }
    },
  },
  {
    name: "counter overflow preserves the timestamp ceiling and caller output",
    run(this: void) {
      // All ones force overflow on the second draw. A lower-clock control distinguishes valid
      // borrowing from a refusal caused by the final representable timestamp.
      // The six-byte timestamp writer would otherwise wrap a borrowed millisecond to 1970,
      // placing subsequent identifiers before those already issued.
      const maximum = 2 ** 48 - 1;
      const ceiling = createUuidV7Generator({
        readUnixMs: () => maximum,
        fillRandom: (bytes) => {
          bytes.fill(0xff);
        },
      });
      assert.equal(unwrap(extractUuidV7UnixMs(unwrap(ceiling.generateUuidV7Bytes()))), maximum);
      const output = new Uint8Array(16).fill(0x55);
      const failed = ceiling.generateUuidV7Bytes(output);
      assert.ok(failed instanceof UuidSlugError);
      assert.equal(failed.code, INVALID_TIMESTAMP);
      assert.deepEqual(output, new Uint8Array(16).fill(0x55));
      const repeated = ceiling.generateUuidV7Bytes();
      assert.ok(repeated instanceof UuidSlugError);
      assert.equal(repeated.code, INVALID_TIMESTAMP);
      const below = createUuidV7Generator({
        readUnixMs: () => maximum - 1,
        fillRandom: (bytes) => {
          bytes.fill(0xff);
        },
      });
      assert.equal(unwrap(extractUuidV7UnixMs(unwrap(below.generateUuidV7Bytes()))), maximum - 1);
      assert.equal(unwrap(extractUuidV7UnixMs(unwrap(below.generateUuidV7Bytes()))), maximum);
    },
  },
  {
    name: "never publishes a partial entropy refill and erases consumed bytes",
    run(this: void) {
      const cause = new Error("partial entropy draw");
      const sourceBuffers: Uint8Array[] = [];
      let failing = false;
      let value = 0x11;
      const fill = pooledFill((bytes) => {
        sourceBuffers.push(bytes);
        bytes.fill(value, 0, failing ? bytes.length / 2 : bytes.length);
        if (failing) throw cause;
      });
      assert.equal(sourceBuffers.length, 0);
      const out = new Uint8Array(16);
      fill(out);
      const sourceBuffer = sourceBuffers[0];
      assert.ok(sourceBuffer);
      assert.ok(out.every((byte) => byte === 0x11));
      assert.ok(sourceBuffer.subarray(0, out.length).every((byte) => byte === 0));
      fill(new Uint8Array(sourceBuffer.length - out.length));
      failing = true;
      value = 0xaa;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        assert.throws(
          () => fill(out),
          (error) => error === cause,
        );
        assert.ok(out.every((byte) => byte === 0x11));
      }
      failing = false;
      value = 0x22;
      fill(out);
      assert.ok(out.every((byte) => byte === 0x22));
    },
  },
  {
    name: "pooled draws copy every byte and erase exactly the consumed range",
    run(this: void) {
      let source: Uint8Array | undefined;
      const fill = pooledFill((bytes) => {
        source = bytes;
        for (let i = 0; i < bytes.length; i += 1) bytes[i] = (i % 251) + 1;
      });
      let offset = 0;
      // Distinct source bytes expose duplication; sixteen-byte draws also start unaligned.
      for (const length of [4, 4, 4, 16, 16, 16]) {
        const output = new Uint8Array(length);
        assert.equal(fill(output), undefined);
        assert.deepEqual(
          Array.from(output),
          Array.from({ length }, (_, i) => offset + i + 1),
        );
        assert.ok(source);
        assert.ok(source.subarray(0, offset + length).every((byte) => byte === 0));
        assert.equal(source[offset + length], offset + length + 1);
        offset += length;
      }
    },
  },
  {
    name: "refuses UUIDv4 generation reentered from its entropy source",
    run(this: void) {
      const originalFill = runtime.fillRandom;
      const originalV4 = runtime.uuidV4;
      const expectedText = "11111111-1111-4111-9111-111111111111";
      const expectedBytes = Array.from(unwrap(uuidStringToBytes(expectedText)));
      const expectedSlug = unwrap(uuidStringToPlainSlug(expectedText));
      // Only the outermost draw reenters. An unrefused nested draw fills different bytes and returns,
      // so the outer result or the missing refusal fails here instead of recursing until the stack
      // overflows into an entropy failure that looks like the refusal.
      const reentered = <Result>(outer: () => Result, inner: () => unknown): Result => {
        let depth = 0;
        let nested: unknown;
        runtime.fillRandom = (bytes) => {
          depth += 1;
          bytes.fill(depth === 1 ? 0x11 : 0x22);
          if (depth === 1) nested = thrownBy(inner);
        };
        const result = outer();
        assert.ok(nested instanceof UuidSlugError);
        assert.equal(nested.code, "rng_unavailable");
        return result;
      };
      try {
        // Portable text, slugs, and caller-buffer writes share one module scratch array.
        delete runtime.uuidV4;
        for (const inner of [
          drawUuidV4Text,
          drawUuidV4Slug,
          drawOwnedUuidV4Bytes,
          drawCallerUuidV4Bytes,
        ]) {
          assert.equal(reentered(drawUuidV4Text, inner), expectedText);
          assert.equal(reentered(drawUuidV4Slug, inner), expectedSlug);
          assert.deepEqual(Array.from(reentered(drawOwnedUuidV4Bytes, inner)), expectedBytes);
          assert.deepEqual(Array.from(reentered(drawCallerUuidV4Bytes, inner)), expectedBytes);
        }
      } finally {
        runtime.fillRandom = originalFill;
        if (originalV4) runtime.uuidV4 = originalV4;
      }
    },
  },
  ...(["base64url", "base32hex"] as const).map((slugAlphabet) => ({
    name: `uses the supplied generator for ${slugAlphabet}`,
    run(this: void) {
      const generated = unwrap(makeGenerator().generateUuidV7());
      assert.equal(uuidToString(unwrap(uuidStringToPlainSlug(generated, slugAlphabet))), uuid);
    },
  })),
  {
    name: "rejects omitted-buffer offsets in both runtime byte methods",
    run(this: void) {
      const callUuidV7Bytes = generateUuidV7Bytes as (
        out?: Uint8Array,
        offset?: number,
      ) => Uint8Array | UuidSlugError;
      for (const offset of [-1, 1, 0.5, NaN, Infinity]) {
        for (const value of [
          callUuidV7Bytes(undefined, offset),
          Reflect.apply(generateUuidV7Bytes, undefined, [{ at: timestamp, outputOffset: offset }]),
        ]) {
          assert.ok(value instanceof UuidSlugError);
          assert.equal(value.code, "invalid_buffer");
        }
      }
    },
  },
  {
    name: "never treats an explicit invalid instant as a readUnixMs request",
    run(this: void) {
      const generator = makeGenerator();
      for (const instant of [undefined, NaN, Infinity, -1]) {
        for (const value of [
          generator.generateUuidV7({ at: instant as number }),
          generator.generateUuidV7Bytes({ at: instant as number }),
        ]) {
          assert.ok(value instanceof UuidSlugError);
          assert.equal(value.code, "invalid_timestamp");
        }
      }
    },
  },
  {
    name: "returns entropy failures with cause and leaves caller bytes untouched",
    run(this: void) {
      const cause = new Error("entropy offline");
      const generator = createUuidV7Generator({
        readUnixMs: () => timestamp,
        fillRandom(bytes) {
          bytes.fill(0xaa, 0, 8);
          throw cause;
        },
      });
      const out = new Uint8Array(32).fill(0x55);
      for (const value of [
        generator.generateUuidV7Bytes(out, 4),
        generator.generateUuidV7Bytes({ at: timestamp, output: out, outputOffset: 4 }),
        generator.generateUuidV7({ at: timestamp }),
        generator.generateUuidV7(),
      ]) {
        assert.ok(value instanceof UuidSlugError);
        assert.equal(value.code, "rng_unavailable");
        assert.equal(value.cause, cause);
      }
      assert.ok(out.every((byte) => byte === 0x55));
    },
  },
  {
    name: "preserves a throwing generator readUnixMs as invalid_timestamp",
    run(this: void) {
      const cause = new Error("readUnixMs offline");
      const generator = createUuidV7Generator({
        readUnixMs() {
          throw cause;
        },
        fillRandom: (bytes) => bytes.fill(0),
      });
      const result = generator.generateUuidV7Bytes();
      assert.ok(result instanceof UuidSlugError);
      assert.equal(result.code, "invalid_timestamp");
      assert.equal(result.cause, cause);
    },
  },
  {
    name: "rejects clock readings outside UUIDv7 bounds before writing caller storage",
    run(this: void) {
      // Both runtime adapters must reject overflow before its high timestamp bits are lost.
      for (const reading of [NaN, Infinity, -Infinity, -0.5, 2 ** 48]) {
        const generator = createUuidV7Generator({
          readUnixMs: () => reading,
          fillRandom: (bytes) => bytes.fill(0),
        });
        const output = new Uint8Array(24).fill(0x55);
        const result = generator.generateUuidV7Bytes(output, 4);
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.code, "invalid_timestamp");
        assert.ok(output.every((byte) => byte === 0x55));
      }
      for (const reading of [0, 0.5, 2 ** 48 - 1]) {
        const generator = createUuidV7Generator({
          readUnixMs: () => reading,
          fillRandom: (bytes) => bytes.fill(0),
        });
        const result = generator.generateUuidV7Bytes();
        assert.ok(result instanceof Uint8Array);
        assert.equal(extractUuidV7UnixMs(result), Math.trunc(reading));
      }
    },
  },
  {
    name: "rejects non-number readUnixMs results at the JavaScript boundary",
    run(this: void) {
      for (const value of ["123", 1n, Symbol("readUnixMs")]) {
        const generator = Reflect.apply(createUuidV7Generator, undefined, [
          { readUnixMs: () => value, fillRandom: (bytes: Uint8Array) => bytes.fill(0) },
        ]);
        const result = generator.generateUuidV7Bytes();
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.code, "invalid_timestamp");
      }
    },
  },
  {
    name: "returns errors for malformed public generator configuration",
    run(this: void) {
      for (const options of [null, 1, "generator", [], { readUnixMs: 1 }, { clok: Date.now }]) {
        const result = Reflect.apply(createSecureUuidV7Generator, undefined, [options]);
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.code, "invalid_options");
      }
      for (const property of ["readUnixMs"] as const) {
        const cause = new Error("readUnixMs getter failed");
        const options = Object.defineProperty({}, property, {
          get() {
            throw cause;
          },
        });
        const result = Reflect.apply(createSecureUuidV7Generator, undefined, [options]);
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.code, "invalid_options");
        assert.equal(result.cause, cause);
      }
    },
  },
  {
    name: "refuses malformed and nonfinite timestamp windows",
    run(this: void) {
      for (const options of [
        null,
        1,
        "one day",
        [],
        { maxTimestampDeltaMs: 0, referenceUnixMilliseconds: timestamp },
      ]) {
        const result = Reflect.apply(validateUuidV7StringUnixMs, undefined, [uuid, options]);
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.code, "invalid_timestamp");
      }
      for (const property of ["maxTimestampDeltaMs", "referenceUnixMs"] as const) {
        const cause = new Error(`${property} getter failed`);
        const options = Object.defineProperty({ maxTimestampDeltaMs: 0 }, property, {
          get() {
            throw cause;
          },
        });
        const result = validateUuidV7StringUnixMs(uuid, options);
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.code, "invalid_timestamp");
        assert.equal(result.cause, cause);
      }
      for (const maxTimestampDeltaMs of [NaN, Infinity, -Infinity, -1]) {
        const result = validateUuidV7StringUnixMs(uuid, {
          maxTimestampDeltaMs,
          referenceUnixMs: timestamp,
        });
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.code, "invalid_timestamp");
      }
      for (const referenceUnixMs of [NaN, Infinity, -Infinity]) {
        const result = validateUuidV7StringUnixMs(uuid, {
          maxTimestampDeltaMs: 0,
          referenceUnixMs,
        });
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.code, "invalid_timestamp");
      }
    },
  },
  {
    name: "distinguishes valid UUIDv4 values from malformed UUID text and slugs",
    run(this: void) {
      for (const result of [
        validateUuidV7StringUnixMs("1f04e7f5-c0c6-4044-b5a3-6278bb77ffb4", {
          maxTimestampDeltaMs: 0,
        }),
        validatePlainUuidV7SlugUnixMs("HwTn9cDGQES1o2J4u3f_tA", {
          maxTimestampDeltaMs: 0,
        }),
      ]) {
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.code, "invalid_uuid_version");
      }
    },
  },
  {
    name: "keeps inclusive symmetric fractional timestamp windows",
    run(this: void) {
      for (const delta of [-0.5, 0, 0.5]) {
        assert.equal(
          validateUuidV7StringUnixMs(uuid, {
            maxTimestampDeltaMs: 0.5,
            referenceUnixMs: timestamp + delta,
          }),
          uuid,
        );
      }
      assert.equal(
        validateUuidV7StringUnixMs(uuid, {
          maxTimestampDeltaMs: 0,
          referenceUnixMs: timestamp,
        }),
        uuid,
      );
      const stale = validateUuidV7StringUnixMs(uuid, {
        maxTimestampDeltaMs: 0.5,
        referenceUnixMs: timestamp + 1,
      });
      assert.ok(stale instanceof UuidSlugError);
      assert.equal(stale.code, "timestamp_outside_window");
    },
  },
  {
    name: "reads Date.now once when referenceUnixMs is omitted",
    run(this: void) {
      const originalNow = Date.now;
      let readings = 0;
      Date.now = () => {
        readings += 1;
        return timestamp;
      };
      try {
        assert.equal(validateUuidV7StringUnixMs(uuid, { maxTimestampDeltaMs: 0 }), uuid);
        assert.equal(readings, 1);
        for (const referenceUnixMs of [null, false, "", "1234567890000"]) {
          const result = Reflect.apply(validateUuidV7StringUnixMs, undefined, [
            uuid,
            { maxTimestampDeltaMs: 0, referenceUnixMs },
          ]);
          assert.ok(result instanceof UuidSlugError);
          assert.equal(result.code, "invalid_timestamp");
          assert.equal(readings, 1);
        }
      } finally {
        Date.now = originalNow;
      }
    },
  },
  {
    name: "accepts structurally valid UUIDv7 values at the window endpoints",
    run(this: void) {
      for (const endpoint of [
        "011f71fb-0450-7000-8000-000000000000",
        "011f71fb-0450-7fff-bfff-ffffffffffff",
      ]) {
        assert.equal(
          validateUuidV7StringUnixMs(endpoint, {
            maxTimestampDeltaMs: 0,
            referenceUnixMs: timestamp,
          }),
          endpoint,
        );
      }
    },
  },
  {
    name: "rejects collision on generated ciphertext as well as explicit conversion",
    run(this: void) {
      const bytes = uuidStringToBytes("019ff19b-58b8-7000-9b1b-df713bd55607");
      assert.ok(!(bytes instanceof Error));
      const xor = Uint8Array.from(Buffer.from("c99ff19b58b890005b1bdf713bd55607", "hex"));
      const mask = unwrap(
        createCustomUuidV7Mask({
          diagnosticLabel: "collision",
          mask(input) {
            return input.map((byte, i) => byte ^ (xor[i] as number));
          },
          unmask(input) {
            return input.map((byte, i) => byte ^ (xor[i] as number));
          },
        }),
      );
      const codec = unwrap(
        createUuidV7MaskingCodecWithGenerator({ mask, sentinels: NIL_TEST_SENTINEL }, () => bytes),
      );
      const failure = codec.generateMaskedUuidV7Slug();
      assert.ok(failure instanceof UuidSlugError);
      assert.equal(failure.code, "invalid_mask");
    },
  },
];
