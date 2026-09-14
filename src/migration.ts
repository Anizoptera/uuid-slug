// SPDX-License-Identifier: Apache-2.0

import { BASE32HEX, BASE64URL, decodeInto, encode } from "./alphabet.ts";
import {
  INVALID_OPTIONS,
  INVALID_UUID_SLUG,
  invalidUuidSlugInput,
  isUuidSlugError,
  UuidSlugError,
} from "./errors.ts";
import { decodeFirstMaskedCandidate, decodeMaskedCandidates } from "./payload.ts";
import type {
  UuidV7Mask,
  UuidSlugMigrationDecoder,
  UuidSlugMigrationFormat,
  UuidSlugMigrationOptions,
  UuidString,
  UuidV7String,
} from "./types.ts";
import { CURRENT_MASK_FORMAT, DIRECT_SLUG_FORMAT, ORIGINAL_MASK_FORMAT } from "./types.ts";
import { bytesToUuidString } from "./uuid.ts";

// These tables and the four-bit checksum define the original wire format.
// Changing them would change the UUID recovered from an existing slug.
const PERMUTE = [9, 13, 3, 8, 14, 0, 11, 7, 6, 1, 15, 4, 2, 5, 10, 12] as const;
const XOR = [
  0xa2, 0x70, 0x32, 0x7f, 0x98, 0xb8, 0x9b, 0x5e, 0x1b, 0x26, 0xb6, 0x16, 0x96, 0xf9, 0xea, 0x3e,
] as const;

/** Return a matching candidate or undefined; callers resolve sentinels before trying masks. */
/*#__NO_SIDE_EFFECTS__*/
function decodeOriginalMask(mixed: Uint8Array): Uint8Array | undefined {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++)
    bytes[PERMUTE[i] as number] = (mixed[i] as number) ^ (XOR[i] as number);
  const found = (bytes[6] as number) >>> 4;
  bytes[6] = ((bytes[6] as number) & 15) | 0x70;
  let checksum = 0;
  for (const byte of bytes) checksum ^= byte;
  // A mismatch is expected while trying formats; allocate diagnostics only if the reader fails.
  return ((checksum >>> 4) ^ (checksum & 15)) === found ? bytes : undefined;
}

/** Read old IDs with the codec's keys and sentinels; never change how new IDs are written. */
export function createMigration(
  masks: readonly UuidV7Mask[],
  sentinels: ReadonlyMap<string, { uuid: UuidV7String }>,
  options?: UuidSlugMigrationOptions,
): UuidSlugMigrationDecoder | UuidSlugError {
  if (
    options !== undefined &&
    (typeof options !== "object" || options === null || Array.isArray(options))
  )
    return new UuidSlugError(INVALID_OPTIONS, "Migration options must be an object.");
  let originalOption: boolean | undefined;
  let directOption: boolean | undefined;
  try {
    originalOption = options?.originalMask;
    directOption = options?.directSlug;
  } catch (cause) {
    return new UuidSlugError(INVALID_OPTIONS, "Reading migration options failed.", { cause });
  }
  if (originalOption !== undefined && typeof originalOption !== "boolean")
    return new UuidSlugError(INVALID_OPTIONS, "Migration originalMask option must be a boolean.");
  if (directOption !== undefined && typeof directOption !== "boolean")
    return new UuidSlugError(INVALID_OPTIONS, "Migration directSlug option must be a boolean.");
  const original = originalOption === true;
  const direct = directOption === true;

  function read(
    slug: string | UuidSlugError,
    format: UuidSlugMigrationFormat | undefined,
    firstOnly: boolean,
  ) {
    if (typeof slug !== "string") return invalidUuidSlugInput(slug);
    if (
      (format !== undefined &&
        format !== CURRENT_MASK_FORMAT &&
        format !== ORIGINAL_MASK_FORMAT &&
        format !== DIRECT_SLUG_FORMAT) ||
      (format === ORIGINAL_MASK_FORMAT && !original) ||
      (format === DIRECT_SLUG_FORMAT && !direct)
    )
      return new UuidSlugError(
        INVALID_UUID_SLUG,
        "Enable the requested format when creating the migration reader.",
      );

    const sentinel = sentinels.get(slug);
    if (sentinel) return [sentinel.uuid];
    const useCurrent = format === undefined || format === CURRENT_MASK_FORMAT;
    const useOriginal = original && (format === undefined || format === ORIGINAL_MASK_FORMAT);
    const useDirect = direct && (format === undefined || format === DIRECT_SLUG_FORMAT);
    const bytes = new Uint8Array(16);
    // Original readers ignored the four trailing bits. Keep those aliases confined to migration.
    const base32 = slug.length === 26 && useDirect;
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
      (useOriginal || useDirect) &&
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
      const uuid = bytesToUuidString(value);
      if (uuid instanceof Error) return uuid;
      if (!candidates.includes(uuid)) candidates.push(uuid);
      return undefined;
    }
    if (useCurrent && !base32) {
      const matches = firstOnly
        ? decodeFirstMaskedCandidate(bytes, tail, masks, candidates)
        : decodeMaskedCandidates(bytes, tail, masks, candidates);
      if (isUuidSlugError(matches)) return matches;
      if (firstOnly && candidates.length) return candidates;
    }
    // Legacy aliases reserve the raw identity, but their check bits can also encode a current ID.
    if (reserved) return candidates;
    if (useOriginal && slug.length === 22) {
      const match = decodeOriginalMask(bytes);
      if (match) {
        const failed = add(match);
        if (failed) return failed;
        if (firstOnly) return candidates;
      }
    }
    if (useDirect && !safeMasked) {
      const failed = add(bytes);
      if (failed) return failed;
    }
    return candidates;
  }

  return {
    uuidSlugToString(slug, format) {
      const result = read(slug, format, true);
      return isUuidSlugError(result)
        ? result
        : (result[0] ??
            new UuidSlugError(INVALID_UUID_SLUG, "Slug does not match an enabled format."));
    },
    uuidSlugToStringCandidates(slug, format) {
      return read(slug, format, false);
    },
  };
}
