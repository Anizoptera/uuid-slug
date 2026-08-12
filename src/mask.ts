// SPDX-License-Identifier: Apache-2.0

import { BASE64URL, decodeInto, encode, spareBits } from "./alphabet";
import { UuidSlugError } from "./errors";
import { mix32, read32 } from "./feistel";
import { formatUuid, isRfcVariant, parseUuid, uuidVersion } from "./uuid";
import type { MaskSchema, MaskedUuidV7Slug, UuidString } from "./types";

/**
 * The check must fail a wrong key with probability 2^-width, which holds only if the function
 * spreads its input across its whole output — so this is an avalanche mixer, not a sum. Measured
 * over 100,000 draws: uniform to chi-squared/df 0.999 across all 65,536 buckets of its top 16 bits.
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

export function uuidToMaskedSlugWithSchema(
  uuid: string,
  schema: MaskSchema,
): UuidSlugError | MaskedUuidV7Slug {
  const raw = parseUuid(uuid);
  if (raw instanceof Error) return raw;
  if (uuidVersion(raw) !== 7 || !isRfcVariant(raw))
    return new UuidSlugError("invalid_uuid_version", "Masked UUID slugs currently require UUIDv7.");
  return uuidV7BytesToMaskedSlug(raw, schema);
}

/** The 12 check bits that fit inside the block; the rest ride in the encoding's spare bits. */
const INNER_TAG_BITS = 12;

/**
 * A masked slug is always 22 base64url characters (Art's ruling, 2026-08-12), so the outer half of
 * the check is a constant 4 bits. Derived rather than written as `4` because the derivation IS the
 * rule — the check is whatever the encoding has left over, never a number somebody chose.
 */
const OUTER_TAG_BITS = spareBits(BASE64URL, 16);
const TAG_BITS = INNER_TAG_BITS + OUTER_TAG_BITS;

export function uuidV7BytesToMaskedSlug(
  raw: Uint8Array,
  schema: MaskSchema,
): UuidSlugError | MaskedUuidV7Slug {
  // Truncating instead would make encoding non-injective — two UUIDs would share one slug, and no
  // decoder could ever tell which was meant. Refusing is the only recoverable answer.
  if ((raw[0] ?? 0) > 0x03)
    return new UuidSlugError(
      "invalid_timestamp",
      "Masking requires a UUIDv7 timestamped before 2^42 ms (year 2109); its top six bits carry the check.",
    );
  const tag = tagFor(raw, TAG_BITS);
  const tagged = new Uint8Array(raw);
  injectTag(tagged, tag >>> OUTER_TAG_BITS);
  const mixed = new Uint8Array(16);
  schema.mix(tagged, mixed, true);
  return encode(mixed, BASE64URL, tag & ((1 << OUTER_TAG_BITS) - 1), OUTER_TAG_BITS);
}

export function maskedSlugToUuidWithSchema(
  slug: string,
  schema: MaskSchema,
): UuidSlugError | UuidString {
  const mixed = new Uint8Array(16);
  const outerTag = decodeInto(slug, BASE64URL, mixed, 0, 16, OUTER_TAG_BITS);
  if (outerTag instanceof Error) return outerTag;
  const unmixed = new Uint8Array(16);
  schema.mix(mixed, unmixed, false);
  // Both halves come out of the same decryption, so a wrong key garbles the observed check as
  // thoroughly as the payload: the tag needs no key of its own to tell keys apart.
  const foundTag = (extractTag(unmixed) << OUTER_TAG_BITS) | outerTag;
  restoreV7(unmixed);
  if (tagFor(unmixed, TAG_BITS) !== foundTag)
    return new UuidSlugError("invalid_uuid_slug", "Masked UUID slug failed schema validation.");
  return formatUuid(unmixed);
}
