// SPDX-License-Identifier: Apache-2.0

import { BASE32HEX, BASE64URL, decodeInto, encode, spareBits } from "./alphabet";
import { UuidSlugError } from "./errors";
import { mix32, read32 } from "./feistel";
import { applyMaskSchema } from "./schema-handle";
import { bytesToUuid } from "./uuid";
import type { UuidV7Mask, MaskedUuidV7Slug, UuidString } from "./types";
import type { SlugAlphabet } from "./uuid";

/** Custom callbacks can fail after construction; preserve their cause in the public error contract. */
function applyMix(
  schema: UuidV7Mask,
  input: Uint8Array,
  output: Uint8Array,
  direction: "mask" | "unmask",
): undefined | UuidSlugError {
  try {
    const cause = applyMaskSchema(schema, input, output, direction);
    return cause
      ? new UuidSlugError(
          "invalid_mask_schema",
          `UUIDv7 mask "${schema.label}" failed while ${direction === "mask" ? "masking" : "unmasking"}.`,
          { cause },
        )
      : undefined;
  } catch (cause) {
    return new UuidSlugError(
      "invalid_mask_schema",
      `UUIDv7 mask "${schema.label}" failed while ${direction === "mask" ? "masking" : "unmasking"}.`,
      { cause },
    );
  }
}

/**
 * Spread every input word across the check so structured UUID fields do not collapse into a sum.
 * This avalanche mixer supplies error detection, not authentication or a cryptographic-strength
 * claim; `docs/security.md` defines that boundary.
 *
 * Taken from the TOP so that widening the check never renumbers the bits below it.
 */
function tagFor(bytes: Uint8Array, width: number) {
  let acc = 0;
  for (let offset = 0; offset < 16; offset += 4) acc = mix32(acc ^ read32(bytes, offset));
  return acc >>> (32 - width);
}

/**
 * The 12 check bits a UUIDv7 can hold inside the block, because it spends them on nothing: bits
 * 0-3 in byte 6's version nibble, 4-5 in byte 8's variant bits, 6-11 in byte 0's top six — the
 * high end of the 48-bit timestamp, zero for every instant before 2109. The rest of the check
 * rides outside the block, in whatever the encoding has spare.
 *
 * Claiming byte 0 is why encoding must REFUSE an instant at or past 2^42 ms rather than truncate.
 */
function injectTag(bytes: Uint8Array, tag: number) {
  bytes[6] = ((tag & 0x0f) << 4) | ((bytes[6] ?? 0) & 0x0f);
  bytes[8] = ((tag & 0x30) << 2) | ((bytes[8] ?? 0) & 0x3f);
  bytes[0] = (((tag >>> 6) & 0x3f) << 2) | ((bytes[0] ?? 0) & 0x03);
}

function extractTag(bytes: Uint8Array) {
  return ((bytes[6] ?? 0) >>> 4) | (((bytes[8] ?? 0) >>> 6) << 4) | (((bytes[0] ?? 0) >>> 2) << 6);
}

/** Puts back the constants the tag displaced, so the block equals the UUID the caller handed in. */
function restoreV7(bytes: Uint8Array) {
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  bytes[0] = (bytes[0] ?? 0) & 0x03;
}

/** The 12 check bits that fit inside the block; the rest ride in the encoding's spare bits. */
const INNER_TAG_BITS = 12;

/**
 * The existing base64url wire format fixes four outer check bits. Alternate spellings preserve
 * all 132 bits; the safe base32hex spelling adds three zero padding bits, not more check bits.
 */
const OUTER_TAG_BITS = spareBits(BASE64URL, 16);
const TAG_BITS = INNER_TAG_BITS + OUTER_TAG_BITS;

export function uuidV7BytesToMaskedSlug(
  raw: Uint8Array,
  schema: UuidV7Mask,
  alphabet: SlugAlphabet = "base64url",
  reserved?: { readonly size: number; has(slug: string): boolean },
): MaskedUuidV7Slug | UuidSlugError {
  // Truncating instead would make encoding non-injective — two UUIDs would share one slug, and no
  // decoder could ever tell which was meant. Refusing is the only recoverable answer.
  if ((raw[0] ?? 0) > 0x03)
    return new UuidSlugError(
      "invalid_timestamp",
      "Masking requires a UUIDv7 timestamped before 2^42 ms (year 2109); its top six bits carry the check.",
    );
  const tag = tagFor(raw, TAG_BITS);
  const mixed = new Uint8Array(raw);
  injectTag(mixed, tag >>> OUTER_TAG_BITS);
  // Every schema receives an isolated block. Reusing that block as output removes a second
  // allocation; built-in transforms read all words before writing and custom transforms copy input.
  const failed = applyMix(schema, mixed, mixed, "mask");
  if (failed) return failed;
  const tail = tag & ((1 << OUTER_TAG_BITS) - 1);
  // Raw sentinels have zero outer bits. Only that tail can collide with retained base64 reads;
  // other safe writes need no second encoding to check a collision that cannot occur.
  const canonical =
    alphabet === "base64url" || (tail === 0 && reserved?.size)
      ? encode(mixed, BASE64URL, tail, OUTER_TAG_BITS)
      : undefined;
  if (canonical !== undefined && reserved?.has(canonical))
    return new UuidSlugError(
      "invalid_mask_schema",
      "Masked output collides with a reserved sentinel. Configure a different mask or sentinel set.",
    );
  return (
    canonical !== undefined && alphabet === "base64url"
      ? canonical
      : encode(mixed, BASE32HEX, tail, OUTER_TAG_BITS)
  ) as MaskedUuidV7Slug;
}

export function decodeMaskedSlug(
  slug: string,
  schema: UuidV7Mask,
  previous: readonly UuidV7Mask[] = [],
): Uint8Array | UuidSlugError {
  if (typeof slug !== "string")
    return new UuidSlugError("invalid_uuid_slug", "Masked UUID slug must be a string.");
  const mixed = new Uint8Array(16);
  const outerTag = decodeInto(
    slug,
    slug.length === 27 ? BASE32HEX : BASE64URL,
    mixed,
    0,
    16,
    OUTER_TAG_BITS,
  );
  if (outerTag instanceof Error) return outerTag;
  // A callback may mutate or retain its input. Each attempted key must receive fresh original
  // ciphertext, as it would when decoding the text again; only the text validation is shared.
  const primary = unmix(previous.length ? mixed.slice() : mixed, outerTag, schema);
  if (primary instanceof Error) return primary;
  if (primary) return primary;
  for (const older of previous) {
    const decoded = unmix(mixed.slice(), outerTag, older);
    if (decoded instanceof Error) return decoded;
    if (decoded) return decoded;
  }
  return new UuidSlugError("invalid_uuid_slug", "Masked UUID slug failed schema validation.");
}

/** Append distinct UUIDs directly to the result, before another callback can mutate their bytes. */
export function decodeMaskedCandidates(
  mixed: Uint8Array,
  outerTag: number,
  schemas: readonly UuidV7Mask[],
  firstOnly = false,
  candidates: UuidString[] = [],
): UuidString[] | UuidSlugError {
  for (const schema of schemas) {
    // Custom callbacks may mutate their input; no key may alter what the next one sees.
    const decoded = unmix(mixed.slice(), outerTag, schema);
    // A failed callback means the candidate list is incomplete, not that its key mismatched.
    if (decoded instanceof Error) return decoded;
    if (decoded) {
      const uuid = bytesToUuid(decoded);
      if (uuid instanceof Error) return uuid;
      if (!candidates.includes(uuid)) candidates.push(uuid);
      if (firstOnly) break;
    }
  }
  return candidates;
}

function unmix(
  mixed: Uint8Array,
  outerTag: number,
  schema: UuidV7Mask,
): Uint8Array | undefined | UuidSlugError {
  // `mixed` is already private to this schema attempt, so the same alias-safe transform contract
  // can write back into it instead of allocating another block.
  const failed = applyMix(schema, mixed, mixed, "unmask");
  if (failed) return failed;
  // Both halves come out of the same decryption, so a wrong key garbles the observed check as
  // thoroughly as the payload: the tag needs no key of its own to tell keys apart.
  const foundTag = (extractTag(mixed) << OUTER_TAG_BITS) | outerTag;
  restoreV7(mixed);
  if (tagFor(mixed, TAG_BITS) !== foundTag) return undefined;
  return mixed;
}
