// SPDX-License-Identifier: Apache-2.0

import { strict as assert } from "node:assert";
import vm from "node:vm";
import { pooledFill } from "../src/runtime/pool";
import { unwrap } from "../dev/unwrap";
import {
  createUuidSlugCodec,
  createCustomMaskSchema,
  createUuidV7Generator,
  extractUuidV7Timestamp,
  formatUuid,
  formatUuidSlug,
  isUuidSlugError,
  parseUuid,
  parseUuidSlug,
  slugToUuid,
  UuidSlugError,
  uuidToSlug,
  uuidV4Bytes,
  validateUuidV7Fresh,
  uuidV7Bytes,
  uuidV7BytesAt,
} from "../src/index";
import type { UuidV7Generator } from "../src/types";
import { createRuntimeGenerator } from "../src/v7";

const timestamp = 1_234_567_890_000;
const uuid = "011f71fb-0450-7121-8848-484a12121212";
const makeGenerator = () =>
  createUuidV7Generator({ clock: () => timestamp, fillRandom: (bytes) => bytes.fill(0x12) });

export const runtimeBoundaryCases = [
  {
    name: "accepts cross-realm Uint8Array inputs",
    run(this: void) {
      const bytes = vm.runInNewContext("new Uint8Array(16)") as Uint8Array;
      assert.equal(formatUuid(bytes), "00000000-0000-0000-0000-000000000000");
    },
  },
  {
    name: "accepts cross-realm Uint8Array custom transform results",
    run(this: void) {
      const copy = vm.runInNewContext("(input) => new Uint8Array(input)") as (
        input: Uint8Array,
      ) => Uint8Array;
      const schema = createCustomMaskSchema({
        id: "cross-realm-output",
        forward: copy,
        reverse: copy,
      });
      assert.ok(!(schema instanceof Error));
      const codec = unwrap(createUuidSlugCodec({ mask: schema }));
      const slug = unwrap(codec.uuidV7ToMaskedSlug(uuid));
      assert.equal(codec.maskedSlugToUuidV7(slug), uuid);
    },
  },
  {
    name: "byte interfaces reject non-Uint8Array inputs and outputs",
    run(this: void) {
      const slug = "AR9x-wRQcSGISEhKEhISEg";
      const generator = makeGenerator();
      const calls = [
        (value: unknown) => Reflect.apply(formatUuid, undefined, [value]),
        (value: unknown) => Reflect.apply(formatUuidSlug, undefined, [value]),
        (value: unknown) => Reflect.apply(extractUuidV7Timestamp, undefined, [value]),
        (value: unknown) => Reflect.apply(parseUuid, undefined, [uuid, value]),
        (value: unknown) => Reflect.apply(parseUuidSlug, undefined, [slug, value]),
        (value: unknown) => Reflect.apply(uuidV4Bytes, undefined, [value]),
        (value: unknown) => Reflect.apply(generator.uuidV7Bytes, undefined, [value]),
        (value: unknown) => Reflect.apply(generator.uuidV7BytesAt, undefined, [timestamp, value]),
      ];
      for (const value of [
        Array.from({ length: 16 }, () => 0),
        { length: 16 },
        new DataView(new ArrayBuffer(16)),
        Object.defineProperty(new Uint16Array(16), Symbol.toStringTag, { value: "Uint8Array" }),
      ]) {
        for (const call of calls) {
          const result = call(value);
          assert.ok(isUuidSlugError(result));
          assert.equal(result.code, "invalid_buffer");
        }
      }
    },
  },
  {
    name: "classifies only local errors with a published code",
    run(this: void) {
      const invalid = Reflect.construct(UuidSlugError, ["unknown_code", "invalid code"]);
      assert.equal(isUuidSlugError(invalid), false);

      const mutated = new UuidSlugError("invalid_uuid", "mutated code");
      Reflect.set(mutated, "code", "unknown_code");
      assert.equal(isUuidSlugError(mutated), false);
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
      const generator: UuidV7Generator = {
        uuidV7: () => foreignError,
        uuidV7At: () => foreignError,
        uuidV7Bytes: () => foreignError,
        uuidV7BytesAt: () => foreignError,
      };
      const codec = createUuidSlugCodec({ mask: { seed: "cross-realm-generator" }, generator });
      assert.ok(!(codec instanceof Error));
      assert.equal(codec.uuidV7MaskedSlug(), foreignError);
    },
  },
  {
    name: "falls back from native byte generation without replacing the caller's buffer",
    run(this: void) {
      const nativeCause = new Error("native generator failed");
      const generator = createRuntimeGenerator({
        fillRandom: (bytes) => bytes.fill(0x12),
        uuidV7Bytes() {
          throw nativeCause;
        },
        uuidV7BytesAt() {
          throw nativeCause;
        },
      });
      for (const generate of [
        (out: Uint8Array) => generator.uuidV7Bytes(out, 4),
        (out: Uint8Array) => generator.uuidV7BytesAt(timestamp, out, 4),
      ]) {
        const out = new Uint8Array(24).fill(0x55);
        assert.equal(generate(out), out);
        assert.ok(out.subarray(0, 4).every((byte) => byte === 0x55));
        assert.ok(out.subarray(4, 20).some((byte) => byte !== 0x55));
        assert.ok(out.subarray(20).every((byte) => byte === 0x55));
      }
    },
  },
  {
    name: "retains native and portable causes when both generators fail",
    run(this: void) {
      const nativeCause = new Error("native generator failed");
      const portableCause = new Error("portable generator failed");
      const generator = createRuntimeGenerator({
        fillRandom() {
          throw portableCause;
        },
        uuidV7() {
          throw nativeCause;
        },
        uuidV7At() {
          throw nativeCause;
        },
        uuidV7Bytes() {
          throw nativeCause;
        },
        uuidV7BytesAt() {
          throw nativeCause;
        },
      });
      for (const result of [
        generator.uuidV7(),
        generator.uuidV7At(timestamp),
        generator.uuidV7Bytes(),
        generator.uuidV7BytesAt(timestamp),
      ]) {
        assert.ok(result instanceof UuidSlugError);
        assert.ok(result.cause instanceof AggregateError);
        assert.equal(result.cause.errors[0], nativeCause);
        const portableFailure = result.cause.errors[1];
        assert.ok(portableFailure instanceof UuidSlugError);
        assert.equal(portableFailure.code, "rng_unavailable");
        assert.equal(portableFailure.cause, portableCause);
      }
    },
  },
  {
    name: "preserves all portable v7 payload bits without merging input bits",
    run(this: void) {
      for (const explicit of [false, true]) {
        const generate = (input: Uint8Array) => {
          const generator = createUuidV7Generator({
            clock: () => 0,
            fillRandom: (bytes) => bytes.set(input),
          });
          const bytes = explicit ? generator.uuidV7BytesAt(0) : generator.uuidV7Bytes();
          assert.ok(bytes instanceof Uint8Array);
          return bytes.reduce((bits, byte) => (bits << 8n) | BigInt(byte), 0n);
        };
        const baseline = generate(new Uint8Array(16));
        let seen = 0n;
        for (let bit = 0; bit < 128; bit += 1) {
          const input = new Uint8Array(16);
          input[bit >> 3] = 1 << (bit & 7);
          const changed = generate(input) ^ baseline;
          assert.equal(changed & (changed - 1n), 0n, "one input bit changed multiple bits");
          assert.equal(seen & changed, 0n, "input bits merged into one output bit");
          seen |= changed;
        }
        const structural = (15n << 76n) | (3n << 62n);
        assert.equal(seen, ((1n << 80n) - 1n) & ~structural);
      }
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
  ...(["base64url", "base32hex"] as const).map((slugAlphabet) => ({
    name: `uses the supplied generator for ${slugAlphabet}`,
    run(this: void) {
      const generated = unwrap(makeGenerator().uuidV7());
      assert.equal(slugToUuid(unwrap(uuidToSlug(generated, slugAlphabet))), uuid);
    },
  })),
  {
    name: "rejects omitted-buffer offsets in both runtime byte methods",
    run(this: void) {
      const callUuidV7Bytes = uuidV7Bytes as (
        out?: Uint8Array,
        offset?: number,
      ) => Uint8Array | UuidSlugError;
      const callUuidV7BytesAt = uuidV7BytesAt as (
        timestamp: number,
        out?: Uint8Array,
        offset?: number,
      ) => Uint8Array | UuidSlugError;
      for (const offset of [-1, 1, 0.5, NaN, Infinity]) {
        for (const value of [
          callUuidV7Bytes(undefined, offset),
          callUuidV7BytesAt(timestamp, undefined, offset),
        ]) {
          assert.ok(value instanceof UuidSlugError);
          assert.equal(value.code, "invalid_buffer");
        }
      }
    },
  },
  {
    name: "never treats an explicit invalid instant as a clock request",
    run(this: void) {
      const generator = makeGenerator();
      for (const instant of [undefined, NaN, Infinity, -1, 0.5]) {
        for (const value of [
          generator.uuidV7At(instant as number),
          generator.uuidV7BytesAt(instant as number),
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
        clock: () => timestamp,
        fillRandom(bytes) {
          bytes.fill(0xaa, 0, 8);
          throw cause;
        },
      });
      const out = new Uint8Array(32).fill(0x55);
      for (const value of [
        generator.uuidV7Bytes(out, 4),
        generator.uuidV7BytesAt(timestamp, out, 4),
        generator.uuidV7At(timestamp),
        generator.uuidV7(),
      ]) {
        assert.ok(value instanceof UuidSlugError);
        assert.equal(value.code, "rng_unavailable");
        assert.equal(value.cause, cause);
      }
      assert.ok(out.every((byte) => byte === 0x55));
    },
  },
  {
    name: "preserves a throwing generator clock as invalid_timestamp",
    run(this: void) {
      const cause = new Error("clock offline");
      const generator = createUuidV7Generator({
        clock() {
          throw cause;
        },
        fillRandom: (bytes) => bytes.fill(0),
      });
      const result = generator.uuidV7Bytes();
      assert.ok(result instanceof UuidSlugError);
      assert.equal(result.code, "invalid_timestamp");
      assert.equal(result.cause, cause);
    },
  },
  {
    name: "rejects non-number clock results at the JavaScript boundary",
    run(this: void) {
      for (const value of ["123", 1n, Symbol("clock")]) {
        const generator = Reflect.apply(createUuidV7Generator, undefined, [
          { clock: () => value, fillRandom: (bytes: Uint8Array) => bytes.fill(0) },
        ]);
        const result = generator.uuidV7Bytes();
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.code, "invalid_timestamp");
      }
    },
  },
  {
    name: "rejects malformed portable generator configuration",
    run(this: void) {
      for (const options of [null, 1, "generator", [], {}, { fillRandom: 1 }]) {
        assert.throws(() => Reflect.apply(createUuidV7Generator, undefined, [options]), TypeError);
      }
      for (const property of ["clock", "fillRandom"] as const) {
        const cause = new Error(`${property} getter failed`);
        const options = Object.defineProperty(
          { fillRandom: (bytes: Uint8Array) => bytes.fill(0) },
          property,
          {
            get() {
              throw cause;
            },
          },
        );
        assert.throws(
          () => Reflect.apply(createUuidV7Generator, undefined, [options]),
          (error: unknown) => error === cause,
        );
      }
    },
  },
  {
    name: "refuses nonfinite and negative freshness configuration",
    run(this: void) {
      for (const options of [null, 1, "one day", []]) {
        const result = Reflect.apply(validateUuidV7Fresh, undefined, [uuid, options]);
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.code, "invalid_timestamp");
      }
      for (const property of ["windowMs", "now"] as const) {
        const cause = new Error(`${property} getter failed`);
        const options = Object.defineProperty({}, property, {
          get() {
            throw cause;
          },
        });
        const result = validateUuidV7Fresh(uuid, options);
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.code, "invalid_timestamp");
        assert.equal(result.cause, cause);
      }
      for (const windowMs of [NaN, Infinity, -Infinity, -1]) {
        const result = validateUuidV7Fresh(uuid, { windowMs, now: () => timestamp });
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.code, "invalid_timestamp");
      }
      for (const now of [NaN, Infinity, -Infinity]) {
        const result = validateUuidV7Fresh(uuid, { now: () => now });
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.code, "invalid_timestamp");
      }
    },
  },
  {
    name: "keeps inclusive symmetric fractional freshness windows and reads the clock once",
    run(this: void) {
      for (const delta of [-0.5, 0, 0.5]) {
        let readings = 0;
        assert.equal(
          validateUuidV7Fresh(uuid, {
            windowMs: 0.5,
            now() {
              readings += 1;
              return timestamp + delta;
            },
          }),
          uuid,
        );
        assert.equal(readings, 1);
      }
      assert.equal(validateUuidV7Fresh(uuid, { windowMs: 0, now: () => timestamp }), uuid);
      const stale = validateUuidV7Fresh(uuid, { windowMs: 0.5, now: () => timestamp + 1 });
      assert.ok(stale instanceof UuidSlugError);
      assert.equal(stale.code, "stale_uuid");
      const cause = new Error("freshness clock offline");
      const error = validateUuidV7Fresh(uuid, {
        now() {
          throw cause;
        },
      });
      assert.ok(error instanceof UuidSlugError);
      assert.equal(error.cause, cause);
    },
  },
  {
    name: "accepts structurally valid fresh UUIDv7 endpoint values",
    run(this: void) {
      for (const endpoint of [
        "011f71fb-0450-7000-8000-000000000000",
        "011f71fb-0450-7fff-bfff-ffffffffffff",
      ]) {
        assert.equal(
          validateUuidV7Fresh(endpoint, { windowMs: 0, now: () => timestamp }),
          endpoint,
        );
      }
    },
  },
  {
    name: "rejects collision on generated ciphertext as well as explicit conversion",
    run(this: void) {
      const bytes = parseUuid("019ff19b-58b8-7000-9b1b-df713bd55607");
      assert.ok(!(bytes instanceof Error));
      const xor = Uint8Array.from(Buffer.from("c99ff19b58b890005b1bdf713bd55607", "hex"));
      const mask = unwrap(
        createCustomMaskSchema({
          id: "collision",
          forward(input) {
            return input.map((byte, i) => byte ^ (xor[i] as number));
          },
          reverse(input) {
            return input.map((byte, i) => byte ^ (xor[i] as number));
          },
        }),
      );
      const codec = unwrap(
        createUuidSlugCodec({
          generator: { ...makeGenerator(), uuidV7Bytes: () => bytes },
          mask,
        }),
      );
      const failure = codec.uuidV7MaskedSlug();
      assert.ok(failure instanceof UuidSlugError);
      assert.equal(failure.code, "invalid_mask_schema");
    },
  },
];
