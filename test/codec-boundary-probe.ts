// SPDX-License-Identifier: Apache-2.0

import { strict as assert } from "node:assert";
import {
  createCustomMaskSchema,
  createMaskSchema,
  createMaskSchemaAsync,
  createUuidSlugCodec as createCodec,
  createUuidV7Generator,
  PUBLIC_MASK_SCHEMA,
  isUuidSlugError,
  isUuidString,
  isUuidV4String,
  isUuidV7Bytes,
  isUuidV7String,
  isUuidSlug,
  isUuidV4Slug,
  isUuidV7Slug,
  parseUuid,
  uuidToSlug,
  uuidV7Slug,
  slugToUuid,
  UUID_SLUG_ERROR_CODES,
  UUID_V7_SENTINEL_DEFINITIONS,
  UuidSlugError,
} from "../src/index";
import type { MaskSchema, UuidSlugCodecOptions } from "../src/types";
import { unwrap } from "../dev/unwrap";
import { uuidVariants } from "./uuid-variants";

const createUuidSlugCodec = (options: UuidSlugCodecOptions) => unwrap(createCodec(options));

/** Compare the full payload independently of production bit packing. */
function bits(text: string, alphabet: string, width: number) {
  return Array.from(text, (char) => alphabet.indexOf(char).toString(2).padStart(width, "0")).join(
    "",
  );
}

export const codecBoundaryCases = [
  {
    name: "schema factories reject untyped coercions before deriving keys",
    async run() {
      let readsAfterInvalidSeed = 0;
      const options = [
        undefined,
        null,
        {},
        { seed: Array.from({ length: 16 }, () => 1) },
        { seed: new ArrayBuffer(16) },
        { seed: "valid-schema-seed", id: 7 },
        { seed: "valid-schema-seed", id: null },
        { seed: "valid-schema-seed", keyIterations: null },
        {
          seed: [],
          get id() {
            readsAfterInvalidSeed += 1;
            return "unread";
          },
          get keyIterations() {
            readsAfterInvalidSeed += 1;
            return 1;
          },
        },
      ];
      const results = await Promise.all(
        options.flatMap((value) => [
          Promise.resolve(Reflect.apply(createMaskSchema, undefined, [value])),
          Reflect.apply(createMaskSchemaAsync, undefined, [value]),
        ]),
      );
      for (const result of results) {
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.code, "invalid_mask_schema");
      }
      assert.equal(readsAfterInvalidSeed, 0);
    },
  },
  {
    name: "codec construction returns package errors for malformed JavaScript options",
    run() {
      const cases = [
        { mask: PUBLIC_MASK_SCHEMA, previousMasks: 1 },
        { mask: PUBLIC_MASK_SCHEMA, sentinels: 1 },
        { mask: PUBLIC_MASK_SCHEMA, sentinels: [null] },
        { mask: PUBLIC_MASK_SCHEMA, generator: null },
        { mask: PUBLIC_MASK_SCHEMA, generator: 1 },
        { mask: PUBLIC_MASK_SCHEMA, generator: {} },
        { mask: PUBLIC_MASK_SCHEMA, generator: { uuidV7Bytes: 1 } },
        {
          mask: PUBLIC_MASK_SCHEMA,
          sentinels: [{ name: 7, uuid: "00000000-0000-7000-8000-000000000000" }],
        },
        new Proxy(
          {},
          {
            has() {
              throw new Error("unreadable options");
            },
          },
        ),
        {
          mask: PUBLIC_MASK_SCHEMA,
          get generator() {
            throw new Error("unreadable generator");
          },
        },
      ];
      for (const options of cases) {
        const result = Reflect.apply(createCodec, undefined, [options]);
        assert.ok(isUuidSlugError(result));
      }
    },
  },
  {
    name: "requires an explicit mask before reading any other codec option",
    run() {
      for (const value of [undefined, null, {}, { mask: undefined }]) {
        let observed = false;
        const options =
          value === undefined || value === null
            ? value
            : Object.defineProperty(value, "generator", {
                get() {
                  observed = true;
                  throw new Error("generator must not be read");
                },
              });
        const result = Reflect.apply(createCodec, undefined, [options]);
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.code, "invalid_mask_schema");
        assert.equal(observed, false);
      }
      const forged = Reflect.apply(createCodec, undefined, [{ mask: { id: "forged" } }]);
      assert.ok(forged instanceof UuidSlugError);
      assert.equal(forged.code, "invalid_mask_schema");
      assert.ok(!(createCodec({ mask: PUBLIC_MASK_SCHEMA }) instanceof Error));
    },
  },
  {
    name: "codec masks and unmasks UUIDv7 bytes without a text round trip",
    run() {
      const codec = createUuidSlugCodec({ mask: PUBLIC_MASK_SCHEMA });
      const uuid = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051";
      const bytes = unwrap(parseUuid(uuid));
      const slug = unwrap(codec.uuidV7BytesToMaskedSlug(bytes));
      const owned = unwrap(codec.maskedSlugToUuidV7Bytes(slug));
      assert.equal(owned.constructor, Uint8Array);
      assert.deepEqual(owned, bytes);
      const destination = new Uint8Array(24).fill(0xee);
      const returned = unwrap(codec.maskedSlugToUuidV7Bytes(slug, destination, 4));
      assert.equal(returned, destination);
      assert.deepEqual(destination.subarray(4, 20), bytes);
      assert.deepEqual(destination.subarray(0, 4), new Uint8Array(4).fill(0xee));
      assert.deepEqual(destination.subarray(20), new Uint8Array(4).fill(0xee));
      const sentinel = codec.sentinels[0];
      assert.ok(sentinel);
      const firstSentinelBytes = unwrap(codec.maskedSlugToUuidV7Bytes(sentinel.slug));
      firstSentinelBytes.fill(0xff);
      assert.equal(
        codec.maskedSlugToUuidV7(sentinel.slug),
        sentinel.uuid,
        "owned bytes must not expose mutable sentinel storage",
      );
    },
  },
  {
    name: "custom schema construction isolates mutating reversible transforms",
    run() {
      const cause = new Error("forward unavailable");
      let fail = false;
      const schema = createCustomMaskSchema({
        id: "xor",
        forward(input) {
          if (fail) throw cause;
          return input.map((byte) => byte ^ 0xa5);
        },
        reverse(input) {
          return input.map((byte) => byte ^ 0xa5);
        },
      });
      assert.ok(!(schema instanceof Error));
      assert.ok(Object.isFrozen(schema));
      assert.deepEqual(Object.keys(schema), ["id"]);
      const codec = unwrap(createCodec({ mask: schema }));
      const uuid = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051";
      const slug = unwrap(codec.uuidV7ToMaskedSlug(uuid));
      assert.equal(codec.maskedSlugToUuidV7(slug), uuid);
      fail = true;
      const refused = codec.uuidV7ToMaskedSlug(uuid);
      assert.ok(refused instanceof UuidSlugError);
      assert.equal(refused.cause, cause);
    },
  },
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
          assert.equal(reader.maskedSlugToUuidV7(text), uuid);
          assert.equal(reader.maskedSlugToUuidV7(legacy as string), uuid);
          assert.deepEqual(reader.migration().candidates(text, "current"), [uuid]);
          assert.deepEqual(reader.migration({ plain: true, original: true }).candidates(text), [
            uuid,
          ]);
          for (let padding = 1; padding < 8; padding += 1) {
            const alias =
              text.slice(0, 26) + alphabet32[alphabet32.indexOf(text[26] as string) | padding];
            assert.ok(reader.maskedSlugToUuidV7(alias) instanceof Error);
            assert.ok(
              reader.migration({ plain: true, original: true }).candidates(alias) instanceof Error,
            );
          }
        }
        assert.ok(safe.maskedSlugToUuidV7(text.toUpperCase()) instanceof Error);
        assert.ok(old.maskedSlugToUuidV7(uuidToSlug(uuid, "base32hex") as string) instanceof Error);
      }
      for (const sentinel of safe.sentinels) {
        assert.equal(sentinel.slug.length, 26);
        assert.equal(slugToUuid(sentinel.slug), sentinel.uuid);
        for (const reader of [old, safe]) {
          assert.equal(reader.maskedSlugToUuidV7(sentinel.slug), sentinel.uuid);
          assert.equal(reader.migration().decode(sentinel.slug), sentinel.uuid);
          assert.equal(
            reader.maskedSlugToUuidV7(uuidToSlug(sentinel.uuid) as string),
            sentinel.uuid,
          );
        }
      }
      assert.equal(unwrap(uuidV7Slug("base32hex")).length, 26);
      const plainSafe = createUuidSlugCodec({ mask }).uuidV7ToMaskedSlug(
        "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051",
      );
      assert.equal(typeof plainSafe, "string");
      assert.equal((plainSafe as string).length, 22);
    },
  },
  {
    name: "boolean guards reject noncanonical characters and preserve every version and variant",
    run() {
      for (const value of [undefined, null, false, 0, "", {}, new DataView(new ArrayBuffer(16))])
        assert.equal(isUuidV7Bytes(value), false);
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
    name: "masked and migration decoders reject non-string JavaScript input",
    run() {
      const codec = createUuidSlugCodec({ mask: PUBLIC_MASK_SCHEMA });
      const migration = codec.migration({ original: true, plain: true });
      for (const value of [null, 1, Symbol("slug"), { length: 22 }]) {
        for (const decode of [
          codec.maskedSlugToUuidV7,
          codec.maskedSlugToUuidV7Bytes,
          codec.validateMaskedSlugFresh,
          migration.decode,
          migration.candidates,
        ]) {
          const result = Reflect.apply(decode, undefined, [value]);
          assert.ok(result instanceof UuidSlugError);
          assert.equal(result.code, "invalid_uuid_slug");
        }
      }
    },
  },
  {
    name: "freshness captures the decoded payload before an external clock can mutate it",
    run() {
      let decoded: Uint8Array = new Uint8Array(0);
      const schema = unwrap(
        createCustomMaskSchema({
          id: "retaining",
          forward(input) {
            return input;
          },
          reverse(input) {
            decoded = input;
            return input;
          },
        }),
      );
      const codec = createUuidSlugCodec({ mask: schema });
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
      const uuid = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051";
      const previous = unwrap(
        createCustomMaskSchema({
          id: "xor-previous",
          forward(input) {
            return input.map((byte) => byte ^ 0xa5);
          },
          reverse(input) {
            return input.map((byte) => byte ^ 0xa5);
          },
        }),
      );
      const cause = new Error("current key unavailable");
      let fail = false;
      const mutating = unwrap(
        createCustomMaskSchema({
          id: "mutating-primary",
          forward(input) {
            if (fail) throw cause;
            return input;
          },
          reverse(input) {
            if (fail) throw cause;
            return input;
          },
        }),
      );
      const slug = unwrap(createUuidSlugCodec({ mask: previous }).uuidV7ToMaskedSlug(uuid));
      const codec = createUuidSlugCodec({ mask: mutating, previousMasks: [previous] });
      assert.equal(codec.maskedSlugToUuidV7(slug), uuid);
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
      const mask = unwrap(
        createCustomMaskSchema({
          id: "sentinel-collision",
          forward(input) {
            return input.map((byte, i) => byte ^ (xor[i] as number));
          },
          reverse(input) {
            return input.map((byte, i) => byte ^ (xor[i] as number));
          },
        }),
      );
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
    name: "refuses generation reentered from its entropy callback",
    run() {
      let nested: unknown;
      let reenter = true;
      const generator = createUuidV7Generator({
        clock: () => 10,
        fillRandom(bytes) {
          bytes.fill(0);
          if (!reenter) return;
          reenter = false;
          nested = generator.uuidV7Bytes();
        },
      });

      const first = generator.uuidV7Bytes();
      assert.ok(!(first instanceof Error));
      assert.ok(isUuidSlugError(nested));
      assert.equal(nested.code, "rng_unavailable");
      assert.equal(
        nested.message,
        "UUIDv7 generation cannot be reentered from its clock or entropy callback.",
      );
      assert.notDeepEqual(generator.uuidV7Bytes(), first);
    },
  },
  {
    name: "generates a registered sentinel in its raw spelling",
    run() {
      const generator = createUuidV7Generator({
        clock: () => 0,
        fillRandom: (bytes) => bytes.fill(0),
      });
      const codec = createUuidSlugCodec({ mask: PUBLIC_MASK_SCHEMA, generator });
      assert.equal(codec.uuidV7MaskedSlug(), "AAAAAAAAcACAAAAAAAAAAA");
    },
  },
  {
    name: "contains thrown and malformed injected generator results",
    run() {
      const cause = new Error("custom generator failed");
      const throwing = createUuidSlugCodec({
        mask: PUBLIC_MASK_SCHEMA,
        generator: {
          uuidV7Bytes() {
            throw cause;
          },
        },
      });
      const thrown = throwing.uuidV7MaskedSlug();
      assert.ok(isUuidSlugError(thrown));
      assert.equal(thrown.code, "rng_unavailable");
      assert.equal(thrown.cause, cause);

      for (const value of [null, "not bytes", new Uint8Array(15)] as const) {
        const malformed = createUuidSlugCodec({
          mask: PUBLIC_MASK_SCHEMA,
          generator: {
            uuidV7Bytes: () => value as unknown as Uint8Array,
          },
        }).uuidV7MaskedSlug();
        assert.ok(isUuidSlugError(malformed));
        assert.equal(malformed.code, "invalid_uuid_version");
      }
    },
  },
  {
    name: "rejects malformed results and transforms that are not inverses",
    run() {
      const malformed = createCustomMaskSchema({
        id: "short",
        forward: () => new Uint8Array(15),
        reverse: (input) => input,
      });
      const notInverse = createCustomMaskSchema({
        id: "destructive",
        forward(input) {
          return input.fill(0);
        },
        reverse(input) {
          return input.fill(0);
        },
      });
      for (const error of [malformed, notInverse]) {
        assert.ok(error instanceof UuidSlugError);
        assert.equal(error.code, "invalid_mask_schema");
      }
    },
  },
  {
    name: "classifies returned and thrown construction failures with their causes",
    run() {
      const returned = new UuidSlugError("rng_unavailable", "key service unavailable");
      const thrown = new Error("mix failed");
      for (const [cause, forward] of [
        [returned, () => returned],
        [
          thrown,
          () => {
            throw thrown;
          },
        ],
      ] as const) {
        const error = createCustomMaskSchema({
          id: "failed",
          forward,
          reverse: (input) => input,
        });
        assert.ok(error instanceof UuidSlugError);
        assert.equal(error.code, "invalid_mask_schema");
        assert.equal(error.cause, cause);
      }
    },
  },
  {
    name: "captures scalar configuration and protects sentinel metadata",
    run() {
      const options: {
        mask: MaskSchema;
        maskedSlugAlphabet: "base64url" | "base32hex";
      } = { mask: PUBLIC_MASK_SCHEMA, maskedSlugAlphabet: "base64url" };
      const codec = createUuidSlugCodec(options);
      options.maskedSlugAlphabet = "base32hex";
      assert.ok(codec.maskedSlugToUuidV7("AAAAAAAAQACAAAAAAAAAAA") instanceof UuidSlugError);
      assert.ok(Object.isFrozen(codec));
      assert.ok(Object.isFrozen(codec.sentinels));
      assert.ok(codec.sentinels.every(Object.isFrozen));
      assert.ok(Object.isFrozen(PUBLIC_MASK_SCHEMA));
      assert.ok(Object.isFrozen(UUID_SLUG_ERROR_CODES));
      assert.ok(Object.isFrozen(UUID_V7_SENTINEL_DEFINITIONS));
      assert.ok(UUID_V7_SENTINEL_DEFINITIONS.every(Object.isFrozen));

      const mutable = {
        id: "stable-schema-reference",
        forward: (input: Uint8Array) => input,
        reverse: (input: Uint8Array) => input,
      };
      const built = createCustomMaskSchema(mutable);
      assert.ok(!(built instanceof Error));
      const stable = createUuidSlugCodec({ mask: built });
      const uuid = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051";
      const slug = stable.uuidV7ToMaskedSlug(uuid);
      assert.equal(typeof slug, "string");
      mutable.reverse = (input) => input.fill(0);
      assert.equal(stable.maskedSlugToUuidV7(slug as string), uuid);
    },
  },
  {
    name: "returns schema failures after construction with their original cause",
    run() {
      const cause = new UuidSlugError("invalid_mask_schema", "schema unavailable");
      let fail = false;
      const schema = unwrap(
        createCustomMaskSchema({
          id: "changes",
          forward(input) {
            return fail ? cause : input;
          },
          reverse(input) {
            return fail ? cause : input;
          },
        }),
      );
      const codec = createUuidSlugCodec({ mask: schema });
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
      const error = createCodec({
        mask: PUBLIC_MASK_SCHEMA,
        maskedSlugAlphabet: slugAlphabet,
      } as UuidSlugCodecOptions);
      assert.ok(error instanceof UuidSlugError);
      assert.equal(error.code, "invalid_uuid_slug");
    },
  })),
] as const;
