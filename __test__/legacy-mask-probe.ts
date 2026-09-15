// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { BASE64URL, decodeInto } from "../src/alphabet";
import { createUuidV7MaskingCodec } from "../src/masking-codec";
import { decodeMaskedCandidates } from "../src/payload";
import { applyMask, createCustomUuidV7Mask } from "../src/mask-handle";
import { deriveUuidV7Mask, UUID_V7_TEST_MASK } from "../src/mask";
import { UuidSlugError } from "../src/errors";
import { plainSlugToUuidBytes, uuidStringToPlainSlug } from "../src/slug";
import fixtures from "../rust/uuid-slug/tests/fixtures/fixtures-original-slugs.json";
import { unwrap } from "../dev/unwrap";
import { uuidTailAliases } from "./uuid-tail-aliases";
import type { UuidString, UuidV7Mask } from "../src/types";
import { NIL_TEST_SENTINEL } from "./sentinel-fixtures";

function mix(mask: UuidV7Mask, input: Uint8Array, direction: "mask" | "unmask") {
  const output = new Uint8Array(16);
  return applyMask(mask, input, output, direction) ?? output;
}

export const legacyMaskCases = [
  {
    name: "migration captures a matching UUID before another callback mutates its bytes",
    run(this: void) {
      const { seeds, slug, uuids } = fixtures.keyOverlap;
      let enabled = false;
      let retained: Uint8Array | undefined;
      const masks = seeds.map((seed) => {
        const handle = deriveUuidV7Mask({ seed });
        if (handle instanceof Error) throw handle;
        return unwrap(
          createCustomUuidV7Mask({
            diagnosticLabel: handle.diagnosticLabel,
            mask(input) {
              if (enabled) retained?.fill(0);
              const output = mix(handle, input, "mask");
              if (output instanceof Error) return output;
              if (enabled) retained = output;
              return output;
            },
            unmask(input) {
              if (enabled) retained?.fill(0);
              const output = mix(handle, input, "unmask");
              if (output instanceof Error) return output;
              if (enabled) retained = output;
              return output;
            },
          }),
        );
      });
      const primary = masks[0];
      assert.ok(primary);
      const codec = unwrap(
        createUuidV7MaskingCodec({ mask: primary, previousMasks: masks.slice(1) }),
      );
      enabled = true;
      assert.deepEqual(
        codec.createUuidSlugMigrationDecoder().uuidSlugToUuidStringCandidates(slug),
        uuids,
      );
    },
  },
  {
    name: "sentinel aliases retain current masked candidates without changing sentinel priority",
    run(this: void) {
      const uuid = "0198abcd-1234-7abc-9def-000000000001";
      let tagged = new Uint8Array(16);
      const identityMask = unwrap(
        createCustomUuidV7Mask({
          diagnosticLabel: "identity",
          mask(input) {
            tagged = input.slice();
            return input;
          },
          unmask(input) {
            return input;
          },
        }),
      );
      const identity = unwrap(
        createUuidV7MaskingCodec({ mask: identityMask, sentinels: NIL_TEST_SENTINEL }),
      );
      identity.uuidToMaskedSlug(uuid);
      const sentinel = identity.sentinels[0];
      assert.ok(sentinel);
      const raw = plainSlugToUuidBytes(sentinel.slug);
      if (raw instanceof Error) throw raw;
      const key = tagged.map((byte, index) => byte ^ (raw[index] as number));
      const aliasMask = unwrap(
        createCustomUuidV7Mask({
          diagnosticLabel: "sentinel-alias",
          mask(input) {
            return input.map((byte, i) => byte ^ (key[i] as number));
          },
          unmask(input) {
            return input.map((byte, i) => byte ^ (key[i] as number));
          },
        }),
      );
      const codec = unwrap(
        createUuidV7MaskingCodec({ mask: aliasMask, sentinels: NIL_TEST_SENTINEL }),
      );
      const slug = codec.uuidToMaskedSlug(uuid);
      if (slug instanceof Error) throw slug;
      assert.notEqual(slug, sentinel.slug);
      assert.equal(codec.uuidToString(slug), uuid);
      const reader = codec.createUuidSlugMigrationDecoder({
        acceptFixedMask: true,
        acceptPlainSlug: true,
      });
      assert.equal(reader.uuidSlugToUuidString(slug), sentinel.uuid);
      assert.deepEqual(reader.uuidSlugToUuidStringCandidates(slug), [sentinel.uuid, uuid]);
      assert.deepEqual(reader.uuidSlugToUuidStringCandidates(slug, "seeded-mask"), [uuid]);
    },
  },
  {
    name: "migration preserves original producer identities and sentinel aliases",
    run(this: void) {
      const codec = unwrap(
        createUuidV7MaskingCodec({ mask: UUID_V7_TEST_MASK, sentinels: NIL_TEST_SENTINEL }),
      );
      const reader = codec.createUuidSlugMigrationDecoder({
        acceptFixedMask: true,
        acceptPlainSlug: true,
      });
      for (const { uuid, slug, raw } of fixtures.issued) {
        const format = slug === raw ? "plain-slug" : "fixed-mask";
        assert.equal(reader.uuidSlugToUuidString(slug, format), uuid);
        for (const alias of uuidTailAliases(slug)) {
          assert.equal(reader.uuidSlugToUuidString(alias, format), uuid);
        }
      }
      for (const { uuid, slug } of fixtures.plain)
        assert.equal(reader.uuidSlugToUuidString(slug, "plain-slug"), uuid);
      const plainUuid = fixtures.plain[0]?.uuid;
      assert.ok(plainUuid);
      const base32 = uuidStringToPlainSlug(plainUuid, "base32hex");
      if (base32 instanceof Error) throw base32;
      assert.equal(reader.uuidSlugToUuidString(base32), plainUuid);
      assert.equal(reader.uuidSlugToUuidString(base32, "plain-slug"), plainUuid);
      assert.ok(reader.uuidSlugToUuidString(base32, "fixed-mask") instanceof Error);
      for (const sentinel of codec.sentinels) {
        assert.deepEqual(reader.uuidSlugToUuidStringCandidates(sentinel.slug), [sentinel.uuid]);
        assert.equal(reader.uuidSlugToUuidString(sentinel.slug, "fixed-mask"), sentinel.uuid);
      }
    },
  },
  {
    name: "migration returns one default candidate and all distinct lookup candidates",
    run(this: void) {
      const { seed, slug, currentUuid, originalUuid, plainUuid } = fixtures.overlap;
      const codec = unwrap(createUuidV7MaskingCodec({ mask: { seed }, previousMasks: [{ seed }] }));
      const reader = codec.createUuidSlugMigrationDecoder({
        acceptFixedMask: true,
        acceptPlainSlug: true,
      });
      assert.equal(reader.uuidSlugToUuidString(slug), currentUuid);
      assert.deepEqual(reader.uuidSlugToUuidStringCandidates(slug), [
        currentUuid,
        originalUuid,
        plainUuid,
      ]);
      assert.equal(reader.uuidSlugToUuidString(slug, "fixed-mask"), originalUuid);
      assert.equal(reader.uuidSlugToUuidString(slug, "plain-slug"), plainUuid);
      assert.deepEqual(reader.uuidSlugToUuidStringCandidates(slug, "seeded-mask"), [currentUuid]);
      const custom = unwrap(
        createUuidV7MaskingCodec({
          mask: { seed },
          sentinels: [{ name: "reserved", uuid: currentUuid }],
        }),
      );
      const sentinel = custom.sentinels[0];
      assert.ok(sentinel);
      assert.deepEqual(
        custom
          .createUuidSlugMigrationDecoder({ acceptFixedMask: true, acceptPlainSlug: true })
          .uuidSlugToUuidStringCandidates(sentinel.slug),
        [currentUuid],
      );
    },
  },
  {
    name: "migration configuration is captured and old formats can be retired independently",
    run(this: void) {
      const { seed, slug, currentUuid, originalUuid, plainUuid } = fixtures.overlap;
      const codec = unwrap(createUuidV7MaskingCodec({ mask: { seed } }));
      const options = { acceptFixedMask: true, acceptPlainSlug: true };
      const reader = codec.createUuidSlugMigrationDecoder(options);
      options.acceptFixedMask = false;
      options.acceptPlainSlug = false;
      assert.deepEqual(reader.uuidSlugToUuidStringCandidates(slug), [
        currentUuid,
        originalUuid,
        plainUuid,
      ]);
      assert.deepEqual(
        codec
          .createUuidSlugMigrationDecoder({ acceptFixedMask: true })
          .uuidSlugToUuidStringCandidates(slug),
        [currentUuid, originalUuid],
      );
      assert.deepEqual(
        codec
          .createUuidSlugMigrationDecoder({ acceptPlainSlug: true })
          .uuidSlugToUuidStringCandidates(slug),
        [currentUuid, plainUuid],
      );
      const currentReader = codec.createUuidSlugMigrationDecoder();
      assert.deepEqual(currentReader.uuidSlugToUuidStringCandidates(slug), [currentUuid]);
      assert.ok(
        Reflect.apply(currentReader.uuidSlugToUuidString, undefined, [
          slug,
          "fixed-mask",
        ]) instanceof Error,
      );
      assert.ok(
        Reflect.apply(currentReader.uuidSlugToUuidString, undefined, [
          slug,
          "plain-slug",
        ]) instanceof Error,
      );
      assert.equal(codec.uuidToMaskedSlug(currentUuid), slug);
      assert.equal(codec.maskedSlugToUuidString(slug), currentUuid);
      for (const invalid of ["", "!".repeat(22), "A".repeat(21), "A".repeat(23)]) {
        assert.ok(reader.uuidSlugToUuidString(invalid) instanceof Error);
        assert.ok(reader.uuidSlugToUuidStringCandidates(invalid) instanceof Error);
      }
      const noMatch = "A".repeat(22);
      assert.deepEqual(
        codec.createUuidSlugMigrationDecoder().uuidSlugToUuidStringCandidates(noMatch),
        [],
      );
      assert.ok(
        codec.createUuidSlugMigrationDecoder().uuidSlugToUuidString(noMatch) instanceof Error,
      );
      const handle = deriveUuidV7Mask({ seed });
      if (handle instanceof Error) throw handle;
      let fail = false;
      const cause = new Error("custom mask failed");
      const failingMask = unwrap(
        createCustomUuidV7Mask({
          diagnosticLabel: "failing-current",
          mask(input) {
            if (fail) throw cause;
            return mix(handle, input, "mask");
          },
          unmask(input) {
            if (fail) throw cause;
            return mix(handle, input, "unmask");
          },
        }),
      );
      const custom = unwrap(
        createUuidV7MaskingCodec({ mask: failingMask }),
      ).createUuidSlugMigrationDecoder({
        acceptFixedMask: true,
        acceptPlainSlug: true,
      });
      fail = true;
      for (const result of [
        custom.uuidSlugToUuidString(slug),
        custom.uuidSlugToUuidStringCandidates(slug),
      ]) {
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.cause, cause);
      }
      assert.equal(custom.uuidSlugToUuidString(slug, "plain-slug"), plainUuid);
    },
  },
  {
    name: "migration returns errors for malformed reader configuration",
    run(this: void) {
      const codec = unwrap(createUuidV7MaskingCodec({ mask: UUID_V7_TEST_MASK }));
      for (const options of [
        null,
        1,
        "migration",
        [],
        { acceptFixedMask: 1 },
        { acceptPlainSlug: "true" },
        { originalMask: true },
        { directSlug: true },
        { acceptPlainSlugs: true },
      ]) {
        const result = Reflect.apply(codec.createUuidSlugMigrationDecoder, undefined, [options]);
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.code, "invalid_options");
      }
      const cause = new Error("migration option getter failed");
      const options = Object.defineProperty({}, "acceptPlainSlug", {
        get() {
          throw cause;
        },
      });
      const result = Reflect.apply(codec.createUuidSlugMigrationDecoder, undefined, [options]);
      assert.ok(result instanceof UuidSlugError);
      assert.equal(result.code, "invalid_options");
      assert.equal(result.cause, cause);
    },
  },
  {
    name: "preserve caller order, input, and complete rotation candidates",
    run(this: void) {
      const { seeds, slug, uuids } = fixtures.keyOverlap;
      const masks = seeds.map((seed) => {
        const mask = deriveUuidV7Mask({ seed });
        if (mask instanceof Error) throw mask;
        return mask;
      });
      const mixed = new Uint8Array(16);
      const tail = decodeInto(slug, BASE64URL, mixed, 0, 16, 4);
      if (tail instanceof Error) throw tail;
      const original = mixed.slice();
      const empty: UuidString[] = [];
      assert.equal(decodeMaskedCandidates(mixed, tail, [], empty), empty);
      assert.deepEqual(mixed, original);
      const mutating = masks.map((handle) =>
        unwrap(
          createCustomUuidV7Mask({
            diagnosticLabel: handle.diagnosticLabel,
            mask(input) {
              return mix(handle, input, "mask");
            },
            unmask(input) {
              return mix(handle, input, "unmask");
            },
          }),
        ),
      );
      const candidates = decodeMaskedCandidates(
        mixed,
        tail,
        mutating.map((mask) => ({ mask, timestampRangeStartUnixMs: 0 })),
      );
      if (candidates instanceof Error) throw candidates;
      assert.deepEqual(candidates, uuids);
      assert.deepEqual(mixed, original);
      const unrelated = { seed: "unrelated-rotation-order-seed" };
      assert.ok(
        unwrap(createUuidV7MaskingCodec({ mask: unrelated })).uuidToString(slug) instanceof Error,
      );
      const ordered = unwrap(createUuidV7MaskingCodec({ mask: unrelated, previousMasks: masks }));
      assert.equal(ordered.uuidToString(slug), uuids[0]);
      const cause = new Error("key service unavailable");
      let fail = false;
      const unavailable = unwrap(
        createCustomUuidV7Mask({
          diagnosticLabel: "unavailable",
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
      fail = true;
      const failed = decodeMaskedCandidates(
        mixed,
        tail,
        [...masks, unavailable].map((mask) => ({ mask, timestampRangeStartUnixMs: 0 })),
      );
      assert.ok(failed instanceof Error);
      assert.equal(failed.cause, cause);
    },
  },
  {
    name: "one slug can carry three distinct UUID interpretations",
    run(this: void) {
      const { slug, seed, currentUuid, originalUuid, plainUuid } = fixtures.overlap;
      const codec = unwrap(createUuidV7MaskingCodec({ mask: { seed } }));
      assert.equal(codec.uuidToMaskedSlug(currentUuid), slug);
      assert.equal(codec.maskedSlugToUuidString(slug), currentUuid);
      assert.deepEqual(
        codec
          .createUuidSlugMigrationDecoder({ acceptFixedMask: true, acceptPlainSlug: true })
          .uuidSlugToUuidStringCandidates(slug),
        [currentUuid, originalUuid, plainUuid],
      );
      assert.equal(new Set([currentUuid, originalUuid, plainUuid]).size, 3);
    },
  },
  {
    name: "preserve original raw UUIDs and their stored tail aliases without relaxing current decoding",
    run(this: void) {
      const reader = unwrap(
        createUuidV7MaskingCodec({ mask: UUID_V7_TEST_MASK }),
      ).createUuidSlugMigrationDecoder({
        acceptPlainSlug: true,
      });
      for (const vector of [
        ...fixtures.plain,
        ...fixtures.issued.map(({ uuid, raw }) => ({ uuid, slug: raw })),
      ]) {
        for (const alias of uuidTailAliases(vector.slug)) {
          assert.equal(reader.uuidSlugToUuidString(alias, "plain-slug"), vector.uuid);
          if (alias !== vector.slug) assert.ok(plainSlugToUuidBytes(alias) instanceof Error);
        }
      }
      for (const invalid of [
        "",
        "!".repeat(22),
        "A".repeat(21),
        "A".repeat(23),
        "A".repeat(21) + "é",
      ])
        assert.ok(reader.uuidSlugToUuidString(invalid, "plain-slug") instanceof Error);
    },
  },
  {
    name: "recover exact UUIDs from original masked producer outputs",
    run(this: void) {
      const reader = unwrap(
        createUuidV7MaskingCodec({ mask: UUID_V7_TEST_MASK }),
      ).createUuidSlugMigrationDecoder({ acceptFixedMask: true });
      let checked = 0;
      for (const vector of fixtures.issued) {
        if (vector.slug === vector.raw) continue;
        assert.equal(reader.uuidSlugToUuidString(vector.slug, "fixed-mask"), vector.uuid);
        checked++;
      }
      assert.ok(checked > 0);
    },
  },
  {
    name: "reject a damaged original checksum",
    run(this: void) {
      const reader = unwrap(
        createUuidV7MaskingCodec({ mask: UUID_V7_TEST_MASK }),
      ).createUuidSlugMigrationDecoder({ acceptFixedMask: true });
      const mixed = new Uint8Array(Buffer.from("TRf_4hG5uOKhvh0EPc3rew", "base64url"));
      assert.ok(
        !(
          reader.uuidSlugToUuidString(
            Buffer.from(mixed).toString("base64url"),
            "fixed-mask",
          ) instanceof Error
        ),
      );
      mixed[0] = (mixed[0] as number) ^ 1;
      assert.ok(
        reader.uuidSlugToUuidString(
          Buffer.from(mixed).toString("base64url"),
          "fixed-mask",
        ) instanceof Error,
      );
    },
  },
];
