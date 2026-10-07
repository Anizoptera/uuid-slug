// SPDX-License-Identifier: Apache-2.0

import { strict as assert } from "node:assert";
import {
  bytesToUuidString,
  createCustomUuidV7Mask,
  deriveUuidV7Mask,
  deriveUuidV7MaskAsync,
  createUuidV7MaskingCodec as createCodec,
  extractUuidV7Payload,
  extractUuidV7UnixMs,
  UUID_V7_TEST_MASK,
  isUuidSlugError,
  isUuidBytes,
  isUuidV4Bytes,
  isUuidString,
  isUuidText,
  isUuidV4String,
  isUuidV4Text,
  isUuidV7Bytes,
  isUuidV7String,
  isUuidV7Text,
  isPlainUuidSlug,
  isPlainUuidV4Slug,
  isPlainUuidV7Slug,
  validatePlainUuidV7SlugUnixMs,
  uuidStringToBytes,
  uuidStringToPlainSlug,
  generatePlainUuidV7Slug,
  parseUuid,
  uuidToBytes,
  uuidToPlainSlug,
  uuidToString,
  UuidSlugError,
} from "../src/index";
import { createPortableUuidV7Generator as createUuidV7Generator } from "../src/v7";
import { createUuidV7MaskingCodecWithGenerator } from "../src/masking-codec";
import type {
  MaskedOrSentinelUuidV7Slug,
  UuidV7Mask,
  UuidV7MaskingCodec,
  UuidV7MaskingCodecOptions,
} from "../src/types";
import { unwrap } from "../dev/unwrap";
import { uuidVariants } from "./uuid-variants";

const createUuidV7MaskingCodec = (options: UuidV7MaskingCodecOptions) =>
  unwrap(createCodec(options));

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
    name: "captures a sentinel UUID accessor once before validation",
    run() {
      const uuid = "01987008-ef3e-7f69-b677-0000000010c7";
      let reads = 0;
      const codec = createUuidV7MaskingCodec({
        mask: UUID_V7_TEST_MASK,
        sentinels: [
          {
            name: "captured",
            get uuid() {
              assert.equal(++reads, 1, "Sentinel UUID must be captured before validation");
              return uuid;
            },
          },
        ],
      });
      assert.equal(reads, 1);
      assert.equal(codec.uuidToMaskedSlug(uuid), uuidToPlainSlug(uuid));
    },
  },
  {
    name: "reads current byte contents instead of a stale UUID version brand",
    run() {
      const codec = createUuidV7MaskingCodec({ mask: UUID_V7_TEST_MASK });
      const bytes = unwrap(uuidStringToBytes("00000000-0000-4000-8000-000000000000"));
      assert.ok(isUuidV4Bytes(bytes));
      for (const version of [7, 5, 4]) {
        bytes[6] = version << 4;
        const expected = `00000000-0000-${version}000-8000-000000000000`;
        assert.equal(uuidToString(bytes), expected);
        assert.equal(codec.uuidToString(bytes), expected);
        assert.equal(uuidToString(unwrap(uuidToPlainSlug(bytes))), expected);
        assert.equal(uuidToString(unwrap(codec.uuidToPlainSlug(bytes))), expected);
        assert.deepEqual(uuidToBytes(bytes), bytes);
        assert.deepEqual(codec.uuidToBytes(bytes), bytes);
        assert.equal(unwrap(parseUuid(bytes)).version, version);
        assert.equal(unwrap(codec.parseUuid(bytes)).version, version);
        assert.equal(unwrap(parseUuid(bytes, codec)).version, version);
      }
    },
  },
  {
    name: "keeps the codec's masked reading when a slug also proves plain UUIDv4 syntax",
    run() {
      const codec = createUuidV7MaskingCodec({ maskSeed: "conversion-test-seed-0000" });
      const slug = "8xUgV27ITf-XIhibd0F6mQ";
      const plainUuid = "f3152057-6ec8-4dff-9722-189b77417a99";
      const maskedUuid = "01987008-ef3e-7f69-b677-0000000010c7";
      assert.ok(isPlainUuidV4Slug(slug));
      assert.equal(codec.uuidToMaskedSlug(maskedUuid), slug);
      assert.equal(uuidToString(slug), plainUuid);
      assert.equal(codec.uuidToString(slug), maskedUuid);
      assert.deepEqual(codec.uuidToBytes(slug), uuidToBytes(maskedUuid));
      assert.equal(codec.uuidToPlainSlug(slug), uuidToPlainSlug(maskedUuid));
      assert.equal(unwrap(parseUuid(slug)).version, 4);
      assert.equal(unwrap(codec.parseUuid(slug)).version, 7);
      assert.equal(unwrap(parseUuid(slug, codec)).version, 7);
    },
  },
  {
    name: "offers one concise codec language without duplicating implementation work",
    run() {
      const codec = createUuidV7MaskingCodec({ mask: UUID_V7_TEST_MASK });
      const uuid = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051";
      const slug = unwrap(codec.uuidToMaskedSlug(uuid));
      const timestamp = unwrap(extractUuidV7UnixMs(unwrap(uuidStringToBytes(uuid))));
      assert.equal(codec.uuidToString(slug), uuid);
      assert.deepEqual(codec.uuidToBytes(slug), unwrap(uuidStringToBytes(uuid)));
      assert.equal(
        codec.validateMaskedUuidV7SlugUnixMs(slug, {
          maxTimestampDeltaMs: 86_400_000,
          referenceUnixMs: timestamp,
        }),
        slug,
      );
      assert.ok(!(codec.generateMaskedUuidV7Slug() instanceof Error));
      assert.equal(Object.isFrozen(codec), true);
      assert.equal("uuidV7MaskedSlug" in codec, false);
    },
  },
  {
    name: "reads one UUID out of a packed array through every universal converter",
    run() {
      const codec = createUuidV7MaskingCodec({ mask: UUID_V7_TEST_MASK });
      const uuid = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051";
      const slug = unwrap(uuidStringToPlainSlug(uuid));
      const packed = new Uint8Array(24).fill(0xee);
      packed.set(unwrap(uuidStringToBytes(uuid)), 5);
      assert.equal(uuidToString(packed, 5), uuid);
      assert.equal(codec.uuidToString(packed, 5, "uppercase"), uuid.toUpperCase());
      assert.equal(uuidToPlainSlug(packed, 5), slug);
      assert.equal(codec.uuidToPlainSlug(packed, 5), slug);
      assert.deepEqual(uuidToBytes(packed, 5), unwrap(uuidStringToBytes(uuid)));
      const output = new Uint8Array(20).fill(0x11);
      assert.equal(codec.uuidToBytes(packed, 5, output, 3), output);
      assert.equal(bytesToUuidString(output, 3), uuid);
      assert.equal(output[2], 0x11);
      // An offset past the end is a buffer error, never a short read.
      assert.ok(uuidToBytes(packed, 9) instanceof UuidSlugError);
      assert.ok(codec.uuidToPlainSlug(packed, 9) instanceof UuidSlugError);
      // Every other accepted form holds one UUID, so a non-zero offset with one is a caller mistake.
      // The timestamp readers follow the same rule: ignoring the offset would answer about byte 0.
      for (const read of [
        uuidToString,
        uuidToBytes,
        uuidToPlainSlug,
        codec.uuidToString,
        extractUuidV7UnixMs,
      ]) {
        for (const value of [uuid, slug, packed.buffer, new DataView(packed.buffer)]) {
          const result = Reflect.apply(read, undefined, [value, 5]);
          assert.ok(result instanceof UuidSlugError);
          assert.equal(result.code, "invalid_options");
        }
      }
      // Offset zero is the spelling of "no offset", so it reads every form the standalone call does.
      const exact = unwrap(uuidStringToBytes(uuid));
      const layout = { subMillisecondFractionBits: 0, counterBits: 0 };
      const unixMs = unwrap(extractUuidV7UnixMs(exact));
      for (const value of [uuid, slug, exact.buffer, new DataView(exact.buffer)]) {
        assert.equal(Reflect.apply(uuidToString, undefined, [value, 0]), uuid);
        assert.equal(Reflect.apply(uuidToPlainSlug, undefined, [value, 0]), slug);
        assert.equal(Reflect.apply(extractUuidV7UnixMs, undefined, [value, 0]), unixMs);
        assert.equal(
          unwrap(Reflect.apply(extractUuidV7Payload, undefined, [value, layout, 0])).unixMs,
          unixMs,
        );
      }
      // The payload reader takes its offset third, so it cannot join the loop above.
      for (const value of [uuid, slug, packed.buffer, new DataView(packed.buffer)]) {
        const result = Reflect.apply(extractUuidV7Payload, undefined, [value, layout, 5]);
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.code, "invalid_options");
      }
      assert.equal(
        Reflect.apply(uuidToString, undefined, [uuid, 0, "uppercase"]),
        uuid.toUpperCase(),
      );
      assert.deepEqual(Reflect.apply(uuidToBytes, undefined, [uuid, 0, new Uint8Array(16)]), exact);
      // Zero must not route a codec read to the keyless reader: a masked slug would spell out the
      // wrong UUID, and one masked base64url slug in sixteen is also a valid plain slug.
      const masked = unwrap(codec.uuidToMaskedSlug(uuid));
      assert.equal(Reflect.apply(codec.uuidToString, undefined, [masked, 0]), uuid);
      assert.equal(Reflect.apply(codec.uuidToPlainSlug, undefined, [masked, 0]), slug);
      assert.deepEqual(Reflect.apply(codec.uuidToBytes, undefined, [masked, 0]), exact);
    },
  },
  {
    name: "converts UUIDv4 and UUIDv7 between canonical text and bytes",
    run() {
      for (const uuid of [
        "550e8400-e29b-41d4-a716-446655440000",
        "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051",
      ]) {
        const bytes = unwrap(uuidStringToBytes(uuid));
        assert.equal(isUuidBytes(bytes), true);
        assert.equal(bytes.constructor, Uint8Array);
        assert.equal(bytesToUuidString(bytes), uuid);

        const destination = new Uint8Array(24).fill(0xee);
        assert.equal(uuidStringToBytes(uuid, destination, 4), destination);
        assert.equal(bytesToUuidString(destination, 4), uuid);
      }
      assert.equal(
        isUuidV4Bytes(unwrap(uuidStringToBytes("550e8400-e29b-41d4-a716-446655440000"))),
        true,
      );
      assert.equal(
        isUuidV4Bytes(unwrap(uuidStringToBytes("0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051"))),
        false,
      );
      assert.ok(uuidStringToBytes("not a UUID") instanceof UuidSlugError);
      assert.ok(bytesToUuidString(new Uint8Array(15)) instanceof UuidSlugError);
      assert.equal(isUuidBytes(new Uint8Array(15)), false);
    },
  },
  {
    name: "mask factories reject untyped coercions before deriving keys",
    async run() {
      let readsAfterInvalidSeed = 0;
      const options = [
        undefined,
        null,
        {},
        { seed: Array.from({ length: 16 }, () => 1) },
        { seed: new ArrayBuffer(16) },
        { seed: "a-valid-mask-seed", diagnosticLabel: 7 },
        { seed: "a-valid-mask-seed", diagnosticLabel: null },
        { seed: "a-valid-mask-seed", keyDerivationIterations: null },
        { seed: "a-valid-mask-seed", keyDerivationIteration: 2 },
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
          Promise.resolve(Reflect.apply(deriveUuidV7Mask, undefined, [value])),
          Reflect.apply(deriveUuidV7MaskAsync, undefined, [value]),
        ]),
      );
      for (const result of results) {
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.code, "invalid_mask");
      }
      assert.equal(readsAfterInvalidSeed, 0);
    },
  },
  {
    name: "codec construction returns package errors for malformed JavaScript options",
    run() {
      const cases = [
        { mask: UUID_V7_TEST_MASK, previousMasks: 1 },
        { mask: UUID_V7_TEST_MASK, outputAlphbet: "base32hex" },
        { mask: UUID_V7_TEST_MASK, sentinels: 1 },
        { mask: UUID_V7_TEST_MASK, sentinels: [null] },
        {
          mask: UUID_V7_TEST_MASK,
          sentinels: [{ name: 7, uuid: "00000000-0000-7000-8000-000000000000" }],
        },
        {
          mask: UUID_V7_TEST_MASK,
          sentinels: [{ name: "nil", uuid: "00000000-0000-7000-8000-000000000000", id: "ignored" }],
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
    name: "codec construction rejects unknown caller-supplied entropy",
    run() {
      const options = {
        mask: UUID_V7_TEST_MASK,
        get generateUuidV7Bytes(): never {
          throw new Error("untrusted UUIDv7 byte generator was read");
        },
      };
      const codec = Reflect.apply(createCodec, undefined, [options]);
      assert.ok(codec instanceof UuidSlugError);
      assert.equal(codec.code, "invalid_mask");
    },
  },
  {
    name: "requires exactly one writer mask before reading any other codec option",
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
        assert.equal(result.code, "invalid_mask");
        assert.equal(observed, false);
      }
      const forged = Reflect.apply(createCodec, undefined, [
        { mask: { diagnosticLabel: "forged" } },
      ]);
      assert.ok(forged instanceof UuidSlugError);
      assert.equal(forged.code, "invalid_mask");
      assert.ok(!(createCodec({ mask: UUID_V7_TEST_MASK }) instanceof Error));
      // maskSeed and mask reach the same derivation, so supplying both leaves no writer mask the
      // codec may prefer, and the seed form must produce the mask its nested spelling produces.
      const seed = "codec-seed-for-both-writer-mask-forms";
      const both = Reflect.apply(createCodec, undefined, [
        { mask: UUID_V7_TEST_MASK, maskSeed: seed },
      ]);
      assert.ok(both instanceof UuidSlugError);
      assert.equal(both.code, "invalid_mask");
      const uuid = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051";
      const fromSeed = unwrap(createCodec({ maskSeed: seed }));
      const fromMaskOptions = unwrap(createCodec({ mask: { seed } }));
      assert.equal(
        unwrap(fromSeed.uuidToMaskedSlug(uuid)),
        unwrap(fromMaskOptions.uuidToMaskedSlug(uuid)),
      );
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
      assert.equal(duplicateUuid.code, "invalid_sentinel");
      assert.match(duplicateUuid.message, /same-uuid.*repeats.*UUID/i);

      const canonical = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051";
      const mixed = canonical.toUpperCase().replace("A1B2", "a1b2");
      const normalized = unwrap(
        createCodec({ mask: UUID_V7_TEST_MASK, sentinels: [{ name: "mixed", uuid: mixed }] }),
      );
      assert.equal(normalized.sentinels[0]?.uuid, canonical);
      assert.equal(normalized.uuidToMaskedSlug(mixed), normalized.sentinels[0]?.slug);
      const duplicateSpelling = createCodec({
        mask: UUID_V7_TEST_MASK,
        sentinels: [
          { name: "canonical", uuid: canonical },
          { name: "same-compact", uuid: mixed.replaceAll("-", "") },
        ],
      });
      assert.ok(duplicateSpelling instanceof UuidSlugError);
      assert.equal(duplicateSpelling.code, "invalid_sentinel");
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
        assert.equal(
          codec.uuidToMaskedSlug(unwrap(uuidStringToBytes(definition.uuid))),
          sentinel.slug,
        );
      }
    },
  },
  {
    name: "codec masks and unmasks UUIDv7 bytes without a text round trip",
    run() {
      const codec = createUuidV7MaskingCodec({
        mask: UUID_V7_TEST_MASK,
        sentinels: [TEST_SENTINELS[0]],
      });
      const uuid = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051";
      const bytes = unwrap(uuidStringToBytes(uuid));
      const v4 = unwrap(uuidStringToBytes("550e8400-e29b-41d4-a716-446655440000"));
      const refused = codec.uuidToMaskedSlug(v4);
      assert.ok(refused instanceof UuidSlugError);
      assert.equal(refused.code, "invalid_uuid_version");
      const slug = unwrap(codec.uuidToMaskedSlug(bytes));
      const owned = unwrap(codec.uuidToBytes(slug));
      assert.equal(owned.constructor, Uint8Array);
      assert.deepEqual(owned, bytes);
      const destination = new Uint8Array(24).fill(0xee);
      const returned = unwrap(codec.uuidToBytes(slug, destination, 4));
      assert.equal(returned, destination);
      assert.deepEqual(destination.subarray(4, 20), bytes);
      assert.deepEqual(destination.subarray(0, 4), new Uint8Array(4).fill(0xee));
      assert.deepEqual(destination.subarray(20), new Uint8Array(4).fill(0xee));
      const sentinel = codec.sentinels[0];
      assert.ok(sentinel);
      const firstSentinelBytes = unwrap(codec.uuidToBytes(sentinel.slug));
      firstSentinelBytes.fill(0xff);
      assert.equal(
        codec.uuidToString(sentinel.slug),
        sentinel.uuid,
        "owned bytes must not expose mutable sentinel storage",
      );
    },
  },
  {
    name: "custom mask construction isolates mutating reversible transforms",
    run() {
      const cause = new Error("forward unavailable");
      let fail = false;
      const handle = createCustomUuidV7Mask({
        diagnosticLabel: "xor",
        mask(input) {
          if (fail) throw cause;
          return input.map((byte) => byte ^ 0xa5);
        },
        unmask(input) {
          return input.map((byte) => byte ^ 0xa5);
        },
      });
      assert.ok(!(handle instanceof Error));
      assert.ok(Object.isFrozen(handle));
      assert.deepEqual(Object.keys(handle), ["diagnosticLabel"]);
      const codec = unwrap(createCodec({ mask: handle }));
      const uuid = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051";
      const slug = unwrap(codec.uuidToMaskedSlug(uuid));
      assert.equal(codec.uuidToString(slug), uuid);
      fail = true;
      const refused = codec.uuidToMaskedSlug(uuid);
      assert.ok(refused instanceof UuidSlugError);
      assert.equal(refused.cause, cause);
    },
  },
  {
    name: "safe masked spelling preserves all wire bits, strict padding, rotation and sentinel identity",
    run() {
      const mask = { seed: "safe-spelling-contract" };
      const old = createUuidV7MaskingCodec({ mask, sentinels: TEST_SENTINELS });
      const safe = createUuidV7MaskingCodec({
        mask,
        sentinels: TEST_SENTINELS,
        maskedSlugAlphabet: "base32hex",
      });
      const rotated = createUuidV7MaskingCodec({
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
        const bytes = unwrap(uuidStringToBytes(uuid));
        const legacy = old.uuidToMaskedSlug(uuid);
        const encoded = safe.uuidToMaskedSlug(uuid);
        assert.equal(typeof legacy, "string");
        assert.equal(typeof encoded, "string");
        assert.equal(old.uuidToMaskedSlug(bytes), legacy);
        assert.equal(safe.uuidToMaskedSlug(bytes), encoded);
        const text = encoded as string;
        assert.equal(text.length, 27);
        assert.equal(bits(text, alphabet32, 5), bits(legacy as string, alphabet64, 6) + "000");
        for (const reader of [old, safe, rotated]) {
          assert.equal(reader.uuidToString(text), uuid);
          assert.equal(reader.uuidToString(legacy as string), uuid);
          assert.deepEqual(reader.uuidToBytes(text), bytes);
          assert.deepEqual(reader.uuidToBytes(legacy as string), bytes);
          assert.deepEqual(
            unwrap(
              reader.createUuidSlugMigrationDecoder({ acceptPlainSlug: true }),
            ).uuidSlugToUuidStringCandidates(text, "seeded-mask"),
            [uuid],
          );
          assert.deepEqual(
            unwrap(
              reader.createUuidSlugMigrationDecoder({
                acceptPlainSlug: true,
                acceptFixedMask: true,
              }),
            ).uuidSlugToUuidStringCandidates(text),
            [uuid],
          );
          for (let padding = 1; padding < 8; padding += 1) {
            const alias =
              text.slice(0, 26) + alphabet32[alphabet32.indexOf(text[26] as string) | padding];
            assert.ok(reader.uuidToString(alias) instanceof Error);
            assert.ok(
              unwrap(
                reader.createUuidSlugMigrationDecoder({
                  acceptPlainSlug: true,
                  acceptFixedMask: true,
                }),
              ).uuidSlugToUuidStringCandidates(alias) instanceof Error,
            );
          }
        }
        assert.equal(safe.uuidToString(text.toUpperCase()), uuid);
        const window = {
          referenceUnixMs: unwrap(extractUuidV7UnixMs(bytes)),
          maxTimestampDeltaMs: 0,
        };
        const plain = unwrap(uuidStringToPlainSlug(uuid, "base32hex"));
        for (const spelling of [plain, plain.toUpperCase()]) {
          const validated = unwrap(validatePlainUuidV7SlugUnixMs(spelling, window));
          assert.equal(validated, plain);
          assert.ok(isPlainUuidV7Slug(validated));
        }
        const zeroUuid = "00000000-0000-7000-8000-000000000000";
        const zeroSlug = unwrap(uuidStringToPlainSlug(zeroUuid, "base32hex"));
        assert.equal(
          unwrap(
            validatePlainUuidV7SlugUnixMs(plain, {
              referenceUnixMs: window.referenceUnixMs,
              get maxTimestampDeltaMs() {
                assert.equal(uuidToString(zeroSlug), zeroUuid);
                return 0;
              },
            }),
          ),
          plain,
        );
        for (const reader of [old, safe, rotated]) {
          for (const spelling of [text, text.toUpperCase(), legacy as string]) {
            const validated = unwrap(reader.validateMaskedUuidV7SlugUnixMs(spelling, window));
            assert.equal(validated, spelling.length === 22 ? legacy : text);
            assert.equal(reader.maskedSlugToUuidString(validated), uuid);
          }
        }
        assert.equal(old.uuidToString(uuidStringToPlainSlug(uuid, "base32hex") as string), uuid);
      }
      for (const sentinel of safe.sentinels) {
        assert.equal(sentinel.slug.length, 26);
        assert.equal(uuidToString(sentinel.slug), sentinel.uuid);
        for (const reader of [old, safe]) {
          assert.equal(reader.uuidToString(sentinel.slug), sentinel.uuid);
          const window = {
            referenceUnixMs: unwrap(extractUuidV7UnixMs(sentinel.uuid)),
            maxTimestampDeltaMs: 0,
          };
          for (const spelling of [sentinel.slug, sentinel.slug.toUpperCase()]) {
            const validated = unwrap(reader.validateMaskedUuidV7SlugUnixMs(spelling, window));
            assert.equal(validated, sentinel.slug);
            assert.ok(isPlainUuidV7Slug(validated));
          }
          assert.equal(
            unwrap(
              reader.createUuidSlugMigrationDecoder({ acceptPlainSlug: true }),
            ).uuidSlugToUuidString(sentinel.slug),
            sentinel.uuid,
          );
          assert.equal(
            reader.uuidToString(uuidStringToPlainSlug(sentinel.uuid) as string),
            sentinel.uuid,
          );
        }
      }
      assert.equal(unwrap(generatePlainUuidV7Slug("base32hex")).length, 26);
      const plainSafe = createUuidV7MaskingCodec({ mask }).uuidToMaskedSlug(
        "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051",
      );
      assert.equal(typeof plainSafe, "string");
      assert.equal((plainSafe as string).length, 22);
    },
  },
  {
    name: "UUID guards accept equivalent text spellings and reject invalid characters",
    run() {
      for (const value of [undefined, null, false, 0, "", {}, new DataView(new ArrayBuffer(16))])
        assert.equal(isUuidV7Bytes(value), false);
      const uuid = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051";
      const lowercaseHex = "0123456789abcdef";
      const acceptedHex = "0123456789abcdefABCDEF";
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
            separators.has(offset) ? char === "-" : lowercaseHex.includes(char),
            `UUID ${offset}/${char.charCodeAt(0)}`,
          );
          assert.equal(
            isUuidText(value),
            separators.has(offset) ? char === "-" : acceptedHex.includes(char),
            `UUID text ${offset}/${char.charCodeAt(0)}`,
          );
        }
      }
      for (const { value, v4, v7 } of uuidVariants(uuid)) {
        assert.equal(isUuidV4String(value), v4);
        assert.equal(isUuidV4Text(value.toUpperCase()), v4);
        assert.equal(isUuidV7String(value), v7);
        assert.equal(isUuidV7Text(value.toUpperCase()), v7);
        assert.equal(isUuidV7Text(value.replaceAll("-", "")), v7);
        assert.equal(isUuidText(value.replaceAll("-", "")), true);
        for (const alphabet of ["base64url", "base32hex"] as const) {
          const slug = uuidStringToPlainSlug(value, alphabet);
          assert.equal(typeof slug, "string");
          assert.equal(isPlainUuidV4Slug(slug as string), v4);
          assert.equal(isPlainUuidV7Slug(slug as string), v7);
        }
      }
      for (const [alphabet, chars, padding] of [
        ["base64url", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_", 16],
        ["base32hex", "0123456789abcdefghijklmnopqrstuv", 4],
      ] as const) {
        const slug = uuidStringToPlainSlug(uuid, alphabet) as string;
        for (let offset = 0; offset < slug.length; offset += 1) {
          for (let code = 0; code < 128; code += 1) {
            const char = String.fromCharCode(code);
            const value = slug.slice(0, offset) + char + slug.slice(offset + 1);
            const digit = chars.indexOf(char);
            const valid = digit >= 0 && (offset < slug.length - 1 || digit % padding === 0);
            assert.equal(isPlainUuidSlug(value), valid, `${alphabet} ${offset}/${code}`);
          }
        }
        assert.equal(isPlainUuidSlug(slug.slice(0, -1) + "\u2028"), false);
        assert.equal(isPlainUuidSlug(slug + "\n"), false);
      }
    },
  },
  {
    name: "unknown runtime alphabet values return a package error",
    run() {
      const result = Reflect.apply(uuidStringToPlainSlug, undefined, [
        "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051",
        Symbol("unknown"),
      ]);
      assert.ok(result instanceof UuidSlugError);
      assert.equal(result.code, "invalid_options");
    },
  },
  {
    name: "universal byte inputs and slug-only readers report their own invalid domains",
    run() {
      const codec = createUuidV7MaskingCodec({ mask: UUID_V7_TEST_MASK });
      const migration = unwrap(
        codec.createUuidSlugMigrationDecoder({
          acceptFixedMask: true,
          acceptPlainSlug: true,
        }),
      );
      for (const value of [null, 1, Symbol("slug"), { length: 22 }]) {
        for (const decode of [codec.uuidToString, codec.uuidToBytes]) {
          const result = Reflect.apply(decode, undefined, [value]);
          assert.ok(result instanceof UuidSlugError);
          assert.equal(result.code, "invalid_buffer");
        }
        for (const decode of [
          codec.validateMaskedUuidV7SlugUnixMs,
          migration.uuidSlugToUuidString,
          migration.uuidSlugToUuidStringCandidates,
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
          diagnosticLabel: "xor-previous",
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
          diagnosticLabel: "mutating-primary",
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
      const slug = unwrap(createUuidV7MaskingCodec({ mask: previous }).uuidToMaskedSlug(uuid));
      const codec = createUuidV7MaskingCodec({ mask: mutating, previousMasks: [previous] });
      assert.equal(codec.uuidToString(slug), uuid);
      fail = true;
      const refused = codec.uuidToString(slug);
      assert.ok(refused instanceof UuidSlugError);
      assert.equal(refused.code, "invalid_mask");
      assert.equal(refused.cause, cause);
    },
  },
  {
    name: "refuses ciphertext that aliases a reserved sentinel",
    run() {
      const xor = Uint8Array.from(Buffer.from("c99ff19b58b890005b1bdf713bd55607", "hex"));
      const mask = unwrap(
        createCustomUuidV7Mask({
          diagnosticLabel: "sentinel-collision",
          mask(input) {
            return input.map((byte, i) => byte ^ (xor[i] as number));
          },
          unmask(input) {
            return input.map((byte, i) => byte ^ (xor[i] as number));
          },
        }),
      );
      for (const slugAlphabet of ["base64url", "base32hex"] as const) {
        const codec = createUuidV7MaskingCodec({
          mask,
          sentinels: [TEST_SENTINELS[0]],
          maskedSlugAlphabet: slugAlphabet,
        });
        const result = codec.uuidToMaskedSlug("019ff19b-58b8-7000-9b1b-df713bd55607");
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.code, "invalid_mask");
        assert.equal(
          codec.uuidToString("AAAAAAAAcACAAAAAAAAAAA"),
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
        readUnixMs: () => 10,
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
        "UUIDv7 generation cannot be reentered from its readUnixMs or entropy callback.",
      );
      assert.notDeepEqual(generator.generateUuidV7Bytes(), first);
    },
  },
  {
    name: "generates one UUID and its registered sentinel spelling together",
    run() {
      const generator = createUuidV7Generator({
        readUnixMs: () => 0,
        fillRandom: (bytes) => bytes.fill(0),
      });
      const codec = unwrap(
        createUuidV7MaskingCodecWithGenerator(
          { mask: UUID_V7_TEST_MASK, sentinels: TEST_SENTINELS },
          generator.generateUuidV7Bytes,
        ),
      );
      const generated = unwrap(codec.generateUuidV7WithMaskedSlug());
      assert.equal(generated.uuid, "00000000-0000-7000-8000-000000000000");
      assert.equal(generated.slug, "AAAAAAAAcACAAAAAAAAAAA");
      assert.equal(codec.uuidToString(generated.slug), generated.uuid);
    },
  },
  {
    name: "contains thrown and malformed injected generator results",
    run() {
      const cause = new Error("custom generator failed");
      const throwing = unwrap(
        createUuidV7MaskingCodecWithGenerator({ mask: UUID_V7_TEST_MASK }, function () {
          throw cause;
        }),
      );
      const thrown = throwing.generateMaskedUuidV7Slug();
      assert.ok(isUuidSlugError(thrown));
      assert.equal(thrown.code, "rng_unavailable");
      assert.equal(thrown.cause, cause);

      const foreignFailure = Object.assign(new Error("foreign generator failed"), {
        __failure: true as const,
        code: "rng_unavailable" as const,
        name: "UuidSlugError",
      });
      const returningFailure = unwrap(
        createUuidV7MaskingCodecWithGenerator(
          { mask: UUID_V7_TEST_MASK },
          () => foreignFailure as UuidSlugError,
        ),
      );
      assert.equal(returningFailure.generateMaskedUuidV7Slug(), foreignFailure);

      for (const value of [null, "not bytes", new Uint8Array(15)] as const) {
        const malformed = unwrap(
          createUuidV7MaskingCodecWithGenerator(
            { mask: UUID_V7_TEST_MASK },
            () => value as unknown as Uint8Array,
          ),
        ).generateMaskedUuidV7Slug();
        assert.ok(isUuidSlugError(malformed));
        assert.equal(malformed.code, "invalid_options");
        assert.match(malformed.message, /exactly 16 UUID bytes.*got/);
      }

      const wrongVersion = unwrap(
        createUuidV7MaskingCodecWithGenerator(
          { mask: UUID_V7_TEST_MASK },
          () => new Uint8Array(16),
        ),
      ).generateMaskedUuidV7Slug();
      assert.ok(isUuidSlugError(wrongVersion));
      assert.equal(wrongVersion.code, "invalid_uuid_version");
      assert.match(wrongVersion.message, /not an RFC-variant UUIDv7/);
    },
  },
  {
    name: "rejects malformed results and transforms that are not inverses",
    run() {
      const malformed = createCustomUuidV7Mask({
        diagnosticLabel: "short",
        mask: () => new Uint8Array(15),
        unmask: (input) => input,
      });
      const notInverse = createCustomUuidV7Mask({
        diagnosticLabel: "destructive",
        mask(input) {
          return input.fill(0);
        },
        unmask(input) {
          return input.fill(0);
        },
      });
      for (const error of [malformed, notInverse]) {
        assert.ok(error instanceof UuidSlugError);
        assert.equal(error.code, "invalid_mask");
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
          diagnosticLabel: "failed",
          mask: forward,
          unmask: (input) => input,
        });
        assert.ok(error instanceof UuidSlugError);
        assert.equal(error.code, "invalid_mask");
        assert.equal(error.cause, cause);
      }
    },
  },
  {
    name: "captures scalar configuration and protects sentinel metadata",
    run() {
      const options: {
        mask: UuidV7Mask;
        maskedSlugAlphabet: "base64url" | "base32hex";
      } = { mask: UUID_V7_TEST_MASK, maskedSlugAlphabet: "base64url" };
      const codec = createUuidV7MaskingCodec({ ...options, sentinels: TEST_SENTINELS });
      options.maskedSlugAlphabet = "base32hex";
      assert.equal(
        unwrap(codec.uuidToMaskedSlug("0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051")).length,
        22,
      );
      assert.ok(Object.isFrozen(codec));
      assert.ok(Object.isFrozen(codec.sentinels));
      assert.ok(codec.sentinels.every(Object.isFrozen));
      assert.ok(Object.isFrozen(UUID_V7_TEST_MASK));

      const mutable = {
        diagnosticLabel: "stable-mask-reference",
        mask: (input: Uint8Array) => input,
        unmask: (input: Uint8Array) => input,
      };
      const built = createCustomUuidV7Mask(mutable);
      assert.ok(!(built instanceof Error));
      const stable = createUuidV7MaskingCodec({ mask: built });
      const uuid = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051";
      const slug = stable.uuidToMaskedSlug(uuid);
      assert.equal(typeof slug, "string");
      mutable.unmask = (input) => input.fill(0);
      assert.equal(stable.uuidToString(slug as string), uuid);
    },
  },
  {
    name: "returns mask failures after construction with their original cause",
    run() {
      const cause = new UuidSlugError("invalid_mask", "mask unavailable");
      let fail = false;
      const handle = unwrap(
        createCustomUuidV7Mask({
          diagnosticLabel: "changes",
          mask(input) {
            return fail ? cause : input;
          },
          unmask(input) {
            return fail ? cause : input;
          },
        }),
      );
      const codec = createUuidV7MaskingCodec({ mask: handle });
      const uuid = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051";
      const slug = codec.uuidToMaskedSlug(uuid);
      assert.equal(typeof slug, "string");
      fail = true;
      for (const result of [codec.uuidToMaskedSlug(uuid), codec.uuidToString(slug as string)]) {
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.code, "invalid_mask");
        assert.equal(result.cause, cause);
      }
    },
  },
  {
    name: "isolates nested custom-mask generation",
    run() {
      let codec: UuidV7MaskingCodec | undefined;
      let nested: { uuid: string; slug: MaskedOrSentinelUuidV7Slug } | undefined;
      let entered = false;
      const transform = (input: Uint8Array) => {
        const before = input.slice();
        if (codec && !entered) {
          entered = true;
          nested = unwrap(codec.generateUuidV7WithMaskedSlug());
          entered = false;
          assert.deepEqual(input, before);
        }
        return input.map((byte) => byte ^ 0x5a);
      };
      const mask = unwrap(
        createCustomUuidV7Mask({
          diagnosticLabel: "nested generation",
          mask: transform,
          unmask: transform,
        }),
      );
      codec = createUuidV7MaskingCodec({ mask });
      const outer = unwrap(codec.generateUuidV7WithMaskedSlug());
      const reader = codec;
      // Decoding must not trigger a third generation and overwrite the nested pair being checked.
      codec = undefined;
      assert.equal(reader.maskedSlugToUuidString(outer.slug), outer.uuid);
      assert.ok(nested);
      assert.equal(reader.maskedSlugToUuidString(nested.slug), nested.uuid);
    },
  },
  {
    name: "isolates nested custom-mask calls",
    run() {
      const first = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051";
      const second = "019ff19b-58b8-7000-9b1b-df713bd5562c";
      const firstBytes = unwrap(uuidStringToBytes(first));
      let codec: UuidV7MaskingCodec | undefined;
      let nested: MaskedOrSentinelUuidV7Slug | UuidSlugError | undefined;
      let entered = false;
      const transform = (input: Uint8Array) => {
        const before = input.slice();
        if (codec && !entered) {
          entered = true;
          nested = codec.uuidToMaskedSlug(second);
          entered = false;
          assert.deepEqual(input, before);
        }
        return input.map((byte) => byte ^ 0x5a);
      };
      const mask = unwrap(
        createCustomUuidV7Mask({ diagnosticLabel: "nested", mask: transform, unmask: transform }),
      );
      codec = createUuidV7MaskingCodec({ mask });
      for (const input of [firstBytes, first]) {
        const outer: MaskedOrSentinelUuidV7Slug = unwrap(codec.uuidToMaskedSlug(input));
        assert.equal(codec.uuidToString(outer), first);
        if (typeof nested !== "string") assert.fail("nested encoding must return a slug");
        assert.equal(codec.uuidToString(nested), second);
      }
    },
  },
  ...["constructor", "toString", "__proto__"].map((slugAlphabet) => ({
    name: `rejects inherited alphabet ${slugAlphabet} at construction`,
    run() {
      const error = createCodec({
        mask: UUID_V7_TEST_MASK,
        maskedSlugAlphabet: slugAlphabet,
      } as UuidV7MaskingCodecOptions);
      assert.ok(error instanceof UuidSlugError);
      assert.equal(error.code, "invalid_options");
    },
  })),
] as const;
