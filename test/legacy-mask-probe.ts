// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { BASE64URL, decodeInto } from "../src/alphabet";
import { createUuidSlugCodec } from "../src/codec";
import { decodeOriginalMask, parseOriginalSlug } from "../src/legacy-mask";
import { decodeMaskedCandidates } from "../src/mask";
import { createMaskSchema } from "../src/schema";
import { formatUuid, parseUuidSlug, uuidToSlug } from "../src/uuid";
import fixtures from "./fixtures-original-slugs.json";

export const legacyMaskCases = [
  {
    name: "migration preserves original producer identities and sentinel aliases",
    run(this: void) {
      const codec = createUuidSlugCodec();
      const reader = codec.migration({ original: true, plain: true });
      for (const { uuid, slug, raw } of fixtures.issued) {
        const format = slug === raw ? "plain" : "original";
        assert.equal(reader.decode(slug, format), uuid);
        const last = BASE64URL.decode[slug.charCodeAt(21)] as number;
        for (let tail = 0; tail < 16; tail++) {
          const alias = slug.slice(0, 21) + BASE64URL.chars[(last & ~15) | tail];
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
      const codec = createUuidSlugCodec({ mask: { seed }, previousMasks: [{ seed }] });
      const reader = codec.migration({ original: true, plain: true });
      assert.equal(reader.decode(slug), currentUuid);
      assert.deepEqual(reader.candidates(slug), [currentUuid, originalUuid, plainUuid]);
      assert.equal(reader.decode(slug, "original"), originalUuid);
      assert.equal(reader.decode(slug, "plain"), plainUuid);
      assert.deepEqual(reader.candidates(slug, "current"), [currentUuid]);
      const custom = createUuidSlugCodec({
        mask: { seed },
        sentinels: [{ name: "reserved", uuid: currentUuid }],
      });
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
      const codec = createUuidSlugCodec({ mask: { seed } });
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
      assert.deepEqual(codec.migration().candidates(slug), [currentUuid]);
      assert.ok(codec.migration().decode(slug, "original") instanceof Error);
      assert.ok(codec.migration().decode(slug, "plain") instanceof Error);
      assert.equal(codec.uuidV7ToMaskedSlug(currentUuid), slug);
      assert.equal(codec.maskedSlugToUuid(slug), currentUuid);
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
      const custom = createUuidSlugCodec({
        mask: {
          ...schema,
          mix(input, output, forward) {
            if (fail) throw cause;
            schema.mix(input, output, forward);
          },
        },
      }).migration({ original: true, plain: true });
      fail = true;
      for (const result of [custom.decode(slug), custom.candidates(slug)]) {
        assert.ok(result instanceof Error);
        assert.equal(result.cause, cause);
      }
      assert.equal(custom.decode(slug, "plain"), plainUuid);
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
      const mutating = schemas.map((schema) => ({
        ...schema,
        mix(input: Uint8Array, output: Uint8Array, forward: boolean) {
          schema.mix(input, output, forward);
          input.fill(0);
        },
      }));
      const candidates = decodeMaskedCandidates(mixed, tail, mutating);
      if (candidates instanceof Error) throw candidates;
      assert.deepEqual(
        candidates.map((bytes) => formatUuid(bytes)),
        uuids,
      );
      assert.deepEqual(mixed, original);
      const cause = new Error("key service unavailable");
      const failed = decodeMaskedCandidates(mixed, tail, [
        ...schemas,
        {
          id: "unavailable",
          mix() {
            throw cause;
          },
        },
      ]);
      assert.ok(failed instanceof Error);
      assert.equal(failed.cause, cause);
    },
  },
  {
    name: "one slug can carry three distinct UUID interpretations",
    run(this: void) {
      const { slug, seed, currentUuid, originalUuid, plainUuid } = fixtures.overlap;
      const codec = createUuidSlugCodec({ mask: { seed } });
      assert.equal(codec.uuidV7ToMaskedSlug(currentUuid), slug);
      assert.equal(codec.maskedSlugToUuid(slug), currentUuid);
      const raw = parseOriginalSlug(slug);
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
      for (const vector of [
        ...fixtures.plain,
        ...fixtures.issued.map(({ uuid, raw }) => ({ uuid, slug: raw })),
      ]) {
        const last = BASE64URL.decode[vector.slug.charCodeAt(21)] as number;
        for (let tail = 0; tail < 16; tail++) {
          const alias = vector.slug.slice(0, 21) + BASE64URL.chars[last | tail];
          const bytes = parseOriginalSlug(alias);
          if (bytes instanceof Error) throw bytes;
          assert.equal(formatUuid(bytes), vector.uuid);
          if (tail !== 0) assert.ok(parseUuidSlug(alias) instanceof Error);
        }
      }
      for (const invalid of [
        "",
        "!".repeat(22),
        "A".repeat(21),
        "A".repeat(23),
        "A".repeat(21) + "é",
      ])
        assert.ok(parseOriginalSlug(invalid) instanceof Error);
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
