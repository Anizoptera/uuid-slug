// SPDX-License-Identifier: Apache-2.0

import { strict as assert } from "node:assert";
import {
  createMaskSchema,
  createUuidSlugCodec,
  createUuidV7Generator,
  UuidSlugError,
} from "../src/index";
import type { MaskSchema, UuidSlugCodecOptions } from "../src/types";

export const codecBoundaryCases = [
  {
    name: "rotation isolates mutating callbacks and preserves the primary failure cause",
    run() {
      const current = createMaskSchema({ seed: "profile-current-seed" });
      assert.ok(!(current instanceof Error));
      const previous = { seed: "profile-previous-seed" };
      const older = createUuidSlugCodec({ mask: previous });
      const uuid = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051";
      const slug = older.uuidV7ToMaskedSlug(uuid);
      assert.equal(typeof slug, "string");
      assert.ok(
        createUuidSlugCodec({ mask: current }).maskedSlugToUuid(slug as string) instanceof Error,
      );
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
      assert.equal(codec.maskedSlugToUuidV7(slug as string), uuid);
      fail = true;
      assert.equal(codec.maskedSlugToUuidV7(slug as string), uuid);
      const refused = codec.maskedSlugToUuidV7("______________________");
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
      const codec = createUuidSlugCodec({ mask });
      const result = codec.uuidV7ToMaskedSlug("019ff19b-58b8-7000-9b1b-df713bd55607");
      assert.ok(result instanceof UuidSlugError);
      assert.equal(result.code, "invalid_mask_schema");
      assert.equal(
        codec.maskedSlugToUuidV7("AAAAAAAAcACAAAAAAAAAAA"),
        "00000000-0000-7000-8000-000000000000",
      );
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
      assert.throws(
        () =>
          createUuidSlugCodec({
            mask: {
              id: "destructive",
              mix(input, output) {
                input.fill(0);
                output.fill(0);
              },
            },
          }),
        { code: "invalid_mask_schema" },
      );
    },
  },
  {
    name: "preserves a throwing schema's cause",
    run() {
      const cause = new Error("mix failed");
      assert.throws(
        () =>
          createUuidSlugCodec({
            mask: {
              id: "throwing",
              mix() {
                throw cause;
              },
            },
          }),
        (error: Error) =>
          error instanceof UuidSlugError &&
          error.code === "invalid_mask_schema" &&
          error.cause === cause,
      );
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
      assert.throws(() => createUuidSlugCodec({ slugAlphabet } as UuidSlugCodecOptions), {
        code: "invalid_uuid_slug",
      });
    },
  })),
] as const;
