import { describe, expect, it } from "vitest";
import { runInNewContext } from "node:vm";
import {
  createCustomUuidV7Mask,
  createUuidV7Mask,
  createUuidV7SlugCodec as createCodec,
  extractUuidV7Timestamp,
  isUuidSlug,
  isUuidSlugError,
  uuidToBytes,
  UUID_V7_TEST_MASK,
  slugToUuid,
  unwrapUuidSlug,
  uuidToSlug,
  generateUuidV4Bytes,
  generateUuidV4Slug,
  generateUuidV7BytesAt,
  generateUuidV7Slug,
  UuidSlugError,
  validateUuidV7SlugTimestamp,
} from "../src/index";
import type { SlugAlphabet, UuidV7SlugCodecOptions } from "../src/index";
import { unwrap } from "../dev/unwrap";
import { TEST_SENTINELS } from "./sentinel-fixtures";

const SAMPLE_V7_A = "01987008-ef3e-7f69-b677-22ec1a5bbdb2";
const SAMPLE_V7_B = "01987bbb-178b-7858-93e8-fc5e5444913b";
const SAMPLE_V4 = "b1ba599d-4844-4bb0-a1ee-ac0aeb8875f5";

const createUuidV7SlugCodec = (options: UuidV7SlugCodecOptions) => unwrap(createCodec(options));

describe("error classification", () => {
  it("accepts package errors across realms without accepting lookalike data or throwing", () => {
    const foreign: unknown[] = runInNewContext(
      '["UuidSlugError", "UuidRuntimeError"].map(name => Object.assign(new Error("failure"), { name, code: "invalid_uuid" }))',
    );
    expect(isUuidSlugError(new UuidSlugError("invalid_uuid", "bad UUID"))).toBe(true);
    expect(foreign.every(isUuidSlugError)).toBe(true);
    expect(isUuidSlugError({ name: "UuidSlugError", code: "invalid_uuid" })).toBe(false);
    expect(
      isUuidSlugError(
        new Proxy(new Error("hostile"), {
          get() {
            throw new Error("getter failed");
          },
        }),
      ),
    ).toBe(false);
  });

  it("unwraps success values and throws package errors from any realm", () => {
    const success = new Uint8Array([1, 2, 3]);
    const foreign = runInNewContext(
      'Object.assign(new Error("failure"), { name: "UuidSlugError", code: "invalid_uuid" })',
    ) as UuidSlugError;

    expect(unwrapUuidSlug(success)).toBe(success);
    expect(() => unwrapUuidSlug(new UuidSlugError("invalid_uuid", "failure"))).toThrow(
      UuidSlugError,
    );
    expect(() => unwrapUuidSlug(foreign)).toThrow(foreign);
  });
});

/** Compared with `<` because that is what a database index or a sorted listing does to these. */
const ascending = (slugs: readonly string[]) =>
  slugs.every((slug, i) => i === 0 || (slugs[i - 1] as string) < slug);

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
  // reporting the wrong version. Anything built on it — a timestamp window, an audit trail —
  // accepted or rejected by coin flip while every type checked out.
  it("refuses a UUIDv4 rather than reading its random bytes as a date", () => {
    const v4 = uuidToBytes(SAMPLE_V4);
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
    // `generateUuidV7BytesAt` is the independent oracle: the instant is chosen here, not read back from
    // whatever the generator happened to produce, so the two must agree on the 48-bit layout.
    const instant = 1_700_000_000_123;
    const buffer = new Uint8Array(32);
    const written = generateUuidV7BytesAt(instant, buffer, 16);
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
    expect(uuidToBytes(SAMPLE_V7_A.toUpperCase())).toBeInstanceOf(Error);
  });

  // A UUIDv7 leads with its 48-bit timestamp, so slugs sort by creation time exactly when the
  // alphabet's characters are in value order. That is the whole reason base32hex is offered.
  it("sorts base32hex slugs by creation time, which base64url cannot do", () => {
    // Spread across the encodable range so the ordering is decided by timestamp characters at
    // several positions rather than by one lucky byte. Tails are constant: this is a claim about
    // the timestamp prefix, and random tails would only add noise to it.
    //
    // The last instant is deliberate. base64url runs `A-Za-z0-9-_`, which is monotonic for its
    // first 52 values — `A` < `z` in ASCII too — and only inverts once a 6-bit group reaches 52
    // and encodes as `0`, which sorts BELOW `A`. 0x034000000000 is the smallest round instant
    // whose second character does that. Without it every base64url slug here sorts correctly and
    // the contrast below proves nothing.
    const instants = [1, 2 ** 12, 2 ** 20, 2 ** 26, 2 ** 31, 2 ** 34, 2 ** 38, 0x034000000000];
    const uuids = instants.map((ms) => {
      const hex = ms.toString(16).padStart(12, "0");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-7000-8000-000000000000`;
    });
    const slugsIn = (alphabet: SlugAlphabet) =>
      uuids.map((uuid) => {
        const slug = uuidToSlug(uuid, alphabet);
        if (slug instanceof Error) throw slug;
        return String(slug);
      });

    expect(ascending(slugsIn("base32hex"))).toBe(true);
    // The falsifier. Without it this case passes against an implementation that ignores the
    // alphabet argument and returns base64url both times, which is precisely the way wiring a new
    // option fails.
    expect(ascending(slugsIn("base64url"))).toBe(false);
  });

  it("selects direct and masked slug alphabets independently", () => {
    // The option's boundary is the point of this case. Sentinels are matched against masked input,
    // and masked slugs are base64url by ruling, so a codec-wide alphabet that leaked into either
    // would make sentinels unrecognisable exactly where they are used.
    const codec = createUuidV7SlugCodec({
      mask: { seed: "alpha-test-seed-0000" },
      sentinels: TEST_SENTINELS,
    });
    expect(generateUuidV7Slug("base32hex")).toHaveLength(26);
    expect(generateUuidV4Slug("base32hex")).toHaveLength(26);
    expect(codec.generateSlug()).toHaveLength(22);
    expect(codec.sentinels[0]?.slug).toHaveLength(22);
  });

  it("answers rather than crashing when JavaScript passes an alphabet name TypeScript forbids", () => {
    // The union makes this unreachable from TypeScript, so the cast is the only way to reach the
    // branch — and the branch exists because a JS caller would otherwise index `undefined`.
    expect(uuidToSlug(SAMPLE_V4, "base16" as SlugAlphabet)).toBeInstanceOf(Error);
  });

  it("reads either alphabet back without being told which", () => {
    // Decoding takes no alphabet because the two lengths are disjoint. That is what lets a system
    // change alphabet without invalidating a single slug it has already handed out.
    for (const uuid of [SAMPLE_V7_A, SAMPLE_V4])
      for (const [alphabet, length] of [
        ["base64url", 22],
        ["base32hex", 26],
      ] as const) {
        const slug = uuidToSlug(uuid, alphabet);
        if (slug instanceof Error) throw slug;
        expect(slug).toHaveLength(length);
        expect(slugToUuid(String(slug))).toBe(uuid);
      }
  });
});

describe("masked UUID slugs", () => {
  it("uses direct precomputed sentinel slugs for sentinel transmission", () => {
    // Sentinels stay readable by eye on purpose, so a masked codec is what makes the assertion
    // mean anything: it proves masking is bypassed for them rather than merely absent.
    const codec = createUuidV7SlugCodec({
      mask: { seed: "sentinel-bypass-test-seed-0000" },
      sentinels: TEST_SENTINELS,
    });
    const [, anonymousUser, unknownUser] = codec.sentinels;
    if (!anonymousUser || !unknownUser) throw new Error("sentinel setup failed");
    expect(codec.sentinels.map((item) => item.slug)).toEqual([
      "AAAAAAAAcACAAAAAAAAAAA",
      "AAAAAAABcACAAAAAAAAAAA",
      "AAAAAAACcACAAAAAAAAAAA",
    ]);
    expect(codec.encodeUuid(anonymousUser.uuid)).toBe("AAAAAAABcACAAAAAAAAAAA");
    expect(codec.decodeSlug("AAAAAAACcACAAAAAAAAAAA")).toBe(unknownUser.uuid);
  });

  it("rejects a wrong schema unless the caller listed it as a previous one", () => {
    const first = createUuidV7Mask({ seed: "project-a-test-seed-0000" });
    const second = createUuidV7Mask({ seed: "project-b-test-seed-0000" });
    if (first instanceof Error || second instanceof Error)
      throw new Error("schema creation failed");
    const a = createUuidV7SlugCodec({ mask: first });
    const b = createUuidV7SlugCodec({ mask: second });
    const slug = a.encodeUuid(SAMPLE_V7_A);
    if (slug instanceof Error) throw slug;
    expect(b.decodeSlug(slug)).toBeInstanceOf(Error);
    expect(
      createUuidV7SlugCodec({
        mask: second,
        previousMasks: [first],
      }).decodeSlug(slug),
    ).toBe(SAMPLE_V7_A);
  });

  it("validates timestamps against the codec's OWN key, not the package's published one", () => {
    // This case fails if timestamp validation uses any schema other than the codec's selected key.
    const ids = createUuidV7SlugCodec({ mask: { seed: "not-the-published-one-test-seed-0000" } });
    const slug = ids.encodeUuid(SAMPLE_V7_A);
    if (slug instanceof Error) throw slug;
    // `now` is pinned to the sample's own instant so the window, not the clock, decides.
    const at = extractUuidV7Timestamp(uuidToBytes(SAMPLE_V7_A) as Uint8Array) as number;
    expect(
      ids.validateSlugTimestamp(slug, { maxTimestampDeltaMs: 86_400_000, referenceUnixMs: at }),
    ).toBe(slug);
    expect(
      ids.validateSlugTimestamp(slug, {
        maxTimestampDeltaMs: 86_400_000,
        referenceUnixMs: at + 86_400_001,
      }),
    ).toBeInstanceOf(Error);
    // Both edges exactly, because the README says an id is refused when it sits OUTSIDE the
    // window — so the boundary itself is inside it, and nothing else says which. Relaxing either
    // comparison to its non-strict form left the suite green (measured 2026-08-12); an off-by-one
    // here silently expires ids a day early, or accepts ones a day stale.
    expect(
      ids.validateSlugTimestamp(slug, {
        maxTimestampDeltaMs: 86_400_000,
        referenceUnixMs: at + 86_400_000,
      }),
    ).toBe(slug);
    expect(
      ids.validateSlugTimestamp(slug, {
        maxTimestampDeltaMs: 86_400_000,
        referenceUnixMs: at - 86_400_000,
      }),
    ).toBe(slug);
  });

  it("rotates a seed without making the caller build a schema for the old one", () => {
    // Rotation is the whole reason the list exists, so listing a previous SEED must cost what
    // naming the current one costs. It used to demand a constructor and an error branch.
    const before = createUuidV7SlugCodec({ mask: { seed: "key-v1-test-seed-0000" } });
    const slug = before.encodeUuid(SAMPLE_V7_A);
    if (slug instanceof Error) throw slug;
    const after = createUuidV7SlugCodec({
      mask: { seed: "key-v2-test-seed-0000" },
      previousMasks: [{ seed: "key-v1-test-seed-0000" }],
    });
    expect(after.decodeSlug(slug)).toBe(SAMPLE_V7_A);
    // And the rotation actually rotated: new ids are issued under v2, not v1.
    expect(after.encodeUuid(SAMPLE_V7_A)).not.toBe(slug);
  });

  it("refuses a caller's schema that does not reverse its own mixing step", () => {
    // A custom schema is the only extension point, and getting the inverse wrong is silent: encoding still
    // produces a slug, and every id issued under it is unreadable forever. So it must fail at
    // construction. Two distinct ways to get it wrong, because one probe cannot see both.
    const ignoresDirection = createCustomUuidV7Mask({
      label: "one-way",
      mask: (input) => input.map((byte) => (byte + 1) & 0xff),
      unmask: (input) => input.map((byte) => (byte + 1) & 0xff),
    });
    // Reorders identically in both directions — the classic permutation-table mistake, and the
    // reason an all-zero probe alone is not enough: zeroes survive any reordering unchanged.
    const reordersBothWays = createCustomUuidV7Mask({
      label: "same-both-ways",
      mask: (input) => input.map((_, i) => input[(i + 5) % 16] as number),
      unmask: (input) => input.map((_, i) => input[(i + 5) % 16] as number),
    });
    expect(ignoresDirection).toMatchObject({ code: "invalid_mask_schema" });
    expect(reordersBothWays).toMatchObject({ code: "invalid_mask_schema" });
    expect(createCodec({ mask: { seed: "fine-test-seed-0000" } })).not.toBeInstanceOf(Error);
  });

  // Both are CALLER-input checks whose absence is silent: a short seed masks nothing while every
  // round-trip still passes, and a bad iteration count either derives a different key or hangs
  // construction with no output to read.
  it.each([
    ["empty seed", { seed: "" }],
    ["seed under the 16-byte floor", { seed: "fifteen-bytes!" }],
    [
      "fractional keyDerivationIterations",
      { seed: "long-enough-seed-here", keyDerivationIterations: 1.5 },
    ],
    ["zero keyDerivationIterations", { seed: "long-enough-seed-here", keyDerivationIterations: 0 }],
    [
      "keyDerivationIterations past the ceiling",
      { seed: "long-enough-seed-here", keyDerivationIterations: 2 ** 30 },
    ],
  ])("refuses a %s", (_label, options) => {
    expect(createUuidV7Mask(options)).toBeInstanceOf(Error);
  });

  it("derives a different key for a different iteration count, and the same one for a repeat", () => {
    // keyDerivationIterations is part of the key, not a tuning knob: this is what makes the wire-format
    // warning on it true rather than merely cautious.
    const uuid = "019ff19b-58b8-7000-9b1b-df713bd5562c";
    const slugAt = (keyDerivationIterations: number) => {
      const schema = createUuidV7Mask({
        seed: "rotation-seed-long-enough",
        keyDerivationIterations,
      });
      if (schema instanceof Error) throw schema;
      return createUuidV7SlugCodec({ mask: schema }).encodeUuid(uuid);
    };
    expect(slugAt(1)).not.toBe(slugAt(2));
    expect(slugAt(3)).toBe(slugAt(3));
  });
});

describe("plain-slug migration", () => {
  // Nothing pinned this flag before, which is how a decode path got deleted as a "duplicate"
  // and how a schema combination that silently returns WRONG uuids went unnoticed. The cases
  // below are chosen to fail loudly if either recurs.
  it("decodes a plain UUIDv4 slug, which the v7 form cannot", () => {
    // The flag exists to migrate off unmasked ids, and those predate any decision to use v7.
    // `decode` rejecting them is correct; something has to accept them.
    const codec = createUuidV7SlugCodec({ mask: UUID_V7_TEST_MASK });
    const slug = uuidToSlug(SAMPLE_V4);
    expect(codec.createMigrationDecoder({ plainSlug: true }).decodeSlug(String(slug))).toBe(
      SAMPLE_V4,
    );
    expect(codec.decodeSlug(String(slug))).toBeInstanceOf(Error);
  });

  it("keeps wrong-key diagnosis out of an explicitly enabled plain migration", () => {
    // Ordinary decoding owns current masked identifiers and must report the wrong key. A separate
    // migration reader with `plainSlug: true` deliberately adds the overlapping direct interpretation;
    // it must return that candidate instead of changing ordinary codec behavior.
    const mine = createUuidV7Mask({ label: "feistel-only", seed: "the-key-in-use-test-seed-0000" });
    const theirs = createUuidV7Mask({
      label: "feistel-only",
      seed: "a-different-key-test-seed-0000",
    });
    if (mine instanceof Error) throw mine;
    if (theirs instanceof Error) throw theirs;
    const foreign = String(createUuidV7SlugCodec({ mask: theirs }).encodeUuid(SAMPLE_V7_A));

    const codec = createUuidV7SlugCodec({ mask: mine });
    const failure = codec.decodeSlug(foreign);
    expect(failure).toBeInstanceOf(UuidSlugError);
    expect((failure as UuidSlugError).code).toBe("invalid_uuid_slug");
    expect(codec.createMigrationDecoder({ plainSlug: true }).decodeSlug(foreign)).toBe(
      "1f04e7f5-c0c6-4044-b5a3-6278bb77ffb4",
    );
  });

  it("returns a base32hex slug it accepted as itself, not as a base64url one", () => {
    // `validateTimestamp` used to declare a masked v7 slug even though plain migration can
    // while this path hands back a 26-character base32hex string, so the declared type was false
    // and an exact base64url check on the result was `false`. The behaviour is correct:
    // whose own alphabet is base32hex has exactly these legacy ids, which is what the flag is for.
    // The signature is generic now, so the value is returned at the type it arrived as; `tsc` is
    // what checks that half. This pins the behaviour the type had to be made honest about.
    const legacy = String(uuidToSlug(SAMPLE_V7_A, "base32hex"));
    expect(legacy).toHaveLength(26);
    // `now` pinned to the sample's own instant, so the timestamp window is satisfied and the case
    // is about the returned VALUE rather than about the clock.
    const minted = extractUuidV7Timestamp(uuidToBytes(SAMPLE_V7_A) as Uint8Array) as number;
    expect(
      validateUuidV7SlugTimestamp(legacy, {
        maxTimestampDeltaMs: 86_400_000,
        referenceUnixMs: minted,
      }),
    ).toBe(legacy);
    expect(legacy.length === 22 && isUuidSlug(legacy)).toBe(false);
  });
});

describe("sentinel definitions", () => {
  it("refuses a sentinel that is not a UUIDv7", () => {
    expect(
      createCodec({
        mask: UUID_V7_TEST_MASK,
        sentinels: [{ name: "v4-sentinel", uuid: SAMPLE_V4 }],
      }),
    ).toMatchObject({ code: "invalid_uuid_version" });
  });

  it("refuses two sentinels sharing one UUID, which would collapse silently", () => {
    expect(
      createCodec({
        mask: UUID_V7_TEST_MASK,
        sentinels: [
          { name: "first", uuid: SAMPLE_V7_A },
          { name: "second", uuid: SAMPLE_V7_A },
        ],
      }),
    ).toMatchObject({ code: "invalid_uuid" });
  });
});

// The v7 generator is pinned from several directions — `test/v7.test.ts` for the bit layout and
// the buffer bounds, `test/entropy.test.ts` for conformance across 2000 draws. The v4 path shares
// neither, and had no case of its own: measured 2026-08-12 by mutation, moving its version stamp
// to byte 7, its variant stamp to byte 9, or relaxing its bounds guard to `&&` each left the whole
// suite green.
describe("UUIDv4 generation", () => {
  it("stamps version 4 and the RFC variant, in exactly sixteen bytes", () => {
    // README §Guarantees promises correct version and variant bits for EVERY generated id. This is
    // the only case that holds that promise for a v4. The length is asserted with them because the
    // same line decides it, and a 17-byte "UUID" fails no other case here.
    const bytes = generateUuidV4Bytes();
    if (bytes instanceof Error) throw bytes;
    expect(bytes).toHaveLength(16);
    expect((bytes[6] as number) >> 4).toBe(0x4);
    expect((bytes[8] as number) >> 6).toBe(0b10);
  });

  it("refuses a buffer it cannot fit rather than writing past the end", () => {
    // Both arms of the guard, matching the v7 case: past the end once the offset is added, and a
    // negative offset that stays inside the length. A short write is silent — the bytes past the
    // end are dropped and the id comes back truncated with no error anywhere.
    expect(generateUuidV4Bytes(new Uint8Array(16), 1)).toBeInstanceOf(Error);
    expect(generateUuidV4Bytes(new Uint8Array(16), -1)).toBeInstanceOf(Error);
  });
});
