// SPDX-License-Identifier: Apache-2.0

import { BASE64URL, decodeInto, encode, spareBits } from "./alphabet";
import type { Alphabet } from "./alphabet";
import { UuidSlugError } from "./errors";
import { mix32, read32 } from "./feistel";
import { formatUuid, isRfcVariant, parseUuid, uuidVersion } from "./uuid";
import type {
  MaskTagBits,
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

/**
 * Avalanche matters once the check is wide: a wrong key must fail it with probability 2^-width, and
 * that only holds if the function spreads its input across the whole output. The 4- and 6-bit
 * checksums above are weak sums and stay exactly as they are — they are the wire format of slugs an
 * older scheme already issued, so "improving" them would stop those slugs decoding.
 */
function hash32(bytes: Uint8Array): number {
  let acc = 0;
  for (let offset = 0; offset < 16; offset += 4) acc = mix32(acc ^ read32(bytes, offset));
  return acc;
}

/** The top `width` bits of the hash, so widening the check never renumbers the bits below it. */
function tagFor(bytes: Uint8Array, width: number) {
  if (width === 4) return checksum4(bytes);
  if (width === 6) return checksum6(bytes);
  return hash32(bytes) >>> (32 - width);
}

/**
 * The check rides in the bits a UUIDv7 spends on nothing, so it costs no length. The three regions
 * NEST — each wider tier keeps the narrower one's bits exactly where they were — which is what lets
 * a single width fix the whole layout and lets `12` be a superset of `6` rather than a rival to it.
 *
 * Bits 0-3 sit in byte 6's version nibble, 4-5 in byte 8's variant bits, 6-11 in byte 0's top six —
 * the high end of the 48-bit timestamp, which is zero for every instant before 2109 and is why the
 * 12-bit tier must refuse to encode one at or past 2^42 ms rather than truncate it.
 */
function injectTag(bytes: Uint8Array, tag: number, tagBits: MaskTagBits) {
  bytes[6] = ((tag & 0x0f) << 4) | ((bytes[6] ?? 0) & 0x0f);
  if (tagBits >= 6) bytes[8] = ((tag & 0x30) << 2) | ((bytes[8] ?? 0) & 0x3f);
  if (tagBits === 12) bytes[0] = (((tag >>> 6) & 0x3f) << 2) | ((bytes[0] ?? 0) & 0x03);
}

function extractTag(bytes: Uint8Array, tagBits: MaskTagBits) {
  let tag = (bytes[6] ?? 0) >>> 4;
  if (tagBits >= 6) tag |= ((bytes[8] ?? 0) >>> 6) << 4;
  if (tagBits === 12) tag |= ((bytes[0] ?? 0) >>> 2) << 6;
  return tag;
}

/** Puts back the constants the tag displaced, so the block equals the UUID the caller handed in. */
function restoreV7(bytes: Uint8Array, tagBits: MaskTagBits) {
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70;
  if (tagBits >= 6) bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  if (tagBits === 12) bytes[0] = (bytes[0] ?? 0) & 0x03;
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
 * The half of the check that rides in the encoding's leftover bits rather than inside the block.
 *
 * 16 bytes occupy 128 of the 132 bits in 22 base64url characters and 128 of the 130 in 26 base32hex
 * characters, so this is 4 and 2 respectively — which is exactly what turns the 12-bit inner tier
 * into the ruled 16- and 14-bit checks, with no per-alphabet special case anywhere.
 *
 * Zero for the narrow tiers: their slugs were issued when those bits meant something else, and
 * a tail of zero reproduces the plain encoding byte for byte, so they are untouched.
 */
const outerTagBits = (tagBits: MaskTagBits, alpha: Alphabet) =>
  tagBits === 12 ? spareBits(alpha, 16) : 0;

export function uuidV7BytesToMaskedSlug(
  raw: Uint8Array,
  schema: MaskSchema,
  alpha: Alphabet = BASE64URL,
): Error | MaskedUuidV7Slug {
  const outer = outerTagBits(schema.tagBits, alpha);
  // Truncating instead would make encoding non-injective — two UUIDs would share one slug, and no
  // decoder could ever tell which was meant. Refusing is the only recoverable answer.
  if (outer > 0 && (raw[0] ?? 0) > 0x03)
    return new UuidSlugError(
      "invalid_timestamp",
      "Masking requires a UUIDv7 timestamped before 2^42 ms (year 2109); its top six bits carry the check.",
    );
  const tag = tagFor(raw, schema.tagBits + outer);
  const tagged = new Uint8Array(raw);
  injectTag(tagged, tag >>> outer, schema.tagBits);
  const mixed = new Uint8Array(16);
  schema.mix(tagged, mixed, true);
  return encode(mixed, alpha, tag & ((1 << outer) - 1), outer);
}

export function maskedSlugToUuidWithSchema(
  slug: string,
  schema: MaskSchema,
  alpha: Alphabet = BASE64URL,
): Error | UuidString {
  const outer = outerTagBits(schema.tagBits, alpha);
  const mixed = new Uint8Array(16);
  const outerTag = decodeInto(slug, alpha, mixed, 0, 16, outer);
  if (outerTag instanceof Error) return outerTag;
  const unmixed = new Uint8Array(16);
  schema.mix(mixed, unmixed, false);
  // Both halves come out of the same decryption, so a wrong key garbles the observed check as
  // thoroughly as the payload: the tag needs no key of its own to tell keys apart.
  const foundTag = (extractTag(unmixed, schema.tagBits) << outer) | outerTag;
  restoreV7(unmixed, schema.tagBits);
  if (tagFor(unmixed, schema.tagBits + outer) !== foundTag)
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
