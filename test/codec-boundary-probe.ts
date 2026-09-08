// SPDX-License-Identifier: Apache-2.0

import { strict as assert } from "node:assert";
import {
  createMaskSchema,
  createUuidSlugCodec as createCodec,
  createUuidV7Generator,
  DEFAULT_MASK_SCHEMA,
  isUuidString,
  isUuidV4String,
  isUuidV7String,
  isUuidSlug,
  isUuidV4Slug,
  isUuidV7Slug,
  uuidToSlug,
  slugToUuid,
  UUID_SLUG_ERROR_CODES,
  UUID_V7_SENTINEL_DEFINITIONS,
  UuidSlugError,
} from "../src/index";
import { isBase64Url } from "../src/base64url";
import type { MaskSchema, UuidSlugCodecOptions } from "../src/types";
import { unwrap } from "../dev/unwrap";
import fixtures from "../rust/uuid-slug/tests/fixtures/fixtures-original-slugs.json";
import { uuidVariants } from "./uuid-variants";

const createUuidSlugCodec = (options?: UuidSlugCodecOptions) =>
  options === undefined ? createCodec() : unwrap(createCodec(options));

/** Compare the full payload independently of production bit packing. */
function bits(text: string, alphabet: string, width: number) {
  return Array.from(text, (char) => alphabet.indexOf(char).toString(2).padStart(width, "0")).join(
    "",
  );
}

export const codecBoundaryCases = [
  {
    name: "safe masked spelling preserves all wire bits, strict padding, rotation and sentinel identity",
    run() {
      const mask = { seed: "safe-spelling-contract" };
      const old = createUuidSlugCodec({ mask });
      const safe = createUuidSlugCodec({ mask, maskedSlugAlphabet: "base32hex" });
      const rotated = createUuidSlugCodec({
        mask: { seed: "safe-rotated-contract" },
        previousMasks: [mask],
      });
      const alphabet64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
      const alphabet32 = "0123456789abcdefghijklmnopqrstuv";
      for (const uuid of [
        "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051",
        "03ffffff-ffff-7fff-bfff-ffffffffffff",
      ]) {
        const legacy = old.uuidV7ToMaskedSlug(uuid);
        const encoded = safe.uuidV7ToMaskedSlug(uuid);
        assert.equal(typeof legacy, "string");
        assert.equal(typeof encoded, "string");
        const text = encoded as string;
        assert.equal(text.length, 27);
        assert.equal(bits(text, alphabet32, 5), bits(legacy as string, alphabet64, 6) + "000");
        for (const reader of [old, safe, rotated]) {
          assert.equal(reader.maskedSlugToUuid(text), uuid);
          assert.equal(reader.maskedSlugToUuid(legacy as string), uuid);
          assert.deepEqual(reader.migration().candidates(text, "current"), [uuid]);
          assert.deepEqual(reader.migration({ plain: true, original: true }).candidates(text), [
            uuid,
          ]);
          for (let padding = 1; padding < 8; padding += 1) {
            const alias =
              text.slice(0, 26) + alphabet32[alphabet32.indexOf(text[26] as string) | padding];
            assert.ok(reader.maskedSlugToUuid(alias) instanceof Error);
            assert.ok(
              reader.migration({ plain: true, original: true }).candidates(alias) instanceof Error,
            );
          }
        }
        assert.ok(safe.maskedSlugToUuid(text.toUpperCase()) instanceof Error);
        assert.ok(old.maskedSlugToUuid(uuidToSlug(uuid, "base32hex") as string) instanceof Error);
      }
      for (const sentinel of safe.sentinels) {
        assert.equal(sentinel.slug.length, 26);
        assert.equal(slugToUuid(sentinel.slug), sentinel.uuid);
        for (const reader of [old, safe]) {
          assert.equal(reader.maskedSlugToUuid(sentinel.slug), sentinel.uuid);
          assert.equal(reader.migration().decode(sentinel.slug), sentinel.uuid);
          assert.equal(reader.maskedSlugToUuid(uuidToSlug(sentinel.uuid) as string), sentinel.uuid);
        }
      }
      assert.equal(unwrap(safe.uuidV7Slug()).length, 22);
      const plainSafe = createUuidSlugCodec({ mask, slugAlphabet: "base32hex" }).uuidV7ToMaskedSlug(
        "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051",
      );
      assert.equal(typeof plainSafe, "string");
      assert.equal((plainSafe as string).length, 22);
    },
  },
  {
    name: "boolean guards reject noncanonical characters and preserve every version and variant",
    run() {
      const uuid = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051";
      const hex = "0123456789abcdef";
      const separators = new Set([8, 13, 18, 23]);
      // Replace every position: late invalid characters must not hide behind an earlier guard.
      for (let offset = 0; offset < uuid.length; offset += 1) {
        for (const char of Array.from({ length: 128 }, (_, i) => String.fromCharCode(i)).concat([
          "ÿ",
          "\ud800",
          "\u2028",
        ])) {
          const value = uuid.slice(0, offset) + char + uuid.slice(offset + 1);
          assert.equal(
            isUuidString(value),
            separators.has(offset) ? char === "-" : hex.includes(char),
            `UUID ${offset}/${char.charCodeAt(0)}`,
          );
        }
      }
      for (const { value, v4, v7 } of uuidVariants(uuid)) {
        assert.equal(isUuidV4String(value), v4);
        assert.equal(isUuidV7String(value), v7);
        assert.equal(isUuidV7String(value.toUpperCase()), false);
        for (const alphabet of ["base64url", "base32hex"] as const) {
          const slug = uuidToSlug(value, alphabet);
          assert.equal(typeof slug, "string");
          assert.equal(isUuidV4Slug(slug as string), v4);
          assert.equal(isUuidV7Slug(slug as string), v7);
        }
      }
      for (const [alphabet, chars, padding] of [
        ["base64url", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_", 16],
        ["base32hex", "0123456789abcdefghijklmnopqrstuv", 4],
      ] as const) {
        const slug = uuidToSlug(uuid, alphabet) as string;
        for (let offset = 0; offset < slug.length; offset += 1) {
          for (let code = 0; code < 128; code += 1) {
            const char = String.fromCharCode(code);
            const value = slug.slice(0, offset) + char + slug.slice(offset + 1);
            const digit = chars.indexOf(char);
            const valid = digit >= 0 && (offset < slug.length - 1 || digit % padding === 0);
            assert.equal(isUuidSlug(value), valid, `${alphabet} ${offset}/${code}`);
          }
        }
        assert.equal(isUuidSlug(slug.slice(0, -1) + "\u2028"), false);
        assert.equal(isUuidSlug(slug + "\n"), false);
      }
      for (const length of [1, 15, 17, 64]) {
        const encoded = Buffer.alloc(length, 0xff).toString("base64url");
        assert.equal(isBase64Url(encoded), false);
        for (const suffix of ["=", "\n", "\r", "\u2028", "ÿ"])
          assert.equal(isBase64Url(encoded + suffix), false);
      }
      assert.equal(isBase64Url(Buffer.alloc(16, 0xff).toString("base64url")), true);
      assert.equal(isBase64Url(""), false);
      for (const value of [null, undefined, "A", "AAAAA", "AB", "AAB"])
        assert.equal(isBase64Url(value), false);
    },
  },
  {
    name: "unknown runtime alphabet values return a package error",
    run() {
      const result = Reflect.apply(uuidToSlug, undefined, [
        "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051",
        Symbol("unknown"),
      ]);
      assert.ok(result instanceof UuidSlugError);
      assert.equal(result.code, "invalid_uuid_slug");
    },
  },
  {
    name: "freshness captures the decoded payload before an external clock can mutate it",
    run() {
      let decoded: Uint8Array = new Uint8Array(0);
      const codec = createUuidSlugCodec({
        mask: {
          id: "retaining",
          mix(input, output, forward) {
            output.set(input);
            if (!forward) decoded = output;
          },
        },
      });
      const uuid = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051";
      const slug = codec.uuidV7ToMaskedSlug(uuid);
      assert.equal(typeof slug, "string");
      assert.equal(
        codec.validateMaskedSlugFresh(slug as string, {
          now: () => {
            decoded.fill(0);
            return 0x0190a1b2c3d4;
          },
          windowMs: 0,
        }),
        slug,
      );
    },
  },
  {
    name: "rotation isolates mutating callbacks and preserves the primary failure cause",
    run() {
      const { seeds, slug } = fixtures.keyOverlap;
      const currentSeed = seeds[0];
      const previousSeed = seeds[1];
      assert.ok(currentSeed);
      assert.ok(previousSeed);
      const current = createMaskSchema({ seed: currentSeed });
      assert.ok(!(current instanceof Error));
      const previous = { seed: previousSeed };
      const cause = new Error("current key unavailable");
      let fail = false;
      const mutating: MaskSchema = {
        id: "mutating-primary",
        mix(input, output, forward) {
          if (fail) throw cause;
          current.mix(input, output, forward);
          input.fill(0);
        },
      };
      const codec = createUuidSlugCodec({ mask: mutating, previousMasks: [previous] });
      assert.equal(codec.maskedSlugToUuidV7(slug), fixtures.keyOverlap.uuids[0]);
      fail = true;
      const refused = codec.maskedSlugToUuidV7(slug);
      assert.ok(refused instanceof UuidSlugError);
      assert.equal(refused.code, "invalid_mask_schema");
      assert.equal(refused.cause, cause);
    },
  },
  {
    name: "refuses ciphertext that aliases a reserved sentinel",
    run() {
      const xor = Uint8Array.from(Buffer.from("c99ff19b58b890005b1bdf713bd55607", "hex"));
      const mask: MaskSchema = {
        id: "sentinel-collision",
        mix(input, output) {
          for (let i = 0; i < 16; i += 1) output[i] = (input[i] as number) ^ (xor[i] as number);
        },
      };
      for (const maskedSlugAlphabet of ["base64url", "base32hex"] as const) {
        const codec = createUuidSlugCodec({ mask, maskedSlugAlphabet });
        const result = codec.uuidV7ToMaskedSlug("019ff19b-58b8-7000-9b1b-df713bd55607");
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.code, "invalid_mask_schema");
        assert.equal(
          codec.maskedSlugToUuidV7("AAAAAAAAcACAAAAAAAAAAA"),
          "00000000-0000-7000-8000-000000000000",
        );
      }
    },
  },
  {
    name: "generates a registered sentinel in its raw spelling",
    run() {
      const generator = createUuidV7Generator({
        clock: () => 0,
        fillRandom: (bytes) => bytes.fill(0),
      });
      const codec = createUuidSlugCodec({ generator });
      assert.equal(codec.uuidV7MaskedSlug(), "AAAAAAAAcACAAAAAAAAAAA");
    },
  },
  {
    name: "rejects a schema that overwrites the invertibility witness",
    run() {
      const error = createCodec({
        mask: {
          id: "destructive",
          mix(input, output) {
            input.fill(0);
            output.fill(0);
          },
        },
      });
      assert.ok(error instanceof UuidSlugError);
      assert.equal(error.code, "invalid_mask_schema");
    },
  },
  {
    name: "preserves a throwing schema's cause",
    run() {
      const cause = new Error("mix failed");
      const error = createCodec({
        mask: {
          id: "throwing",
          mix() {
            throw cause;
          },
        },
      });
      assert.ok(error instanceof UuidSlugError);
      assert.equal(error.code, "invalid_mask_schema");
      assert.equal(error.cause, cause);
    },
  },
  {
    name: "captures scalar configuration and protects sentinel metadata",
    run() {
      const options: { acceptUnmaskedSlugs: boolean } = { acceptUnmaskedSlugs: false };
      const codec = createUuidSlugCodec(options);
      options.acceptUnmaskedSlugs = true;
      assert.ok(codec.maskedSlugToUuid("AAAAAAAAQACAAAAAAAAAAA") instanceof UuidSlugError);
      assert.ok(Object.isFrozen(codec.sentinels));
      assert.ok(codec.sentinels.every(Object.isFrozen));
      assert.ok(Object.isFrozen(DEFAULT_MASK_SCHEMA));
      assert.ok(Object.isFrozen(UUID_SLUG_ERROR_CODES));
      assert.ok(Object.isFrozen(UUID_V7_SENTINEL_DEFINITIONS));
      assert.ok(UUID_V7_SENTINEL_DEFINITIONS.every(Object.isFrozen));

      const built = createMaskSchema({ seed: "stable-schema-reference" });
      assert.ok(!(built instanceof Error));
      const mutable: MaskSchema = {
        id: built.id,
        mix: (input, output, forward) => built.mix(input, output, forward),
      };
      const stable = createUuidSlugCodec({ mask: mutable });
      const uuid = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051";
      const slug = stable.uuidV7ToMaskedSlug(uuid);
      assert.equal(typeof slug, "string");
      mutable.mix = (input, output) => output.set(input);
      assert.equal(stable.maskedSlugToUuidV7(slug as string), uuid);
    },
  },
  {
    name: "returns schema failures after construction with their original cause",
    run() {
      const cause = new Error("schema unavailable");
      let fail = false;
      const codec = createUuidSlugCodec({
        mask: {
          id: "changes",
          mix(input, output) {
            if (fail) throw cause;
            output.set(input);
          },
        },
      });
      const uuid = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051";
      const slug = codec.uuidV7ToMaskedSlug(uuid);
      assert.equal(typeof slug, "string");
      fail = true;
      for (const result of [
        codec.uuidV7ToMaskedSlug(uuid),
        codec.maskedSlugToUuidV7(slug as string),
      ]) {
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.code, "invalid_mask_schema");
        assert.equal(result.cause, cause);
      }
    },
  },
  ...["constructor", "toString", "__proto__"].map((slugAlphabet) => ({
    name: `rejects inherited alphabet ${slugAlphabet} at construction`,
    run() {
      const error = createCodec({ slugAlphabet } as UuidSlugCodecOptions);
      assert.ok(error instanceof UuidSlugError);
      assert.equal(error.code, "invalid_uuid_slug");
    },
  })),
] as const;
