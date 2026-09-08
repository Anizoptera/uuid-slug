// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { BASE64URL, decodeInto } from "../src/alphabet";
import { decodeOriginalMask, parseOriginalSlug } from "../src/legacy-mask";
import { formatUuid, parseUuidSlug } from "../src/uuid";
import fixtures from "./fixtures-original-slugs.json";

export const legacyMaskCases = [
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
      assert.ok(!(decodeOriginalMask(mixed) instanceof Error));
      mixed[0] = (mixed[0] as number) ^ 1;
      assert.ok(decodeOriginalMask(mixed) instanceof Error);
      assert.ok(decodeOriginalMask(mixed.subarray(1)) instanceof Error);
    },
  },
];
