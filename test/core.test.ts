import { describe, expect, it } from "vitest";
import {
  createMaskSchema,
  createUuidSlugCodec,
  decodeBase64Url,
  encodeBase64Url,
  extractUuidV7Timestamp,
  isBase64Url,
  parseUuid,
  slugToUuid,
  uuidToSlug,
  uuidV7BytesAt,
  UuidSlugError,
} from "../src/index";
import type { SlugAlphabet } from "../src/index";
import { deterministicUuidV7 } from "./deterministic-uuid";

const SAMPLE_V7_A = "01987008-ef3e-7f69-b677-22ec1a5bbdb2";
const SAMPLE_V7_B = "01987bbb-178b-7858-93e8-fc5e5444913b";
const SAMPLE_V4 = "b1ba599d-4844-4bb0-a1ee-ac0aeb8875f5";

/** Compared with `<` because that is what a database index or a sorted listing does to these. */
const ascending = (slugs: readonly string[]) =>
  slugs.every((slug, i) => i === 0 || (slugs[i - 1] as string) < slug);

describe("base64url", () => {
  it("round-trips one UUID payload and rejects every other byte length", () => {
    const bytes = Uint8Array.from({ length: 16 }, (_, index) => index * 13);
    const encoded = encodeBase64Url(bytes);
    if (encoded instanceof Error) throw encoded;
    expect(decodeBase64Url(encoded)).toEqual(bytes);
    expect(encodeBase64Url(new Uint8Array())).toBeInstanceOf(Error);
    expect(encodeBase64Url(new Uint8Array(15))).toBeInstanceOf(Error);
    expect(encodeBase64Url(new Uint8Array(17))).toBeInstanceOf(Error);
    expect(decodeBase64Url(Buffer.alloc(15).toString("base64url"))).toBeInstanceOf(Error);
    expect(decodeBase64Url(Buffer.alloc(17).toString("base64url"))).toBeInstanceOf(Error);
    expect(decodeBase64Url(`${encoded}=`)).toBeInstanceOf(Error);
    expect(decodeBase64Url("A")).toBeInstanceOf(Error);
  });

  it("preserves every 16-byte payload without imposing a UUID version or variant", () => {
    for (const bytes of [new Uint8Array(16), new Uint8Array(16).fill(0xff)]) {
      const encoded = encodeBase64Url(bytes);
      if (encoded instanceof Error) throw encoded;
      expect(decodeBase64Url(encoded)).toEqual(bytes);
      expect(isBase64Url(encoded)).toBe(true);
    }
  });

  it("returns exactly the bytes it decoded, whether or not a buffer was supplied", () => {
    // The view identifies the written range without hiding the caller's buffer.
    const bytes = Uint8Array.from({ length: 16 }, (_, index) => index * 13);
    const encoded = encodeBase64Url(bytes);
    if (encoded instanceof Error) throw encoded;
    const buffer = new Uint8Array(32).fill(0xab);
    const written = decodeBase64Url(encoded, buffer, 8);
    if (written instanceof Error) throw written;
    expect(written).toEqual(bytes);
    expect(written.byteOffset).toBe(8);
    expect(written.buffer).toBe(buffer.buffer);
    expect([...buffer.slice(0, 8)]).toEqual(Array.from<number>({ length: 8 }).fill(0xab));
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

  it("mints codec slugs in the configured alphabet, but never sentinels or masked ones", () => {
    // The option's boundary is the point of this case. Sentinels are matched against masked input,
    // and masked slugs are base64url by ruling, so a codec-wide alphabet that leaked into either
    // would make sentinels unrecognisable exactly where they are used.
    const codec = createUuidSlugCodec({
      mask: { seed: "alpha-test-seed-0000" },
      slugAlphabet: "base32hex",
    });
    expect(codec.uuidV7Slug()).toHaveLength(26);
    expect(codec.uuidV4Slug()).toHaveLength(26);
    expect(codec.uuidV7MaskedSlug()).toHaveLength(22);
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
    const codec = createUuidSlugCodec({ mask: { seed: "sentinel-bypass-test-seed-0000" } });
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

  it("rejects a wrong schema unless the caller listed it as a previous one", () => {
    const first = createMaskSchema({ seed: "project-a-test-seed-0000" });
    const second = createMaskSchema({ seed: "project-b-test-seed-0000" });
    if (first instanceof Error || second instanceof Error)
      throw new Error("schema creation failed");
    const a = createUuidSlugCodec({ mask: first });
    const b = createUuidSlugCodec({ mask: second });
    const slug = a.uuidV7ToMaskedSlug(SAMPLE_V7_A);
    if (slug instanceof Error) throw slug;
    expect(b.maskedSlugToUuidV7(slug)).toBeInstanceOf(Error);
    expect(
      createUuidSlugCodec({
        mask: second,
        previousMasks: [first],
      }).maskedSlugToUuidV7(slug),
    ).toBe(SAMPLE_V7_A);
  });

  it("validates freshness against the codec's OWN key, not the package's published one", () => {
    // The predecessor of this method was module-level and reached for `defaultCodec`, so it
    // unmasked with the seed shipped in this package rather than the caller's. Every caller who
    // supplied a seed — the only ones for whom masking does anything — got a confident Error for
    // a slug their own codec had just issued. It shipped with no test at all, which is why: this
    // case goes red against that implementation and nothing else in the suite does.
    const ids = createUuidSlugCodec({ mask: { seed: "not-the-published-one-test-seed-0000" } });
    const slug = ids.uuidV7ToMaskedSlug(SAMPLE_V7_A);
    if (slug instanceof Error) throw slug;
    // `now` is pinned to the sample's own instant so the window, not the clock, decides.
    const at = extractUuidV7Timestamp(parseUuid(SAMPLE_V7_A) as Uint8Array) as number;
    expect(ids.validateMaskedSlugFresh(slug, { now: () => at })).toBe(slug);
    expect(ids.validateMaskedSlugFresh(slug, { now: () => at + 86_400_001 })).toBeInstanceOf(Error);
    // Both edges exactly, because the README says an id is refused when it sits OUTSIDE the
    // window — so the boundary itself is inside it, and nothing else says which. Relaxing either
    // comparison to its non-strict form left the suite green (measured 2026-08-12); an off-by-one
    // here silently expires ids a day early, or accepts ones a day stale.
    expect(ids.validateMaskedSlugFresh(slug, { now: () => at + 86_400_000 })).toBe(slug);
    expect(ids.validateMaskedSlugFresh(slug, { now: () => at - 86_400_000 })).toBe(slug);
  });

  it("rotates a seed without making the caller build a schema for the old one", () => {
    // Rotation is the whole reason the list exists, so listing a previous SEED must cost what
    // naming the current one costs. It used to demand a constructor and an error branch.
    const before = createUuidSlugCodec({ mask: { seed: "key-v1-test-seed-0000" } });
    const slug = before.uuidV7ToMaskedSlug(SAMPLE_V7_A);
    if (slug instanceof Error) throw slug;
    const after = createUuidSlugCodec({
      mask: { seed: "key-v2-test-seed-0000" },
      previousMasks: [{ seed: "key-v1-test-seed-0000" }],
    });
    expect(after.maskedSlugToUuidV7(slug)).toBe(SAMPLE_V7_A);
    // And the rotation actually rotated: new ids are issued under v2, not v1.
    expect(after.uuidV7ToMaskedSlug(SAMPLE_V7_A)).not.toBe(slug);
  });

  it("refuses a caller's schema that does not reverse its own mixing step", () => {
    // A `mix` is the only extension point, and getting the inverse wrong is silent: encoding still
    // produces a slug, and every id issued under it is unreadable forever. So it must fail at
    // construction. Two distinct ways to get it wrong, because one probe cannot see both.
    const ignoresDirection = {
      id: "one-way",
      mix: (input: Uint8Array, output: Uint8Array) => output.set(input.map((b) => (b + 1) & 0xff)),
    };
    // Reorders identically in both directions — the classic permutation-table mistake, and the
    // reason an all-zero probe alone is not enough: zeroes survive any reordering unchanged.
    const reordersBothWays = {
      id: "same-both-ways",
      mix: (input: Uint8Array, output: Uint8Array) => {
        for (let i = 0; i < 16; i += 1) output[i] = input[(i + 5) % 16] as number;
      },
    };
    expect(() => createUuidSlugCodec({ mask: ignoresDirection })).toThrow(/reverse/);
    expect(() => createUuidSlugCodec({ mask: reordersBothWays })).toThrow(/reverse/);
    // And a correct one is accepted, so the guard is not simply rejecting everything.
    expect(() => createUuidSlugCodec({ mask: { seed: "fine-test-seed-0000" } })).not.toThrow();
  });

  // Both are CALLER-input checks whose absence is silent: a short seed masks nothing while every
  // round-trip still passes, and a bad iteration count either derives a different key or hangs
  // construction with no output to read.
  it.each([
    ["empty seed", { seed: "" }],
    ["seed under the 16-byte floor", { seed: "fifteen-bytes!" }],
    ["fractional keyIterations", { seed: "long-enough-seed-here", keyIterations: 1.5 }],
    ["zero keyIterations", { seed: "long-enough-seed-here", keyIterations: 0 }],
    ["keyIterations past the ceiling", { seed: "long-enough-seed-here", keyIterations: 2 ** 30 }],
  ])("refuses a %s", (_label, options) => {
    expect(createMaskSchema(options)).toBeInstanceOf(Error);
  });

  it("derives a different key for a different iteration count, and the same one for a repeat", () => {
    // keyIterations is part of the key, not a tuning knob: this is what makes the wire-format
    // warning on it true rather than merely cautious.
    const uuid = "019ff19b-58b8-7000-9b1b-df713bd5562c";
    const slugAt = (keyIterations: number) => {
      const schema = createMaskSchema({ seed: "rotation-seed-long-enough", keyIterations });
      if (schema instanceof Error) throw schema;
      return createUuidSlugCodec({ mask: schema }).uuidV7ToMaskedSlug(uuid);
    };
    expect(slugAt(1)).not.toBe(slugAt(2));
    expect(slugAt(3)).toBe(slugAt(3));
  });
});

describe("acceptUnmaskedSlugs", () => {
  // Nothing pinned this flag before, which is how a decode path got deleted as a "duplicate"
  // and how a schema combination that silently returns WRONG uuids went unnoticed. Both cases
  // below are chosen to fail loudly if either recurs.
  it("decodes a plain UUIDv4 slug, which the v7 form cannot", () => {
    // The flag exists to migrate off unmasked ids, and those predate any decision to use v7.
    // `maskedSlugToUuidV7` rejecting them is correct; something has to accept them.
    const codec = createUuidSlugCodec({ acceptUnmaskedSlugs: true });
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
    const schema = createMaskSchema({ id: "feistel-only", seed: "direct-decode-test-seed-0000" });
    if (schema instanceof Error) throw schema;
    const codec = createUuidSlugCodec({ acceptUnmaskedSlugs: true, mask: schema });
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

  it("blames the schema, not the alphabet, when a slug matches no key", () => {
    // The main failure this flag is present for is a wrong or rotated key, and turning it on used
    // to CHANGE THE DIAGNOSIS for it: the fallback's error was returned and the masked one thrown
    // away, so the operator was told `invalid_base64url: non-canonical trailing bits`. That is
    // untrue — the input is well-formed base64url, and its trailing bits ARE the mask check — and
    // it sends them hunting a typo in an id that has none. The flag must not change the answer to
    // "why did this not decode".
    const mine = createMaskSchema({ id: "feistel-only", seed: "the-key-in-use-test-seed-0000" });
    const theirs = createMaskSchema({ id: "feistel-only", seed: "a-different-key-test-seed-0000" });
    if (mine instanceof Error) throw mine;
    if (theirs instanceof Error) throw theirs;
    const foreign = String(createUuidSlugCodec({ mask: theirs }).uuidV7ToMaskedSlug(SAMPLE_V7_A));

    for (const acceptUnmaskedSlugs of [false, true]) {
      const codec = createUuidSlugCodec({ acceptUnmaskedSlugs, mask: mine });
      const failure = codec.maskedSlugToUuid(foreign);
      expect(failure).toBeInstanceOf(UuidSlugError);
      expect((failure as UuidSlugError).code).toBe("invalid_uuid_slug");
    }
  });

  it("returns a base32hex slug it accepted as itself, not as a base64url one", () => {
    // `validateMaskedSlugFresh` used to declare `MaskedUuidV7Slug` — `Base64UrlString & UuidSlug` —
    // while this path hands back a 26-character base32hex string, so the declared type was false
    // and `isBase64Url` on the result was `false`. The behaviour is correct and must stay: a codec
    // whose own alphabet is base32hex has exactly these legacy ids, which is what the flag is for.
    // The signature is generic now, so the value is returned at the type it arrived as; `tsc` is
    // what checks that half. This pins the behaviour the type had to be made honest about.
    const codec = createUuidSlugCodec({ acceptUnmaskedSlugs: true, slugAlphabet: "base32hex" });
    const legacy = String(uuidToSlug(SAMPLE_V7_A, "base32hex"));
    expect(legacy).toHaveLength(26);
    // `now` pinned to the sample's own instant, so the freshness window is satisfied and the case
    // is about the returned VALUE rather than about the clock.
    const minted = extractUuidV7Timestamp(parseUuid(SAMPLE_V7_A) as Uint8Array) as number;
    expect(codec.validateMaskedSlugFresh(legacy, { now: () => minted })).toBe(legacy);
    expect(isBase64Url(legacy)).toBe(false);
  });
});

describe("sentinel definitions", () => {
  // Everything else this constructor takes is proved at construction — `mix` invertibility, an
  // empty seed. Sentinels were the gap, and the gap is invisible: `UuidV7SentinelDefinition.uuid`
  // is typed `UuidV7String`, but `Brand`'s marker is OPTIONAL by design, so any string satisfies
  // it and the compiler never looks. A v4 sentinel constructed fine, masked fine, and then failed
  // on every single decode for the life of the codec.
  it("refuses a sentinel that is not a UUIDv7", () => {
    // A v4 is passed with NO cast, and that is the demonstration: `uuid` is declared `UuidV7String`
    // and the compiler raises nothing. Writing `SAMPLE_V4 as UuidV7String` here was reported by
    // oxlint as an unnecessary assertion — the type system agreeing, in its own words, that it
    // cannot tell these apart. Only a runtime check can.
    expect(() =>
      createUuidSlugCodec({ sentinels: [{ name: "v4-sentinel", uuid: SAMPLE_V4 }] }),
    ).toThrow(UuidSlugError);
  });

  it("refuses two sentinels sharing one UUID, which would collapse silently", () => {
    // Both entries survive in `codec.sentinels` while the lookup maps keep only the last, so the
    // codec reports a sentinel it can never match.
    expect(() =>
      createUuidSlugCodec({
        sentinels: [
          { name: "first", uuid: SAMPLE_V7_A },
          { name: "second", uuid: SAMPLE_V7_A },
        ],
      }),
    ).toThrow(UuidSlugError);
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
    const bytes = createUuidSlugCodec().uuidV4Bytes();
    if (bytes instanceof Error) throw bytes;
    expect(bytes).toHaveLength(16);
    expect((bytes[6] as number) >> 4).toBe(0x4);
    expect((bytes[8] as number) >> 6).toBe(0b10);
  });

  it("refuses a buffer it cannot fit rather than writing past the end", () => {
    // Both arms of the guard, matching the v7 case: past the end once the offset is added, and a
    // negative offset that stays inside the length. A short write is silent — the bytes past the
    // end are dropped and the id comes back truncated with no error anywhere.
    const codec = createUuidSlugCodec();
    expect(codec.uuidV4Bytes(new Uint8Array(16), 1)).toBeInstanceOf(Error);
    expect(codec.uuidV4Bytes(new Uint8Array(16), -1)).toBeInstanceOf(Error);
  });
});
