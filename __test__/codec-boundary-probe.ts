// SPDX-License-Identifier: Apache-2.0

import { strict as assert } from "node:assert";
import {
  bytesToUuid,
  createCustomUuidV7Mask,
  createUuidV7Mask,
  createUuidV7MaskAsync,
  createUuidV7SlugCodec as createCodec,
  extractUuidV7Timestamp,
  UUID_V7_TEST_MASK,
  isUuidSlugError,
  isUuidBytes,
  isUuidV4Bytes,
  isUuidString,
  isUuidV4String,
  isUuidV7Bytes,
  isUuidV7String,
  isUuidSlug,
  isUuidV4Slug,
  isUuidV7Slug,
  uuidToBytes,
  uuidToSlug,
  generateUuidV7Slug,
  slugToUuid,
  UUID_SLUG_ERROR_CODES,
  UuidSlugError,
} from "../src/index";
import { createPortableUuidV7Generator as createUuidV7Generator } from "../src/v7";
import { createUuidV7SlugCodecWithGenerator } from "../src/codec";
import type {
  UuidV7CodecSlug,
  UuidV7Mask,
  UuidV7SlugCodec,
  UuidV7SlugCodecOptions,
} from "../src/types";
import { unwrap } from "../dev/unwrap";
import { uuidVariants } from "./uuid-variants";

const createUuidV7SlugCodec = (options: UuidV7SlugCodecOptions) => unwrap(createCodec(options));

const TEST_SENTINELS = [
  { name: "nil", uuid: "00000000-0000-7000-8000-000000000000" },
  { name: "anonymousUser", uuid: "00000000-0001-7000-8000-000000000000" },
  { name: "unknownUser", uuid: "00000000-0002-7000-8000-000000000000" },
] as const;

/** Compare the full payload independently of production bit packing. */
function bits(text: string, alphabet: string, width: number) {
  return Array.from(text, (char) => alphabet.indexOf(char).toString(2).padStart(width, "0")).join(
    "",
  );
}

export const codecBoundaryCases = [
  {
    name: "offers one concise codec language without duplicating implementation work",
    run() {
      const codec = createUuidV7SlugCodec({ mask: UUID_V7_TEST_MASK });
      const uuid = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051";
      const slug = unwrap(codec.encodeUuid(uuid));
      const timestamp = unwrap(extractUuidV7Timestamp(unwrap(uuidToBytes(uuid))));
      assert.equal(codec.decodeSlug(slug), uuid);
      assert.deepEqual(codec.decodeSlugToBytes(slug), unwrap(uuidToBytes(uuid)));
      assert.equal(
        codec.validateSlugTimestamp(slug, {
          maxTimestampDeltaMs: 86_400_000,
          referenceUnixMs: timestamp,
        }),
        slug,
      );
      assert.ok(!(codec.generateSlug() instanceof Error));
      assert.equal(Object.isFrozen(codec), true);
      assert.equal("uuidV7MaskedSlug" in codec, false);
    },
  },
  {
    name: "converts UUIDv4 and UUIDv7 between canonical text and bytes",
    run() {
      for (const uuid of [
        "550e8400-e29b-41d4-a716-446655440000",
        "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051",
      ]) {
        const bytes = unwrap(uuidToBytes(uuid));
        assert.equal(isUuidBytes(bytes), true);
        assert.equal(bytes.constructor, Uint8Array);
        assert.equal(bytesToUuid(bytes), uuid);

        const destination = new Uint8Array(24).fill(0xee);
        assert.equal(uuidToBytes(uuid, destination, 4), destination);
        assert.equal(bytesToUuid(destination, 4), uuid);
      }
      assert.equal(
        isUuidV4Bytes(unwrap(uuidToBytes("550e8400-e29b-41d4-a716-446655440000"))),
        true,
      );
      assert.equal(
        isUuidV4Bytes(unwrap(uuidToBytes("0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051"))),
        false,
      );
      assert.ok(uuidToBytes("not a UUID") instanceof UuidSlugError);
      assert.ok(bytesToUuid(new Uint8Array(15)) instanceof UuidSlugError);
      assert.equal(isUuidBytes(new Uint8Array(15)), false);
    },
  },
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
        { seed: "valid-schema-seed", label: 7 },
        { seed: "valid-schema-seed", label: null },
        { seed: "valid-schema-seed", keyDerivationIterations: null },
        {
          seed: [],
          get id() {
            readsAfterInvalidSeed += 1;
            return "unread";
          },
          get keyDerivationIterations() {
            readsAfterInvalidSeed += 1;
            return 1;
          },
        },
      ];
      const results = await Promise.all(
        options.flatMap((value) => [
          Promise.resolve(Reflect.apply(createUuidV7Mask, undefined, [value])),
          Reflect.apply(createUuidV7MaskAsync, undefined, [value]),
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
        { mask: UUID_V7_TEST_MASK, previousMasks: 1 },
        { mask: UUID_V7_TEST_MASK, sentinels: 1 },
        { mask: UUID_V7_TEST_MASK, sentinels: [null] },
        {
          mask: UUID_V7_TEST_MASK,
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
      ];
      for (const options of cases) {
        const result = Reflect.apply(createCodec, undefined, [options]);
        assert.ok(isUuidSlugError(result));
      }
    },
  },
  {
    name: "codec generation ignores caller-supplied entropy",
    run() {
      const options = {
        mask: UUID_V7_TEST_MASK,
        get generateUuidV7Bytes(): never {
          throw new Error("untrusted UUIDv7 byte generator was read");
        },
      };
      const codec = Reflect.apply(createCodec, undefined, [options]);
      assert.ok(!(codec instanceof Error));
      assert.equal(typeof codec.generateSlug(), "string");
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
            : Object.defineProperty(value, "generateUuidV7Bytes", {
                get() {
                  observed = true;
                  throw new Error("UUIDv7 byte generator must not be read");
                },
              });
        const result = Reflect.apply(createCodec, undefined, [options]);
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.code, "invalid_mask_schema");
        assert.equal(observed, false);
      }
      const forged = Reflect.apply(createCodec, undefined, [{ mask: { label: "forged" } }]);
      assert.ok(forged instanceof UuidSlugError);
      assert.equal(forged.code, "invalid_mask_schema");
      assert.ok(!(createCodec({ mask: UUID_V7_TEST_MASK }) instanceof Error));
    },
  },
  {
    name: "requires each sentinel to have one nonempty name and one unique UUID",
    run() {
      const distinct = createCodec({ mask: UUID_V7_TEST_MASK, sentinels: TEST_SENTINELS });
      assert.ok(!(distinct instanceof Error));
      for (const sentinels of [
        [{ name: "", uuid: TEST_SENTINELS[0].uuid }],
        [TEST_SENTINELS[0], { name: TEST_SENTINELS[0].name, uuid: TEST_SENTINELS[1].uuid }],
      ]) {
        const result = createCodec({ mask: UUID_V7_TEST_MASK, sentinels });
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.code, "invalid_sentinel");
      }
      const duplicateUuid = createCodec({
        mask: UUID_V7_TEST_MASK,
        sentinels: [TEST_SENTINELS[0], { name: "same-uuid", uuid: TEST_SENTINELS[0].uuid }],
      });
      assert.ok(duplicateUuid instanceof UuidSlugError);
      assert.equal(duplicateUuid.code, "invalid_uuid");
    },
  },
  {
    name: "byte sentinel lookup preserves exact identity when index keys collide",
    run() {
      const definitions = [
        ...Array.from({ length: 14 }, (_, index) => ({
          name: `collision-${index}`,
          uuid: `${index.toString(16).padStart(8, "0")}-0000-7000-8000-0000deadbeef`,
        })),
        { name: "fingerprint-a", uuid: "3645727c-8054-7057-8043-e9e1deadbeef" },
        { name: "fingerprint-b", uuid: "2e3ee2c1-7549-70ed-8072-c29fdeadbeef" },
      ];
      const codec = unwrap(createCodec({ mask: UUID_V7_TEST_MASK, sentinels: definitions }));
      for (let index = 0; index < definitions.length; index += 1) {
        const definition = definitions[index];
        const sentinel = codec.sentinels[index];
        assert.ok(definition && sentinel);
        assert.equal(codec.encodeUuid(unwrap(uuidToBytes(definition.uuid))), sentinel.slug);
      }
    },
  },
  {
    name: "codec masks and unmasks UUIDv7 bytes without a text round trip",
    run() {
      const codec = createUuidV7SlugCodec({
        mask: UUID_V7_TEST_MASK,
        sentinels: [TEST_SENTINELS[0]],
      });
      const uuid = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051";
      const bytes = unwrap(uuidToBytes(uuid));
      const v4 = unwrap(uuidToBytes("550e8400-e29b-41d4-a716-446655440000"));
      const refused = codec.encodeUuid(v4);
      assert.ok(refused instanceof UuidSlugError);
      assert.equal(refused.code, "invalid_uuid_version");
      const slug = unwrap(codec.encodeUuid(bytes));
      const owned = unwrap(codec.decodeSlugToBytes(slug));
      assert.equal(owned.constructor, Uint8Array);
      assert.deepEqual(owned, bytes);
      const destination = new Uint8Array(24).fill(0xee);
      const returned = unwrap(codec.decodeSlugToBytes(slug, destination, 4));
      assert.equal(returned, destination);
      assert.deepEqual(destination.subarray(4, 20), bytes);
      assert.deepEqual(destination.subarray(0, 4), new Uint8Array(4).fill(0xee));
      assert.deepEqual(destination.subarray(20), new Uint8Array(4).fill(0xee));
      const sentinel = codec.sentinels[0];
      assert.ok(sentinel);
      const firstSentinelBytes = unwrap(codec.decodeSlugToBytes(sentinel.slug));
      firstSentinelBytes.fill(0xff);
      assert.equal(
        codec.decodeSlug(sentinel.slug),
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
      const schema = createCustomUuidV7Mask({
        label: "xor",
        mask(input) {
          if (fail) throw cause;
          return input.map((byte) => byte ^ 0xa5);
        },
        unmask(input) {
          return input.map((byte) => byte ^ 0xa5);
        },
      });
      assert.ok(!(schema instanceof Error));
      assert.ok(Object.isFrozen(schema));
      assert.deepEqual(Object.keys(schema), ["label"]);
      const codec = unwrap(createCodec({ mask: schema }));
      const uuid = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051";
      const slug = unwrap(codec.encodeUuid(uuid));
      assert.equal(codec.decodeSlug(slug), uuid);
      fail = true;
      const refused = codec.encodeUuid(uuid);
      assert.ok(refused instanceof UuidSlugError);
      assert.equal(refused.cause, cause);
    },
  },
  {
    name: "safe masked spelling preserves all wire bits, strict padding, rotation and sentinel identity",
    run() {
      const mask = { seed: "safe-spelling-contract" };
      const old = createUuidV7SlugCodec({ mask, sentinels: TEST_SENTINELS });
      const safe = createUuidV7SlugCodec({
        mask,
        sentinels: TEST_SENTINELS,
        outputAlphabet: "base32hex",
      });
      const rotated = createUuidV7SlugCodec({
        mask: { seed: "safe-rotated-contract" },
        previousMasks: [mask],
        sentinels: TEST_SENTINELS,
      });
      const alphabet64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
      const alphabet32 = "0123456789abcdefghijklmnopqrstuv";
      for (const uuid of [
        "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051",
        "03ffffff-ffff-7fff-bfff-ffffffffffff",
      ]) {
        const bytes = unwrap(uuidToBytes(uuid));
        const legacy = old.encodeUuid(uuid);
        const encoded = safe.encodeUuid(uuid);
        assert.equal(typeof legacy, "string");
        assert.equal(typeof encoded, "string");
        assert.equal(old.encodeUuid(bytes), legacy);
        assert.equal(safe.encodeUuid(bytes), encoded);
        const text = encoded as string;
        assert.equal(text.length, 27);
        assert.equal(bits(text, alphabet32, 5), bits(legacy as string, alphabet64, 6) + "000");
        for (const reader of [old, safe, rotated]) {
          assert.equal(reader.decodeSlug(text), uuid);
          assert.equal(reader.decodeSlug(legacy as string), uuid);
          assert.deepEqual(reader.decodeSlugToBytes(text), bytes);
          assert.deepEqual(reader.decodeSlugToBytes(legacy as string), bytes);
          assert.deepEqual(
            reader
              .createMigrationDecoder({ plainSlug: true })
              .decodeSlugCandidates(text, "current-mask"),
            [uuid],
          );
          assert.deepEqual(
            reader
              .createMigrationDecoder({ plainSlug: true, originalMask: true })
              .decodeSlugCandidates(text),
            [uuid],
          );
          for (let padding = 1; padding < 8; padding += 1) {
            const alias =
              text.slice(0, 26) + alphabet32[alphabet32.indexOf(text[26] as string) | padding];
            assert.ok(reader.decodeSlug(alias) instanceof Error);
            assert.ok(
              reader
                .createMigrationDecoder({ plainSlug: true, originalMask: true })
                .decodeSlugCandidates(alias) instanceof Error,
            );
          }
        }
        assert.ok(safe.decodeSlug(text.toUpperCase()) instanceof Error);
        assert.ok(old.decodeSlug(uuidToSlug(uuid, "base32hex") as string) instanceof Error);
      }
      for (const sentinel of safe.sentinels) {
        assert.equal(sentinel.slug.length, 26);
        assert.equal(slugToUuid(sentinel.slug), sentinel.uuid);
        for (const reader of [old, safe]) {
          assert.equal(reader.decodeSlug(sentinel.slug), sentinel.uuid);
          assert.equal(
            reader.createMigrationDecoder({ plainSlug: true }).decodeSlug(sentinel.slug),
            sentinel.uuid,
          );
          assert.equal(reader.decodeSlug(uuidToSlug(sentinel.uuid) as string), sentinel.uuid);
        }
      }
      assert.equal(unwrap(generateUuidV7Slug("base32hex")).length, 26);
      const plainSafe = createUuidV7SlugCodec({ mask }).encodeUuid(
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
      const codec = createUuidV7SlugCodec({ mask: UUID_V7_TEST_MASK });
      const migration = codec.createMigrationDecoder({ originalMask: true, plainSlug: true });
      for (const value of [null, 1, Symbol("slug"), { length: 22 }]) {
        for (const decode of [
          codec.decodeSlug,
          codec.decodeSlugToBytes,
          codec.validateSlugTimestamp,
          migration.decodeSlug,
          migration.decodeSlugCandidates,
        ]) {
          const result = Reflect.apply(decode, undefined, [value]);
          assert.ok(result instanceof UuidSlugError);
          assert.equal(result.code, "invalid_uuid_slug");
        }
      }
    },
  },
  {
    name: "rotation isolates mutating callbacks and preserves the primary failure cause",
    run() {
      const uuid = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051";
      const previous = unwrap(
        createCustomUuidV7Mask({
          label: "xor-previous",
          mask(input) {
            return input.map((byte) => byte ^ 0xa5);
          },
          unmask(input) {
            return input.map((byte) => byte ^ 0xa5);
          },
        }),
      );
      const cause = new Error("current key unavailable");
      let fail = false;
      const mutating = unwrap(
        createCustomUuidV7Mask({
          label: "mutating-primary",
          mask(input) {
            if (fail) throw cause;
            return input;
          },
          unmask(input) {
            if (fail) throw cause;
            return input;
          },
        }),
      );
      const slug = unwrap(createUuidV7SlugCodec({ mask: previous }).encodeUuid(uuid));
      const codec = createUuidV7SlugCodec({ mask: mutating, previousMasks: [previous] });
      assert.equal(codec.decodeSlug(slug), uuid);
      fail = true;
      const refused = codec.decodeSlug(slug);
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
        createCustomUuidV7Mask({
          label: "sentinel-collision",
          mask(input) {
            return input.map((byte, i) => byte ^ (xor[i] as number));
          },
          unmask(input) {
            return input.map((byte, i) => byte ^ (xor[i] as number));
          },
        }),
      );
      for (const slugAlphabet of ["base64url", "base32hex"] as const) {
        const codec = createUuidV7SlugCodec({
          mask,
          sentinels: [TEST_SENTINELS[0]],
          outputAlphabet: slugAlphabet,
        });
        const result = codec.encodeUuid("019ff19b-58b8-7000-9b1b-df713bd55607");
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.code, "invalid_mask_schema");
        assert.equal(
          codec.decodeSlug("AAAAAAAAcACAAAAAAAAAAA"),
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
          nested = generator.generateUuidV7Bytes();
        },
      });

      const first = generator.generateUuidV7Bytes();
      assert.ok(!(first instanceof Error));
      assert.ok(isUuidSlugError(nested));
      assert.equal(nested.code, "rng_unavailable");
      assert.equal(
        nested.message,
        "UUIDv7 generation cannot be reentered from its clock or entropy callback.",
      );
      assert.notDeepEqual(generator.generateUuidV7Bytes(), first);
    },
  },
  {
    name: "generates a registered sentinel in its raw spelling",
    run() {
      const generator = createUuidV7Generator({
        clock: () => 0,
        fillRandom: (bytes) => bytes.fill(0),
      });
      const codec = unwrap(
        createUuidV7SlugCodecWithGenerator(
          { mask: UUID_V7_TEST_MASK, sentinels: TEST_SENTINELS },
          generator.generateUuidV7Bytes,
        ),
      );
      assert.equal(codec.generateSlug(), "AAAAAAAAcACAAAAAAAAAAA");
    },
  },
  {
    name: "contains thrown and malformed injected generator results",
    run() {
      const cause = new Error("custom generator failed");
      const throwing = unwrap(
        createUuidV7SlugCodecWithGenerator({ mask: UUID_V7_TEST_MASK }, function () {
          throw cause;
        }),
      );
      const thrown = throwing.generateSlug();
      assert.ok(isUuidSlugError(thrown));
      assert.equal(thrown.code, "rng_unavailable");
      assert.equal(thrown.cause, cause);

      for (const value of [null, "not bytes", new Uint8Array(15)] as const) {
        const malformed = unwrap(
          createUuidV7SlugCodecWithGenerator(
            { mask: UUID_V7_TEST_MASK },
            () => value as unknown as Uint8Array,
          ),
        ).generateSlug();
        assert.ok(isUuidSlugError(malformed));
        assert.equal(malformed.code, "invalid_uuid_version");
      }
    },
  },
  {
    name: "rejects malformed results and transforms that are not inverses",
    run() {
      const malformed = createCustomUuidV7Mask({
        label: "short",
        mask: () => new Uint8Array(15),
        unmask: (input) => input,
      });
      const notInverse = createCustomUuidV7Mask({
        label: "destructive",
        mask(input) {
          return input.fill(0);
        },
        unmask(input) {
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
        const error = createCustomUuidV7Mask({
          label: "failed",
          mask: forward,
          unmask: (input) => input,
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
        mask: UuidV7Mask;
        outputAlphabet: "base64url" | "base32hex";
      } = { mask: UUID_V7_TEST_MASK, outputAlphabet: "base64url" };
      const codec = createUuidV7SlugCodec({ ...options, sentinels: TEST_SENTINELS });
      options.outputAlphabet = "base32hex";
      assert.ok(codec.decodeSlug("AAAAAAAAQACAAAAAAAAAAA") instanceof UuidSlugError);
      assert.ok(Object.isFrozen(codec));
      assert.ok(Object.isFrozen(codec.sentinels));
      assert.ok(codec.sentinels.every(Object.isFrozen));
      assert.ok(Object.isFrozen(UUID_V7_TEST_MASK));
      assert.ok(Object.isFrozen(UUID_SLUG_ERROR_CODES));

      const mutable = {
        label: "stable-schema-reference",
        mask: (input: Uint8Array) => input,
        unmask: (input: Uint8Array) => input,
      };
      const built = createCustomUuidV7Mask(mutable);
      assert.ok(!(built instanceof Error));
      const stable = createUuidV7SlugCodec({ mask: built });
      const uuid = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051";
      const slug = stable.encodeUuid(uuid);
      assert.equal(typeof slug, "string");
      mutable.unmask = (input) => input.fill(0);
      assert.equal(stable.decodeSlug(slug as string), uuid);
    },
  },
  {
    name: "returns schema failures after construction with their original cause",
    run() {
      const cause = new UuidSlugError("invalid_mask_schema", "schema unavailable");
      let fail = false;
      const schema = unwrap(
        createCustomUuidV7Mask({
          label: "changes",
          mask(input) {
            return fail ? cause : input;
          },
          unmask(input) {
            return fail ? cause : input;
          },
        }),
      );
      const codec = createUuidV7SlugCodec({ mask: schema });
      const uuid = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051";
      const slug = codec.encodeUuid(uuid);
      assert.equal(typeof slug, "string");
      fail = true;
      for (const result of [codec.encodeUuid(uuid), codec.decodeSlug(slug as string)]) {
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.code, "invalid_mask_schema");
        assert.equal(result.cause, cause);
      }
    },
  },
  {
    name: "isolates nested custom-mask calls",
    run() {
      const first = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051";
      const second = "019ff19b-58b8-7000-9b1b-df713bd5562c";
      const firstBytes = unwrap(uuidToBytes(first));
      const secondBytes = unwrap(uuidToBytes(second));
      let codec: UuidV7SlugCodec | undefined;
      let nested: UuidV7CodecSlug | UuidSlugError | undefined;
      let entered = false;
      const transform = (input: Uint8Array) => {
        const before = input.slice();
        if (codec && !entered) {
          entered = true;
          nested = codec.encodeUuid(secondBytes);
          entered = false;
          assert.deepEqual(input, before);
        }
        return input.map((byte) => byte ^ 0x5a);
      };
      const mask = unwrap(
        createCustomUuidV7Mask({ label: "nested", mask: transform, unmask: transform }),
      );
      codec = createUuidV7SlugCodec({ mask });
      const outer = unwrap(codec.encodeUuid(firstBytes));
      assert.equal(codec.decodeSlug(outer), first);
      if (typeof nested !== "string") assert.fail("nested encoding must return a slug");
      assert.equal(codec.decodeSlug(nested), second);
    },
  },
  ...["constructor", "toString", "__proto__"].map((slugAlphabet) => ({
    name: `rejects inherited alphabet ${slugAlphabet} at construction`,
    run() {
      const error = createCodec({
        mask: UUID_V7_TEST_MASK,
        outputAlphabet: slugAlphabet,
      } as UuidV7SlugCodecOptions);
      assert.ok(error instanceof UuidSlugError);
      assert.equal(error.code, "invalid_uuid_slug");
    },
  })),
] as const;
