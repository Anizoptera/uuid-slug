// SPDX-License-Identifier: Apache-2.0

import { unwrap } from "../dev/unwrap";
type Api = typeof import("../src/index");
type PrivateV4Api = Pick<typeof import("../src/v4"), "generatePortableUuidV4">;
type PrivateAlphabetApi = Pick<
  typeof import("../src/alphabet"),
  "BASE32HEX" | "BASE64URL" | "decodeInto" | "encodePortable"
>;
export type ProfileValue = string | number | boolean | Uint8Array | Error | object;
export type ProfileCase = (index: number) => ProfileValue;

export interface ProfileSuite {
  readonly cases: Record<string, ProfileCase>;
  verify(): void;
}

/** Reject a corpus witness that does not reach its named success or failure path. */
export function assertProfileOutcome(name: string, value: ProfileValue): boolean {
  const expectedError = name.startsWith("invalid.");
  if (expectedError !== value instanceof Error)
    throw new Error(`Unexpected success/failure outcome for ${name}`, { cause: value });
  const expectedGuard = name.startsWith("guard.invalid.")
    ? false
    : name.startsWith("guard.") || undefined;
  if (expectedGuard !== undefined && value !== expectedGuard)
    throw new Error(`Guard corpus did not reach its named path: ${name}`);
  return expectedError;
}

interface OriginalFixture {
  readonly raw: string;
  readonly slug: string;
}

/** Build one public-operation corpus for every JavaScript runtime profiler. */
export function createProfileCases(
  api: Api,
  originalFixtures: readonly OriginalFixture[],
  privateV4Api: PrivateV4Api | undefined,
  privateAlphabetApi?: PrivateAlphabetApi,
): ProfileSuite {
  const instant = 1_725_000_000_000;
  const timestampWindow = { maxTimestampDeltaMs: 86_400_000, referenceUnixMs: instant };
  const sentinelTimestampWindow = { maxTimestampDeltaMs: 0, referenceUnixMs: 0 };
  const current = { seed: "profile-current-seed" };
  const previous = { seed: "profile-previous-seed" };
  const rotationMasks = Array.from({ length: 17 }, (_, index) =>
    unwrap(
      api.createUuidV7Mask({
        keyDerivationIterations: 1,
        seed: `profile-rotation-seed-${index}`,
      }),
    ),
  );
  const rotationWriters = rotationMasks.map((mask) => unwrap(api.createUuidV7SlugCodec({ mask })));
  const sentinelDefinitions = Array.from({ length: 64 }, (_, index) => ({
    name: `sentinel-${index}`,
    uuid: `00000000-0000-7000-8000-${index.toString(16).padStart(12, "0")}`,
  }));
  const sentinels = sentinelDefinitions.slice(0, 1);
  const codec = unwrap(api.createUuidV7SlugCodec({ mask: current, sentinels }));
  const sentinelCodec4 = unwrap(
    api.createUuidV7SlugCodec({ mask: current, sentinels: sentinelDefinitions.slice(0, 4) }),
  );
  const sentinelCodec8 = unwrap(
    api.createUuidV7SlugCodec({ mask: current, sentinels: sentinelDefinitions.slice(0, 8) }),
  );
  const sentinelCodec16 = unwrap(
    api.createUuidV7SlugCodec({ mask: current, sentinels: sentinelDefinitions.slice(0, 16) }),
  );
  const sentinelCodec64 = unwrap(
    api.createUuidV7SlugCodec({ mask: current, sentinels: sentinelDefinitions }),
  );
  const collidingSentinelDefinitions = Array.from({ length: 64 }, (_, index) => ({
    name: `colliding-sentinel-${index}`,
    uuid: `${index.toString(16).padStart(8, "0")}-0000-7000-8000-0000deadbeef`,
  }));
  const collidingSentinelCodec64 = unwrap(
    api.createUuidV7SlugCodec({ mask: current, sentinels: collidingSentinelDefinitions }),
  );
  const base32Codec = unwrap(
    api.createUuidV7SlugCodec({ mask: current, outputAlphabet: "base32hex", sentinels }),
  );
  const base32Sentinel = base32Codec.sentinels[0];
  const older = unwrap(api.createUuidV7SlugCodec({ mask: previous }));
  const customMask = unwrap(
    api.createCustomUuidV7Mask({
      label: "profile-xor",
      mask: (input) => input.map((byte) => byte ^ 0x5a),
      unmask: (input) => input.map((byte) => byte ^ 0x5a),
    }),
  );
  const customCodec = unwrap(api.createUuidV7SlugCodec({ mask: customMask }));
  let customFailureEnabled = false;
  const failingCustomMask = unwrap(
    api.createCustomUuidV7Mask({
      label: "profile-failing",
      mask: (input) => {
        if (customFailureEnabled) throw new Error("profile custom mask failure");
        return input;
      },
      unmask: (input) => {
        if (customFailureEnabled) throw new Error("profile custom mask failure");
        return input;
      },
    }),
  );
  const failingCustomCodec = unwrap(api.createUuidV7SlugCodec({ mask: failingCustomMask }));
  const collisionMaskBytes = Uint8Array.of(
    0xc9,
    0x9f,
    0xf1,
    0x9b,
    0x58,
    0xb8,
    0x90,
    0x00,
    0x5b,
    0x1b,
    0xdf,
    0x71,
    0x3b,
    0xd5,
    0x56,
    0x07,
  );
  const collisionMask = unwrap(
    api.createCustomUuidV7Mask({
      label: "profile-sentinel-collision",
      mask: (input) => input.map((byte, index) => byte ^ (collisionMaskBytes[index] as number)),
      unmask: (input) => input.map((byte, index) => byte ^ (collisionMaskBytes[index] as number)),
    }),
  );
  const collisionInput = "019ff19b-58b8-7000-9b1b-df713bd55607";
  const collisionCodec = unwrap(
    api.createUuidV7SlugCodec({ mask: collisionMask, sentinels: sentinelDefinitions.slice(0, 1) }),
  );
  const collisionBase32Codec = unwrap(
    api.createUuidV7SlugCodec({
      mask: collisionMask,
      outputAlphabet: "base32hex",
      sentinels: sentinelDefinitions.slice(0, 1),
    }),
  );
  const rotated = unwrap(api.createUuidV7SlugCodec({ mask: current, previousMasks: [previous] }));
  const migration = rotated.createMigrationDecoder({ originalMask: true, plainSlug: true });
  const maskedOnlyMigration = codec.createMigrationDecoder();
  const originals = originalFixtures.filter(({ slug, raw }) => slug !== raw);
  const portable = api.createUuidV7Generator({ clock: () => instant });
  let advancingMs = instant;
  const portableAdvancing = api.createUuidV7Generator({ clock: () => (advancingMs += 1) });
  let rollingBackMs = instant;
  const portableRollingBack = api.createUuidV7Generator({ clock: () => (rollingBackMs -= 1) });
  const portableSlug = (alphabet: "base64url" | "base32hex") => {
    const value = portable.generateUuidV7Bytes();
    return value instanceof Error ? value : api.bytesToSlug(value, alphabet);
  };
  const profileUuid = (index: number) => {
    const time = (instant + index).toString(16).padStart(12, "0");
    const a = ((index * 251) & 4095).toString(16).padStart(3, "0");
    const b = (0x8000 | ((index * 31337) & 16383)).toString(16);
    const tail = (Math.imul(index + 1, 0x9e3779b1) >>> 0).toString(16).padStart(8, "0");
    return `${time.slice(0, 8)}-${time.slice(8)}-7${a}-${b}-${tail}${index.toString(16).padStart(4, "0")}`;
  };
  const ids = Array.from({ length: 256 }, (_, index) => profileUuid(index));
  const bytes = ids.map((id) => unwrap(api.uuidToBytes(id)));
  const sentinelBytes = sentinelDefinitions.map(({ uuid }) => unwrap(api.uuidToBytes(uuid)));
  const collidingSentinelBytes = collidingSentinelDefinitions.map(({ uuid }) =>
    unwrap(api.uuidToBytes(uuid)),
  );
  const collidingSentinelMiss = unwrap(api.uuidToBytes("00000040-0000-7000-8000-0000deadbeef"));
  const slugs = ids.map((id) => unwrap(api.uuidToSlug(id)));
  const identityMask = unwrap(
    api.createCustomUuidV7Mask({
      label: "profile-candidate-identity",
      mask: (input) => input,
      unmask: (input) => input,
    }),
  );
  const identityCodec = unwrap(api.createUuidV7SlugCodec({ mask: identityMask }));
  const overlapEntries: { uuid: string; slug: string }[] = [];
  let overlapTail: string | undefined;
  for (let index = 0; index < 4096 && overlapEntries.length < 64; index += 1) {
    const uuid = profileUuid(index);
    const slug = unwrap(identityCodec.encodeUuid(uuid));
    overlapTail ??= slug.at(-1);
    if (slug.at(-1) === overlapTail) overlapEntries.push({ uuid, slug });
  }
  if (overlapEntries.length !== 64) throw new Error("Insufficient migration overlap fixtures");
  const base64url = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  // Clear the four external check bits so the public plain-slug decoder exposes each ciphertext.
  const mixedBytes = (slug: string) => {
    const last = base64url.indexOf(slug[21]!);
    if (last < 0) throw new Error("Invalid migration overlap fixture");
    return unwrap(api.slugToBytes(slug.slice(0, 21) + base64url[last & 0x30]));
  };
  const overlapSlug = overlapEntries[0]!.slug;
  const overlapBytes = mixedBytes(overlapSlug);
  const overlapMasks = overlapEntries.map(({ slug }, index) => {
    const encoded = mixedBytes(slug);
    const key = encoded.map((byte, offset) => byte ^ overlapBytes[offset]!);
    return unwrap(
      api.createCustomUuidV7Mask({
        label: `profile-candidate-${index}`,
        mask: (input) => input.map((byte, offset) => byte ^ key[offset]!),
        unmask: (input) => input.map((byte, offset) => byte ^ key[offset]!),
      }),
    );
  });
  if (
    privateAlphabetApi &&
    privateAlphabetApi.encodePortable(bytes[0] as Uint8Array, privateAlphabetApi.BASE64URL) !==
      slugs[0]
  )
    throw new Error("Portable base64url encoding differs from the public canonical spelling");
  const base32 = ids.map((id) => unwrap(api.uuidToSlug(id, "base32hex")));
  if (
    privateAlphabetApi &&
    privateAlphabetApi.encodePortable(bytes[0] as Uint8Array, privateAlphabetApi.BASE32HEX) !==
      base32[0]
  )
    throw new Error("Portable base32hex encoding differs from the public canonical spelling");
  const masked = ids.map((id) => unwrap(codec.encodeUuid(id)));
  const maskedBase32 = ids.map((id) => unwrap(base32Codec.encodeUuid(id)));
  const maskedCustom = bytes.map((value) => unwrap(customCodec.encodeUuid(value)));
  const oldOnly = ids
    .map((id) => unwrap(older.encodeUuid(id)))
    .filter((slug) => codec.decodeSlug(slug) instanceof Error);
  if (oldOnly.length === 0) throw new Error("No previous-key-only fixtures");
  const rotationFixture = (count: number) => {
    const masks = rotationMasks.slice(0, count);
    const reader = unwrap(api.createUuidV7SlugCodec({ mask: current, previousMasks: masks }));
    const lastWriter = rotationWriters[count - 1]!;
    const missWriter = rotationWriters[16]!;
    const last = ids
      .map((id) => unwrap(lastWriter.encodeUuid(id)))
      .find((slug) => {
        return [codec, ...rotationWriters.slice(0, count - 1)].every(
          (candidate) => candidate.decodeSlug(slug) instanceof Error,
        );
      });
    const miss = ids
      .map((id) => unwrap(missWriter.encodeUuid(id)))
      .find((slug) => {
        return reader.decodeSlug(slug) instanceof Error;
      });
    if (!last || !miss) throw new Error(`No rotation fixture for ${count} previous keys`);
    return { reader, last, miss };
  };
  const rotation4 = rotationFixture(4);
  const rotation8 = rotationFixture(8);
  const rotation16 = rotationFixture(16);
  const migrationFixture = (count: 1 | 4 | 8 | 16) => {
    const masks = rotationMasks.slice(0, count);
    const migrationCodec = unwrap(
      api.createUuidV7SlugCodec({ mask: masks[0]!, previousMasks: masks.slice(1) }),
    );
    const positions = [0, Math.floor(count / 2), count - 1];
    const migrationSlugs = positions.map((position) => {
      const writer = rotationWriters[position]!;
      const slug = ids
        .map((id) => unwrap(writer.encodeUuid(id)))
        .find((value) =>
          rotationWriters
            .slice(0, position)
            .every((earlier) => earlier.decodeSlug(value) instanceof Error),
        );
      if (!slug) throw new Error(`No migration fixture for schema ${position} of ${count}`);
      return slug;
    });
    const miss = ids
      .map((id) => unwrap(rotationWriters[16]!.encodeUuid(id)))
      .find((value) => migrationCodec.decodeSlug(value) instanceof Error);
    if (!miss) throw new Error(`No migration miss fixture for ${count} schemas`);
    return {
      reader: migrationCodec.createMigrationDecoder(),
      first: migrationSlugs[0]!,
      middle: migrationSlugs[1]!,
      last: migrationSlugs[2]!,
      miss,
    };
  };
  const migration1 = migrationFixture(1);
  const migration4 = migrationFixture(4);
  const migration8 = migrationFixture(8);
  const migration16 = migrationFixture(16);
  const candidateFixtures = [1, 4, 8, 16, 32, 64].map((count) => {
    const distinct = unwrap(
      api.createUuidV7SlugCodec({
        mask: overlapMasks[0]!,
        previousMasks: overlapMasks.slice(1, count),
      }),
    ).createMigrationDecoder();
    const duplicate = unwrap(
      api.createUuidV7SlugCodec({
        mask: overlapMasks[0]!,
        previousMasks: Array.from({ length: count - 1 }, () => overlapMasks[0]!),
      }),
    ).createMigrationDecoder();
    return { count, distinct, duplicate };
  });
  const into = new Uint8Array(24);
  const portableDecodeInto = new Uint8Array(16);
  if (privateAlphabetApi) {
    for (const [value, alpha] of [
      [slugs[0], privateAlphabetApi.BASE64URL],
      [base32[0], privateAlphabetApi.BASE32HEX],
    ] as const) {
      const tail = privateAlphabetApi.decodeInto(value as string, alpha, portableDecodeInto, 0, 16);
      if (tail !== 0 || portableDecodeInto.join(",") !== (bytes[0] as Uint8Array).join(","))
        throw new Error(`Portable ${alpha.name} decoding differs from the public canonical value`);
    }
  }
  const sentinel = codec.sentinels[0];
  if (!sentinel) throw new Error("Missing sentinel fixture");
  const badUuid = "z".repeat(36);
  const validUuid = ids[0] as string;
  const invalidUuidHex = [0, 16, 35].map(
    (position) => `${validUuid.slice(0, position)}!${validUuid.slice(position + 1)}`,
  );
  const badSlug = "!".repeat(22);
  const invalidBase64Slugs = [0, 11, 21].map(
    (position) => `${slugs[0]!.slice(0, position)}!${slugs[0]!.slice(position + 1)}`,
  );
  const invalidBase32Slugs = [0, 13, 25].map(
    (position) => `${base32[0]!.slice(0, position)}w${base32[0]!.slice(position + 1)}`,
  );
  const invalidBase64Tail = `${slugs[0]!.slice(0, 21)}${privateAlphabetApi?.BASE64URL.chars[1] ?? "B"}`;
  const invalidBase32Tail = `${base32[0]!.slice(0, 25)}1`;
  const v4Uuid = "3b12f1df-5232-4804-897e-917bf397618a";
  const v4Bytes = unwrap(api.uuidToBytes(v4Uuid));
  const v4Slug = unwrap(api.uuidToSlug(v4Uuid));
  const outsideTimestampWindow = { maxTimestampDeltaMs: 0, referenceUnixMs: instant + 1 };
  if (!base32Sentinel) throw new Error("Missing base32 sentinel fixture");
  customFailureEnabled = true;

  const migrationScalingCases: Record<string, ProfileCase> = {};
  for (const [count, fixture] of [
    [1, migration1],
    [4, migration4],
    [8, migration8],
    [16, migration16],
  ] as const) {
    migrationScalingCases[`migration.schemas${count}.first`] = () =>
      fixture.reader.decodeSlug(fixture.first);
    migrationScalingCases[`migration.schemas${count}.middle`] = () =>
      fixture.reader.decodeSlug(fixture.middle);
    migrationScalingCases[`migration.schemas${count}.last`] = () =>
      fixture.reader.decodeSlug(fixture.last);
    migrationScalingCases[`invalid.migration.schemas${count}.miss`] = () =>
      fixture.reader.decodeSlug(fixture.miss);
    migrationScalingCases[`migration.schemas${count}.candidates`] = () =>
      fixture.reader.decodeSlugCandidates(fixture.first);
  }
  for (const { count, distinct, duplicate } of candidateFixtures) {
    const distinctWitness = distinct.decodeSlugCandidates(overlapSlug);
    const duplicateWitness = duplicate.decodeSlugCandidates(overlapSlug);
    if (
      distinctWitness instanceof Error ||
      duplicateWitness instanceof Error ||
      distinctWitness.length !== count ||
      duplicateWitness.length !== 1
    )
      throw new Error(
        `Migration candidate fixture did not yield ${count} distinct and one duplicate`,
      );
    migrationScalingCases[`migration.candidates${count}.distinct`] = () =>
      distinct.decodeSlugCandidates(overlapSlug);
    migrationScalingCases[`migration.candidates${count}.duplicate`] = () =>
      duplicate.decodeSlugCandidates(overlapSlug);
  }

  const cases = {
    ...migrationScalingCases,
    control: (index) => ids[index & 255] as string,
    "v4.string": () => api.generateUuidV4(),
    ...(privateV4Api ? { "portable.v4.string": () => privateV4Api.generatePortableUuidV4() } : {}),
    ...(privateAlphabetApi
      ? {
          "portable.base64.encode": (index: number) =>
            privateAlphabetApi.encodePortable(
              bytes[index & 255] as Uint8Array,
              privateAlphabetApi.BASE64URL,
            ),
          "portable.base32.encode": (index: number) =>
            privateAlphabetApi.encodePortable(
              bytes[index & 255] as Uint8Array,
              privateAlphabetApi.BASE32HEX,
            ),
          "portable.base64.decode": (index: number) =>
            privateAlphabetApi.decodeInto(
              slugs[index & 255] as string,
              privateAlphabetApi.BASE64URL,
              portableDecodeInto,
              0,
              16,
            ),
          "portable.base32.decode": (index: number) =>
            privateAlphabetApi.decodeInto(
              base32[index & 255] as string,
              privateAlphabetApi.BASE32HEX,
              portableDecodeInto,
              0,
              16,
            ),
        }
      : {}),
    "v7.string": () => api.generateUuidV7(),
    "v4.bytes": () => api.generateUuidV4Bytes(),
    "v4.into": () => api.generateUuidV4Bytes(into, 4),
    "v7.bytes": () => api.generateUuidV7Bytes(),
    "v7.into": () => api.generateUuidV7Bytes(into, 4),
    "v7.at": (index) => api.generateUuidV7At(instant + (index & 255)),
    "v7.at.bytes": (index) => api.generateUuidV7BytesAt(instant + (index & 255)),
    "v7.at.into": (index) => api.generateUuidV7BytesAt(instant + (index & 255), into, 4),
    "portable.string": () => portable.generateUuidV7(),
    "portable.bytes": () => portable.generateUuidV7Bytes(),
    "portable.into": () => portable.generateUuidV7Bytes(into, 4),
    "portable.at": (index) => portable.generateUuidV7At(instant + (index & 255)),
    "portable.at.bytes": (index) => portable.generateUuidV7BytesAt(instant + (index & 255)),
    "portable.at.into": (index) => portable.generateUuidV7BytesAt(instant + (index & 255), into, 4),
    "portable.slug": () => portableSlug("base64url"),
    "portable.base32": () => portableSlug("base32hex"),
    // Advancing and rollback clocks select opposite state-machine edges; a fixed clock covers only
    // same-millisecond continuation even though all three routes write the same UUID layout.
    "portable.advance.into": () => portableAdvancing.generateUuidV7Bytes(into, 4),
    "portable.rollback.into": () => portableRollingBack.generateUuidV7Bytes(into, 4),
    "construct.generator": () => api.createUuidV7Generator({ clock: () => instant }),
    "construct.generator.default": () => api.createUuidV7Generator({}),
    "v4.slug": () => api.generateUuidV4Slug(),
    "v4.base32": () => api.generateUuidV4Slug("base32hex"),
    "v7.slug": () => api.generateUuidV7Slug(),
    "v7.base32": () => api.generateUuidV7Slug("base32hex"),
    parse: (index) => api.uuidToBytes(ids[index & 255] as string),
    "parse.into": (index) => api.uuidToBytes(ids[index & 255] as string, into, 4),
    format: (index) => api.bytesToUuid(bytes[index & 255] as Uint8Array),
    "format.offset": (index) => {
      into.set(bytes[index & 255] as Uint8Array, 4);
      return api.bytesToUuid(into, 4);
    },
    "bytes.base64": (index) => api.bytesToSlug(bytes[index & 255] as Uint8Array),
    "bytes.base32": (index) => api.bytesToSlug(bytes[index & 255] as Uint8Array, "base32hex"),
    "bytes.offset.base64": (index) => {
      into.set(bytes[index & 255] as Uint8Array, 4);
      return api.bytesToSlug(into, 4);
    },
    "bytes.offset.base32": (index) => {
      into.set(bytes[index & 255] as Uint8Array, 4);
      return api.bytesToSlug(into, 4, "base32hex");
    },
    "plain.encode": (index) => api.uuidToSlug(ids[index & 255] as string),
    "plain.decode": (index) => api.slugToUuid(slugs[index & 255] as string),
    "base32.encode": (index) => api.uuidToSlug(ids[index & 255] as string, "base32hex"),
    "base32.decode": (index) => api.slugToUuid(base32[index & 255] as string),
    "slug.bytes": (index) => api.slugToBytes(slugs[index & 255] as string),
    "slug.base32.bytes": (index) => api.slugToBytes(base32[index & 255] as string),
    "slug.into": (index) => api.slugToBytes(slugs[index & 255] as string, into, 4),
    "slug.base32.into": (index) => api.slugToBytes(base32[index & 255] as string, into, 4),
    "guard.uuid.any": (index) => api.isUuidString(ids[index & 255]),
    "guard.uuid.v4": () => api.isUuidV4String(v4Uuid),
    "guard.invalid.uuid": () => api.isUuidV7String(badUuid),
    "guard.invalid.slug": () => api.isUuidV7Slug(badSlug),
    "guard.uuid": (index) => api.isUuidV7String(ids[index & 255]),
    "guard.bytes.any": (index) => api.isUuidBytes(bytes[index & 255]),
    "guard.bytes.v4": () =>
      api.isUuidV4Bytes(
        Uint8Array.of(59, 18, 241, 223, 82, 50, 72, 4, 137, 126, 145, 123, 243, 151, 97, 138),
      ),
    "guard.bytes.v7": (index) => api.isUuidV7Bytes(bytes[index & 255]),
    "guard.slug.any": (index) => api.isUuidSlug(slugs[index & 255]),
    "guard.slug.v4": () => api.isUuidV4Slug("OxLx31IySASJfpF785dhig"),
    "guard.slug": (index) => api.isUuidV7Slug(slugs[index & 255]),
    "timestamp.uuid": (index) =>
      api.validateUuidV7Timestamp(ids[index & 255] as string, timestampWindow),
    "timestamp.slug": (index) =>
      api.validateUuidV7SlugTimestamp(slugs[index & 255] as string, timestampWindow),
    "timestamp.extract": (index) => api.extractUuidV7Timestamp(bytes[index & 255] as Uint8Array),
    "timestamp.extract.offset": (index) => {
      into.set(bytes[index & 255] as Uint8Array, 4);
      return api.extractUuidV7Timestamp(into, 4);
    },
    "timestamp.extract.uuid": (index) => api.extractUuidV7Timestamp(ids[index & 255] as string),
    "timestamp.extract.slug": (index) => api.extractUuidV7Timestamp(slugs[index & 255] as string),
    "timestamp.extract.slug.base32": (index) =>
      api.extractUuidV7Timestamp(base32[index & 255] as string),
    "timestamp.extract.masked": (index) =>
      codec.extractSlugTimestamp(masked[index & 255] as string),
    "timestamp.extract.masked.base32": (index) =>
      base32Codec.extractSlugTimestamp(maskedBase32[index & 255] as string),
    "timestamp.masked": (index) =>
      codec.validateSlugTimestamp(masked[index & 255] as string, timestampWindow),
    "timestamp.masked.base32": (index) =>
      base32Codec.validateSlugTimestamp(maskedBase32[index & 255] as string, timestampWindow),
    "masked.generate": () => codec.generateSlug(),
    "masked.base32.generate": () => base32Codec.generateSlug(),
    "masked.encode": (index) => codec.encodeUuid(ids[index & 255] as string),
    "masked.encode.bytes": (index) => codec.encodeUuid(bytes[index & 255] as Uint8Array),
    "masked.decode": (index) => codec.decodeSlug(masked[index & 255] as string),
    "masked.decode.bytes": (index) => codec.decodeSlugToBytes(masked[index & 255] as string),
    "masked.decode.into": (index) =>
      codec.decodeSlugToBytes(masked[index & 255] as string, into, 4),
    "masked.base32.encode": (index) => base32Codec.encodeUuid(ids[index & 255] as string),
    "masked.base32.encode.bytes": (index) =>
      base32Codec.encodeUuid(bytes[index & 255] as Uint8Array),
    "masked.base32.decode": (index) => base32Codec.decodeSlug(maskedBase32[index & 255] as string),
    "masked.base32.decode.bytes": (index) =>
      base32Codec.decodeSlugToBytes(maskedBase32[index & 255] as string),
    "masked.base32.decode.into": (index) =>
      base32Codec.decodeSlugToBytes(maskedBase32[index & 255] as string, into, 4),
    "masked.custom.encode": (index) => customCodec.encodeUuid(bytes[index & 255] as Uint8Array),
    "masked.custom.decode": (index) => customCodec.decodeSlug(maskedCustom[index & 255] as string),
    "masked.custom.decode.bytes": (index) =>
      customCodec.decodeSlugToBytes(maskedCustom[index & 255] as string),
    "masked.custom.decode.into": (index) =>
      customCodec.decodeSlugToBytes(maskedCustom[index & 255] as string, into, 4),
    "rotation.current": (index) => rotated.decodeSlug(masked[index & 255] as string),
    "rotation.previous": (index) => rotated.decodeSlug(oldOnly[index % oldOnly.length] as string),
    "rotation.current.bytes": (index) => rotated.decodeSlugToBytes(masked[index & 255] as string),
    "rotation.previous.bytes": (index) =>
      rotated.decodeSlugToBytes(oldOnly[index % oldOnly.length] as string),
    "rotation4.current": (index) => rotation4.reader.decodeSlug(masked[index & 255] as string),
    "rotation4.last": () => rotation4.reader.decodeSlug(rotation4.last),
    "invalid.rotation4.miss": () => rotation4.reader.decodeSlug(rotation4.miss),
    "rotation8.current": (index) => rotation8.reader.decodeSlug(masked[index & 255] as string),
    "rotation8.last": () => rotation8.reader.decodeSlug(rotation8.last),
    "invalid.rotation8.miss": () => rotation8.reader.decodeSlug(rotation8.miss),
    "rotation16.current": (index) => rotation16.reader.decodeSlug(masked[index & 255] as string),
    "rotation16.last": () => rotation16.reader.decodeSlug(rotation16.last),
    "invalid.rotation16.miss": () => rotation16.reader.decodeSlug(rotation16.miss),
    "migration.current": (index) => migration.decodeSlug(masked[index & 255] as string),
    "migration.previous": (index) =>
      migration.decodeSlug(oldOnly[index % oldOnly.length] as string),
    "migration.decodeCandidates": (index) =>
      migration.decodeSlugCandidates(masked[index & 255] as string),
    "migration.previousCandidates": (index) =>
      migration.decodeSlugCandidates(oldOnly[index % oldOnly.length] as string),
    "migration.plain": (index) => migration.decodeSlug(slugs[index & 255] as string, "plain-slug"),
    "migration.base32": (index) =>
      migration.decodeSlug(base32[index & 255] as string, "plain-slug"),
    "migration.base32Candidates": (index) =>
      migration.decodeSlugCandidates(base32[index & 255] as string, "plain-slug"),
    "migration.original": (index) =>
      migration.decodeSlug(originals[index % originals.length]!.slug, "original-mask"),
    "migration.plainCandidates": (index) =>
      migration.decodeSlugCandidates(slugs[index & 255] as string, "plain-slug"),
    "migration.originalCandidates": (index) =>
      migration.decodeSlugCandidates(originals[index % originals.length]!.slug, "original-mask"),
    "invalid.migration": () => maskedOnlyMigration.decodeSlug(badSlug),
    "invalid.migrationCandidates": () => maskedOnlyMigration.decodeSlugCandidates(badSlug),
    "sentinel.encode": () => codec.encodeUuid(sentinel.uuid),
    "sentinel.encode.bytes": () => codec.encodeUuid(sentinelBytes[0] as Uint8Array),
    "sentinel.encode.bytes.miss": () => codec.encodeUuid(bytes[255] as Uint8Array),
    "sentinel.decode": () => codec.decodeSlug(sentinel.slug),
    "sentinel.decode.bytes": () => codec.decodeSlugToBytes(sentinel.slug),
    "sentinel.decode.into": () => codec.decodeSlugToBytes(sentinel.slug, into, 4),
    "sentinel.timestamp": () => codec.validateSlugTimestamp(sentinel.slug, sentinelTimestampWindow),
    "sentinel.base32.encode": () => base32Codec.encodeUuid(base32Sentinel.uuid),
    "sentinel.base32.decode": () => base32Codec.decodeSlug(base32Sentinel.slug),
    "sentinel.base32.decode.bytes": () => base32Codec.decodeSlugToBytes(base32Sentinel.slug),
    "sentinel.base32.decode.into": () =>
      base32Codec.decodeSlugToBytes(base32Sentinel.slug, into, 4),
    "sentinel.base32.timestamp": () =>
      base32Codec.validateSlugTimestamp(base32Sentinel.slug, sentinelTimestampWindow),
    "sentinel.scan4.first": () => sentinelCodec4.encodeUuid(sentinelDefinitions[0]!.uuid),
    "sentinel.scan4.middle": () => sentinelCodec4.encodeUuid(sentinelDefinitions[2]!.uuid),
    "sentinel.scan4.last": () => sentinelCodec4.encodeUuid(sentinelDefinitions[3]!.uuid),
    "sentinel.scan4.miss": () => sentinelCodec4.encodeUuid(ids[255] as string),
    "sentinel.scan4.bytes.first": () => sentinelCodec4.encodeUuid(sentinelBytes[0] as Uint8Array),
    "sentinel.scan4.bytes.middle": () => sentinelCodec4.encodeUuid(sentinelBytes[2] as Uint8Array),
    "sentinel.scan4.bytes.last": () => sentinelCodec4.encodeUuid(sentinelBytes[3] as Uint8Array),
    "sentinel.scan4.bytes.miss": () => sentinelCodec4.encodeUuid(bytes[255] as Uint8Array),
    "sentinel.scan8.first": () => sentinelCodec8.encodeUuid(sentinelDefinitions[0]!.uuid),
    "sentinel.scan8.middle": () => sentinelCodec8.encodeUuid(sentinelDefinitions[4]!.uuid),
    "sentinel.scan8.last": () => sentinelCodec8.encodeUuid(sentinelDefinitions[7]!.uuid),
    "sentinel.scan8.miss": () => sentinelCodec8.encodeUuid(ids[255] as string),
    "sentinel.scan8.bytes.first": () => sentinelCodec8.encodeUuid(sentinelBytes[0] as Uint8Array),
    "sentinel.scan8.bytes.middle": () => sentinelCodec8.encodeUuid(sentinelBytes[4] as Uint8Array),
    "sentinel.scan8.bytes.last": () => sentinelCodec8.encodeUuid(sentinelBytes[7] as Uint8Array),
    "sentinel.scan8.bytes.miss": () => sentinelCodec8.encodeUuid(bytes[255] as Uint8Array),
    "sentinel.scan16.first": () => sentinelCodec16.encodeUuid(sentinelDefinitions[0]!.uuid),
    "sentinel.scan16.middle": () => sentinelCodec16.encodeUuid(sentinelDefinitions[8]!.uuid),
    "sentinel.scan16.last": () => sentinelCodec16.encodeUuid(sentinelDefinitions[15]!.uuid),
    "sentinel.scan16.miss": () => sentinelCodec16.encodeUuid(ids[255] as string),
    "sentinel.scan16.bytes.first": () => sentinelCodec16.encodeUuid(sentinelBytes[0] as Uint8Array),
    "sentinel.scan16.bytes.middle": () =>
      sentinelCodec16.encodeUuid(sentinelBytes[8] as Uint8Array),
    "sentinel.scan16.bytes.last": () => sentinelCodec16.encodeUuid(sentinelBytes[15] as Uint8Array),
    "sentinel.scan16.bytes.miss": () => sentinelCodec16.encodeUuid(bytes[255] as Uint8Array),
    "sentinel.scan64.first": () => sentinelCodec64.encodeUuid(sentinelDefinitions[0]!.uuid),
    "sentinel.scan64.middle": () => sentinelCodec64.encodeUuid(sentinelDefinitions[32]!.uuid),
    "sentinel.scan64.last": () => sentinelCodec64.encodeUuid(sentinelDefinitions[63]!.uuid),
    "sentinel.scan64.miss": () => sentinelCodec64.encodeUuid(ids[255] as string),
    "sentinel.scan64.bytes.first": () => sentinelCodec64.encodeUuid(sentinelBytes[0] as Uint8Array),
    "sentinel.scan64.bytes.middle": () =>
      sentinelCodec64.encodeUuid(sentinelBytes[32] as Uint8Array),
    "sentinel.scan64.bytes.last": () => sentinelCodec64.encodeUuid(sentinelBytes[63] as Uint8Array),
    "sentinel.scan64.bytes.miss": () => sentinelCodec64.encodeUuid(bytes[255] as Uint8Array),
    "sentinel.collision64.bytes.first": () =>
      collidingSentinelCodec64.encodeUuid(collidingSentinelBytes[0] as Uint8Array),
    "sentinel.collision64.bytes.middle": () =>
      collidingSentinelCodec64.encodeUuid(collidingSentinelBytes[32] as Uint8Array),
    "sentinel.collision64.bytes.last": () =>
      collidingSentinelCodec64.encodeUuid(collidingSentinelBytes[63] as Uint8Array),
    "sentinel.collision64.bytes.miss": () =>
      collidingSentinelCodec64.encodeUuid(collidingSentinelMiss),
    "invalid.uuid": () => api.uuidToBytes(badUuid),
    "invalid.uuid.hex.early": () => api.uuidToBytes(invalidUuidHex[0] as string),
    "invalid.uuid.hex.middle": () => api.uuidToBytes(invalidUuidHex[1] as string),
    "invalid.uuid.hex.late": () => api.uuidToBytes(invalidUuidHex[2] as string),
    "invalid.uuid.slug": () => api.uuidToSlug(badUuid),
    "invalid.uuid.into.range": () => api.uuidToBytes(ids[0] as string, into, 9),
    "invalid.uuid.format.range": () => api.bytesToUuid(into, 9),
    "invalid.slug.format.range": () => api.bytesToSlug(into, 9),
    "invalid.timestamp.extract.range": () => api.extractUuidV7Timestamp(into, 9),
    "invalid.slug": () => api.slugToBytes(badSlug),
    "invalid.slug.base64.early": () => api.slugToBytes(invalidBase64Slugs[0] as string),
    "invalid.slug.base64.middle": () => api.slugToBytes(invalidBase64Slugs[1] as string),
    "invalid.slug.base64.late": () => api.slugToBytes(invalidBase64Slugs[2] as string),
    "invalid.slug.base64.tail": () => api.slugToBytes(invalidBase64Tail),
    "invalid.slug.base32.early": () => api.slugToBytes(invalidBase32Slugs[0] as string),
    "invalid.slug.base32.middle": () => api.slugToBytes(invalidBase32Slugs[1] as string),
    "invalid.slug.base32.late": () => api.slugToBytes(invalidBase32Slugs[2] as string),
    "invalid.slug.base32.tail": () => api.slugToBytes(invalidBase32Tail),
    "invalid.slug.uuid": () => api.slugToUuid(badSlug),
    "invalid.slug.into.range": () => api.slugToBytes(slugs[0] as string, into, 9),
    "invalid.mask.into.range": () => codec.decodeSlugToBytes(masked[0] as string, into, 9),
    "invalid.alphabet": () =>
      Reflect.apply(api.uuidToSlug, undefined, [ids[0] as string, "invalid-alphabet"]),
    "invalid.v4.into.range": () => api.generateUuidV4Bytes(into, 9),
    "invalid.v7.into.range": () => api.generateUuidV7Bytes(into, 9),
    "invalid.v7.at.into.range": () => api.generateUuidV7BytesAt(instant, into, 9),
    "invalid.mask": (index) => codec.decodeSlug(oldOnly[index % oldOnly.length] as string),
    "invalid.mask.version": () => codec.encodeUuid(v4Bytes),
    "invalid.mask.custom": () => failingCustomCodec.encodeUuid(bytes[0] as Uint8Array),
    "invalid.mask.sentinel-collision": () => collisionCodec.encodeUuid(collisionInput),
    "invalid.mask.sentinel-collision.base32": () => collisionBase32Codec.encodeUuid(collisionInput),
    "invalid.timestamp.version": () => api.validateUuidV7Timestamp(v4Uuid, timestampWindow),
    "invalid.timestamp.window": () =>
      api.validateUuidV7Timestamp(ids[0] as string, outsideTimestampWindow),
    "invalid.timestamp.slug.version": () =>
      api.validateUuidV7SlugTimestamp(v4Slug, timestampWindow),
    "invalid.timestamp.slug.window": () =>
      api.validateUuidV7SlugTimestamp(slugs[0] as string, outsideTimestampWindow),
    "invalid.construct.schema": () => api.createUuidV7Mask({ seed: "" }),
    "invalid.construct.custom": () =>
      api.createCustomUuidV7Mask({
        label: "profile-invalid",
        mask: () => new Uint8Array(15),
        unmask: (input) => input,
      }),
    "invalid.construct.generator": () =>
      Reflect.apply(api.createUuidV7Generator, undefined, [null]),
    "invalid.construct.codec.sentinel": () =>
      api.createUuidV7SlugCodec({
        mask: current,
        sentinels: [sentinelDefinitions[0]!, { ...sentinelDefinitions[1]!, name: "sentinel-0" }],
      }),
    "error.classify": () => api.isUuidSlugError(api.uuidToBytes(badUuid)),
    "construct.codec": () => api.createUuidV7SlugCodec({ mask: current }),
    "construct.schema": () => api.createUuidV7Mask(current),
    "construct.schema.bytes": () =>
      api.createUuidV7Mask({ seed: new Uint8Array(16), keyDerivationIterations: 1 }),
    "construct.schema.iterated": () =>
      api.createUuidV7Mask({ ...current, keyDerivationIterations: 8 }),
    "construct.codec.rotation": () =>
      api.createUuidV7SlugCodec({
        mask: current,
        previousMasks: [previous, { seed: "profile-third-seed" }],
      }),
    "construct.codec.sentinels": () => api.createUuidV7SlugCodec({ mask: current, sentinels }),
    "construct.codec.sentinels4": () =>
      api.createUuidV7SlugCodec({ mask: current, sentinels: sentinelDefinitions.slice(0, 4) }),
    "construct.codec.sentinels8": () =>
      api.createUuidV7SlugCodec({ mask: current, sentinels: sentinelDefinitions.slice(0, 8) }),
    "construct.codec.sentinels16": () =>
      api.createUuidV7SlugCodec({ mask: current, sentinels: sentinelDefinitions.slice(0, 16) }),
    "construct.codec.sentinels64": () =>
      api.createUuidV7SlugCodec({ mask: current, sentinels: sentinelDefinitions }),
    "construct.migration.current": () => codec.createMigrationDecoder(),
    "construct.migration.plain": () => codec.createMigrationDecoder({ plainSlug: true }),
    "construct.migration.original": () => codec.createMigrationDecoder({ originalMask: true }),
    "construct.migration.all": () =>
      codec.createMigrationDecoder({ originalMask: true, plainSlug: true }),
    "construct.custom": () =>
      api.createCustomUuidV7Mask({
        label: "profile-identity",
        mask: (input) => input,
        unmask: (input) => input,
      }),
  } satisfies Record<string, ProfileCase>;

  function verify(): void {
    for (const [name, operation] of Object.entries(cases)) {
      for (const index of [0, 255]) {
        into.fill(0x55);
        const value = operation(index);
        const expectedError = assertProfileOutcome(name, value);
        if (expectedError) {
          if (name.includes(".into.range") && into.some((byte) => byte !== 0x55))
            throw new Error(`${name} modified caller storage before returning an error`);
          continue;
        }
        if (typeof value === "string") {
          const valid =
            api.isUuidString(value) ||
            api.isUuidSlug(value) ||
            !(codec.decodeSlug(value) instanceof Error) ||
            !(base32Codec.decodeSlug(value) instanceof Error) ||
            !(customCodec.decodeSlug(value) instanceof Error);
          if (!valid) throw new Error(`${name} returned malformed identifier text`);
        } else if (value instanceof Uint8Array) {
          if (name.endsWith(".into") && (value !== into || value[0] !== 0x55 || value[23] !== 0x55))
            throw new Error(`${name} violated caller-owned output identity or boundaries`);
          const payload = name.endsWith(".into") ? value.subarray(4, 20) : value;
          if (!api.isUuidBytes(payload)) throw new Error(`${name} returned malformed UUID bytes`);
        } else if (typeof value === "number" && !Number.isFinite(value)) {
          throw new Error(`${name} returned a nonfinite number`);
        }
      }
    }
  }

  return { cases, verify };
}
