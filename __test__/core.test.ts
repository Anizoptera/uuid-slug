import { describe, expect, it } from "vitest";
import { runInNewContext } from "node:vm";
import {
  uuidBytesToDirectSlug,
  bytesToUuidString,
  UUID_TEXT_LOWERCASE,
  UUID_TEXT_UPPERCASE,
  createCustomUuidV7Mask,
  deriveUuidV7Mask,
  createUuidV7SlugCodec as createCodec,
  extractUuidV7UnixMs,
  isDirectUuidV7Slug,
  isUuidV7String,
  isUuidSlugError,
  slugToUuidBytes,
  uuidStringToBytes,
  UUID_V7_TEST_MASK,
  slugToUuidString,
  uuidStringToDirectSlug,
  generateUuidV4Bytes,
  generateDirectUuidV4Slug,
  generateUuidV7BytesAtUnixMs,
  generateDirectUuidV7Slug,
  generateUuidV7WithDirectSlug,
  UuidSlugError,
  validateUuidV7Timestamp,
  validateDirectUuidV7SlugUnixMs,
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
    const foreign = runInNewContext(
      'Object.assign(new Error("failure"), { name: "UuidSlugError", code: "invalid_uuid" })',
    ) as UuidSlugError;
    expect(isUuidSlugError(new UuidSlugError("invalid_uuid", "bad UUID"))).toBe(true);
    expect(isUuidSlugError(foreign)).toBe(true);
    const shadowed = new UuidSlugError("invalid_uuid", "shadowed marker");
    Object.defineProperty(shadowed, "__failure", {
      get() {
        throw new Error("marker blocked");
      },
    });
    expect(isUuidSlugError(shadowed)).toBe(true);
    expect(
      isUuidSlugError(
        Object.assign(new Error("legacy"), { name: "UuidRuntimeError", code: "invalid_uuid" }),
      ),
    ).toBe(false);
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

  it("recognizes the package marker first and preserves failures through compatible calls", () => {
    const failure = new UuidSlugError("invalid_uuid", "stop here");
    expect(failure["__failure"]).toBe(true);
    expect(isUuidSlugError({ __failure: true })).toBe(true);

    const output = new Uint8Array(32).fill(0x5a);
    expect(uuidStringToDirectSlug(failure)).toBe(failure);
    expect(slugToUuidString(failure)).toBe(failure);
    expect(uuidBytesToDirectSlug(failure)).toBe(failure);
    expect(bytesToUuidString(failure)).toBe(failure);
    expect(uuidStringToBytes(failure, output, 8)).toBe(failure);
    expect(slugToUuidBytes(failure, output, 8)).toBe(failure);
    expect(output.every((byte) => byte === 0x5a)).toBe(true);

    const codec = createCodec({ mask: UUID_V7_TEST_MASK });
    if (isUuidSlugError(codec)) throw codec;
    expect(createCodec({ mask: failure })).toBe(failure);
    expect(createCodec({ mask: UUID_V7_TEST_MASK, previousMasks: [failure] })).toBe(failure);
    expect(codec.uuidToSlug(failure)).toBe(failure);
    expect(codec.slugToUuidString(failure)).toBe(failure);
    expect(codec.slugToUuidBytes(failure, output, 8)).toBe(failure);
    expect(codec.extractUuidSlugUnixMs(failure)).toBe(failure);
    expect(codec.validateUuidSlugUnixMs(failure, { maxTimestampDeltaMs: 0 })).toBe(failure);
    expect(codec.createMigrationDecoder().slugToUuidString(failure)).toBe(failure);
    expect(codec.createMigrationDecoder().slugToUuidStringCandidates(failure)).toBe(failure);
    expect(output.every((byte) => byte === 0x5a)).toBe(true);
  });

  it("does not inspect the error marker on a valid byte input", () => {
    const bytes = unwrap(uuidStringToBytes(SAMPLE_V7_A));
    Object.defineProperty(bytes, "__failure", {
      get() {
        throw new Error("success reached the error detector");
      },
    });
    const codec = createUuidV7SlugCodec({ mask: UUID_V7_TEST_MASK });
    expect(codec.uuidToSlug(bytes)).toBe(codec.uuidToSlug(SAMPLE_V7_A));
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
    const v4 = uuidStringToBytes(SAMPLE_V4);
    if (v4 instanceof Error) throw v4;
    expect(extractUuidV7UnixMs(v4)).toBeInstanceOf(Error);
  });

  it("refuses a buffer too short to hold a UUID at the given offset", () => {
    // Every buffer here carries a valid version and variant AT THE OFFSET ASKED FOR, so the bounds
    // check is the only thing that can reject it. That matters: an all-zero buffer is rejected by
    // the version check instead, which is how the first draft of this test passed unchanged against
    // an implementation carrying no bounds check at all — proved by deleting the check and watching
    // it stay green. The three cases are three distinct branches: past the end, past the end only
    // once the offset is added, and a negative offset that stays inside the length.
    expect(extractUuidV7UnixMs(v7PatternAt(15, 0))).toBeInstanceOf(Error);
    expect(extractUuidV7UnixMs(v7PatternAt(16, 1), 1)).toBeInstanceOf(Error);
    expect(extractUuidV7UnixMs(v7PatternAt(16, -1), -1)).toBeInstanceOf(Error);
  });

  it("reads back the exact instant a UUID was minted at, at any offset", () => {
    // `generateUuidV7BytesAtUnixMs` is the independent oracle: the instant is chosen here, not read back from
    // whatever the generator happened to produce, so the two must agree on the 48-bit layout.
    const instant = 1_700_000_000_123;
    const buffer = new Uint8Array(32);
    const written = generateUuidV7BytesAtUnixMs(instant, buffer, 16);
    if (written instanceof Error) throw written;
    expect(extractUuidV7UnixMs(buffer, 16)).toBe(instant);
  });

  it("reads the same instant from UUID text and both direct slug spellings", () => {
    const instant = 1_700_000_000_123;
    const uuid = unwrap(generateUuidV7BytesAtUnixMs(instant));
    const text = unwrap(bytesToUuidString(uuid));
    expect(extractUuidV7UnixMs(text)).toBe(instant);
    expect(extractUuidV7UnixMs(unwrap(uuidBytesToDirectSlug(uuid)))).toBe(instant);
    expect(extractUuidV7UnixMs(unwrap(uuidBytesToDirectSlug(uuid, "base32hex")))).toBe(instant);
  });

  it("uses the codec key to read masked and sentinel timestamps", () => {
    const codec = createUuidV7SlugCodec({
      mask: UUID_V7_TEST_MASK,
      sentinels: TEST_SENTINELS,
    });
    const instant = unwrap(extractUuidV7UnixMs(TEST_SENTINELS[0].uuid));
    const masked = unwrap(codec.uuidToSlug(SAMPLE_V7_A));
    const sentinel = codec.sentinels[0];
    if (!sentinel) throw new Error("Expected configured sentinel");
    expect(codec.extractUuidSlugUnixMs(masked)).toBe(extractUuidV7UnixMs(SAMPLE_V7_A));
    expect(codec.extractUuidSlugUnixMs(sentinel.slug)).toBe(instant);
  });
});

describe("direct UUID slugs", () => {
  it("preserves the full UUID space without masked timestamp limits", () => {
    for (const uuid of [
      "ffffffff-ffff-7fff-bfff-ffffffffffff",
      "ffffffff-ffff-4fff-bfff-ffffffffffff",
      "ffffffff-ffff-8fff-ffff-ffffffffffff",
      "00000000-0000-0000-0000-000000000000",
    ])
      for (const alphabet of ["base64url", "base32hex"] as const) {
        const slug = unwrap(uuidStringToDirectSlug(uuid, alphabet));
        expect(slugToUuidString(slug)).toBe(uuid);
        expect(uuidBytesToDirectSlug(unwrap(uuidStringToBytes(uuid)), alphabet)).toBe(slug);
      }
  });

  it("matches stable direct vectors", () => {
    expect(uuidStringToDirectSlug(SAMPLE_V7_A)).toBe("AZhwCO8-f2m2dyLsGlu9sg");
    expect(uuidStringToDirectSlug(SAMPLE_V7_B)).toBe("AZh7uxeLeFiT6PxeVESROw");
    expect(uuidStringToDirectSlug(SAMPLE_V4)).toBe("sbpZnUhES7Ch7qwK64h19Q");
    expect(slugToUuidString("sbpZnUhES7Ch7qwK64h19Q")).toBe(SAMPLE_V4);
  });

  it("returns UUID text and a direct slug for one generated value", () => {
    const generated = unwrap(generateUuidV7WithDirectSlug("base32hex"));
    expect(slugToUuidString(generated.slug)).toBe(generated.uuid);
  });

  it("preserves every byte value at every UUID position", () => {
    const bytes = new Uint8Array(16);
    for (let sample = 0; sample < 256; sample += 1) {
      for (let position = 0; position < bytes.length; position += 1)
        bytes[position] = (sample + position * 17) & 255;
      const uuid = unwrap(bytesToUuidString(bytes));
      for (const alphabet of ["base64url", "base32hex"] as const)
        expect(uuidStringToDirectSlug(uuid, alphabet)).toBe(uuidBytesToDirectSlug(bytes, alphabet));
    }
  });

  it("accepts mixed-case hyphenated and compact UUID input but guards canonical output", () => {
    const mixed = SAMPLE_V7_A.toUpperCase().replace("58B8", "58b8");
    const compact = mixed.replaceAll("-", "");
    expect(bytesToUuidString(unwrap(uuidStringToBytes(mixed)))).toBe(SAMPLE_V7_A);
    expect(bytesToUuidString(unwrap(uuidStringToBytes(compact)))).toBe(SAMPLE_V7_A);
    expect(uuidStringToDirectSlug(compact)).toBe(uuidStringToDirectSlug(SAMPLE_V7_A));
    expect(extractUuidV7UnixMs(mixed)).toBe(extractUuidV7UnixMs(SAMPLE_V7_A));
    expect(
      validateUuidV7Timestamp(compact, {
        maxTimestampDeltaMs: 0,
        referenceUnixMs: unwrap(extractUuidV7UnixMs(SAMPLE_V7_A)),
      }),
    ).toBe(SAMPLE_V7_A);
    expect(isUuidV7String(mixed)).toBe(false);
    expect(isUuidV7String(compact)).toBe(false);
  });

  it("formats UUID bytes with built-in lowercase and uppercase presets", () => {
    const bytes = unwrap(uuidStringToBytes(SAMPLE_V7_A));
    const wrapped = new Uint8Array(20);
    wrapped.set(bytes, 2);
    expect(bytesToUuidString(bytes)).toBe(SAMPLE_V7_A);
    expect(bytesToUuidString(bytes, UUID_TEXT_LOWERCASE)).toBe(SAMPLE_V7_A);
    expect(bytesToUuidString(bytes, UUID_TEXT_UPPERCASE)).toBe(SAMPLE_V7_A.toUpperCase());
    expect(bytesToUuidString(wrapped, 2, UUID_TEXT_UPPERCASE)).toBe(SAMPLE_V7_A.toUpperCase());
    expect(bytesToUuidString(bytes, Symbol("titlecase") as never)).toMatchObject({
      code: "invalid_options",
    });
  });

  it("accepts uppercase base32hex input and returns canonical lowercase output", () => {
    const canonical = unwrap(uuidStringToDirectSlug(SAMPLE_V7_A, "base32hex"));
    expect(slugToUuidString(canonical.toUpperCase())).toBe(SAMPLE_V7_A);
    expect(isDirectUuidV7Slug(canonical.toUpperCase())).toBe(false);
  });

  it("keeps parser diagnostics on every invalid UUID hex position", () => {
    for (let index = 0; index < SAMPLE_V7_A.length; index += 1) {
      if (SAMPLE_V7_A[index] === "-") continue;
      const invalid = `${SAMPLE_V7_A.slice(0, index)}!${SAMPLE_V7_A.slice(index + 1)}`;
      for (const alphabet of ["base64url", "base32hex"] as const)
        expect(uuidStringToDirectSlug(invalid, alphabet)).toEqual(uuidStringToBytes(invalid));
    }
    const compact = SAMPLE_V7_A.replaceAll("-", "");
    const output = new Uint8Array(16).fill(0x5a);
    for (let index = 0; index < compact.length; index += 1) {
      const invalid = `${compact.slice(0, index)}!${compact.slice(index + 1)}`;
      expect(uuidStringToBytes(invalid, output)).toBeInstanceOf(Error);
      expect(output.every((byte) => byte === 0x5a)).toBe(true);
    }
    for (const invalid of [
      compact.slice(1),
      `${compact}0`,
      SAMPLE_V7_A.replace("-", "0"),
      `{${SAMPLE_V7_A}}`,
    ]) {
      expect(uuidStringToBytes(invalid, output)).toBeInstanceOf(Error);
      expect(output.every((byte) => byte === 0x5a)).toBe(true);
    }
    expect(extractUuidV7UnixMs(SAMPLE_V4.replaceAll("-", ""))).toMatchObject({
      code: "invalid_uuid_version",
    });
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
        const slug = uuidStringToDirectSlug(uuid, alphabet);
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
    const base32Codec = createUuidV7SlugCodec({
      mask: { seed: "alpha-test-seed-0000" },
      outputAlphabet: "base32hex",
      sentinels: TEST_SENTINELS,
    });
    expect(generateDirectUuidV7Slug("base32hex")).toHaveLength(26);
    expect(generateDirectUuidV4Slug("base32hex")).toHaveLength(26);
    expect(codec.generateUuidV7CodecSlug()).toHaveLength(22);
    expect(codec.sentinels[0]?.slug).toHaveLength(22);
    expect(base32Codec.generateUuidV7CodecSlug()).toHaveLength(27);
    expect(base32Codec.sentinels[0]?.slug).toHaveLength(26);
  });

  it("answers rather than crashing when JavaScript passes an alphabet name TypeScript forbids", () => {
    // The union makes this unreachable from TypeScript, so the cast is the only way to reach the
    // branch — and the branch exists because a JS caller would otherwise index `undefined`.
    expect(uuidStringToDirectSlug(SAMPLE_V4, "base16" as SlugAlphabet)).toBeInstanceOf(Error);
  });

  it("reads either alphabet back without being told which", () => {
    // Decoding takes no alphabet because the two lengths are disjoint. That is what lets a system
    // change alphabet without invalidating a single slug it has already handed out.
    for (const uuid of [SAMPLE_V7_A, SAMPLE_V4])
      for (const [alphabet, length] of [
        ["base64url", 22],
        ["base32hex", 26],
      ] as const) {
        const slug = uuidStringToDirectSlug(uuid, alphabet);
        if (slug instanceof Error) throw slug;
        expect(slug).toHaveLength(length);
        expect(slugToUuidString(String(slug))).toBe(uuid);
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
    expect(codec.uuidToSlug(anonymousUser.uuid)).toBe("AAAAAAABcACAAAAAAAAAAA");
    expect(codec.slugToUuidString("AAAAAAACcACAAAAAAAAAAA")).toBe(unknownUser.uuid);
  });

  it("rejects a wrong mask unless the caller listed it as a previous one", () => {
    const first = deriveUuidV7Mask({ seed: "project-a-test-seed-0000" });
    const second = deriveUuidV7Mask({ seed: "project-b-test-seed-0000" });
    const third = deriveUuidV7Mask({ seed: "project-c-test-seed-0000" });
    if (first instanceof Error || second instanceof Error || third instanceof Error)
      throw new Error("mask creation failed");
    const a = createUuidV7SlugCodec({ mask: first });
    const b = createUuidV7SlugCodec({ mask: second });
    const slug = a.uuidToSlug(SAMPLE_V7_A);
    if (slug instanceof Error) throw slug;
    expect(b.slugToUuidString(slug)).toBeInstanceOf(Error);
    expect(
      createUuidV7SlugCodec({
        mask: second,
        previousMasks: [third, first],
      }).slugToUuidString(slug),
    ).toBe(SAMPLE_V7_A);
  });

  it("validates timestamps against the codec's OWN key, not the package's published one", () => {
    // This case fails if timestamp validation uses any mask other than the codec's selected key.
    const ids = createUuidV7SlugCodec({ mask: { seed: "not-the-published-one-test-seed-0000" } });
    const slug = ids.uuidToSlug(SAMPLE_V7_A);
    if (slug instanceof Error) throw slug;
    // `now` is pinned to the sample's own instant so the window, not the clock, decides.
    const at = extractUuidV7UnixMs(uuidStringToBytes(SAMPLE_V7_A) as Uint8Array) as number;
    expect(
      ids.validateUuidSlugUnixMs(slug, { maxTimestampDeltaMs: 86_400_000, referenceUnixMs: at }),
    ).toBe(slug);
    expect(
      ids.validateUuidSlugUnixMs(slug, {
        maxTimestampDeltaMs: 86_400_000,
        referenceUnixMs: at + 86_400_001,
      }),
    ).toBeInstanceOf(Error);
    // Both edges exactly, because the README says an id is refused when it sits OUTSIDE the
    // window — so the boundary itself is inside it, and nothing else says which. Relaxing either
    // comparison to its non-strict form left the suite green (measured 2026-08-12); an off-by-one
    // here silently expires ids a day early, or accepts ones a day stale.
    expect(
      ids.validateUuidSlugUnixMs(slug, {
        maxTimestampDeltaMs: 86_400_000,
        referenceUnixMs: at + 86_400_000,
      }),
    ).toBe(slug);
    expect(
      ids.validateUuidSlugUnixMs(slug, {
        maxTimestampDeltaMs: 86_400_000,
        referenceUnixMs: at - 86_400_000,
      }),
    ).toBe(slug);
  });

  it("rotates a seed without making the caller build a mask for the old one", () => {
    // Rotation is the whole reason the list exists, so listing a previous SEED must cost what
    // naming the current one costs. It used to demand a constructor and an error branch.
    const before = createUuidV7SlugCodec({ mask: { seed: "key-v1-test-seed-0000" } });
    const slug = before.uuidToSlug(SAMPLE_V7_A);
    if (slug instanceof Error) throw slug;
    const after = createUuidV7SlugCodec({
      mask: { seed: "key-v2-test-seed-0000" },
      previousMasks: [{ seed: "key-v1-test-seed-0000" }],
    });
    expect(after.slugToUuidString(slug)).toBe(SAMPLE_V7_A);
    // And the rotation actually rotated: new ids are issued under v2, not v1.
    expect(after.uuidToSlug(SAMPLE_V7_A)).not.toBe(slug);
  });

  it("refuses a caller's mask that does not reverse its own mixing step", () => {
    // A custom mask is the only extension point, and getting the inverse wrong is silent: encoding still
    // produces a slug, and every id issued under it is unreadable forever. So it must fail at
    // construction. Two distinct ways to get it wrong, because one probe cannot see both.
    const ignoresDirection = createCustomUuidV7Mask({
      diagnosticLabel: "one-way",
      mask: (input) => input.map((byte) => (byte + 1) & 0xff),
      unmask: (input) => input.map((byte) => (byte + 1) & 0xff),
    });
    // Reorders identically in both directions — the classic permutation-table mistake, and the
    // reason an all-zero probe alone is not enough: zeroes survive any reordering unchanged.
    const reordersBothWays = createCustomUuidV7Mask({
      diagnosticLabel: "same-both-ways",
      mask: (input) => input.map((_, i) => input[(i + 5) % 16] as number),
      unmask: (input) => input.map((_, i) => input[(i + 5) % 16] as number),
    });
    expect(ignoresDirection).toMatchObject({ code: "invalid_mask" });
    expect(reordersBothWays).toMatchObject({ code: "invalid_mask" });
    expect(createCodec({ mask: { seed: "fine-test-seed-0000" } })).not.toBeInstanceOf(Error);
  });

  it("refuses unknown custom-mask options instead of ignoring caller intent", () => {
    const result = Reflect.apply(createCustomUuidV7Mask, undefined, [
      {
        diagnosticLabel: "typo",
        mask: (input: Uint8Array) => input,
        unmask: (input: Uint8Array) => input,
        verifyInverse: true,
      },
    ]);
    expect(result).toMatchObject({ code: "invalid_mask" });
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
    expect(deriveUuidV7Mask(options)).toBeInstanceOf(Error);
  });

  it("derives a different key for a different iteration count, and the same one for a repeat", () => {
    // keyDerivationIterations is part of the key, not a tuning knob: this is what makes the wire-format
    // warning on it true rather than merely cautious.
    const uuid = "019ff19b-58b8-7000-9b1b-df713bd5562c";
    const slugAt = (keyDerivationIterations: number) => {
      const handle = deriveUuidV7Mask({
        seed: "rotation-seed-long-enough",
        keyDerivationIterations,
      });
      if (handle instanceof Error) throw handle;
      return createUuidV7SlugCodec({ mask: handle }).uuidToSlug(uuid);
    };
    expect(slugAt(1)).not.toBe(slugAt(2));
    expect(slugAt(3)).toBe(slugAt(3));
  });
});

describe("direct-slug migration", () => {
  // Nothing pinned this flag before, which is how a decode path got deleted as a "duplicate"
  // and how a mask combination that silently returns WRONG uuids went unnoticed. The cases
  // below are chosen to fail loudly if either recurs.
  it("decodes a plain UUIDv4 slug, which the v7 form cannot", () => {
    // The flag exists to migrate off unmasked ids, and those predate any decision to use v7.
    // `decode` rejecting them is correct; something has to accept them.
    const codec = createUuidV7SlugCodec({ mask: UUID_V7_TEST_MASK });
    const slug = uuidStringToDirectSlug(SAMPLE_V4);
    expect(
      codec.createMigrationDecoder({ acceptDirectSlug: true }).slugToUuidString(String(slug)),
    ).toBe(SAMPLE_V4);
    expect(codec.slugToUuidString(String(slug))).toBeInstanceOf(Error);
  });

  it("keeps wrong-key diagnosis out of an explicitly enabled plain migration", () => {
    // Ordinary decoding owns current masked identifiers and must report the wrong key. A separate
    // migration reader with `acceptDirectSlug: true` deliberately adds the overlapping direct interpretation;
    // it must return that candidate instead of changing ordinary codec behavior.
    const mine = deriveUuidV7Mask({
      diagnosticLabel: "feistel-only",
      seed: "the-key-in-use-test-seed-0000",
    });
    const theirs = deriveUuidV7Mask({
      diagnosticLabel: "feistel-only",
      seed: "a-different-key-test-seed-0000",
    });
    if (mine instanceof Error) throw mine;
    if (theirs instanceof Error) throw theirs;
    const foreign = String(createUuidV7SlugCodec({ mask: theirs }).uuidToSlug(SAMPLE_V7_A));

    const codec = createUuidV7SlugCodec({ mask: mine });
    const failure = codec.slugToUuidString(foreign);
    expect(failure).toBeInstanceOf(UuidSlugError);
    expect((failure as UuidSlugError).code).toBe("invalid_uuid_slug");
    expect(codec.createMigrationDecoder({ acceptDirectSlug: true }).slugToUuidString(foreign)).toBe(
      "1f04e7f5-c0c6-4044-b5a3-6278bb77ffb4",
    );
  });

  it("returns a base32hex slug it accepted as itself, not as a base64url one", () => {
    // Plain migration accepts both direct alphabets. Returning the original spelling preserves
    // storage identity; the packed type fixture separately proves that the input type is retained.
    const legacy = String(uuidStringToDirectSlug(SAMPLE_V7_A, "base32hex"));
    expect(legacy).toHaveLength(26);
    // `now` pinned to the sample's own instant, so the timestamp window is satisfied and the case
    // is about the returned VALUE rather than about the clock.
    const minted = extractUuidV7UnixMs(uuidStringToBytes(SAMPLE_V7_A) as Uint8Array) as number;
    expect(
      validateDirectUuidV7SlugUnixMs(legacy, {
        maxTimestampDeltaMs: 86_400_000,
        referenceUnixMs: minted,
      }),
    ).toBe(legacy);
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

// The v7 generator is pinned from several directions — `__test__/v7.test.ts` for the bit layout and
// the buffer bounds, `__test__/entropy.test.ts` for conformance across 2000 draws. The v4 path shares
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
