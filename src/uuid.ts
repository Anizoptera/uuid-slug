// SPDX-License-Identifier: Apache-2.0

import { BASE32HEX, BASE64URL, decodeInto, encode, isEncoded } from "./alphabet";
import type { Alphabet } from "./alphabet";
import { checkRange, UuidSlugError } from "./errors";
import type {
  UuidSlug,
  UuidBytes,
  UuidV7Bytes,
  UuidString,
  UuidV4Slug,
  UuidV4String,
  UuidV7Slug,
  UuidV7String,
} from "./types";

const HEX = "0123456789abcdef";
// Probe once and allocate the byte-pair fallback only on engines that need it.
const nativeToHex = (Uint8Array.prototype as { toHex?: () => string }).toHex;
const HEX_BYTES = nativeToHex
  ? []
  : /*#__PURE__*/ Array.from(
      { length: 256 },
      (_, byte) => (HEX[byte >>> 4] as string) + (HEX[byte & 15] as string),
    );
const HEX_DECODE = new Int8Array(128).fill(-1);
for (let i = 0; i < 10; i += 1) HEX_DECODE[48 + i] = i;
for (let i = 0; i < 6; i += 1) HEX_DECODE[97 + i] = 10 + i;

const UUID_LENGTH = 36;
const UUID_BYTE_OFFSETS = [0, 2, 4, 6, 9, 11, 14, 16, 19, 21, 24, 26, 28, 30, 32, 34] as const;

/**
 * The alphabets a plain slug may be written in. base64url is the default and the shortest;
 * base32hex costs four more characters and buys the one property base64url cannot offer: its
 * characters are in ASCII order, so base32hex slugs of UUIDv7s sort chronologically as plain
 * strings. Only the lowercase spelling decodes — the table is built from `chars` — so slugs have
 * no second spelling, as everywhere else in this format.
 *
 * Masked output selects its alphabet independently: base32hex preserves case-insensitive filenames,
 * but sorting masked ciphertext does not recover chronological order.
 */
const SLUG_ALPHABETS: { base32hex: Alphabet; base64url: Alphabet } = {
  base32hex: BASE32HEX,
  base64url: BASE64URL,
} as const;

/**
 * Callers name an alphabet rather than passing one. `Alphabet` holds a decode table and a bit
 * width — internals that would become public surface the moment the type escaped — and accepting
 * an arbitrary one would also open a second extension point beside `MaskSchema`, which this
 * package documents as its only one. A union of two names cannot be widened by a caller at all, so
 * there is nothing to validate.
 */
export type SlugAlphabet = "base64url" | "base32hex";

/** Reject values outside the public alphabet union when untyped JavaScript bypasses TypeScript. */
export function resolveSlugAlphabet(alphabet: SlugAlphabet): Alphabet | UuidSlugError {
  if (alphabet === "base64url" || alphabet === "base32hex") return SLUG_ALPHABETS[alphabet];
  return new UuidSlugError(
    "invalid_uuid_slug",
    `Unknown slug alphabet; expected ${Object.keys(SLUG_ALPHABETS).join(" or ")}.`,
  );
}

/** Characters needed for 16 bytes: 22 in base64url, 26 in base32hex. */
function slugLength(alpha: Alphabet) {
  return Math.ceil(128 / alpha.bitsPerChar);
}

/**
 * Length -> alphabet, which is why decoding takes no alphabet argument: the two lengths are
 * disjoint, so a slug names its own encoding and a caller cannot pick the wrong one. Indexed
 * rather than searched because every decode and every type guard pays this lookup.
 */
const SLUG_ALPHABET_BY_LENGTH: readonly (Alphabet | undefined)[] = Object.values(
  SLUG_ALPHABETS,
).reduce<(Alphabet | undefined)[]>((table, alpha) => {
  table[slugLength(alpha)] = alpha;
  return table;
}, []);

const SLUG_LENGTHS = Object.values(SLUG_ALPHABETS)
  .map((alpha) => `${slugLength(alpha)} (${alpha.name})`)
  .join(" or ");

function hexValue(code: number) {
  return HEX_DECODE[code] ?? -1;
}

/** Parse one canonical UUID; a failure leaves caller-supplied storage unchanged. */
export function parseUuid(uuid: string): UuidBytes | UuidSlugError;
export function parseUuid<T extends Uint8Array>(
  uuid: string,
  out: T,
  offset?: number,
): T | UuidSlugError;
export function parseUuid(uuid: string, out?: Uint8Array, offset = 0): Uint8Array | UuidSlugError {
  if (uuid.length !== UUID_LENGTH)
    return new UuidSlugError("invalid_uuid", "UUID must be 36 characters.");
  if (uuid[8] !== "-" || uuid[13] !== "-" || uuid[18] !== "-" || uuid[23] !== "-") {
    return new UuidSlugError("invalid_uuid", "UUID hyphen positions are invalid.");
  }

  const target = out ?? new Uint8Array(16);
  const badRange = checkRange(target.length, offset, 16);
  if (badRange) return badRange;

  for (const textOffset of UUID_BYTE_OFFSETS) {
    if (hexValue(uuid.charCodeAt(textOffset)) < 0 || hexValue(uuid.charCodeAt(textOffset + 1)) < 0)
      return new UuidSlugError("invalid_uuid", `Invalid UUID hex at offset ${textOffset}.`);
  }
  for (let byteIndex = 0; byteIndex < UUID_BYTE_OFFSETS.length; byteIndex += 1) {
    const textOffset = UUID_BYTE_OFFSETS[byteIndex] as number;
    const high = hexValue(uuid.charCodeAt(textOffset));
    const low = hexValue(uuid.charCodeAt(textOffset + 1));
    target[offset + byteIndex] = (high << 4) | low;
  }
  return target;
}

export function formatUuid(bytes: Uint8Array, offset = 0): UuidString | UuidSlugError {
  const badRange = checkRange(bytes.length, offset, 16);
  if (badRange) return badRange;
  if (nativeToHex) {
    const hex = nativeToHex.call(bytes.length === 16 ? bytes : bytes.subarray(offset, offset + 16));
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}` as UuidString;
  }
  let out = "";
  for (let i = 0; i < 16; i += 1) {
    if (i === 4 || i === 6 || i === 8 || i === 10) out += "-";
    const byte = bytes[offset + i] ?? 0;
    out += HEX_BYTES[byte];
  }
  return out as UuidString;
}

export function uuidVersion(bytes: Uint8Array, offset = 0): number {
  return (bytes[offset + 6] ?? 0) >>> 4;
}

export function isRfcVariant(bytes: Uint8Array, offset = 0): boolean {
  return (bytes[offset + 8] ?? 0) >>> 6 === 0b10;
}

// Predicates inspect the same hex table as parsing without allocating output bytes or Errors.
export function isUuidString(uuid: unknown): uuid is UuidString {
  if (typeof uuid !== "string" || uuid.length !== UUID_LENGTH) return false;
  if (uuid[8] !== "-" || uuid[13] !== "-" || uuid[18] !== "-" || uuid[23] !== "-") return false;
  for (let i = 0; i < UUID_BYTE_OFFSETS.length; i += 1) {
    const offset = UUID_BYTE_OFFSETS[i] as number;
    if (hexValue(uuid.charCodeAt(offset)) < 0 || hexValue(uuid.charCodeAt(offset + 1)) < 0)
      return false;
  }
  return true;
}

/** The string has already passed canonical validation, so the variant digit is a known hex value. */
function stringHasRfcVariant(uuid: string): boolean {
  return (HEX_DECODE[uuid.charCodeAt(19)] as number) >>> 2 === 2;
}

function isUint8Array(value: unknown): value is Uint8Array {
  return (
    ArrayBuffer.isView(value) &&
    (value instanceof Uint8Array || Object.prototype.toString.call(value) === "[object Uint8Array]")
  );
}

export function isUuidV4String(uuid: unknown): uuid is UuidV4String {
  return isUuidString(uuid) && uuid[14] === "4" && stringHasRfcVariant(uuid);
}

export function isUuidV7String(uuid: unknown): uuid is UuidV7String {
  return isUuidString(uuid) && uuid[14] === "7" && stringHasRfcVariant(uuid);
}

/**
 * The only BYTE-level predicate, and the asymmetry against `isUuidV4String` is deliberate: masking
 * accepts v7 alone, so a caller holding raw bytes has a reason to ask this and none to ask the v4
 * question. `isUuidV4Bytes` is absent because nothing needs it, not because it was overlooked —
 * add it when a caller appears, never for symmetry, since an export is permanent surface.
 */
export function isUuidV7Bytes(bytes: unknown): bytes is UuidV7Bytes {
  return (
    isUint8Array(bytes) && bytes.length === 16 && uuidVersion(bytes) === 7 && isRfcVariant(bytes)
  );
}

export function formatUuidSlug(
  bytes: Uint8Array,
  alphabet?: SlugAlphabet,
): UuidSlug | UuidSlugError;
export function formatUuidSlug(
  bytes: Uint8Array,
  offset: number,
  alphabet?: SlugAlphabet,
): UuidSlug | UuidSlugError;
export function formatUuidSlug(
  bytes: Uint8Array,
  offsetOrAlphabet: number | SlugAlphabet = 0,
  alphabet?: SlugAlphabet,
): UuidSlug | UuidSlugError {
  const alphabetIsSecond = typeof offsetOrAlphabet !== "number";
  const offset = alphabetIsSecond ? 0 : offsetOrAlphabet;
  const badRange = checkRange(bytes.length, offset, 16);
  if (badRange) return badRange;
  if (alphabetIsSecond && alphabet !== undefined)
    return new UuidSlugError(
      "invalid_uuid_slug",
      "Pass the alphabet once: second for a whole UUID, or third after a numeric offset.",
    );
  // Unreachable from TypeScript, where the name is a two-member union. Reached from JavaScript,
  // which is why it answers rather than indexing into `undefined`.
  const alpha = resolveSlugAlphabet(
    alphabetIsSecond ? offsetOrAlphabet : (alphabet ?? "base64url"),
  );
  if (alpha instanceof Error) return alpha;
  return encode(
    bytes.length === 16 ? bytes : bytes.subarray(offset, offset + 16),
    alpha,
  ) as UuidSlug;
}

/** Accept either slug alphabet and leave caller-supplied storage unchanged on failure. */
export function parseUuidSlug(slug: string): UuidBytes | UuidSlugError;
export function parseUuidSlug<T extends Uint8Array>(
  slug: string,
  out: T,
  offset?: number,
): T | UuidSlugError;
export function parseUuidSlug(
  slug: string,
  out?: Uint8Array,
  offset = 0,
): Uint8Array | UuidSlugError {
  const alpha = SLUG_ALPHABET_BY_LENGTH[slug.length];
  if (!alpha)
    return new UuidSlugError(
      "invalid_uuid_slug",
      `UUID slug must be ${SLUG_LENGTHS} characters, got ${slug.length}.`,
    );
  const target = out ?? new Uint8Array(16);
  const badRange = checkRange(target.length, offset, 16);
  if (badRange) return badRange;
  if (out && !isEncoded(slug, alpha, 16)) {
    for (let i = 0; i < slug.length; i += 1) {
      const code = slug.charCodeAt(i);
      if (code >= 128 || (alpha.decode[code] as number) < 0)
        return new UuidSlugError(alpha.code, `Invalid ${alpha.name} character at offset ${i}.`);
    }
    return new UuidSlugError(alpha.code, `${alpha.name} value has non-canonical trailing bits.`);
  }
  const result = decodeInto(slug, alpha, target, offset, 16);
  return result instanceof Error ? result : target;
}

export function uuidToSlug(
  uuid: string,
  alphabet: SlugAlphabet = "base64url",
): UuidSlug | UuidSlugError {
  const bytes = parseUuid(uuid);
  if (bytes instanceof Error) return bytes;
  return formatUuidSlug(bytes, alphabet);
}

export function slugToUuid(slug: string): UuidString | UuidSlugError {
  const bytes = parseUuidSlug(slug);
  if (bytes instanceof Error) return bytes;
  return formatUuid(bytes);
}

export function isUuidSlug(slug: unknown): slug is UuidSlug {
  if (typeof slug !== "string" || !slug) return false;
  const alpha = SLUG_ALPHABET_BY_LENGTH[slug.length];
  return alpha !== undefined && isEncoded(slug, alpha, 16);
}

/** Read only the version/variant bytes after canonical validation, without decoding a whole UUID. */
function slugByte(slug: string, alpha: Alphabet, offset: number): number {
  const start = Math.floor((offset * 8) / alpha.bitsPerChar);
  const end = Math.floor((offset * 8 + 7) / alpha.bitsPerChar);
  let value = 0;
  for (let i = start; i <= end; i += 1)
    value = (value << alpha.bitsPerChar) | (alpha.decode[slug.charCodeAt(i)] as number);
  return (value >>> ((end + 1) * alpha.bitsPerChar - (offset + 1) * 8)) & 255;
}

function isVersionedSlug(slug: unknown, version: number): slug is UuidSlug {
  if (!isUuidSlug(slug)) return false;
  const alpha = SLUG_ALPHABET_BY_LENGTH[slug.length] as Alphabet;
  return slugByte(slug, alpha, 6) >>> 4 === version && slugByte(slug, alpha, 8) >>> 6 === 2;
}

export function isUuidV4Slug(slug: unknown): slug is UuidV4Slug {
  return isVersionedSlug(slug, 4);
}

export function isUuidV7Slug(slug: unknown): slug is UuidV7Slug {
  return isVersionedSlug(slug, 7);
}

/**
 * The 48-bit millisecond a UUIDv7 was minted at.
 *
 * It REFUSES anything that is not a v7, which is the whole point of the return type: the first six
 * bytes of a v4 are random, so reading them yields a confident, well-formed date drawn uniformly
 * from the next nine thousand years. A caller that passed the wrong version got that date silently,
 * and a freshness check built on it would accept or reject by coin flip while looking correct.
 *
 * Short input is reported separately from wrong version, because `uuidVersion` reads a missing byte
 * as zero and would otherwise blame a truncated buffer for holding a v0.
 */
export function extractUuidV7Timestamp(bytes: Uint8Array, offset = 0): number | UuidSlugError {
  const badRange = checkRange(bytes.length, offset, 16);
  if (badRange) return badRange;
  if (uuidVersion(bytes, offset) !== 7 || !isRfcVariant(bytes, offset))
    return new UuidSlugError("invalid_uuid_version", "Timestamp is only defined for UUIDv7.");
  let timestamp = 0;
  for (let i = 0; i < 6; i += 1) timestamp = timestamp * 256 + (bytes[offset + i] ?? 0);
  return timestamp;
}
