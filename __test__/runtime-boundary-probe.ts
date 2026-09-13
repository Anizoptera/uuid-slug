// SPDX-License-Identifier: Apache-2.0

import { strict as assert } from "node:assert";
import vm from "node:vm";
import { pooledFill } from "../src/runtime/pool";
import { runtime } from "#runtime";
import { unwrap } from "../dev/unwrap";
import {
  createUuidV7Generator as createSecureUuidV7Generator,
  createUuidV7SlugCodec,
  createCustomUuidV7Mask,
  extractUuidV7Timestamp,
  bytesToUuid,
  bytesToSlug,
  isUuidV4String,
  isUuidV7Bytes,
  isUuidV7Slug,
  isUuidV7String,
  isUuidSlugError,
  uuidToBytes,
  slugToBytes,
  slugToUuid,
  UuidSlugError,
  uuidToSlug,
  generateUuidV4,
  generateUuidV4Bytes,
  generateUuidV4Slug,
  generateUuidV7,
  generateUuidV7At,
  validateUuidV7Timestamp,
  validateUuidV7SlugTimestamp,
  generateUuidV7Bytes,
  generateUuidV7BytesAt,
  generateUuidV7Slug,
} from "../src/index";
import { createPortableUuidV7Generator as createUuidV7Generator } from "../src/v7";
import { createUuidV7SlugCodecWithGenerator } from "../src/codec";
import type { UuidV7Generator } from "../src/types";
import { createRuntimeGenerator } from "../src/v7";
import { NIL_TEST_SENTINEL } from "./sentinel-fixtures";

const timestamp = 1_234_567_890_000;
const uuid = "011f71fb-0450-7121-8848-484a12121212";
const makeGenerator = () =>
  createUuidV7Generator({ clock: () => timestamp, fillRandom: (bytes) => bytes.fill(0x12) });
const hasCause = (value: unknown, target: unknown): boolean =>
  value === target ||
  (value instanceof AggregateError && value.errors.some((cause) => hasCause(cause, target))) ||
  (value instanceof Error && hasCause(value.cause, target));

export const runtimeBoundaryCases = [
  {
    name: "public generators never read caller-supplied entropy",
    run(this: void) {
      const originalFill = runtime.fillRandom;
      let runtimeDraws = 0;
      runtime.fillRandom = (bytes) => {
        runtimeDraws += 1;
        originalFill(bytes);
      };
      const options = {
        clock: () => timestamp,
        get fillRandom(): never {
          throw new Error("untrusted entropy was read");
        },
      };
      try {
        const generator = Reflect.apply(createSecureUuidV7Generator, undefined, [options]);
        assert.ok(!(generator.generateUuidV7Bytes() instanceof Error));
        assert.equal(runtimeDraws, 1);
      } finally {
        runtime.fillRandom = originalFill;
      }
    },
  },
  {
    name: "public generators fail atomically when platform entropy is unavailable",
    run(this: void) {
      const originalFill = runtime.fillRandom;
      const cause = new Error("platform entropy unavailable");
      runtime.fillRandom = () =>
        new UuidSlugError("rng_unavailable", "platform entropy unavailable", { cause });
      const out = new Uint8Array(24).fill(0xa5);
      try {
        const generator = createSecureUuidV7Generator({ clock: () => timestamp });
        const failure = generator.generateUuidV7Bytes(out, 4);
        assert.ok(failure instanceof UuidSlugError);
        assert.equal(failure.code, "rng_unavailable");
        assert.equal(failure.cause, cause);
        assert.deepEqual(out, new Uint8Array(24).fill(0xa5));
      } finally {
        runtime.fillRandom = originalFill;
      }
    },
  },
  {
    name: "distinguishes native success, portable success and dual failure by output route",
    run(this: void) {
      const saved = { ...runtime };
      const portableCause = new Error("portable route failed");
      const nativeCause = new Error("native route failed");
      let failPortable = false;
      const nativeCalls = { v4: 0, v7: 0 };
      const expectedNativeCalls = { v4: 1, v7: 1 };
      runtime.fillRandom = (bytes) => {
        if (failPortable) throw portableCause;
        saved.fillRandom(bytes);
      };
      const native =
        <Result>(key: keyof typeof nativeCalls, value: Result) =>
        () => {
          nativeCalls[key] += 1;
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
        runtime.uuidV4 = native("v4", "123e4567-e89b-42d3-a456-426614174000");
        runtime.uuidV7 = native("v7", uuid);
        assert.equal(generateUuidV4(), "123e4567-e89b-42d3-a456-426614174000");
        assert.equal(isUuidV4String(bytesToUuid(unwrap(generateUuidV4Bytes()))), true);
        assert.equal(typeof generateUuidV4Slug(), "string");
        assert.equal(generateUuidV7(), uuid);
        assert.equal(isUuidV7String(generateUuidV7At(timestamp)), true);
        assert.equal(isUuidV7Bytes(generateUuidV7Bytes()), true);
        assert.equal(isUuidV7Bytes(generateUuidV7BytesAt(timestamp)), true);
        const currentOut = new Uint8Array(24).fill(0x55);
        const explicitOut = new Uint8Array(24).fill(0x55);
        assert.equal(generateUuidV7Bytes(currentOut, 4), currentOut);
        assert.equal(generateUuidV7BytesAt(timestamp, explicitOut, 4), explicitOut);
        assert.equal(isUuidV7Slug(generateUuidV7Slug()), true);
        assert.equal(unwrap(generateUuidV7Slug("base32hex")).length, 26);
        assert.deepEqual(nativeCalls, expectedNativeCalls);

        delete runtime.uuidV4;
        delete runtime.uuidV7;
        assert.equal(isUuidV4String(generateUuidV4()), true);
        assert.equal(isUuidV7String(generateUuidV7()), true);
        assert.equal(isUuidV7String(generateUuidV7At(timestamp)), true);
        assert.equal(isUuidV7Bytes(generateUuidV7Bytes()), true);
        assert.equal(isUuidV7Bytes(generateUuidV7BytesAt(timestamp)), true);
        assert.equal(isUuidV7Slug(generateUuidV7Slug()), true);
        assert.equal(unwrap(generateUuidV7Slug("base32hex")).length, 26);
        assert.deepEqual(nativeCalls, expectedNativeCalls);

        const throwNative = (): never => {
          throw nativeCause;
        };
        runtime.uuidV4 = throwNative;
        runtime.uuidV7 = throwNative;
        failPortable = true;
        assertDualFailure(generateUuidV4());
        assertPortableFailure(generateUuidV4Bytes());
        assertPortableFailure(generateUuidV4Slug());
        const dualGenerator = createRuntimeGenerator({
          fillRandom() {
            throw portableCause;
          },
          uuidV7: throwNative,
        });
        assertDualFailure(dualGenerator.generateUuidV7());
      } finally {
        failPortable = false;
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
        assert.ok(!(generateUuidV4() instanceof Error));
      } finally {
        if (originalV4) runtime.uuidV4 = originalV4;
        else delete runtime.uuidV4;
      }
    },
  },
  {
    name: "falls back when optional native generation returns malformed values",
    run(this: void) {
      const originalV4 = runtime.uuidV4;
      runtime.uuidV4 = () => "not-a-uuid";
      try {
        assert.equal(isUuidV4String(generateUuidV4()), true);
      } finally {
        if (originalV4) runtime.uuidV4 = originalV4;
        else delete runtime.uuidV4;
      }

      const generator = createRuntimeGenerator({
        fillRandom: (bytes) => {
          bytes.fill(0x12);
          return undefined;
        },
        uuidV7: () => "not-a-uuid",
      });
      assert.equal(isUuidV7String(generator.generateUuidV7()), true);
      assert.equal(isUuidV7String(generator.generateUuidV7At(timestamp)), true);
      assert.equal(isUuidV7Bytes(generator.generateUuidV7Bytes()), true);
      assert.equal(isUuidV7Bytes(generator.generateUuidV7BytesAt(timestamp)), true);
      for (const generate of [
        (out: Uint8Array) => generator.generateUuidV7Bytes(out, 4),
        (out: Uint8Array) => generator.generateUuidV7BytesAt(timestamp, out, 4),
      ]) {
        const out = new Uint8Array(24).fill(0x55);
        assert.equal(generate(out), out);
        assert.ok(out.subarray(0, 4).every((byte) => byte === 0x55));
        assert.ok(isUuidV7Bytes(out.subarray(4, 20)));
        assert.ok(out.subarray(20).every((byte) => byte === 0x55));
      }
    },
  },
  {
    name: "accepts cross-realm Uint8Array inputs",
    run(this: void) {
      const bytes = vm.runInNewContext("new Uint8Array(16)") as Uint8Array;
      assert.equal(bytesToUuid(bytes), "00000000-0000-0000-0000-000000000000");
    },
  },
  {
    name: "accepts cross-realm Uint8Array custom transform results",
    run(this: void) {
      const copy = vm.runInNewContext("(input) => new Uint8Array(input)") as (
        input: Uint8Array,
      ) => Uint8Array;
      const handle = createCustomUuidV7Mask({
        label: "cross-realm-output",
        mask: copy,
        unmask: copy,
      });
      assert.ok(!(handle instanceof Error));
      const codec = unwrap(createUuidV7SlugCodec({ mask: handle }));
      const slug = unwrap(codec.encodeUuid(uuid));
      assert.equal(codec.decodeSlug(slug), uuid);
    },
  },
  {
    name: "byte interfaces reject non-Uint8Array inputs and outputs",
    run(this: void) {
      const slug = "AR9x-wRQcSGISEhKEhISEg";
      const generator = makeGenerator();
      const calls = [
        (value: unknown) => Reflect.apply(bytesToUuid, undefined, [value]),
        (value: unknown) => Reflect.apply(bytesToSlug, undefined, [value]),
        (value: unknown) => Reflect.apply(extractUuidV7Timestamp, undefined, [value]),
        (value: unknown) => Reflect.apply(uuidToBytes, undefined, [uuid, value]),
        (value: unknown) => Reflect.apply(slugToBytes, undefined, [slug, value]),
        (value: unknown) => Reflect.apply(generateUuidV4Bytes, undefined, [value]),
        (value: unknown) => Reflect.apply(generator.generateUuidV7Bytes, undefined, [value]),
        (value: unknown) =>
          Reflect.apply(generator.generateUuidV7BytesAt, undefined, [timestamp, value]),
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
        generateUuidV7: () => foreignError,
        generateUuidV7At: () => foreignError,
        generateUuidV7Bytes: () => foreignError,
        generateUuidV7BytesAt: () => foreignError,
      };
      const codec = createUuidV7SlugCodecWithGenerator(
        { mask: { seed: "cross-realm-generator" } },
        generator.generateUuidV7Bytes,
      );
      assert.ok(!(codec instanceof Error));
      assert.equal(codec.generateSlug(), foreignError);
    },
  },
  {
    name: "preserves all portable v7 payload bits without merging input bits",
    run(this: void) {
      for (const explicit of [false, true]) {
        let entropyBytes = 0;
        const generate = (input?: Uint8Array) => {
          const generator = createUuidV7Generator({
            clock: () => 0,
            fillRandom: (bytes) => {
              entropyBytes = bytes.length;
              if (input) bytes.set(input);
            },
          });
          const bytes = explicit
            ? generator.generateUuidV7BytesAt(0)
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
    name: "refuses UUIDv4 generation reentered from its entropy source",
    run(this: void) {
      const originalFill = runtime.fillRandom;
      let nested: unknown;
      runtime.fillRandom = (bytes) => {
        bytes.fill(nested === undefined ? 0x11 : 0x22);
        if (nested === undefined) nested = generateUuidV4Bytes();
      };
      try {
        assert.ok(!(generateUuidV4Bytes() instanceof Error));
        assert.ok(nested instanceof UuidSlugError);
        assert.equal(nested.code, "rng_unavailable");
      } finally {
        runtime.fillRandom = originalFill;
      }
    },
  },
  ...(["base64url", "base32hex"] as const).map((slugAlphabet) => ({
    name: `uses the supplied generator for ${slugAlphabet}`,
    run(this: void) {
      const generated = unwrap(makeGenerator().generateUuidV7());
      assert.equal(slugToUuid(unwrap(uuidToSlug(generated, slugAlphabet))), uuid);
    },
  })),
  {
    name: "rejects omitted-buffer offsets in both runtime byte methods",
    run(this: void) {
      const callUuidV7Bytes = generateUuidV7Bytes as (
        out?: Uint8Array,
        offset?: number,
      ) => Uint8Array | UuidSlugError;
      const callUuidV7BytesAt = generateUuidV7BytesAt as (
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
          generator.generateUuidV7At(instant as number),
          generator.generateUuidV7BytesAt(instant as number),
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
        generator.generateUuidV7Bytes(out, 4),
        generator.generateUuidV7BytesAt(timestamp, out, 4),
        generator.generateUuidV7At(timestamp),
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
    name: "preserves a throwing generator clock as invalid_timestamp",
    run(this: void) {
      const cause = new Error("clock offline");
      const generator = createUuidV7Generator({
        clock() {
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
    name: "rejects non-number clock results at the JavaScript boundary",
    run(this: void) {
      for (const value of ["123", 1n, Symbol("clock")]) {
        const generator = Reflect.apply(createUuidV7Generator, undefined, [
          { clock: () => value, fillRandom: (bytes: Uint8Array) => bytes.fill(0) },
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
      for (const options of [null, 1, "generator", [], { clock: 1 }]) {
        const result = Reflect.apply(createSecureUuidV7Generator, undefined, [options]);
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.code, "invalid_options");
      }
      for (const property of ["clock"] as const) {
        const cause = new Error("clock getter failed");
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
      for (const options of [null, 1, "one day", []]) {
        const result = Reflect.apply(validateUuidV7Timestamp, undefined, [uuid, options]);
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
        const result = validateUuidV7Timestamp(uuid, options);
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.code, "invalid_timestamp");
        assert.equal(result.cause, cause);
      }
      for (const maxTimestampDeltaMs of [NaN, Infinity, -Infinity, -1]) {
        const result = validateUuidV7Timestamp(uuid, {
          maxTimestampDeltaMs,
          referenceUnixMs: timestamp,
        });
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.code, "invalid_timestamp");
      }
      for (const referenceUnixMs of [NaN, Infinity, -Infinity]) {
        const result = validateUuidV7Timestamp(uuid, {
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
        validateUuidV7Timestamp("1f04e7f5-c0c6-4044-b5a3-6278bb77ffb4", {
          maxTimestampDeltaMs: 0,
        }),
        validateUuidV7SlugTimestamp("HwTn9cDGQES1o2J4u3f_tA", {
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
          validateUuidV7Timestamp(uuid, {
            maxTimestampDeltaMs: 0.5,
            referenceUnixMs: timestamp + delta,
          }),
          uuid,
        );
      }
      assert.equal(
        validateUuidV7Timestamp(uuid, {
          maxTimestampDeltaMs: 0,
          referenceUnixMs: timestamp,
        }),
        uuid,
      );
      const stale = validateUuidV7Timestamp(uuid, {
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
        assert.equal(validateUuidV7Timestamp(uuid, { maxTimestampDeltaMs: 0 }), uuid);
        assert.equal(readings, 1);
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
          validateUuidV7Timestamp(endpoint, {
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
      const bytes = uuidToBytes("019ff19b-58b8-7000-9b1b-df713bd55607");
      assert.ok(!(bytes instanceof Error));
      const xor = Uint8Array.from(Buffer.from("c99ff19b58b890005b1bdf713bd55607", "hex"));
      const mask = unwrap(
        createCustomUuidV7Mask({
          label: "collision",
          mask(input) {
            return input.map((byte, i) => byte ^ (xor[i] as number));
          },
          unmask(input) {
            return input.map((byte, i) => byte ^ (xor[i] as number));
          },
        }),
      );
      const codec = unwrap(
        createUuidV7SlugCodecWithGenerator({ mask, sentinels: NIL_TEST_SENTINEL }, () => bytes),
      );
      const failure = codec.generateSlug();
      assert.ok(failure instanceof UuidSlugError);
      assert.equal(failure.code, "invalid_mask");
    },
  },
];
