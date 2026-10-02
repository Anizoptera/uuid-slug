// SPDX-License-Identifier: Apache-2.0

import { unwrap } from "../dev/unwrap";
import { createBoundsProfileCases } from "./profile-bounds";
import { createUuidV4ProfileCases } from "./profile-v4";
type Api = typeof import("../src/index");
type PrivateV4Api = Pick<typeof import("../src/v4"), "generatePortableUuidV4">;
type PrivateAlphabetApi = Pick<
  typeof import("../src/alphabet"),
  "BASE32HEX" | "BASE64URL" | "decodeInto" | "encodePortable"
>;
export type ProfileValue = string | number | boolean | Uint8Array | Error | object;
export type ProfileCase = (index: number) => ProfileValue;

interface ProfileSuite {
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

/** Select cases whose names contain any comma-separated filter substring; fail when none match. */
export function selectProfileCases<Case>(
  cases: Record<string, Case>,
  filter: string | null | undefined,
): [string, Case][] {
  const terms = filter ? filter.split(",").filter(Boolean) : [];
  const selected = Object.entries(cases).filter(
    ([name]) => terms.length === 0 || terms.some((term) => name.includes(term)),
  );
  if (selected.length === 0) throw new Error("Profile filter selected no cases");
  return selected;
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
  const base32hexName = api.BASE32HEX;
  const base64urlName = api.BASE64URL;
  const plainSlugFormat = api.PLAIN_SLUG_FORMAT;
  const originalMaskFormat = api.FIXED_MASK_FORMAT;
  const instant = 1_725_000_000_000;
  const timestampWindow = { maxTimestampDeltaMs: 86_400_000, referenceUnixMs: instant };
  const sentinelTimestampWindow = { maxTimestampDeltaMs: 0, referenceUnixMs: 0 };
  const current = { seed: "profile-current-seed" };
  const previous = { seed: "profile-previous-seed" };
  const rotationMasks = Array.from({ length: 17 }, (_, index) =>
    unwrap(
      api.deriveUuidV7Mask({
        keyDerivationIterations: 1,
        seed: `profile-rotation-seed-${index}`,
      }),
    ),
  );
  const rotationWriters = rotationMasks.map((mask) =>
    unwrap(api.createUuidV7MaskingCodec({ mask })),
  );
  const sentinelDefinitions = Array.from({ length: 64 }, (_, index) => ({
    name: `sentinel-${index}`,
    uuid: `00000000-0000-7000-8000-${index.toString(16).padStart(12, "0")}`,
  }));
  const sentinels = sentinelDefinitions.slice(0, 1);
  const codec = unwrap(api.createUuidV7MaskingCodec({ mask: current, sentinels }));
  const sentinelCodec4 = unwrap(
    api.createUuidV7MaskingCodec({ mask: current, sentinels: sentinelDefinitions.slice(0, 4) }),
  );
  const sentinelCodec8 = unwrap(
    api.createUuidV7MaskingCodec({ mask: current, sentinels: sentinelDefinitions.slice(0, 8) }),
  );
  const sentinelCodec16 = unwrap(
    api.createUuidV7MaskingCodec({ mask: current, sentinels: sentinelDefinitions.slice(0, 16) }),
  );
  const sentinelCodec64 = unwrap(
    api.createUuidV7MaskingCodec({ mask: current, sentinels: sentinelDefinitions }),
  );
  const collidingSentinelDefinitions = Array.from({ length: 64 }, (_, index) => ({
    name: `colliding-sentinel-${index}`,
    uuid: `${index.toString(16).padStart(8, "0")}-0000-7000-8000-0000deadbeef`,
  }));
  const collidingSentinelCodec64 = unwrap(
    api.createUuidV7MaskingCodec({ mask: current, sentinels: collidingSentinelDefinitions }),
  );
  const base32Codec = unwrap(
    api.createUuidV7MaskingCodec({ mask: current, maskedSlugAlphabet: base32hexName, sentinels }),
  );
  const base32Sentinel = base32Codec.sentinels[0];
  const older = unwrap(api.createUuidV7MaskingCodec({ mask: previous }));
  const customMask = unwrap(
    api.createCustomUuidV7Mask({
      diagnosticLabel: "profile-xor",
      mask: (input) => input.map((byte) => byte ^ 0x5a),
      unmask: (input) => input.map((byte) => byte ^ 0x5a),
    }),
  );
  const customCodec = unwrap(api.createUuidV7MaskingCodec({ mask: customMask }));
  let customFailureEnabled = false;
  const failingCustomMask = unwrap(
    api.createCustomUuidV7Mask({
      diagnosticLabel: "profile-failing",
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
  const failingCustomCodec = unwrap(api.createUuidV7MaskingCodec({ mask: failingCustomMask }));
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
      diagnosticLabel: "profile-sentinel-collision",
      mask: (input) => input.map((byte, index) => byte ^ (collisionMaskBytes[index] as number)),
      unmask: (input) => input.map((byte, index) => byte ^ (collisionMaskBytes[index] as number)),
    }),
  );
  const collisionInput = "019ff19b-58b8-7000-9b1b-df713bd55607";
  const collisionCodec = unwrap(
    api.createUuidV7MaskingCodec({
      mask: collisionMask,
      sentinels: sentinelDefinitions.slice(0, 1),
    }),
  );
  const collisionBase32Codec = unwrap(
    api.createUuidV7MaskingCodec({
      mask: collisionMask,
      maskedSlugAlphabet: base32hexName,
      sentinels: sentinelDefinitions.slice(0, 1),
    }),
  );
  const rotated = unwrap(
    api.createUuidV7MaskingCodec({ mask: current, previousMasks: [previous] }),
  );
  const migration = rotated.createUuidSlugMigrationDecoder({
    acceptFixedMask: true,
    acceptPlainSlug: true,
  });
  const maskedOnlyMigration = codec.createUuidSlugMigrationDecoder();
  const originals = originalFixtures.filter(({ slug, raw }) => slug !== raw);
  const portable = unwrap(api.createUuidV7Generator({ readUnixMs: () => instant }));
  const portableSubMillisecond = unwrap(
    api.createUuidV7Generator({
      readUnixMs: () => instant + 0.75,
      subMillisecondFractionBits: 12,
    }),
  );
  const portableSubMillisecondAuto = unwrap(
    api.createUuidV7Generator({
      subMillisecondFractionBits: 12,
    }),
  );
  let advancingMs = instant;
  const portableAdvancing = unwrap(
    api.createUuidV7Generator({ readUnixMs: () => (advancingMs += 1) }),
  );
  let rollingBackMs = instant;
  const portableRollingBack = unwrap(
    api.createUuidV7Generator({ readUnixMs: () => (rollingBackMs -= 1) }),
  );
  const portableSlug = (alphabet: typeof base64urlName | typeof base32hexName) => {
    const value = portable.generateUuidV7Bytes();
    return value instanceof Error ? value : api.uuidBytesToPlainSlug(value, alphabet);
  };
  const profileUuid = (index: number) => {
    const time = (instant + index).toString(16).padStart(12, "0");
    const a = ((index * 251) & 4095).toString(16).padStart(3, "0");
    const b = (0x8000 | ((index * 31337) & 16383)).toString(16);
    const tail = (Math.imul(index + 1, 0x9e3779b1) >>> 0).toString(16).padStart(8, "0");
    return `${time.slice(0, 8)}-${time.slice(8)}-7${a}-${b}-${tail}${index.toString(16).padStart(4, "0")}`;
  };
  const ids = Array.from({ length: 256 }, (_, index) => profileUuid(index));
  const compactIds = ids.map((uuid) => uuid.replaceAll("-", ""));
  const mixedIds = ids.map((uuid) => uuid.slice(0, 18).toUpperCase() + uuid.slice(18));
  const bytes = ids.map((id) => unwrap(api.uuidStringToBytes(id)));
  const packageFailure = api.uuidStringToBytes("invalid");
  if (!(packageFailure instanceof Error)) throw new Error("Error profile fixture did not fail");
  const ownLongMarker: { __failure: unknown } = { __failure: true };
  const ownShortMarker: { _: unknown } = { _: true };
  const longMarkerPrototype = { __failure: true };
  const shortMarkerPrototype = { _: true };
  const prototypeLongMarker = Object.create(longMarkerPrototype) as { __failure: unknown };
  const prototypeShortMarker = Object.create(shortMarkerPrototype) as { _: unknown };
  const markerSymbol = Symbol("failure");
  const ownSymbolMarker: Record<symbol, unknown> = { [markerSymbol]: true };
  const prototypeSymbolMarker = Object.create({ [markerSymbol]: true }) as Record<symbol, unknown>;
  const nativeErrorIsError = (Error as { isError?: (value: unknown) => boolean }).isError;
  const errorMarker = "__failure";
  const errorCodes: ReadonlySet<unknown> = new Set([
    api.ABORTED,
    api.INVALID_BASE32HEX,
    api.INVALID_BASE64URL,
    api.INVALID_BUFFER,
    api.INVALID_MASK,
    api.INVALID_OPTIONS,
    api.INVALID_SENTINEL,
    api.INVALID_TIMESTAMP,
    api.INVALID_UUID,
    api.INVALID_UUID_SLUG,
    api.INVALID_UUID_VERSION,
    api.RNG_UNAVAILABLE,
    api.TIMESTAMP_OUTSIDE_WINDOW,
  ]);
  const unmarkedFailure = new Error("invalid") as Error & {
    code: typeof api.INVALID_UUID;
  };
  unmarkedFailure.name = "UuidSlugError";
  unmarkedFailure.code = api.INVALID_UUID;
  const ordinaryObject = {};
  const recognizesPackageShape = (value: object) =>
    Reflect.get(value, "name") === "UuidSlugError" && errorCodes.has(Reflect.get(value, "code"));
  const recognizesCrossRealmError = nativeErrorIsError
    ? nativeErrorIsError
    : (value: unknown) => Object.prototype.toString.call(value) === "[object Error]";
  const markerNativeTag = (value: unknown) => {
    if (typeof value !== "object" || value === null) return false;
    try {
      if ((value as Record<string, unknown>)[errorMarker] === true) return true;
      return recognizesCrossRealmError(value) && recognizesPackageShape(value);
    } catch {
      return false;
    }
  };
  const markerInstanceNativeTag = (value: unknown) => {
    if (typeof value !== "object" || value === null) return false;
    try {
      if ((value as Record<string, unknown>)[errorMarker] === true) return true;
      if (value instanceof Error) return recognizesPackageShape(value);
      return recognizesCrossRealmError(value) && recognizesPackageShape(value);
    } catch {
      return false;
    }
  };
  const instanceMarkerNativeTag = (value: unknown) => {
    if (typeof value !== "object" || value === null) return false;
    try {
      if (value instanceof Error) return recognizesPackageShape(value);
      if ((value as Record<string, unknown>)[errorMarker] === true) return true;
      return recognizesCrossRealmError(value) && recognizesPackageShape(value);
    } catch {
      return false;
    }
  };
  const markerTag = (value: unknown) => {
    if (typeof value !== "object" || value === null) return false;
    try {
      if ((value as Record<string, unknown>)[errorMarker] === true) return true;
      return (
        Object.prototype.toString.call(value) === "[object Error]" && recognizesPackageShape(value)
      );
    } catch {
      return false;
    }
  };
  const markerInstanceTag = (value: unknown) => {
    if (typeof value !== "object" || value === null) return false;
    try {
      if ((value as Record<string, unknown>)[errorMarker] === true) return true;
      if (value instanceof Error) return recognizesPackageShape(value);
      return (
        Object.prototype.toString.call(value) === "[object Error]" && recognizesPackageShape(value)
      );
    } catch {
      return false;
    }
  };
  const sentinelBytes = sentinelDefinitions.map(({ uuid }) => unwrap(api.uuidStringToBytes(uuid)));
  const collidingSentinelBytes = collidingSentinelDefinitions.map(({ uuid }) =>
    unwrap(api.uuidStringToBytes(uuid)),
  );
  const collidingSentinelMiss = unwrap(
    api.uuidStringToBytes("00000040-0000-7000-8000-0000deadbeef"),
  );
  const slugs = ids.map((id) => unwrap(api.uuidStringToPlainSlug(id)));
  const identityMask = unwrap(
    api.createCustomUuidV7Mask({
      diagnosticLabel: "profile-candidate-identity",
      mask: (input) => input,
      unmask: (input) => input,
    }),
  );
  const identityCodec = unwrap(api.createUuidV7MaskingCodec({ mask: identityMask }));
  const overlapEntries: { uuid: string; slug: string }[] = [];
  let overlapTail: string | undefined;
  for (let index = 0; index < 4096 && overlapEntries.length < 64; index += 1) {
    const uuid = profileUuid(index);
    const slug = unwrap(identityCodec.uuidToMaskedSlug(uuid));
    overlapTail ??= slug.at(-1);
    if (slug.at(-1) === overlapTail) overlapEntries.push({ uuid, slug });
  }
  if (overlapEntries.length !== 64) throw new Error("Insufficient migration overlap fixtures");
  const base64url = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  // Clear the four external check bits so the public plain-slug decoder exposes each ciphertext.
  const mixedBytes = (slug: string) => {
    const last = base64url.indexOf(slug[21]!);
    if (last < 0) throw new Error("Invalid migration overlap fixture");
    return unwrap(api.uuidToBytes(slug.slice(0, 21) + base64url[last & 0x30]));
  };
  const overlapSlug = overlapEntries[0]!.slug;
  const overlapBytes = mixedBytes(overlapSlug);
  const overlapMasks = overlapEntries.map(({ slug }, index) => {
    const encoded = mixedBytes(slug);
    const key = encoded.map((byte, offset) => byte ^ overlapBytes[offset]!);
    return unwrap(
      api.createCustomUuidV7Mask({
        diagnosticLabel: `profile-candidate-${index}`,
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
  const base32 = ids.map((id) => unwrap(api.uuidStringToPlainSlug(id, base32hexName)));
  if (
    privateAlphabetApi &&
    privateAlphabetApi.encodePortable(bytes[0] as Uint8Array, privateAlphabetApi.BASE32HEX) !==
      base32[0]
  )
    throw new Error("Portable base32hex encoding differs from the public canonical spelling");
  const masked = ids.map((id) => unwrap(codec.uuidToMaskedSlug(id)));
  const maskedBase32 = ids.map((id) => unwrap(base32Codec.uuidToMaskedSlug(id)));
  const maskedCustom = bytes.map((value) => unwrap(customCodec.uuidToMaskedSlug(value)));
  const oldOnly = ids
    .map((id) => unwrap(older.uuidToMaskedSlug(id)))
    .filter((slug) => codec.uuidToString(slug) instanceof Error);
  if (oldOnly.length === 0) throw new Error("No previous-key-only fixtures");
  const rotationFixture = (count: number) => {
    const masks = rotationMasks.slice(0, count);
    const reader = unwrap(api.createUuidV7MaskingCodec({ mask: current, previousMasks: masks }));
    const lastWriter = rotationWriters[count - 1]!;
    const missWriter = rotationWriters[16]!;
    const last = ids
      .map((id) => unwrap(lastWriter.uuidToMaskedSlug(id)))
      .find((slug) => {
        return [codec, ...rotationWriters.slice(0, count - 1)].every(
          (candidate) => candidate.uuidToString(slug) instanceof Error,
        );
      });
    const miss = ids
      .map((id) => unwrap(missWriter.uuidToMaskedSlug(id)))
      .find((slug) => {
        return reader.uuidToString(slug) instanceof Error;
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
      api.createUuidV7MaskingCodec({ mask: masks[0]!, previousMasks: masks.slice(1) }),
    );
    const positions = [0, Math.floor(count / 2), count - 1];
    const migrationSlugs = positions.map((position) => {
      const writer = rotationWriters[position]!;
      const slug = ids
        .map((id) => unwrap(writer.uuidToMaskedSlug(id)))
        .find((value) =>
          rotationWriters
            .slice(0, position)
            .every((earlier) => earlier.uuidToString(value) instanceof Error),
        );
      if (!slug) throw new Error(`No migration fixture for mask ${position} of ${count}`);
      return slug;
    });
    const miss = ids
      .map((id) => unwrap(rotationWriters[16]!.uuidToMaskedSlug(id)))
      .find((value) => migrationCodec.uuidToString(value) instanceof Error);
    if (!miss) throw new Error(`No migration miss fixture for ${count} masks`);
    return {
      reader: migrationCodec.createUuidSlugMigrationDecoder(),
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
      api.createUuidV7MaskingCodec({
        mask: overlapMasks[0]!,
        previousMasks: overlapMasks.slice(1, count),
      }),
    ).createUuidSlugMigrationDecoder();
    const duplicate = unwrap(
      api.createUuidV7MaskingCodec({
        mask: overlapMasks[0]!,
        previousMasks: Array.from({ length: count - 1 }, () => overlapMasks[0]!),
      }),
    ).createUuidSlugMigrationDecoder();
    return { count, distinct, duplicate };
  });
  const into = new Uint8Array(24);
  const selectedGenerator = unwrap(
    api.createUuidV7Generator({
      readUnixMs: () => instant + 0.25,
      subMillisecondFractionBits: 12,
    }),
  );
  // A caller-built generator that delegates to a package sequence takes the structural read.
  const structuralGenerator: typeof selectedGenerator = { ...selectedGenerator };
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
  const v4Bytes = unwrap(api.uuidStringToBytes(v4Uuid));
  const v4Slug = unwrap(api.uuidStringToPlainSlug(v4Uuid));
  const outsideTimestampWindow = { maxTimestampDeltaMs: 0, referenceUnixMs: instant + 1 };
  if (!base32Sentinel) throw new Error("Missing base32 sentinel fixture");
  customFailureEnabled = true;
  // Plain slugs this codec's check rejects take its plain reading on the universal readers.
  const plainOnlySlugs = slugs.filter(
    (slug) => codec.maskedSlugToUuidString(slug) instanceof Error,
  );
  if (plainOnlySlugs.some((slug) => codec.uuidToString(slug) !== api.uuidToString(slug)))
    throw new Error("Codec plain-slug fixture did not take the plain reading");
  const values = ids.map((id) => unwrap(api.parseUuid(id)));
  const structuralCodec: typeof codec = { ...codec };
  const payloadLayout = { subMillisecondFractionBits: 0, counterBits: 42 };

  const migrationScalingCases: Record<string, ProfileCase> = {};
  for (const [count, fixture] of [
    [1, migration1],
    [4, migration4],
    [8, migration8],
    [16, migration16],
  ] as const) {
    migrationScalingCases[`migration.masks${count}.first`] = () =>
      fixture.reader.uuidSlugToUuidString(fixture.first);
    migrationScalingCases[`migration.masks${count}.middle`] = () =>
      fixture.reader.uuidSlugToUuidString(fixture.middle);
    migrationScalingCases[`migration.masks${count}.last`] = () =>
      fixture.reader.uuidSlugToUuidString(fixture.last);
    migrationScalingCases[`invalid.migration.masks${count}.miss`] = () =>
      fixture.reader.uuidSlugToUuidString(fixture.miss);
    migrationScalingCases[`migration.masks${count}.candidates`] = () =>
      fixture.reader.uuidSlugToUuidStringCandidates(fixture.first);
  }
  for (const { count, distinct, duplicate } of candidateFixtures) {
    const distinctWitness = distinct.uuidSlugToUuidStringCandidates(overlapSlug);
    const duplicateWitness = duplicate.uuidSlugToUuidStringCandidates(overlapSlug);
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
      distinct.uuidSlugToUuidStringCandidates(overlapSlug);
    migrationScalingCases[`migration.candidates${count}.duplicate`] = () =>
      duplicate.uuidSlugToUuidStringCandidates(overlapSlug);
  }

  const cases = {
    ...migrationScalingCases,
    control: (index) => ids[index & 255] as string,
    ...createUuidV4ProfileCases(api, into, privateV4Api),
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
    ...createBoundsProfileCases(api, instant),
    "v7.bytes": () => api.generateUuidV7Bytes(),
    "v7.into": () => api.generateUuidV7Bytes(into, 4),
    "v7.at": (index) => api.generateUuidV7({ at: instant + (index & 255) }),
    "v7.at.bytes": (index) => api.generateUuidV7Bytes({ at: instant + (index & 255) }),
    "v7.at.into": (index) =>
      api.generateUuidV7Bytes({ at: instant + (index & 255), output: into, outputOffset: 4 }),
    "v7.at.slug": (index) => api.generatePlainUuidV7Slug({ at: instant + (index & 255) }),
    "portable.string": () => portable.generateUuidV7(),
    "portable.bytes": () => portable.generateUuidV7Bytes(),
    "portable.into": () => portable.generateUuidV7Bytes(into, 4),
    "portable.subms12.into": () => portableSubMillisecond.generateUuidV7Bytes(into, 4),
    "portable.subms12.auto.into": () => portableSubMillisecondAuto.generateUuidV7Bytes(into, 4),
    "portable.at": (index) => portable.generateUuidV7({ at: instant + (index & 255) }),
    "portable.at.bytes": (index) => portable.generateUuidV7Bytes({ at: instant + (index & 255) }),
    "portable.at.into": (index) =>
      portable.generateUuidV7Bytes({ at: instant + (index & 255), output: into, outputOffset: 4 }),
    "portable.slug": () => portableSlug(base64urlName),
    "portable.base32": () => portableSlug(base32hexName),
    // Advancing and rollback clocks select opposite state-machine edges; a fixed clock covers only
    // same-millisecond continuation even though all three routes write the same UUID layout.
    "portable.advance.into": () => portableAdvancing.generateUuidV7Bytes(into, 4),
    "portable.rollback.into": () => portableRollingBack.generateUuidV7Bytes(into, 4),
    "construct.generator": () => api.createUuidV7Generator({ readUnixMs: () => instant }),
    "construct.generator.default": () => api.createUuidV7Generator({}),
    "v4.slug": () => api.generatePlainUuidV4Slug(),
    "v4.base32": () => api.generatePlainUuidV4Slug(base32hexName),
    "v7.slug": () => api.generatePlainUuidV7Slug(),
    "v7.base32": () => api.generatePlainUuidV7Slug(base32hexName),
    "v7.slug.selected-generator": () =>
      api.generatePlainUuidV7Slug({ generator: selectedGenerator }),
    "v7.pair.selected-generator": () =>
      api.generateUuidV7WithPlainSlug({ generator: selectedGenerator }),
    "v7.slug.structural-generator": () =>
      api.generatePlainUuidV7Slug({ generator: structuralGenerator }),
    "v7.bytes.selected-generator": () => api.generateUuidV7Bytes({ generator: selectedGenerator }),
    "v7.string.selected-generator": () => api.generateUuidV7({ generator: selectedGenerator }),
    parse: (index) => api.uuidStringToBytes(ids[index & 255] as string),
    "parse.compact": (index) => api.uuidStringToBytes(compactIds[index & 255] as string),
    "parse.mixed": (index) => api.uuidStringToBytes(mixedIds[index & 255] as string),
    "parse.into": (index) => api.uuidStringToBytes(ids[index & 255] as string, into, 4),
    format: (index) => api.bytesToUuidString(bytes[index & 255] as Uint8Array),
    "format.uppercase": (index) =>
      api.bytesToUuidString(bytes[index & 255] as Uint8Array, api.UUID_TEXT_UPPERCASE),
    "format.offset": (index) => {
      into.set(bytes[index & 255] as Uint8Array, 4);
      return api.bytesToUuidString(into, 4);
    },
    "bytes.base64": (index) => api.uuidBytesToPlainSlug(bytes[index & 255] as Uint8Array),
    "bytes.base32": (index) =>
      api.uuidBytesToPlainSlug(bytes[index & 255] as Uint8Array, base32hexName),
    "bytes.offset.base64": (index) => {
      into.set(bytes[index & 255] as Uint8Array, 4);
      return api.uuidBytesToPlainSlug(into, 4);
    },
    "bytes.offset.base32": (index) => {
      into.set(bytes[index & 255] as Uint8Array, 4);
      return api.uuidBytesToPlainSlug(into, 4, base32hexName);
    },
    "plain.encode": (index) => api.uuidStringToPlainSlug(ids[index & 255] as string),
    "plain.decode": (index) => api.uuidToString(slugs[index & 255] as string),
    "uuid.toString.bytes": (index) => api.uuidToString(bytes[index & 255] as Uint8Array),
    "uuid.toBytes.bytes": (index) => api.uuidToBytes(bytes[index & 255] as Uint8Array),
    "uuid.toBytes.uuid": (index) => api.uuidToBytes(ids[index & 255] as string),
    "uuid.toPlainSlug.bytes": (index) => api.uuidToPlainSlug(bytes[index & 255] as Uint8Array),
    "base32.encode": (index) =>
      api.uuidStringToPlainSlug(ids[index & 255] as string, base32hexName),
    "base32.decode": (index) => api.uuidToString(base32[index & 255] as string),
    "slug.bytes": (index) => api.uuidToBytes(slugs[index & 255] as string),
    "slug.base32.bytes": (index) => api.uuidToBytes(base32[index & 255] as string),
    "slug.into": (index) => api.uuidToBytes(slugs[index & 255] as string, into, 4),
    "slug.base32.into": (index) => api.uuidToBytes(base32[index & 255] as string, into, 4),
    "guard.uuid.any": (index) => api.isUuidString(ids[index & 255]),
    "guard.uuid.v4": () => api.isUuidV4String(v4Uuid),
    "guard.invalid.uuid": () => api.isUuidV7String(badUuid),
    "guard.invalid.slug": () => api.isPlainUuidV7Slug(badSlug),
    "guard.uuid": (index) => api.isUuidV7String(ids[index & 255]),
    "guard.uuid.compact": (index) => api.isUuidV7Text(compactIds[index & 255]),
    "guard.uuid.mixed": (index) => api.isUuidV7Text(mixedIds[index & 255]),
    "guard.bytes.any": (index) => api.isUuidBytes(bytes[index & 255]),
    "guard.bytes.v4": () =>
      api.isUuidV4Bytes(
        Uint8Array.of(59, 18, 241, 223, 82, 50, 72, 4, 137, 126, 145, 123, 243, 151, 97, 138),
      ),
    "guard.bytes.v7": (index) => api.isUuidV7Bytes(bytes[index & 255]),
    "guard.slug.any": (index) => api.isPlainUuidSlug(slugs[index & 255]),
    "guard.slug.v4": () => api.isPlainUuidV4Slug("OxLx31IySASJfpF785dhig"),
    "guard.slug": (index) => api.isPlainUuidV7Slug(slugs[index & 255]),
    "timestamp.uuid": (index) =>
      api.validateUuidV7StringUnixMs(ids[index & 255] as string, timestampWindow),
    "timestamp.slug": (index) =>
      api.validatePlainUuidV7SlugUnixMs(slugs[index & 255] as string, timestampWindow),
    "timestamp.extract": (index) => api.extractUuidV7UnixMs(bytes[index & 255] as Uint8Array),
    "timestamp.extract.offset": (index) => {
      into.set(bytes[index & 255] as Uint8Array, 4);
      return api.extractUuidV7UnixMs(into, 4);
    },
    "timestamp.extract.uuid": (index) => api.extractUuidV7UnixMs(ids[index & 255] as string),
    "timestamp.extract.slug": (index) => api.extractUuidV7UnixMs(slugs[index & 255] as string),
    "timestamp.extract.slug.base32": (index) =>
      api.extractUuidV7UnixMs(base32[index & 255] as string),
    "timestamp.extract.masked": (index) =>
      codec.extractMaskedUuidV7UnixMs(masked[index & 255] as string),
    "timestamp.extract.masked.base32": (index) =>
      base32Codec.extractMaskedUuidV7UnixMs(maskedBase32[index & 255] as string),
    "timestamp.masked": (index) =>
      codec.validateMaskedUuidV7SlugUnixMs(masked[index & 255] as string, timestampWindow),
    "timestamp.masked.base32": (index) =>
      base32Codec.validateMaskedUuidV7SlugUnixMs(
        maskedBase32[index & 255] as string,
        timestampWindow,
      ),
    "masked.generate": () => codec.generateMaskedUuidV7Slug(),
    "masked.base32.generate": () => base32Codec.generateMaskedUuidV7Slug(),
    "masked.generate.selected-generator": () =>
      codec.generateMaskedUuidV7Slug({ generator: selectedGenerator }),
    "masked.pair.selected-generator": () =>
      codec.generateUuidV7WithMaskedSlug({ generator: selectedGenerator }),
    "masked.encode": (index) => codec.uuidToMaskedSlug(ids[index & 255] as string),
    "masked.encode.bytes": (index) => codec.uuidToMaskedSlug(bytes[index & 255] as Uint8Array),
    "codec.toString.uuid": (index) => codec.uuidToString(ids[index & 255] as string),
    "codec.toString.plain": (index) =>
      codec.uuidToString(plainOnlySlugs[index % plainOnlySlugs.length] as string),
    "codec.toBytes.plain": (index) =>
      codec.uuidToBytes(plainOnlySlugs[index % plainOnlySlugs.length] as string),
    "uuid.toString.canonical": (index) => api.uuidToString(ids[index & 255] as string),
    "uuid.toString.mixed": (index) => api.uuidToString(mixedIds[index & 255] as string),
    "plain.toString": (index) => api.plainSlugToUuidString(slugs[index & 255] as string),
    "value.parse.uuid": (index) => api.parseUuid(ids[index & 255] as string),
    "value.parse.slug": (index) => api.parseUuid(slugs[index & 255] as string),
    "value.parse.bytes": (index) => api.parseUuid(bytes[index & 255] as Uint8Array),
    "value.parse.masked": (index) => codec.parseUuid(masked[index & 255] as string),
    "value.parse.structural": (index) => api.parseUuid(ids[index & 255] as string, structuralCodec),
    "value.generate": () => api.generateUuidV7Value(),
    "value.generate.at": (index) => api.generateUuidV7Value({ at: instant + (index & 255) }),
    "value.toString": (index) => values[index & 255]!.toString(),
    "value.toPlainSlug": (index) => values[index & 255]!.toPlainSlug(),
    "value.toMaskedSlug": (index) => values[index & 255]!.toMaskedSlug(codec),
    "value.toMaskedSlug.structural": (index) => values[index & 255]!.toMaskedSlug(structuralCodec),
    "value.convert.string": (index) => api.uuidToString(values[index & 255]!),
    "value.convert.masked": (index) => codec.uuidToMaskedSlug(values[index & 255]!),
    "payload.extract.uuid": (index) =>
      api.extractUuidV7Payload(ids[index & 255] as string, payloadLayout),
    "payload.extract.bytes": (index) =>
      api.extractUuidV7Payload(bytes[index & 255] as Uint8Array, payloadLayout),
    "codec.toString.bytes": (index) => codec.uuidToString(bytes[index & 255] as Uint8Array),
    "codec.toBytes.bytes": (index) => codec.uuidToBytes(bytes[index & 255] as Uint8Array),
    "codec.toPlainSlug.bytes": (index) => codec.uuidToPlainSlug(bytes[index & 255] as Uint8Array),
    "masked.decode": (index) => codec.maskedSlugToUuidString(masked[index & 255] as string),
    "masked.decode.bytes": (index) => codec.maskedSlugToUuidBytes(masked[index & 255] as string),
    "masked.decode.into": (index) =>
      codec.maskedSlugToUuidBytes(masked[index & 255] as string, into, 4),
    "masked.base32.encode": (index) => base32Codec.uuidToMaskedSlug(ids[index & 255] as string),
    "masked.base32.encode.bytes": (index) =>
      base32Codec.uuidToMaskedSlug(bytes[index & 255] as Uint8Array),
    "masked.base32.decode": (index) =>
      base32Codec.maskedSlugToUuidString(maskedBase32[index & 255] as string),
    "masked.base32.decode.bytes": (index) =>
      base32Codec.maskedSlugToUuidBytes(maskedBase32[index & 255] as string),
    "masked.base32.decode.into": (index) =>
      base32Codec.maskedSlugToUuidBytes(maskedBase32[index & 255] as string, into, 4),
    "masked.custom.encode": (index) =>
      customCodec.uuidToMaskedSlug(bytes[index & 255] as Uint8Array),
    "masked.custom.decode": (index) =>
      customCodec.maskedSlugToUuidString(maskedCustom[index & 255] as string),
    "masked.custom.decode.bytes": (index) =>
      customCodec.maskedSlugToUuidBytes(maskedCustom[index & 255] as string),
    "masked.custom.decode.into": (index) =>
      customCodec.maskedSlugToUuidBytes(maskedCustom[index & 255] as string, into, 4),
    "rotation.current": (index) => rotated.uuidToString(masked[index & 255] as string),
    "rotation.previous": (index) => rotated.uuidToString(oldOnly[index % oldOnly.length] as string),
    "rotation.current.bytes": (index) => rotated.uuidToBytes(masked[index & 255] as string),
    "rotation.previous.bytes": (index) =>
      rotated.uuidToBytes(oldOnly[index % oldOnly.length] as string),
    "rotation4.current": (index) => rotation4.reader.uuidToString(masked[index & 255] as string),
    "rotation4.last": () => rotation4.reader.uuidToString(rotation4.last),
    "invalid.rotation4.miss": () => rotation4.reader.uuidToString(rotation4.miss),
    "rotation8.current": (index) => rotation8.reader.uuidToString(masked[index & 255] as string),
    "rotation8.last": () => rotation8.reader.uuidToString(rotation8.last),
    "invalid.rotation8.miss": () => rotation8.reader.uuidToString(rotation8.miss),
    "rotation16.current": (index) => rotation16.reader.uuidToString(masked[index & 255] as string),
    "rotation16.last": () => rotation16.reader.uuidToString(rotation16.last),
    "invalid.rotation16.miss": () => rotation16.reader.uuidToString(rotation16.miss),
    "migration.current": (index) => migration.uuidSlugToUuidString(masked[index & 255] as string),
    "migration.previous": (index) =>
      migration.uuidSlugToUuidString(oldOnly[index % oldOnly.length] as string),
    "migration.decodeCandidates": (index) =>
      migration.uuidSlugToUuidStringCandidates(masked[index & 255] as string),
    "migration.previousCandidates": (index) =>
      migration.uuidSlugToUuidStringCandidates(oldOnly[index % oldOnly.length] as string),
    "migration.plain": (index) =>
      migration.uuidSlugToUuidString(slugs[index & 255] as string, plainSlugFormat),
    "migration.base32": (index) =>
      migration.uuidSlugToUuidString(base32[index & 255] as string, plainSlugFormat),
    "migration.base32Candidates": (index) =>
      migration.uuidSlugToUuidStringCandidates(base32[index & 255] as string, plainSlugFormat),
    "migration.original": (index) =>
      migration.uuidSlugToUuidString(originals[index % originals.length]!.slug, originalMaskFormat),
    "migration.directCandidates": (index) =>
      migration.uuidSlugToUuidStringCandidates(slugs[index & 255] as string, plainSlugFormat),
    "migration.originalCandidates": (index) =>
      migration.uuidSlugToUuidStringCandidates(
        originals[index % originals.length]!.slug,
        originalMaskFormat,
      ),
    "invalid.migration": () => maskedOnlyMigration.uuidSlugToUuidString(badSlug),
    "invalid.migrationCandidates": () =>
      maskedOnlyMigration.uuidSlugToUuidStringCandidates(badSlug),
    "sentinel.encode": () => codec.uuidToMaskedSlug(sentinel.uuid),
    "sentinel.encode.bytes": () => codec.uuidToMaskedSlug(sentinelBytes[0] as Uint8Array),
    "sentinel.encode.bytes.miss": () => codec.uuidToMaskedSlug(bytes[255] as Uint8Array),
    "sentinel.decode": () => codec.uuidToString(sentinel.slug),
    "sentinel.decode.bytes": () => codec.uuidToBytes(sentinel.slug),
    "sentinel.decode.into": () => codec.uuidToBytes(sentinel.slug, into, 4),
    "sentinel.timestamp": () =>
      codec.validateMaskedUuidV7SlugUnixMs(sentinel.slug, sentinelTimestampWindow),
    "sentinel.base32.encode": () => base32Codec.uuidToMaskedSlug(base32Sentinel.uuid),
    "sentinel.base32.decode": () => base32Codec.uuidToString(base32Sentinel.slug),
    "sentinel.base32.decode.bytes": () => base32Codec.uuidToBytes(base32Sentinel.slug),
    "sentinel.base32.decode.into": () => base32Codec.uuidToBytes(base32Sentinel.slug, into, 4),
    "sentinel.base32.timestamp": () =>
      base32Codec.validateMaskedUuidV7SlugUnixMs(base32Sentinel.slug, sentinelTimestampWindow),
    "sentinel.scan4.first": () => sentinelCodec4.uuidToMaskedSlug(sentinelDefinitions[0]!.uuid),
    "sentinel.scan4.middle": () => sentinelCodec4.uuidToMaskedSlug(sentinelDefinitions[2]!.uuid),
    "sentinel.scan4.last": () => sentinelCodec4.uuidToMaskedSlug(sentinelDefinitions[3]!.uuid),
    "sentinel.scan4.miss": () => sentinelCodec4.uuidToMaskedSlug(ids[255] as string),
    "sentinel.scan4.bytes.first": () =>
      sentinelCodec4.uuidToMaskedSlug(sentinelBytes[0] as Uint8Array),
    "sentinel.scan4.bytes.middle": () =>
      sentinelCodec4.uuidToMaskedSlug(sentinelBytes[2] as Uint8Array),
    "sentinel.scan4.bytes.last": () =>
      sentinelCodec4.uuidToMaskedSlug(sentinelBytes[3] as Uint8Array),
    "sentinel.scan4.bytes.miss": () => sentinelCodec4.uuidToMaskedSlug(bytes[255] as Uint8Array),
    "sentinel.scan8.first": () => sentinelCodec8.uuidToMaskedSlug(sentinelDefinitions[0]!.uuid),
    "sentinel.scan8.middle": () => sentinelCodec8.uuidToMaskedSlug(sentinelDefinitions[4]!.uuid),
    "sentinel.scan8.last": () => sentinelCodec8.uuidToMaskedSlug(sentinelDefinitions[7]!.uuid),
    "sentinel.scan8.miss": () => sentinelCodec8.uuidToMaskedSlug(ids[255] as string),
    "sentinel.scan8.bytes.first": () =>
      sentinelCodec8.uuidToMaskedSlug(sentinelBytes[0] as Uint8Array),
    "sentinel.scan8.bytes.middle": () =>
      sentinelCodec8.uuidToMaskedSlug(sentinelBytes[4] as Uint8Array),
    "sentinel.scan8.bytes.last": () =>
      sentinelCodec8.uuidToMaskedSlug(sentinelBytes[7] as Uint8Array),
    "sentinel.scan8.bytes.miss": () => sentinelCodec8.uuidToMaskedSlug(bytes[255] as Uint8Array),
    "sentinel.scan16.first": () => sentinelCodec16.uuidToMaskedSlug(sentinelDefinitions[0]!.uuid),
    "sentinel.scan16.middle": () => sentinelCodec16.uuidToMaskedSlug(sentinelDefinitions[8]!.uuid),
    "sentinel.scan16.last": () => sentinelCodec16.uuidToMaskedSlug(sentinelDefinitions[15]!.uuid),
    "sentinel.scan16.miss": () => sentinelCodec16.uuidToMaskedSlug(ids[255] as string),
    "sentinel.scan16.bytes.first": () =>
      sentinelCodec16.uuidToMaskedSlug(sentinelBytes[0] as Uint8Array),
    "sentinel.scan16.bytes.middle": () =>
      sentinelCodec16.uuidToMaskedSlug(sentinelBytes[8] as Uint8Array),
    "sentinel.scan16.bytes.last": () =>
      sentinelCodec16.uuidToMaskedSlug(sentinelBytes[15] as Uint8Array),
    "sentinel.scan16.bytes.miss": () => sentinelCodec16.uuidToMaskedSlug(bytes[255] as Uint8Array),
    "sentinel.scan64.first": () => sentinelCodec64.uuidToMaskedSlug(sentinelDefinitions[0]!.uuid),
    "sentinel.scan64.middle": () => sentinelCodec64.uuidToMaskedSlug(sentinelDefinitions[32]!.uuid),
    "sentinel.scan64.last": () => sentinelCodec64.uuidToMaskedSlug(sentinelDefinitions[63]!.uuid),
    "sentinel.scan64.miss": () => sentinelCodec64.uuidToMaskedSlug(ids[255] as string),
    "sentinel.scan64.bytes.first": () =>
      sentinelCodec64.uuidToMaskedSlug(sentinelBytes[0] as Uint8Array),
    "sentinel.scan64.bytes.middle": () =>
      sentinelCodec64.uuidToMaskedSlug(sentinelBytes[32] as Uint8Array),
    "sentinel.scan64.bytes.last": () =>
      sentinelCodec64.uuidToMaskedSlug(sentinelBytes[63] as Uint8Array),
    "sentinel.scan64.bytes.miss": () => sentinelCodec64.uuidToMaskedSlug(bytes[255] as Uint8Array),
    "sentinel.collision64.bytes.first": () =>
      collidingSentinelCodec64.uuidToMaskedSlug(collidingSentinelBytes[0] as Uint8Array),
    "sentinel.collision64.bytes.middle": () =>
      collidingSentinelCodec64.uuidToMaskedSlug(collidingSentinelBytes[32] as Uint8Array),
    "sentinel.collision64.bytes.last": () =>
      collidingSentinelCodec64.uuidToMaskedSlug(collidingSentinelBytes[63] as Uint8Array),
    "sentinel.collision64.bytes.miss": () =>
      collidingSentinelCodec64.uuidToMaskedSlug(collidingSentinelMiss),
    "invalid.uuid": () => api.uuidStringToBytes(badUuid),
    "invalid.uuid.hex.early": () => api.uuidStringToBytes(invalidUuidHex[0] as string),
    "invalid.uuid.hex.middle": () => api.uuidStringToBytes(invalidUuidHex[1] as string),
    "invalid.uuid.hex.late": () => api.uuidStringToBytes(invalidUuidHex[2] as string),
    "invalid.uuid.slug": () => api.uuidStringToPlainSlug(badUuid),
    "invalid.uuid.into.range": () => api.uuidStringToBytes(ids[0] as string, into, 9),
    "invalid.uuid.format.range": () => api.bytesToUuidString(into, 9),
    "invalid.slug.format.range": () => api.uuidBytesToPlainSlug(into, 9),
    "invalid.timestamp.extract.range": () => api.extractUuidV7UnixMs(into, 9),
    "invalid.slug": () => api.uuidToBytes(badSlug),
    "invalid.slug.base64.early": () => api.uuidToBytes(invalidBase64Slugs[0] as string),
    "invalid.slug.base64.middle": () => api.uuidToBytes(invalidBase64Slugs[1] as string),
    "invalid.slug.base64.late": () => api.uuidToBytes(invalidBase64Slugs[2] as string),
    "invalid.slug.base64.tail": () => api.uuidToBytes(invalidBase64Tail),
    "invalid.slug.base32.early": () => api.uuidToBytes(invalidBase32Slugs[0] as string),
    "invalid.slug.base32.middle": () => api.uuidToBytes(invalidBase32Slugs[1] as string),
    "invalid.slug.base32.late": () => api.uuidToBytes(invalidBase32Slugs[2] as string),
    "invalid.slug.base32.tail": () => api.uuidToBytes(invalidBase32Tail),
    "invalid.slug.uuid": () => api.uuidToString(badSlug),
    "invalid.slug.into.range": () => api.uuidToBytes(slugs[0] as string, into, 9),
    "invalid.mask.into.range": () => codec.uuidToBytes(masked[0] as string, into, 9),
    "invalid.alphabet": () =>
      Reflect.apply(api.uuidStringToPlainSlug, undefined, [ids[0] as string, "invalid-alphabet"]),
    "invalid.v4.into.range": () => api.generateUuidV4Bytes(into, 9),
    "invalid.v7.into.range": () => api.generateUuidV7Bytes(into, 9),
    "invalid.v7.at.into.range": () =>
      api.generateUuidV7Bytes({ at: instant, output: into, outputOffset: 9 }),
    "invalid.mask": (index) => codec.uuidToString(oldOnly[index % oldOnly.length] as string),
    "invalid.mask.version": () => codec.uuidToMaskedSlug(v4Bytes),
    "invalid.mask.custom": () => failingCustomCodec.uuidToMaskedSlug(bytes[0] as Uint8Array),
    "invalid.mask.sentinel-collision": () => collisionCodec.uuidToMaskedSlug(collisionInput),
    "invalid.mask.sentinel-collision.base32": () =>
      collisionBase32Codec.uuidToMaskedSlug(collisionInput),
    "invalid.timestamp.version": () => api.validateUuidV7StringUnixMs(v4Uuid, timestampWindow),
    "invalid.timestamp.window": () =>
      api.validateUuidV7StringUnixMs(ids[0] as string, outsideTimestampWindow),
    "invalid.timestamp.slug.version": () =>
      api.validatePlainUuidV7SlugUnixMs(v4Slug, timestampWindow),
    "invalid.timestamp.slug.window": () =>
      api.validatePlainUuidV7SlugUnixMs(slugs[0] as string, outsideTimestampWindow),
    "invalid.construct.mask": () => api.deriveUuidV7Mask({ seed: "" }),
    "invalid.construct.custom": () =>
      api.createCustomUuidV7Mask({
        diagnosticLabel: "profile-invalid",
        mask: () => new Uint8Array(15),
        unmask: (input) => input,
      }),
    "invalid.construct.generator": () =>
      Reflect.apply(api.createUuidV7Generator, undefined, [null]),
    "invalid.construct.codec.sentinel": () =>
      api.createUuidV7MaskingCodec({
        mask: current,
        sentinels: [sentinelDefinitions[0]!, { ...sentinelDefinitions[1]!, name: "sentinel-0" }],
      }),
    "error.classify.success": (index) => api.isUuidSlugError(ids[index & 255]),
    "error.classify.failure": () => api.isUuidSlugError(packageFailure),
    "error.detector.marker-native.string": (index) => markerNativeTag(ids[index & 255]),
    "error.detector.marker-native.bytes": (index) => markerNativeTag(bytes[index & 255]),
    "error.detector.marker-native.object": () => markerNativeTag(ordinaryObject),
    "error.detector.marker-native.marked": () => markerNativeTag(packageFailure),
    "error.detector.marker-native.unmarked": () => markerNativeTag(unmarkedFailure),
    "error.detector.marker-instance.string": (index) => markerInstanceNativeTag(ids[index & 255]),
    "error.detector.marker-instance.bytes": (index) => markerInstanceNativeTag(bytes[index & 255]),
    "error.detector.marker-instance.object": () => markerInstanceNativeTag(ordinaryObject),
    "error.detector.marker-instance.marked": () => markerInstanceNativeTag(packageFailure),
    "error.detector.marker-instance.unmarked": () => markerInstanceNativeTag(unmarkedFailure),
    "error.detector.instance-marker.string": (index) => instanceMarkerNativeTag(ids[index & 255]),
    "error.detector.instance-marker.bytes": (index) => instanceMarkerNativeTag(bytes[index & 255]),
    "error.detector.instance-marker.object": () => instanceMarkerNativeTag(ordinaryObject),
    "error.detector.instance-marker.marked": () => instanceMarkerNativeTag(packageFailure),
    "error.detector.instance-marker.unmarked": () => instanceMarkerNativeTag(unmarkedFailure),
    "error.detector.tag.string": (index) => markerTag(ids[index & 255]),
    "error.detector.tag.bytes": (index) => markerTag(bytes[index & 255]),
    "error.detector.tag.object": () => markerTag(ordinaryObject),
    "error.detector.tag.marked": () => markerTag(packageFailure),
    "error.detector.tag.unmarked": () => markerTag(unmarkedFailure),
    "error.detector.instance-tag.string": (index) => markerInstanceTag(ids[index & 255]),
    "error.detector.instance-tag.bytes": (index) => markerInstanceTag(bytes[index & 255]),
    "error.detector.instance-tag.object": () => markerInstanceTag(ordinaryObject),
    "error.detector.instance-tag.marked": () => markerInstanceTag(packageFailure),
    "error.detector.instance-tag.unmarked": () => markerInstanceTag(unmarkedFailure),
    "error.marker.own.long": () => ownLongMarker["__failure"] === true,
    "error.marker.own.short": () => ownShortMarker._ === true,
    "error.marker.prototype.long": () => prototypeLongMarker["__failure"] === true,
    "error.marker.prototype.short": () => prototypeShortMarker._ === true,
    "error.marker.own.symbol": () => ownSymbolMarker[markerSymbol] === true,
    "error.marker.prototype.symbol": () => prototypeSymbolMarker[markerSymbol] === true,
    "error.native.instanceof": () => packageFailure instanceof Error,
    ...(nativeErrorIsError
      ? { "error.native.isError": () => nativeErrorIsError(packageFailure) }
      : {}),
    "invalid.error.propagate": () => api.uuidStringToPlainSlug(packageFailure),
    "construct.codec": () => api.createUuidV7MaskingCodec({ mask: current }),
    "construct.mask": () => api.deriveUuidV7Mask(current),
    "construct.mask.bytes": () =>
      api.deriveUuidV7Mask({ seed: new Uint8Array(16), keyDerivationIterations: 1 }),
    "construct.mask.iterated": () =>
      api.deriveUuidV7Mask({ ...current, keyDerivationIterations: 8 }),
    "construct.codec.rotation": () =>
      api.createUuidV7MaskingCodec({
        mask: current,
        previousMasks: [previous, { seed: "profile-third-seed" }],
      }),
    "construct.codec.sentinels": () => api.createUuidV7MaskingCodec({ mask: current, sentinels }),
    "construct.codec.sentinels4": () =>
      api.createUuidV7MaskingCodec({ mask: current, sentinels: sentinelDefinitions.slice(0, 4) }),
    "construct.codec.sentinels8": () =>
      api.createUuidV7MaskingCodec({ mask: current, sentinels: sentinelDefinitions.slice(0, 8) }),
    "construct.codec.sentinels16": () =>
      api.createUuidV7MaskingCodec({ mask: current, sentinels: sentinelDefinitions.slice(0, 16) }),
    "construct.codec.sentinels64": () =>
      api.createUuidV7MaskingCodec({ mask: current, sentinels: sentinelDefinitions }),
    "construct.migration.current": () => codec.createUuidSlugMigrationDecoder(),
    "construct.migration.plain": () =>
      codec.createUuidSlugMigrationDecoder({ acceptPlainSlug: true }),
    "construct.migration.original": () =>
      codec.createUuidSlugMigrationDecoder({ acceptFixedMask: true }),
    "construct.migration.all": () =>
      codec.createUuidSlugMigrationDecoder({ acceptFixedMask: true, acceptPlainSlug: true }),
    "construct.custom": () =>
      api.createCustomUuidV7Mask({
        diagnosticLabel: "profile-identity",
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
            api.isPlainUuidSlug(value) ||
            !(codec.uuidToString(value) instanceof Error) ||
            !(base32Codec.uuidToString(value) instanceof Error) ||
            !(customCodec.uuidToString(value) instanceof Error);
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
