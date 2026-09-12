// SPDX-License-Identifier: Apache-2.0

import { BASE32HEX, BASE64URL, decodeInto, encode } from "./alphabet";
import { UuidSlugError } from "./errors";
import { decodeOriginalMask } from "./legacy-mask";
import { decodeFirstMaskedCandidate, decodeMaskedCandidates } from "./mask";
import type {
  UuidV7Mask,
  UuidSlugMigrationDecoder,
  UuidSlugMigrationFormat,
  UuidSlugMigrationOptions,
  UuidString,
  UuidV7String,
} from "./types";
import { UUID_SLUG_MIGRATION_FORMATS } from "./types";
import { bytesToUuid } from "./uuid";

/** Read old IDs with the codec's keys and sentinels; never change how new IDs are written. */
export function createMigration(
  schemas: readonly UuidV7Mask[],
  sentinels: ReadonlyMap<string, { uuid: UuidV7String }>,
  options?: UuidSlugMigrationOptions,
): UuidSlugMigrationDecoder | UuidSlugError {
  if (
    options !== undefined &&
    (typeof options !== "object" || options === null || Array.isArray(options))
  )
    return new UuidSlugError("invalid_options", "Migration options must be an object.");
  let originalOption: boolean | undefined;
  let plainOption: boolean | undefined;
  try {
    originalOption = options?.originalMask;
    plainOption = options?.plainSlug;
  } catch (cause) {
    return new UuidSlugError("invalid_options", "Reading migration options failed.", { cause });
  }
  if (originalOption !== undefined && typeof originalOption !== "boolean")
    return new UuidSlugError("invalid_options", "Migration originalMask option must be a boolean.");
  if (plainOption !== undefined && typeof plainOption !== "boolean")
    return new UuidSlugError("invalid_options", "Migration plainSlug option must be a boolean.");
  const original = originalOption === true;
  const plain = plainOption === true;

  function read(slug: string, format: UuidSlugMigrationFormat | undefined, firstOnly: boolean) {
    if (typeof slug !== "string")
      return new UuidSlugError("invalid_uuid_slug", "Migration slug must be a string.");
    if (
      (format !== undefined &&
        !UUID_SLUG_MIGRATION_FORMATS.some((candidate) => candidate === format)) ||
      (format === "original-mask" && !original) ||
      (format === "plain-slug" && !plain)
    )
      return new UuidSlugError(
        "invalid_uuid_slug",
        "Enable the requested format when creating the migration reader.",
      );

    const sentinel = sentinels.get(slug);
    if (sentinel) return [sentinel.uuid];
    const useCurrent = format === undefined || format === "current-mask";
    const useOriginal = original && (format === undefined || format === "original-mask");
    const usePlain = plain && (format === undefined || format === "plain-slug");
    const bytes = new Uint8Array(16);
    // Original readers ignored the four trailing bits. Keep those aliases confined to migration.
    const base32 = slug.length === 26 && usePlain;
    const safeMasked = slug.length === 27 && useCurrent;
    const tail = decodeInto(
      slug,
      base32 || safeMasked ? BASE32HEX : BASE64URL,
      bytes,
      0,
      16,
      base32 ? 0 : 4,
    );
    if (tail instanceof Error) return tail;
    // A base64 alias differs only in its final four bits; reuse the validated text instead of
    // encoding all sixteen bytes again. Base32 input still needs the sentinel's base64 spelling.
    const reserved =
      !safeMasked &&
      (useOriginal || usePlain) &&
      sentinels.get(
        base32
          ? encode(bytes, BASE64URL)
          : tail === 0
            ? slug
            : slug.slice(0, 21) + BASE64URL.chars[((bytes[15] as number) & 3) << 4],
      );
    if (reserved && firstOnly) return [reserved.uuid];
    const candidates: UuidString[] = reserved ? [reserved.uuid] : [];
    function add(value: Uint8Array) {
      const uuid = bytesToUuid(value);
      if (uuid instanceof Error) return uuid;
      if (!candidates.includes(uuid)) candidates.push(uuid);
      return undefined;
    }
    if (useCurrent && !base32) {
      const matches = firstOnly
        ? decodeFirstMaskedCandidate(bytes, tail, schemas, candidates)
        : decodeMaskedCandidates(bytes, tail, schemas, candidates);
      if (matches instanceof Error) return matches;
      if (firstOnly && candidates.length) return candidates;
    }
    // Legacy aliases reserve the raw identity, but their check bits can also encode a current ID.
    if (reserved) return candidates;
    if (useOriginal && slug.length === 22) {
      const match = decodeOriginalMask(bytes);
      if (match instanceof Error) return match;
      if (match) {
        const failed = add(match);
        if (failed) return failed;
        if (firstOnly) return candidates;
      }
    }
    if (usePlain && !safeMasked) {
      const failed = add(bytes);
      if (failed) return failed;
    }
    return candidates;
  }

  return {
    decodeSlug(slug, format) {
      const result = read(slug, format, true);
      return result instanceof Error
        ? result
        : (result[0] ??
            new UuidSlugError("invalid_uuid_slug", "Slug does not match an enabled format."));
    },
    decodeSlugCandidates(slug, format) {
      return read(slug, format, false);
    },
  };
}
