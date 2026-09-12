// SPDX-License-Identifier: Apache-2.0

import { unwrap } from "../dev/unwrap";
type Api = typeof import("../src/index");
type PrivateApi = Pick<typeof import("../src/v4"), "generatePortableUuidV4">;
export type ProfileValue = string | number | boolean | Uint8Array | Error | object;
export type ProfileCase = (index: number) => ProfileValue;

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
  privateApi: PrivateApi | undefined,
): Record<string, ProfileCase> {
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
  const sentinelDefinitions = Array.from({ length: 16 }, (_, index) => ({
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
    api.createUuidV7SlugCodec({ mask: current, sentinels: sentinelDefinitions }),
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
  const ids = Array.from({ length: 256 }, (_, index) => {
    const time = (instant + index).toString(16).padStart(12, "0");
    const a = ((index * 251) & 4095).toString(16).padStart(3, "0");
    const b = (0x8000 | ((index * 31337) & 16383)).toString(16);
    const tail = (Math.imul(index + 1, 0x9e3779b1) >>> 0).toString(16).padStart(8, "0");
    return `${time.slice(0, 8)}-${time.slice(8)}-7${a}-${b}-${tail}${index.toString(16).padStart(4, "0")}`;
  });
  const bytes = ids.map((id) => unwrap(api.uuidToBytes(id)));
  const sentinelBytes = sentinelDefinitions.map(({ uuid }) => unwrap(api.uuidToBytes(uuid)));
  const slugs = ids.map((id) => unwrap(api.uuidToSlug(id)));
  const base32 = ids.map((id) => unwrap(api.uuidToSlug(id, "base32hex")));
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
  const into = new Uint8Array(24);
  const sentinel = codec.sentinels[0];
  if (!sentinel) throw new Error("Missing sentinel fixture");
  const badUuid = "z".repeat(36);
  const badSlug = "!".repeat(22);
  const v4Uuid = "3b12f1df-5232-4804-897e-917bf397618a";
  if (!base32Sentinel) throw new Error("Missing base32 sentinel fixture");

  return {
    control: (index) => ids[index & 255] as string,
    "v4.string": () => api.generateUuidV4(),
    ...(privateApi ? { "portable.v4.string": () => privateApi.generatePortableUuidV4() } : {}),
    "v7.string": () => api.generateUuidV7(),
    "v4.bytes": () => api.generateUuidV4Bytes(),
    "v4.into": () => api.generateUuidV4Bytes(into, 4),
    "v7.bytes": () => api.generateUuidV7Bytes(),
    "v7.into": () => api.generateUuidV7Bytes(into, 4),
    "v7.at": (index) => api.generateUuidV7At(instant + (index & 255)),
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
    "timestamp.masked": (index) =>
      codec.validateSlugTimestamp(masked[index & 255] as string, timestampWindow),
    "masked.generate": () => codec.generateSlug(),
    "masked.encode": (index) => codec.encodeUuid(ids[index & 255] as string),
    "masked.encode.bytes": (index) => codec.encodeUuid(bytes[index & 255] as Uint8Array),
    "masked.decode": (index) => codec.decodeSlug(masked[index & 255] as string),
    "masked.decode.bytes": (index) => codec.decodeSlugToBytes(masked[index & 255] as string),
    "masked.decode.into": (index) =>
      codec.decodeSlugToBytes(masked[index & 255] as string, into, 4),
    "masked.base32.encode": (index) => base32Codec.encodeUuid(ids[index & 255] as string),
    "masked.base32.decode": (index) => base32Codec.decodeSlug(maskedBase32[index & 255] as string),
    "masked.base32.decode.bytes": (index) =>
      base32Codec.decodeSlugToBytes(maskedBase32[index & 255] as string),
    "masked.base32.decode.into": (index) =>
      base32Codec.decodeSlugToBytes(maskedBase32[index & 255] as string, into, 4),
    "masked.custom.encode": (index) => customCodec.encodeUuid(bytes[index & 255] as Uint8Array),
    "masked.custom.decode": (index) => customCodec.decodeSlug(maskedCustom[index & 255] as string),
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
    "migration.original": (index) =>
      migration.decodeSlug(originals[index % originals.length]!.slug, "original-mask"),
    "migration.plainCandidates": (index) =>
      migration.decodeSlugCandidates(slugs[index & 255] as string, "plain-slug"),
    "migration.originalCandidates": (index) =>
      migration.decodeSlugCandidates(originals[index % originals.length]!.slug, "original-mask"),
    "invalid.migration": () => maskedOnlyMigration.decodeSlug(badSlug),
    "invalid.migrationCandidates": () => maskedOnlyMigration.decodeSlugCandidates(badSlug),
    "sentinel.encode": () => codec.encodeUuid(sentinel.uuid),
    "sentinel.decode": () => codec.decodeSlug(sentinel.slug),
    "sentinel.decode.bytes": () => codec.decodeSlugToBytes(sentinel.slug),
    "sentinel.timestamp": () => codec.validateSlugTimestamp(sentinel.slug, sentinelTimestampWindow),
    "sentinel.base32.encode": () => base32Codec.encodeUuid(base32Sentinel.uuid),
    "sentinel.base32.decode": () => base32Codec.decodeSlug(base32Sentinel.slug),
    "sentinel.base32.decode.bytes": () => base32Codec.decodeSlugToBytes(base32Sentinel.slug),
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
    "invalid.uuid": () => api.uuidToBytes(badUuid),
    "invalid.slug": () => api.slugToBytes(badSlug),
    "invalid.mask": (index) => codec.decodeSlug(oldOnly[index % oldOnly.length] as string),
    "invalid.timestamp.version": () => api.validateUuidV7Timestamp(v4Uuid, timestampWindow),
    "error.classify": () => api.isUuidSlugError(api.uuidToBytes(badUuid)),
    "error.unwrap.success": (index) => api.unwrapUuidSlug(bytes[index & 255] as Uint8Array),
    "invalid.error.unwrap": () => {
      try {
        return api.unwrapUuidSlug(api.uuidToBytes(badUuid));
      } catch (cause) {
        if (!(cause instanceof Error)) throw cause;
        return cause;
      }
    },
    "construct.codec": () => api.createUuidV7SlugCodec({ mask: current }),
    "construct.schema": () => api.createUuidV7Mask(current),
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
      api.createUuidV7SlugCodec({ mask: current, sentinels: sentinelDefinitions }),
    "construct.custom": () =>
      api.createCustomUuidV7Mask({
        label: "profile-identity",
        mask: (input) => input,
        unmask: (input) => input,
      }),
  } satisfies Record<string, ProfileCase>;
}
