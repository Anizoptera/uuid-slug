// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { BASE64URL, decodeInto } from "../src/alphabet";
import { createUuidSlugCodec } from "../src/codec";
import { decodeOriginalMask } from "../src/legacy-mask";
import { decodeMaskedCandidates } from "../src/mask";
import { applyMaskSchema, createCustomMaskSchema } from "../src/schema-handle";
import { createMaskSchema, PUBLIC_MASK_SCHEMA } from "../src/schema";
import { formatUuid, parseUuidSlug, uuidToSlug } from "../src/uuid";
import fixtures from "../rust/uuid-slug/tests/fixtures/fixtures-original-slugs.json";
import { unwrap } from "../dev/unwrap";
import { uuidTailAliases } from "./uuid-tail-aliases";
import type { MaskSchema, UuidSlugMigration } from "../src/types";

function mix(schema: MaskSchema, input: Uint8Array, forward: boolean) {
  const output = new Uint8Array(16);
  return applyMaskSchema(schema, input, output, forward) ?? output;
}

export const legacyMaskCases = [
  {
    name: "migration captures a matching UUID before another callback mutates its bytes",
    run(this: void) {
      const { seeds, slug, uuids } = fixtures.keyOverlap;
      let enabled = false;
      let retained: Uint8Array | undefined;
      const masks = seeds.map((seed) => {
        const schema = createMaskSchema({ seed });
        if (schema instanceof Error) throw schema;
        return unwrap(
          createCustomMaskSchema({
            id: schema.id,
            forward(input) {
              if (enabled) retained?.fill(0);
              const output = mix(schema, input, true);
              if (output instanceof Error) return output;
              if (enabled) retained = output;
              return output;
            },
            reverse(input) {
              if (enabled) retained?.fill(0);
              const output = mix(schema, input, false);
              if (output instanceof Error) return output;
              if (enabled) retained = output;
              return output;
            },
          }),
        );
      });
      const primary = masks[0];
      assert.ok(primary);
      const codec = unwrap(createUuidSlugCodec({ mask: primary, previousMasks: masks.slice(1) }));
      enabled = true;
      assert.deepEqual(codec.migration().candidates(slug), uuids);
    },
  },
  {
    name: "sentinel aliases retain current masked candidates without changing sentinel priority",
    run(this: void) {
      const uuid = "0198abcd-1234-7abc-9def-000000000001";
      let tagged = new Uint8Array(16);
      const identityMask = unwrap(
        createCustomMaskSchema({
          id: "identity",
          forward(input) {
            tagged = input.slice();
            return input;
          },
          reverse(input) {
            return input;
          },
        }),
      );
      const identity = unwrap(createUuidSlugCodec({ mask: identityMask }));
      identity.uuidV7ToMaskedSlug(uuid);
      const sentinel = identity.sentinels[0];
      assert.ok(sentinel);
      const raw = parseUuidSlug(sentinel.slug);
      if (raw instanceof Error) throw raw;
      const key = tagged.map((byte, index) => byte ^ (raw[index] as number));
      const aliasMask = unwrap(
        createCustomMaskSchema({
          id: "sentinel-alias",
          forward(input) {
            return input.map((byte, i) => byte ^ (key[i] as number));
          },
          reverse(input) {
            return input.map((byte, i) => byte ^ (key[i] as number));
          },
        }),
      );
      const codec = unwrap(createUuidSlugCodec({ mask: aliasMask }));
      const slug = codec.uuidV7ToMaskedSlug(uuid);
      if (slug instanceof Error) throw slug;
      assert.notEqual(slug, sentinel.slug);
      assert.equal(codec.maskedSlugToUuidV7(slug), uuid);
      const reader = codec.migration({ original: true, plain: true });
      assert.equal(reader.decode(slug), sentinel.uuid);
      assert.deepEqual(reader.candidates(slug), [sentinel.uuid, uuid]);
      assert.deepEqual(reader.candidates(slug, "current"), [uuid]);
    },
  },
  {
    name: "migration preserves original producer identities and sentinel aliases",
    run(this: void) {
      const codec = unwrap(createUuidSlugCodec({ mask: PUBLIC_MASK_SCHEMA }));
      const reader = codec.migration({ original: true, plain: true });
      for (const { uuid, slug, raw } of fixtures.issued) {
        const format = slug === raw ? "plain" : "original";
        assert.equal(reader.decode(slug, format), uuid);
        for (const alias of uuidTailAliases(slug)) {
          assert.equal(reader.decode(alias, format), uuid);
        }
      }
      for (const { uuid, slug } of fixtures.plain) assert.equal(reader.decode(slug, "plain"), uuid);
      const plainUuid = fixtures.plain[0]?.uuid;
      assert.ok(plainUuid);
      const base32 = uuidToSlug(plainUuid, "base32hex");
      if (base32 instanceof Error) throw base32;
      assert.equal(reader.decode(base32), plainUuid);
      assert.equal(reader.decode(base32, "plain"), plainUuid);
      assert.ok(reader.decode(base32, "original") instanceof Error);
      for (const sentinel of codec.sentinels) {
        assert.deepEqual(reader.candidates(sentinel.slug), [sentinel.uuid]);
        assert.equal(reader.decode(sentinel.slug, "original"), sentinel.uuid);
      }
    },
  },
  {
    name: "migration returns one default candidate and all distinct lookup candidates",
    run(this: void) {
      const { seed, slug, currentUuid, originalUuid, plainUuid } = fixtures.overlap;
      const codec = unwrap(createUuidSlugCodec({ mask: { seed }, previousMasks: [{ seed }] }));
      const reader = codec.migration({ original: true, plain: true });
      assert.equal(reader.decode(slug), currentUuid);
      assert.deepEqual(reader.candidates(slug), [currentUuid, originalUuid, plainUuid]);
      assert.equal(reader.decode(slug, "original"), originalUuid);
      assert.equal(reader.decode(slug, "plain"), plainUuid);
      assert.deepEqual(reader.candidates(slug, "current"), [currentUuid]);
      const custom = unwrap(
        createUuidSlugCodec({
          mask: { seed },
          sentinels: [{ name: "reserved", uuid: currentUuid }],
        }),
      );
      const sentinel = custom.sentinels[0];
      assert.ok(sentinel);
      assert.deepEqual(
        custom.migration({ original: true, plain: true }).candidates(sentinel.slug),
        [currentUuid],
      );
    },
  },
  {
    name: "migration configuration is captured and old formats can be retired independently",
    run(this: void) {
      const { seed, slug, currentUuid, originalUuid, plainUuid } = fixtures.overlap;
      const codec = unwrap(createUuidSlugCodec({ mask: { seed } }));
      const options = { original: true, plain: true };
      const reader = codec.migration(options);
      options.original = false;
      options.plain = false;
      assert.deepEqual(reader.candidates(slug), [currentUuid, originalUuid, plainUuid]);
      assert.deepEqual(codec.migration({ original: true }).candidates(slug), [
        currentUuid,
        originalUuid,
      ]);
      assert.deepEqual(codec.migration({ plain: true }).candidates(slug), [currentUuid, plainUuid]);
      const currentReader: UuidSlugMigration = codec.migration();
      assert.deepEqual(currentReader.candidates(slug), [currentUuid]);
      assert.ok(currentReader.decode(slug, "original") instanceof Error);
      assert.ok(currentReader.decode(slug, "plain") instanceof Error);
      assert.equal(codec.uuidV7ToMaskedSlug(currentUuid), slug);
      assert.equal(codec.maskedSlugToUuidV7(slug), currentUuid);
      for (const invalid of ["", "!".repeat(22), "A".repeat(21), "A".repeat(23)]) {
        assert.ok(reader.decode(invalid) instanceof Error);
        assert.ok(reader.candidates(invalid) instanceof Error);
      }
      const noMatch = "A".repeat(22);
      assert.deepEqual(codec.migration().candidates(noMatch), []);
      assert.ok(codec.migration().decode(noMatch) instanceof Error);
      const schema = createMaskSchema({ seed });
      if (schema instanceof Error) throw schema;
      let fail = false;
      const cause = new Error("custom mask failed");
      const failingSchema = unwrap(
        createCustomMaskSchema({
          id: "failing-current",
          forward(input) {
            if (fail) throw cause;
            return mix(schema, input, true);
          },
          reverse(input) {
            if (fail) throw cause;
            return mix(schema, input, false);
          },
        }),
      );
      const custom = unwrap(createUuidSlugCodec({ mask: failingSchema })).migration({
        original: true,
        plain: true,
      });
      fail = true;
      for (const result of [custom.decode(slug), custom.candidates(slug)]) {
        assert.ok(result instanceof Error);
        assert.equal(result.cause, cause);
      }
      assert.equal(custom.decode(slug, "plain"), plainUuid);
    },
  },
  {
    name: "migration rejects malformed reader configuration",
    run(this: void) {
      const codec = unwrap(createUuidSlugCodec({ mask: PUBLIC_MASK_SCHEMA }));
      for (const options of [null, 1, "migration", [], { original: 1 }, { plain: "true" }]) {
        assert.throws(() => Reflect.apply(codec.migration, undefined, [options]), TypeError);
      }
      const cause = new Error("migration option getter failed");
      const options = Object.defineProperty({}, "plain", {
        get() {
          throw cause;
        },
      });
      assert.throws(
        () => Reflect.apply(codec.migration, undefined, [options]),
        (error: unknown) => error === cause,
      );
    },
  },
  {
    name: "enumerate matching rotation keys without input mutation or partial results",
    run(this: void) {
      const { seeds, slug, uuids } = fixtures.keyOverlap;
      const schemas = seeds.map((seed) => {
        const schema = createMaskSchema({ seed });
        if (schema instanceof Error) throw schema;
        return schema;
      });
      const mixed = new Uint8Array(16);
      const tail = decodeInto(slug, BASE64URL, mixed, 0, 16, 4);
      if (tail instanceof Error) throw tail;
      const original = mixed.slice();
      const mutating = schemas.map((schema) =>
        unwrap(
          createCustomMaskSchema({
            id: schema.id,
            forward(input) {
              return mix(schema, input, true);
            },
            reverse(input) {
              return mix(schema, input, false);
            },
          }),
        ),
      );
      const candidates = decodeMaskedCandidates(mixed, tail, mutating);
      if (candidates instanceof Error) throw candidates;
      assert.deepEqual(candidates, uuids);
      assert.deepEqual(mixed, original);
      const cause = new Error("key service unavailable");
      let fail = false;
      const unavailable = unwrap(
        createCustomMaskSchema({
          id: "unavailable",
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
      fail = true;
      const failed = decodeMaskedCandidates(mixed, tail, [...schemas, unavailable]);
      assert.ok(failed instanceof Error);
      assert.equal(failed.cause, cause);
    },
  },
  {
    name: "one slug can carry three distinct UUID interpretations",
    run(this: void) {
      const { slug, seed, currentUuid, originalUuid, plainUuid } = fixtures.overlap;
      const codec = unwrap(createUuidSlugCodec({ mask: { seed } }));
      assert.equal(codec.uuidV7ToMaskedSlug(currentUuid), slug);
      assert.equal(codec.maskedSlugToUuidV7(slug), currentUuid);
      const raw = parseUuidSlug(slug);
      if (raw instanceof Error) throw raw;
      assert.equal(formatUuid(raw), plainUuid);
      const original = decodeOriginalMask(raw);
      if (original instanceof Error) throw original;
      assert.ok(original);
      assert.equal(formatUuid(original), originalUuid);
      assert.equal(new Set([currentUuid, originalUuid, plainUuid]).size, 3);
    },
  },
  {
    name: "preserve original raw UUIDs and their stored tail aliases without relaxing current decoding",
    run(this: void) {
      const reader = unwrap(createUuidSlugCodec({ mask: PUBLIC_MASK_SCHEMA })).migration({
        plain: true,
      });
      for (const vector of [
        ...fixtures.plain,
        ...fixtures.issued.map(({ uuid, raw }) => ({ uuid, slug: raw })),
      ]) {
        for (const alias of uuidTailAliases(vector.slug)) {
          assert.equal(reader.decode(alias, "plain"), vector.uuid);
          if (alias !== vector.slug) assert.ok(parseUuidSlug(alias) instanceof Error);
        }
      }
      for (const invalid of [
        "",
        "!".repeat(22),
        "A".repeat(21),
        "A".repeat(23),
        "A".repeat(21) + "é",
      ])
        assert.ok(reader.decode(invalid, "plain") instanceof Error);
    },
  },
  {
    name: "recover exact UUIDs from original masked producer outputs",
    run(this: void) {
      let checked = 0;
      for (const vector of fixtures.issued) {
        if (vector.slug === vector.raw) continue;
        const mixed = new Uint8Array(16);
        assert.equal(decodeInto(vector.slug, BASE64URL, mixed, 0, 16), 0);
        const decoded = decodeOriginalMask(mixed);
        if (decoded instanceof Error) throw decoded;
        assert.ok(decoded);
        assert.equal(formatUuid(decoded), vector.uuid);
        assert.equal(Buffer.from(mixed).toString("base64url"), vector.slug);
        checked++;
      }
      assert.ok(checked > 0);
    },
  },
  {
    name: "reject damaged original checksum and incomplete bytes",
    run(this: void) {
      const mixed = new Uint8Array(Buffer.from("TRf_4hG5uOKhvh0EPc3rew", "base64url"));
      assert.ok(decodeOriginalMask(mixed) instanceof Uint8Array);
      mixed[0] = (mixed[0] as number) ^ 1;
      assert.equal(decodeOriginalMask(mixed), undefined);
      assert.ok(decodeOriginalMask(mixed.subarray(1)) instanceof Error);
    },
  },
];
