// SPDX-License-Identifier: Apache-2.0

import { strict as assert } from "node:assert";
import {
  createUuidSlugCodec,
  createUuidV7Generator,
  parseUuid,
  slugToUuid,
  UuidSlugError,
  validateUuidV7Fresh,
} from "../src/index";

const timestamp = 1_234_567_890_000;
const uuid = "011f71fb-0450-7121-8848-484a12121212";
const makeGenerator = () =>
  createUuidV7Generator({ clock: () => timestamp, fillRandom: (bytes) => bytes.fill(0x12) });

export const runtimeBoundaryCases = [
  ...(["base64url", "base32hex"] as const).map((slugAlphabet) => ({
    name: `uses the supplied generator for ${slugAlphabet}`,
    run(this: void) {
      assert.equal(
        slugToUuid(createUuidSlugCodec({ generator: makeGenerator(), slugAlphabet }).uuidV7Slug()),
        uuid,
      );
    },
  })),
  {
    name: "rejects omitted-buffer offsets in both runtime byte methods",
    run(this: void) {
      const codec = createUuidSlugCodec();
      for (const offset of [-1, 1, 0.5, NaN, Infinity]) {
        for (const value of [
          codec.uuidV7Bytes(undefined, offset),
          codec.uuidV7BytesAt(timestamp, undefined, offset),
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
      for (const generator of [makeGenerator(), createUuidSlugCodec()]) {
        for (const instant of [undefined, NaN, Infinity, -1, 0.5]) {
          for (const value of [
            generator.uuidV7At(instant as number),
            generator.uuidV7BytesAt(instant as number),
          ]) {
            assert.ok(value instanceof UuidSlugError);
            assert.equal(value.code, "invalid_timestamp");
          }
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
        fillRandom() {
          throw cause;
        },
      });
      const out = new Uint8Array(32).fill(0x55);
      for (const value of [
        generator.uuidV7Bytes(out, 4),
        generator.uuidV7BytesAt(timestamp, out, 4),
        generator.uuidV7At(timestamp),
      ]) {
        assert.ok(value instanceof UuidSlugError);
        assert.equal(value.code, "rng_unavailable");
        assert.equal(value.cause, cause);
      }
      assert.ok(out.every((byte) => byte === 0x55));
      assert.throws(
        generator.uuidV7,
        (error: Error) => error instanceof UuidSlugError && error.cause === cause,
      );
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
      const codec = createUuidSlugCodec({
        generator: { ...makeGenerator(), uuidV7Bytes: () => bytes },
        mask: {
          id: "collision",
          mix(input, output) {
            for (let i = 0; i < 16; i += 1) output[i] = (input[i] as number) ^ (xor[i] as number);
          },
        },
      });
      assert.throws(codec.uuidV7MaskedSlug, { code: "invalid_mask_schema" });
    },
  },
];
