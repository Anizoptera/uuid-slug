// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { BASE64URL, decodeInto } from "../src/alphabet";
import { createUuidV7SlugCodec } from "../src/codec";
import { decodeMaskedCandidates } from "../src/payload";
import { applyMask, createCustomUuidV7Mask } from "../src/mask-handle";
import { createUuidV7Mask, UUID_V7_TEST_MASK } from "../src/mask";
import { UuidSlugError } from "../src/errors";
import { slugToBytes, uuidToSlug } from "../src/slug";
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
        const handle = createUuidV7Mask({ seed });
        if (handle instanceof Error) throw handle;
        return unwrap(
          createCustomUuidV7Mask({
            label: handle.label,
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
      const codec = unwrap(createUuidV7SlugCodec({ mask: primary, previousMasks: masks.slice(1) }));
      enabled = true;
      assert.deepEqual(codec.createMigrationDecoder().decodeSlugCandidates(slug), uuids);
    },
  },
  {
    name: "sentinel aliases retain current masked candidates without changing sentinel priority",
    run(this: void) {
      const uuid = "0198abcd-1234-7abc-9def-000000000001";
      let tagged = new Uint8Array(16);
      const identityMask = unwrap(
        createCustomUuidV7Mask({
          label: "identity",
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
        createUuidV7SlugCodec({ mask: identityMask, sentinels: NIL_TEST_SENTINEL }),
      );
      identity.encodeUuid(uuid);
      const sentinel = identity.sentinels[0];
      assert.ok(sentinel);
      const raw = slugToBytes(sentinel.slug);
      if (raw instanceof Error) throw raw;
      const key = tagged.map((byte, index) => byte ^ (raw[index] as number));
      const aliasMask = unwrap(
        createCustomUuidV7Mask({
          label: "sentinel-alias",
          mask(input) {
            return input.map((byte, i) => byte ^ (key[i] as number));
          },
          unmask(input) {
            return input.map((byte, i) => byte ^ (key[i] as number));
          },
        }),
      );
      const codec = unwrap(
        createUuidV7SlugCodec({ mask: aliasMask, sentinels: NIL_TEST_SENTINEL }),
      );
      const slug = codec.encodeUuid(uuid);
      if (slug instanceof Error) throw slug;
      assert.notEqual(slug, sentinel.slug);
      assert.equal(codec.decodeSlug(slug), uuid);
      const reader = codec.createMigrationDecoder({ originalMask: true, directSlug: true });
      assert.equal(reader.decodeSlug(slug), sentinel.uuid);
      assert.deepEqual(reader.decodeSlugCandidates(slug), [sentinel.uuid, uuid]);
      assert.deepEqual(reader.decodeSlugCandidates(slug, "current-mask"), [uuid]);
    },
  },
  {
    name: "migration preserves original producer identities and sentinel aliases",
    run(this: void) {
      const codec = unwrap(
        createUuidV7SlugCodec({ mask: UUID_V7_TEST_MASK, sentinels: NIL_TEST_SENTINEL }),
      );
      const reader = codec.createMigrationDecoder({ originalMask: true, directSlug: true });
      for (const { uuid, slug, raw } of fixtures.issued) {
        const format = slug === raw ? "direct-slug" : "original-mask";
        assert.equal(reader.decodeSlug(slug, format), uuid);
        for (const alias of uuidTailAliases(slug)) {
          assert.equal(reader.decodeSlug(alias, format), uuid);
        }
      }
      for (const { uuid, slug } of fixtures.direct)
        assert.equal(reader.decodeSlug(slug, "direct-slug"), uuid);
      const directUuid = fixtures.direct[0]?.uuid;
      assert.ok(directUuid);
      const base32 = uuidToSlug(directUuid, "base32hex");
      if (base32 instanceof Error) throw base32;
      assert.equal(reader.decodeSlug(base32), directUuid);
      assert.equal(reader.decodeSlug(base32, "direct-slug"), directUuid);
      assert.ok(reader.decodeSlug(base32, "original-mask") instanceof Error);
      for (const sentinel of codec.sentinels) {
        assert.deepEqual(reader.decodeSlugCandidates(sentinel.slug), [sentinel.uuid]);
        assert.equal(reader.decodeSlug(sentinel.slug, "original-mask"), sentinel.uuid);
      }
    },
  },
  {
    name: "migration returns one default candidate and all distinct lookup candidates",
    run(this: void) {
      const { seed, slug, currentUuid, originalUuid, directUuid } = fixtures.overlap;
      const codec = unwrap(createUuidV7SlugCodec({ mask: { seed }, previousMasks: [{ seed }] }));
      const reader = codec.createMigrationDecoder({ originalMask: true, directSlug: true });
      assert.equal(reader.decodeSlug(slug), currentUuid);
      assert.deepEqual(reader.decodeSlugCandidates(slug), [currentUuid, originalUuid, directUuid]);
      assert.equal(reader.decodeSlug(slug, "original-mask"), originalUuid);
      assert.equal(reader.decodeSlug(slug, "direct-slug"), directUuid);
      assert.deepEqual(reader.decodeSlugCandidates(slug, "current-mask"), [currentUuid]);
      const custom = unwrap(
        createUuidV7SlugCodec({
          mask: { seed },
          sentinels: [{ name: "reserved", uuid: currentUuid }],
        }),
      );
      const sentinel = custom.sentinels[0];
      assert.ok(sentinel);
      assert.deepEqual(
        custom
          .createMigrationDecoder({ originalMask: true, directSlug: true })
          .decodeSlugCandidates(sentinel.slug),
        [currentUuid],
      );
    },
  },
  {
    name: "migration configuration is captured and old formats can be retired independently",
    run(this: void) {
      const { seed, slug, currentUuid, originalUuid, directUuid } = fixtures.overlap;
      const codec = unwrap(createUuidV7SlugCodec({ mask: { seed } }));
      const options = { originalMask: true, directSlug: true };
      const reader = codec.createMigrationDecoder(options);
      options.originalMask = false;
      options.directSlug = false;
      assert.deepEqual(reader.decodeSlugCandidates(slug), [currentUuid, originalUuid, directUuid]);
      assert.deepEqual(
        codec.createMigrationDecoder({ originalMask: true }).decodeSlugCandidates(slug),
        [currentUuid, originalUuid],
      );
      assert.deepEqual(
        codec.createMigrationDecoder({ directSlug: true }).decodeSlugCandidates(slug),
        [currentUuid, directUuid],
      );
      const currentReader = codec.createMigrationDecoder();
      assert.deepEqual(currentReader.decodeSlugCandidates(slug), [currentUuid]);
      assert.ok(
        Reflect.apply(currentReader.decodeSlug, undefined, [slug, "original-mask"]) instanceof
          Error,
      );
      assert.ok(
        Reflect.apply(currentReader.decodeSlug, undefined, [slug, "direct-slug"]) instanceof Error,
      );
      assert.equal(codec.encodeUuid(currentUuid), slug);
      assert.equal(codec.decodeSlug(slug), currentUuid);
      for (const invalid of ["", "!".repeat(22), "A".repeat(21), "A".repeat(23)]) {
        assert.ok(reader.decodeSlug(invalid) instanceof Error);
        assert.ok(reader.decodeSlugCandidates(invalid) instanceof Error);
      }
      const noMatch = "A".repeat(22);
      assert.deepEqual(codec.createMigrationDecoder().decodeSlugCandidates(noMatch), []);
      assert.ok(codec.createMigrationDecoder().decodeSlug(noMatch) instanceof Error);
      const handle = createUuidV7Mask({ seed });
      if (handle instanceof Error) throw handle;
      let fail = false;
      const cause = new Error("custom mask failed");
      const failingMask = unwrap(
        createCustomUuidV7Mask({
          label: "failing-current",
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
      const custom = unwrap(createUuidV7SlugCodec({ mask: failingMask })).createMigrationDecoder({
        originalMask: true,
        directSlug: true,
      });
      fail = true;
      for (const result of [custom.decodeSlug(slug), custom.decodeSlugCandidates(slug)]) {
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.cause, cause);
      }
      assert.equal(custom.decodeSlug(slug, "direct-slug"), directUuid);
    },
  },
  {
    name: "migration returns errors for malformed reader configuration",
    run(this: void) {
      const codec = unwrap(createUuidV7SlugCodec({ mask: UUID_V7_TEST_MASK }));
      for (const options of [
        null,
        1,
        "migration",
        [],
        { originalMask: 1 },
        { directSlug: "true" },
      ]) {
        const result = Reflect.apply(codec.createMigrationDecoder, undefined, [options]);
        assert.ok(result instanceof UuidSlugError);
        assert.equal(result.code, "invalid_options");
      }
      const cause = new Error("migration option getter failed");
      const options = Object.defineProperty({}, "directSlug", {
        get() {
          throw cause;
        },
      });
      const result = Reflect.apply(codec.createMigrationDecoder, undefined, [options]);
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
        const mask = createUuidV7Mask({ seed });
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
            label: handle.label,
            mask(input) {
              return mix(handle, input, "mask");
            },
            unmask(input) {
              return mix(handle, input, "unmask");
            },
          }),
        ),
      );
      const candidates = decodeMaskedCandidates(mixed, tail, mutating);
      if (candidates instanceof Error) throw candidates;
      assert.deepEqual(candidates, uuids);
      assert.deepEqual(mixed, original);
      const unrelated = { seed: "unrelated-rotation-order-seed" };
      assert.ok(
        unwrap(createUuidV7SlugCodec({ mask: unrelated })).decodeSlug(slug) instanceof Error,
      );
      const ordered = unwrap(createUuidV7SlugCodec({ mask: unrelated, previousMasks: masks }));
      assert.equal(ordered.decodeSlug(slug), uuids[0]);
      const cause = new Error("key service unavailable");
      let fail = false;
      const unavailable = unwrap(
        createCustomUuidV7Mask({
          label: "unavailable",
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
      const failed = decodeMaskedCandidates(mixed, tail, [...masks, unavailable]);
      assert.ok(failed instanceof Error);
      assert.equal(failed.cause, cause);
    },
  },
  {
    name: "one slug can carry three distinct UUID interpretations",
    run(this: void) {
      const { slug, seed, currentUuid, originalUuid, directUuid } = fixtures.overlap;
      const codec = unwrap(createUuidV7SlugCodec({ mask: { seed } }));
      assert.equal(codec.encodeUuid(currentUuid), slug);
      assert.equal(codec.decodeSlug(slug), currentUuid);
      assert.deepEqual(
        codec
          .createMigrationDecoder({ originalMask: true, directSlug: true })
          .decodeSlugCandidates(slug),
        [currentUuid, originalUuid, directUuid],
      );
      assert.equal(new Set([currentUuid, originalUuid, directUuid]).size, 3);
    },
  },
  {
    name: "preserve original raw UUIDs and their stored tail aliases without relaxing current decoding",
    run(this: void) {
      const reader = unwrap(
        createUuidV7SlugCodec({ mask: UUID_V7_TEST_MASK }),
      ).createMigrationDecoder({
        directSlug: true,
      });
      for (const vector of [
        ...fixtures.direct,
        ...fixtures.issued.map(({ uuid, raw }) => ({ uuid, slug: raw })),
      ]) {
        for (const alias of uuidTailAliases(vector.slug)) {
          assert.equal(reader.decodeSlug(alias, "direct-slug"), vector.uuid);
          if (alias !== vector.slug) assert.ok(slugToBytes(alias) instanceof Error);
        }
      }
      for (const invalid of [
        "",
        "!".repeat(22),
        "A".repeat(21),
        "A".repeat(23),
        "A".repeat(21) + "é",
      ])
        assert.ok(reader.decodeSlug(invalid, "direct-slug") instanceof Error);
    },
  },
  {
    name: "recover exact UUIDs from original masked producer outputs",
    run(this: void) {
      const reader = unwrap(
        createUuidV7SlugCodec({ mask: UUID_V7_TEST_MASK }),
      ).createMigrationDecoder({ originalMask: true });
      let checked = 0;
      for (const vector of fixtures.issued) {
        if (vector.slug === vector.raw) continue;
        assert.equal(reader.decodeSlug(vector.slug, "original-mask"), vector.uuid);
        checked++;
      }
      assert.ok(checked > 0);
    },
  },
  {
    name: "reject a damaged original checksum",
    run(this: void) {
      const reader = unwrap(
        createUuidV7SlugCodec({ mask: UUID_V7_TEST_MASK }),
      ).createMigrationDecoder({ originalMask: true });
      const mixed = new Uint8Array(Buffer.from("TRf_4hG5uOKhvh0EPc3rew", "base64url"));
      assert.ok(
        !(
          reader.decodeSlug(Buffer.from(mixed).toString("base64url"), "original-mask") instanceof
          Error
        ),
      );
      mixed[0] = (mixed[0] as number) ^ 1;
      assert.ok(
        reader.decodeSlug(Buffer.from(mixed).toString("base64url"), "original-mask") instanceof
          Error,
      );
    },
  },
];
