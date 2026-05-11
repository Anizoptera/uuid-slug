import { UuidSlugError } from "./errors";
import {
  formatUuid,
  isRfcVariant,
  parseUuid,
  slugToUuidBytes,
  uuidBytesToSlug,
  uuidVersion,
} from "./uuid";
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
  for (let i = 0; i < bytes.length; i += 1)
    acc = (acc + (bytes[i] ?? 0) * (i + 17)) & 0xff;
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
    return new UuidSlugError(
      "invalid_uuid_version",
      "Masked UUID slugs currently require UUIDv7.",
    );
  return uuidV7BytesToMaskedSlug(raw, schema);
}

export function uuidV7BytesToMaskedSlug(
  raw: Uint8Array,
  schema: MaskSchema,
): Error | MaskedUuidV7Slug {
  const tagged = new Uint8Array(raw);
  injectTag(tagged, tagFor(raw, schema.tagBits), schema.tagBits);
  const mixed = new Uint8Array(16);
  for (let i = 0; i < 16; i += 1)
    mixed[i] = (tagged[schema.permute[i] ?? 0] ?? 0) ^ (schema.xor[i] ?? 0);
  const slug = uuidBytesToSlug(mixed);
  return slug instanceof Error ? slug : (slug as MaskedUuidV7Slug);
}

export function maskedSlugToUuidWithSchema(
  slug: string,
  schema: MaskSchema,
): Error | UuidString {
  const mixed = slugToUuidBytes(slug);
  if (mixed instanceof Error) return mixed;
  const unmixed = new Uint8Array(16);
  for (let i = 0; i < 16; i += 1) {
    const source = schema.inverse[i] ?? 0;
    unmixed[i] = (mixed[source] ?? 0) ^ (schema.xor[source] ?? 0);
  }
  const foundTag = extractTag(unmixed, schema.tagBits);
  restoreV7(unmixed, schema.tagBits);
  if (tagFor(unmixed, schema.tagBits) !== foundTag)
    return new UuidSlugError(
      "invalid_uuid_slug",
      "Masked UUID slug failed schema validation.",
    );
  return formatUuid(unmixed);
}

export function maskedSlugToUuidV7WithSchema(
  slug: string,
  schema: MaskSchema,
): Error | UuidV7String {
  const uuid = maskedSlugToUuidWithSchema(slug, schema);
  return uuid instanceof Error ? uuid : (uuid as UuidV7String);
}
