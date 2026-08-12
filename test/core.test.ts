import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createMaskSchema,
  createUuidSlugCodec,
  defineMaskSchema,
  decodeBase64Url,
  encodeBase64Url,
  extractUuidV7Timestamp,
  isUuidV7String,
  parseUuid,
  slugToUuid,
  UUID_SLUG_ERROR_CODES,
  uuidToSlug,
  uuidV7BytesAt,
} from "../src/index";
import { deterministicUuidV7 } from "./deterministic-uuid";

const SAMPLE_V7_A = "01987008-ef3e-7f69-b677-22ec1a5bbdb2";
const SAMPLE_V7_B = "01987bbb-178b-7858-93e8-fc5e5444913b";
const SAMPLE_V4 = "b1ba599d-4844-4bb0-a1ee-ac0aeb8875f5";

describe("documented surface", () => {
  it("lists every error code in the README, and no code the README invented", () => {
    // A consumer branches on `code`, so an undocumented one is a branch nobody knows to write.
    // The README had eight of ten for as long as ten existed: two people can read both lists and
    // neither comparison happens, because nothing forces them into the same place at the same
    // time. Backticked so a code appearing in ordinary prose cannot satisfy this by accident.
    const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
    const documented = new Set(
      [...readme.matchAll(/`(invalid_[a-z0-9_]+|rng_unavailable|stale_uuid)`/g)].map(
        (match) => match[1] ?? "",
      ),
    );
    const codes: readonly string[] = UUID_SLUG_ERROR_CODES;
    expect({
      invented: [...documented].filter((code) => !codes.includes(code)),
      undocumented: codes.filter((code) => !documented.has(code)),
    }).toEqual({ invented: [], undocumented: [] });
  });

  it("shows a quick-start slug that really is that UUID under that seed", () => {
    // The pair in the README survived a format change as a matched-looking lie: the slug decoded
    // to nothing at all, and only running it revealed that. Example output is the first thing a
    // reader tries, so it is API surface, and prose is where a format change hides longest.
    //
    // All three values are READ OUT of the README. A copy pasted in here would name that file and
    // reach a constant instead, which passes just as happily after someone edits the example.
    const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
    const seed = /ID_MASK_SEED \?\? "([^"]+)"/.exec(readme)?.[1];
    const slug = /\/\/ "([\w-]{22})"/.exec(readme)?.[1];
    const uuid = /\/\/ "([\da-f-]{36})"/.exec(readme)?.[1];
    if (!seed || !slug || !uuid) throw new Error("the README's quick start no longer parses");
    expect(createUuidSlugCodec({ mask: { seed } }).maskedSlugToUuidV7(slug)).toBe(uuid);
  });
});

describe("base64url", () => {
  it("round-trips arbitrary bytes and rejects non-canonical forms", () => {
    const bytes = Uint8Array.from([0, 255, 128, 64, 1, 2, 3, 4]);
    const encoded = encodeBase64Url(bytes);
    expect(decodeBase64Url(encoded)).toEqual(bytes);
    expect(decodeBase64Url(`${encoded}=`)).toBeInstanceOf(Error);
    expect(decodeBase64Url("A")).toBeInstanceOf(Error);
  });
});

/** Zeroed but for the version and variant bytes, placed so a v7 appears to begin at `offset`. */
const v7PatternAt = (length: number, offset: number) => {
  const bytes = new Uint8Array(length);
  bytes[offset + 6] = 0x70;
  bytes[offset + 8] = 0x80;
  return bytes;
};

describe("UUIDv7 timestamp extraction", () => {
  // The defect this pins is silent rather than loud: a v4's first six bytes are random, so the
  // old signature returned a confident date drawn from the next nine thousand years instead of
  // reporting the wrong version. Anything built on it — a freshness window, an audit trail —
  // accepted or rejected by coin flip while every type checked out.
  it("refuses a UUIDv4 rather than reading its random bytes as a date", () => {
    const v4 = parseUuid(SAMPLE_V4);
    if (v4 instanceof Error) throw v4;
    expect(extractUuidV7Timestamp(v4)).toBeInstanceOf(Error);
  });

  it("refuses a buffer too short to hold a UUID at the given offset", () => {
    // Every buffer here carries a valid version and variant AT THE OFFSET ASKED FOR, so the bounds
    // check is the only thing that can reject it. That matters: an all-zero buffer is rejected by
    // the version check instead, which is how the first draft of this test passed unchanged against
    // an implementation carrying no bounds check at all — proved by deleting the check and watching
    // it stay green. The three cases are three distinct branches: past the end, past the end only
    // once the offset is added, and a negative offset that stays inside the length.
    expect(extractUuidV7Timestamp(v7PatternAt(15, 0))).toBeInstanceOf(Error);
    expect(extractUuidV7Timestamp(v7PatternAt(16, 1), 1)).toBeInstanceOf(Error);
    expect(extractUuidV7Timestamp(v7PatternAt(16, -1), -1)).toBeInstanceOf(Error);
  });

  it("reads back the exact instant a UUID was minted at, at any offset", () => {
    // `uuidV7BytesAt` is the independent oracle: the instant is chosen here, not read back from
    // whatever the generator happened to produce, so the two must agree on the 48-bit layout.
    const instant = 1_700_000_000_123;
    const buffer = new Uint8Array(32);
    const written = uuidV7BytesAt(instant, buffer, 16);
    if (written instanceof Error) throw written;
    expect(extractUuidV7Timestamp(buffer, 16)).toBe(instant);
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
  it("uses direct precomputed sentinel slugs for sentinel transmission", () => {
    // Sentinels stay readable by eye on purpose, so a masked codec is what makes the assertion
    // mean anything: it proves masking is bypassed for them rather than merely absent.
    const codec = createUuidSlugCodec({ mask: { seed: "sentinel-bypass" } });
    const [, anonymousUser, unknownUser] = codec.sentinels;
    if (!anonymousUser || !unknownUser) throw new Error("sentinel setup failed");
    expect(codec.sentinels.map((item) => item.slug)).toEqual([
      "AAAAAAAAcACAAAAAAAAAAA",
      "AAAAAAABcACAAAAAAAAAAA",
      "AAAAAAACcACAAAAAAAAAAA",
    ]);
    expect(codec.uuidV7ToMaskedSlug(anonymousUser.uuid)).toBe("AAAAAAABcACAAAAAAAAAAA");
    expect(codec.maskedSlugToUuidV7("AAAAAAACcACAAAAAAAAAAA")).toBe(unknownUser.uuid);
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

describe("legacy.directDecode", () => {
  // Nothing pinned this flag before, which is how a decode path got deleted as a "duplicate"
  // and how a schema combination that silently returns WRONG uuids went unnoticed. Both cases
  // below are chosen to fail loudly if either recurs.
  it("decodes a plain UUIDv4 slug, which the v7 form cannot", () => {
    // The flag exists to migrate off unmasked ids, and those predate any decision to use v7.
    // `maskedSlugToUuidV7` rejecting them is correct; something has to accept them.
    const codec = createUuidSlugCodec({ legacy: { directDecode: true } });
    const slug = uuidToSlug(SAMPLE_V4);
    expect(codec.maskedSlugToUuid(String(slug))).toBe(SAMPLE_V4);
    expect(codec.maskedSlugToUuidV7(String(slug))).toBeInstanceOf(Error);
  });

  it("mistakes a direct slug for a masked one at the check's rate and no more often", () => {
    // A direct slug and a masked one are the same 22 characters of the same alphabet, so the ONLY
    // thing separating them is the check — one direct slug in 2^16 passes it and decodes to a
    // UUID nobody issued. That is the ruled 16-bit format's price and it cannot be bought back:
    // 16 check bits spend all 132 bits of a 22-character slug, leaving nothing for the scheme
    // marker that used to make this exclusion exact.
    //
    // The bound is what this asserts, because the rate is the thing that can silently regress.
    // Narrowing the check to the old 6-bit tag would put roughly 312 confusions in this sample.
    const schema = createMaskSchema({ id: "feistel-only", kind: "feistel", seed: "direct-decode" });
    if (schema instanceof Error) throw schema;
    const codec = createUuidSlugCodec({ mask: schema, legacy: { directDecode: true } });
    let confused = 0;
    for (let i = 0; i < 20_000; i += 1) {
      const uuid = deterministicUuidV7(i);
      if (codec.maskedSlugToUuid(String(uuidToSlug(uuid))) !== uuid) confused += 1;
    }
    // Deterministic input, so this is a fixed count rather than a sample: measured 1 here, and 3
    // in 200,000 against the 3.05 that 2^-16 predicts. The headroom absorbs a reseed, not a
    // format change.
    expect(confused).toBeLessThanOrEqual(4);
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
