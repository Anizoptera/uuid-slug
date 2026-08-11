// SPDX-License-Identifier: Apache-2.0

import { BASE32HEX, BASE64URL, decodeInto, encode, spareBits } from "./alphabet";
import type { Alphabet } from "./alphabet";
import { UuidSlugError } from "./errors";
import { formatUuid, isRfcVariant, parseUuid, uuidVersion } from "./uuid";
import type {
  MaskSchema,
  MaskedUuidSlug,
  MaskedUuidV7Slug,
  UuidString,
  UuidV7String,
} from "./types";

function checksum4(bytes: Uint8Array): number {
  let acc = 0;
  for (const byte of bytes) acc ^= byte;
  return (acc >>> 4) ^ (acc & 0x0f);
}

function checksum6(bytes: Uint8Array): number {
  let acc = 0;
  for (let i = 0; i < bytes.length; i += 1) acc = (acc + (bytes[i] ?? 0) * (i + 17)) & 0xff;
  return ((acc >>> 2) ^ acc) & 0x3f;
}

function tagFor(bytes: Uint8Array, tagBits: 4 | 6) {
  return tagBits === 4 ? checksum4(bytes) : checksum6(bytes);
}

function injectTag(bytes: Uint8Array, tag: number, tagBits: 4 | 6) {
  bytes[6] = ((tag & 0x0f) << 4) | ((bytes[6] ?? 0) & 0x0f);
  if (tagBits === 6) bytes[8] = ((tag & 0x30) << 2) | ((bytes[8] ?? 0) & 0x3f);
}

function extractTag(bytes: Uint8Array, tagBits: 4 | 6) {
  const versionBits = (bytes[6] ?? 0) >>> 4;
  if (tagBits === 4) return versionBits;
  return versionBits | (((bytes[8] ?? 0) >>> 6) << 4);
}

function restoreV7(bytes: Uint8Array, tagBits: 4 | 6) {
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70;
  if (tagBits === 6) bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
}

export function uuidToMaskedSlugWithSchema(
  uuid: string,
  schema: MaskSchema,
): Error | MaskedUuidSlug {
  const raw = parseUuid(uuid);
  if (raw instanceof Error) return raw;
  if (uuidVersion(raw) !== 7 || !isRfcVariant(raw))
    return new UuidSlugError("invalid_uuid_version", "Masked UUID slugs currently require UUIDv7.");
  return uuidV7BytesToMaskedSlug(raw, schema);
}

/**
 * Width of the scheme marker carried in the encoding's spare low bits. Two is not a preference
 * but the maximum both alphabets can hold for free: 16 bytes occupy 128 of the 132 bits in 22
 * base64url characters and 130 of the 130 in 26 base32hex characters, so three bits would cost
 * base32hex a 27th character. Four schemes is the ceiling that follows.
 */
export const SCHEMA_ID_BITS = 2;

for (const alpha of [BASE64URL, BASE32HEX])
  if (spareBits(alpha, 16) < SCHEMA_ID_BITS)
    throw new Error(`${alpha.name} cannot carry the mask scheme marker without growing a slug.`);

export function uuidV7BytesToMaskedSlug(
  raw: Uint8Array,
  schema: MaskSchema,
  alpha: Alphabet = BASE64URL,
): Error | MaskedUuidV7Slug {
  const tagged = new Uint8Array(raw);
  injectTag(tagged, tagFor(raw, schema.tagBits), schema.tagBits);
  const mixed = new Uint8Array(16);
  schema.mix(tagged, mixed, true);
  return encode(mixed, alpha, schema.slugId, SCHEMA_ID_BITS);
}

export function maskedSlugToUuidWithSchema(
  slug: string,
  schema: MaskSchema,
  alpha: Alphabet = BASE64URL,
): Error | UuidString {
  const mixed = new Uint8Array(16);
  const slugId = decodeInto(slug, alpha, mixed, 0, 16, SCHEMA_ID_BITS);
  if (slugId instanceof Error) return slugId;
  // The marker makes scheme selection exact. Without it a caller holding several schemas would
  // decode under each in turn and accept the first whose tag happened to match, which is a
  // 1-in-2^tagBits chance per wrong candidate of returning a plausible but wrong UUID.
  if (slugId !== schema.slugId)
    return new UuidSlugError("invalid_uuid_slug", "Masked UUID slug uses a different mask scheme.");
  const unmixed = new Uint8Array(16);
  schema.mix(mixed, unmixed, false);
  const foundTag = extractTag(unmixed, schema.tagBits);
  restoreV7(unmixed, schema.tagBits);
  if (tagFor(unmixed, schema.tagBits) !== foundTag)
    return new UuidSlugError("invalid_uuid_slug", "Masked UUID slug failed schema validation.");
  return formatUuid(unmixed);
}

export function maskedSlugToUuidV7WithSchema(
  slug: string,
  schema: MaskSchema,
): Error | UuidV7String {
  const uuid = maskedSlugToUuidWithSchema(slug, schema);
  return uuid instanceof Error ? uuid : (uuid as UuidV7String);
}
