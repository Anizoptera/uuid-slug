// SPDX-License-Identifier: Apache-2.0

import { unwrap } from "../dev/unwrap";

type Api = typeof import("../src/index");
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
): Record<string, ProfileCase> {
  const instant = 1_725_000_000_000;
  const timestampWindow = { maxTimestampDeltaMs: 86_400_000, referenceUnixMs: instant };
  const current = { seed: "profile-current-seed" };
  const previous = { seed: "profile-previous-seed" };
  const sentinels = [{ name: "nil", uuid: "00000000-0000-7000-8000-000000000000" }];
  const codec = unwrap(api.createUuidV7SlugCodec({ mask: current, sentinels }));
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
  const originals = originalFixtures.filter(({ slug, raw }) => slug !== raw);
  const portable = api.createUuidV7Generator({ clock: () => instant });
  const ids = Array.from({ length: 256 }, (_, index) => {
    const time = (instant + index).toString(16).padStart(12, "0");
    const a = ((index * 251) & 4095).toString(16).padStart(3, "0");
    const b = (0x8000 | ((index * 31337) & 16383)).toString(16);
    const tail = (Math.imul(index + 1, 0x9e3779b1) >>> 0).toString(16).padStart(8, "0");
    return `${time.slice(0, 8)}-${time.slice(8)}-7${a}-${b}-${tail}${index.toString(16).padStart(4, "0")}`;
  });
  const bytes = ids.map((id) => unwrap(api.uuidToBytes(id)));
  const slugs = ids.map((id) => unwrap(api.uuidToSlug(id)));
  const base32 = ids.map((id) => unwrap(api.uuidToSlug(id, "base32hex")));
  const masked = ids.map((id) => unwrap(codec.encodeUuid(id)));
  const maskedBase32 = ids.map((id) => unwrap(base32Codec.encodeUuid(id)));
  const maskedCustom = bytes.map((value) => unwrap(customCodec.encodeUuid(value)));
  const oldOnly = ids
    .map((id) => unwrap(older.encodeUuid(id)))
    .filter((slug) => codec.decodeSlug(slug) instanceof Error);
  if (oldOnly.length === 0) throw new Error("No previous-key-only fixtures");
  const into = new Uint8Array(24);
  const sentinel = codec.sentinels[0];
  if (!sentinel) throw new Error("Missing sentinel fixture");
  const badUuid = "z".repeat(36);
  const badSlug = "!".repeat(22);
  if (!base32Sentinel) throw new Error("Missing base32 sentinel fixture");

  return {
    control: (index) => ids[index & 255] as string,
    "v4.string": () => api.generateUuidV4(),
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
    "slug.into": (index) => api.slugToBytes(slugs[index & 255] as string, into, 4),
    "slug.base32.into": (index) => api.slugToBytes(base32[index & 255] as string, into, 4),
    "guard.uuid.any": (index) => api.isUuidString(ids[index & 255]),
    "guard.uuid.v4": () => api.isUuidV4String("3b12f1df-5232-4804-897e-917bf397618a"),
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
    "masked.custom.encode": (index) => customCodec.encodeUuid(bytes[index & 255] as Uint8Array),
    "masked.custom.decode": (index) => customCodec.decodeSlug(maskedCustom[index & 255] as string),
    "rotation.current": (index) => rotated.decodeSlug(masked[index & 255] as string),
    "rotation.previous": (index) => rotated.decodeSlug(oldOnly[index % oldOnly.length] as string),
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
    "sentinel.encode": () => codec.encodeUuid(sentinel.uuid),
    "sentinel.decode": () => codec.decodeSlug(sentinel.slug),
    "sentinel.base32.encode": () => base32Codec.encodeUuid(base32Sentinel.uuid),
    "sentinel.base32.decode": () => base32Codec.decodeSlug(base32Sentinel.slug),
    "invalid.uuid": () => api.uuidToBytes(badUuid),
    "invalid.slug": () => api.slugToBytes(badSlug),
    "invalid.mask": (index) => codec.decodeSlug(oldOnly[index % oldOnly.length] as string),
    "error.classify": () => api.isUuidSlugError(api.uuidToBytes(badUuid)),
    "error.unwrap.success": (index) => api.unwrapUuidSlug(bytes[index & 255] as Uint8Array),
    "construct.codec": () => api.createUuidV7SlugCodec({ mask: current }),
    "construct.schema": () => api.createUuidV7Mask(current),
    "construct.schema.iterated": () =>
      api.createUuidV7Mask({ ...current, keyDerivationIterations: 8 }),
    "construct.custom": () =>
      api.createCustomUuidV7Mask({
        label: "profile-identity",
        mask: (input) => input,
        unmask: (input) => input,
      }),
  } satisfies Record<string, ProfileCase>;
}
