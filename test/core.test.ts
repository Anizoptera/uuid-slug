import { describe, expect, it } from "vitest";
import {
  LEGACY_MASK_SCHEMA_V1,
  createMaskSchema,
  createUuidSlugCodec,
  defineMaskSchema,
  decodeBase64Url,
  encodeBase64Url,
  isUuidV7String,
  parseUuid,
  slugToUuid,
  uuidToSlug,
} from "../src/index";

const SAMPLE_V7_A = "01987008-ef3e-7f69-b677-22ec1a5bbdb2";
const SAMPLE_V7_B = "01987bbb-178b-7858-93e8-fc5e5444913b";
const SAMPLE_V4 = "b1ba599d-4844-4bb0-a1ee-ac0aeb8875f5";

describe("base64url", () => {
  it("round-trips arbitrary bytes and rejects non-canonical forms", () => {
    const bytes = Uint8Array.from([0, 255, 128, 64, 1, 2, 3, 4]);
    const encoded = encodeBase64Url(bytes);
    expect(decodeBase64Url(encoded)).toEqual(bytes);
    expect(decodeBase64Url(`${encoded}=`)).toBeInstanceOf(Error);
    expect(decodeBase64Url("A")).toBeInstanceOf(Error);
  });
});

describe("direct UUID slugs", () => {
  it("matches stable direct vectors", () => {
    expect(uuidToSlug(SAMPLE_V7_A)).toBe("AZhwCO8-f2m2dyLsGlu9sg");
    expect(uuidToSlug(SAMPLE_V7_B)).toBe("AZh7uxeLeFiT6PxeVESROw");
    expect(uuidToSlug(SAMPLE_V4)).toBe("sbpZnUhES7Ch7qwK64h19Q");
    expect(slugToUuid("sbpZnUhES7Ch7qwK64h19Q")).toBe(SAMPLE_V4);
  });

  it("rejects uppercase UUIDs instead of silently canonicalizing external input", () => {
    expect(parseUuid(SAMPLE_V7_A.toUpperCase())).toBeInstanceOf(Error);
  });
});

describe("masked UUID slugs", () => {
  it("preserves legacy mask vectors without exposing private source names", () => {
    const codec = createUuidSlugCodec({ mask: LEGACY_MASK_SCHEMA_V1 });
    expect(codec.uuidV7ToMaskedSlug(SAMPLE_V7_A)).toBe(
      "1Ss6ySW5dzcEvgT55sfIJA",
    );
    expect(codec.uuidV7ToMaskedSlug(SAMPLE_V7_B)).toBe(
      "SjSJ7Am5xQbzvo0B7XIWag",
    );
    expect(codec.maskedSlugToUuidV7("1Ss6ySW5dzcEvgT55sfIJA")).toBe(
      SAMPLE_V7_A,
    );
  });

  it("uses direct precomputed sentinel slugs for sentinel transmission", () => {
    const codec = createUuidSlugCodec({ mask: LEGACY_MASK_SCHEMA_V1 });
    const [, anonymousUser, unknownUser] = codec.sentinels;
    if (!anonymousUser || !unknownUser)
      throw new Error("sentinel setup failed");
    expect(codec.sentinels.map((item) => item.slug)).toEqual([
      "AAAAAAAAcACAAAAAAAAAAA",
      "AAAAAAABcACAAAAAAAAAAA",
      "AAAAAAACcACAAAAAAAAAAA",
    ]);
    expect(codec.uuidV7ToMaskedSlug(anonymousUser.uuid)).toBe(
      "AAAAAAABcACAAAAAAAAAAA",
    );
    expect(codec.maskedSlugToUuidV7("AAAAAAACcACAAAAAAAAAAA")).toBe(
      unknownUser.uuid,
    );
  });

  it("rejects wrong schemas unless a legacy schema is explicitly configured", () => {
    const first = createMaskSchema({ seed: "project-a" });
    const second = createMaskSchema({ seed: "project-b" });
    if (first instanceof Error || second instanceof Error)
      throw new Error("schema creation failed");
    const a = createUuidSlugCodec({ mask: first });
    const b = createUuidSlugCodec({ mask: second });
    const slug = a.uuidV7ToMaskedSlug(SAMPLE_V7_A);
    if (slug instanceof Error) throw slug;
    expect(b.maskedSlugToUuidV7(slug)).toBeInstanceOf(Error);
    expect(
      createUuidSlugCodec({
        legacy: { masks: [first] },
        mask: second,
      }).maskedSlugToUuidV7(slug),
    ).toBe(SAMPLE_V7_A);
  });

  it("defensively clones explicit schema arrays", () => {
    const xor = new Uint8Array(16);
    const permute = Uint8Array.from({ length: 16 }, (_, i) => i);
    const schema = defineMaskSchema({
      id: "clone-test",
      permute,
      tagBits: 6,
      xor,
    });
    if (schema instanceof Error) throw schema;
    const codec = createUuidSlugCodec({ mask: schema });
    const before = codec.uuidV7ToMaskedSlug(SAMPLE_V7_A);
    xor[0] = 255;
    permute[0] = 9;
    expect(codec.uuidV7ToMaskedSlug(SAMPLE_V7_A)).toBe(before);
  });

  it("rejects malformed schemas", () => {
    expect(
      defineMaskSchema({
        permute: new Uint8Array(15),
        tagBits: 6,
        xor: new Uint8Array(16),
      }),
    ).toBeInstanceOf(Error);
    expect(
      defineMaskSchema({
        permute: new Uint8Array(16),
        tagBits: 6,
        xor: new Uint8Array(16),
      }),
    ).toBeInstanceOf(Error);
    expect(createMaskSchema({ seed: "" })).toBeInstanceOf(Error);
  });
});

describe("generation", () => {
  it("generates valid UUIDv7 values", () => {
    for (let i = 0; i < 1000; i += 1) {
      const uuid = createUuidSlugCodec().uuidV7();
      expect(isUuidV7String(uuid)).toBe(true);
    }
  });

  it("generates unique masked UUIDv7 slugs across a smoke run", () => {
    const seen = new Set<string>();
    const codec = createUuidSlugCodec();
    for (let i = 0; i < 1000; i += 1) {
      const slug = codec.uuidV7MaskedSlug();
      expect(slug).not.toBeInstanceOf(Error);
      expect(seen.has(String(slug))).toBe(false);
      seen.add(String(slug));
    }
  });
});
