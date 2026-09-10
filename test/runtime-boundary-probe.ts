// SPDX-License-Identifier: Apache-2.0

import { strict as assert } from "node:assert";
import { pooledFill } from "../src/runtime/pool";
import { unwrap } from "../dev/unwrap";
import {
  createUuidSlugCodec,
  createCustomMaskSchema,
  createUuidV7Generator,
  parseUuid,
  slugToUuid,
  UuidSlugError,
  uuidToSlug,
  validateUuidV7Fresh,
  uuidV7Bytes,
  uuidV7BytesAt,
} from "../src/index";

const timestamp = 1_234_567_890_000;
const uuid = "011f71fb-0450-7121-8848-484a12121212";
const makeGenerator = () =>
  createUuidV7Generator({ clock: () => timestamp, fillRandom: (bytes) => bytes.fill(0x12) });

export const runtimeBoundaryCases = [
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
      for (const offset of [-1, 1, 0.5, NaN, Infinity]) {
        for (const value of [
          uuidV7Bytes(undefined, offset),
          uuidV7BytesAt(timestamp, undefined, offset),
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
    name: "refuses nonfinite and negative freshness configuration",
    run(this: void) {
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
    name: "rejects collision on generated ciphertext as well as explicit conversion",
    run(this: void) {
      const bytes = parseUuid("019ff19b-58b8-7000-9b1b-df713bd55607");
      assert.ok(!(bytes instanceof Error));
      const xor = Uint8Array.from(Buffer.from("c99ff19b58b890005b1bdf713bd55607", "hex"));
      const mask = unwrap(
        createCustomMaskSchema({
          id: "collision",
          forward(input, output) {
            for (let i = 0; i < 16; i += 1) output[i] = (input[i] as number) ^ (xor[i] as number);
          },
          reverse(input, output) {
            for (let i = 0; i < 16; i += 1) output[i] = (input[i] as number) ^ (xor[i] as number);
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
