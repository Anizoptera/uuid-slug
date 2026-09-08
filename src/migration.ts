// SPDX-License-Identifier: Apache-2.0

import { BASE64URL, decodeInto } from "./alphabet";
import { UuidSlugError } from "./errors";
import { decodeOriginalMask } from "./legacy-mask";
import { decodeMaskedCandidates } from "./mask";
import type {
  MaskSchema,
  MigrationFormat,
  UuidSlugMigration,
  UuidSlugMigrationOptions,
  UuidString,
  UuidV7String,
} from "./types";
import { formatUuid, formatUuidSlug, parseUuidSlug } from "./uuid";

/** Read old IDs with the codec's keys and sentinels; never change how new IDs are written. */
export function createMigration(
  schemas: readonly MaskSchema[],
  sentinels: ReadonlyMap<string, { uuid: UuidV7String }>,
  options: UuidSlugMigrationOptions = {},
): UuidSlugMigration {
  const original = options.original === true;
  const plain = options.plain === true;

  function read(slug: string, format: MigrationFormat | undefined, firstOnly: boolean) {
    if (
      (format !== undefined &&
        format !== "current" &&
        format !== "original" &&
        format !== "plain") ||
      (format === "original" && !original) ||
      (format === "plain" && !plain)
    )
      return new UuidSlugError(
        "invalid_uuid_slug",
        "Enable the requested format when creating the migration reader.",
      );

    const sentinel = sentinels.get(slug);
    if (sentinel) return [sentinel.uuid];
    const useCurrent = format === undefined || format === "current";
    const useOriginal = original && (format === undefined || format === "original");
    const usePlain = plain && (format === undefined || format === "plain");
    const bytes = new Uint8Array(16);
    // Original readers ignored the four trailing bits. Keep those aliases confined to migration.
    const tail =
      slug.length === 26 && usePlain
        ? parseUuidSlug(slug, bytes)
        : decodeInto(slug, BASE64URL, bytes, 0, 16, 4);
    if (tail instanceof Error) return tail;
    if (useOriginal || usePlain) {
      const canonical = formatUuidSlug(bytes);
      if (canonical instanceof Error) return canonical;
      const reserved = sentinels.get(canonical);
      if (reserved) return [reserved.uuid];
    }
    const candidates: UuidString[] = [];
    function add(value: Uint8Array) {
      const uuid = formatUuid(value);
      if (uuid instanceof Error) return uuid;
      if (!candidates.includes(uuid)) candidates.push(uuid);
      return undefined;
    }
    if (useCurrent && slug.length === 22 && typeof tail === "number") {
      const matches = decodeMaskedCandidates(bytes, tail, schemas, firstOnly);
      if (matches instanceof Error) return matches;
      for (const match of matches) {
        const failed = add(match);
        if (failed) return failed;
      }
      if (firstOnly && candidates.length) return candidates;
    }
    if (useOriginal && slug.length === 22) {
      const match = decodeOriginalMask(bytes);
      if (match instanceof Error) return match;
      if (match) {
        const failed = add(match);
        if (failed) return failed;
        if (firstOnly) return candidates;
      }
    }
    if (usePlain) {
      const failed = add(bytes);
      if (failed) return failed;
    }
    return candidates;
  }

  return {
    decode(slug, format) {
      const result = read(slug, format, true);
      return result instanceof Error
        ? result
        : (result[0] ??
            new UuidSlugError("invalid_uuid_slug", "Slug does not match an enabled format."));
    },
    candidates(slug, format) {
      return read(slug, format, false);
    },
  };
}
