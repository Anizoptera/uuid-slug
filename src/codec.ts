// SPDX-License-Identifier: Apache-2.0

import { runtime } from "#runtime";
import { BASE64URL } from "./alphabet";
import { UuidSlugError } from "./errors";
import {
  uuidToMaskedSlugWithSchema,
  uuidV7BytesToMaskedSlug,
  maskedSlugToUuidWithSchema,
} from "./mask";
import { createMaskSchema, DEFAULT_MASK_SCHEMA, verifyInvertible } from "./schema";
import type {
  MaskSchema,
  MaskedUuidV7Slug,
  PublicUuidV7Slug,
  SentinelUuidV7Slug,
  UuidSlugCodec,
  UuidSlugCodecOptions,
  UuidString,
  UuidV4Slug,
  UuidV4String,
  UuidV7Sentinel,
  UuidV7String,
  UuidV7Slug,
} from "./types";
import { createRuntimeGenerator } from "./v7";
import {
  formatUuid,
  formatUuidSlug,
  hasUuidV7Entropy,
  isUuidSlug,
  isUuidV4Slug,
  isUuidV4String,
  isUuidV7Slug,
  isUuidV7String,
  isUuidString,
  parseUuid,
  slugToUuid,
  uuidToSlug,
  extractUuidV7Timestamp,
} from "./uuid";
import type { FreshValidationOptions, UuidV7SentinelDefinition } from "./types";

export const UUID_V7_SENTINEL_DEFINITIONS: readonly UuidV7SentinelDefinition[] = [
  {
    name: "nil",
    uuid: "00000000-0000-7000-8000-000000000000",
  },
  {
    name: "anonymousUser",
    uuid: "00000000-0001-7000-8000-000000000000",
  },
  {
    name: "unknownUser",
    uuid: "00000000-0002-7000-8000-000000000000",
  },
];

function schemaFromOption(mask: UuidSlugCodecOptions["mask"]): Error | MaskSchema {
  if (!mask) return DEFAULT_MASK_SCHEMA;
  // A built schema carries its mixing step; an options object carries only a seed to derive one
  // from. One discriminating property beats sniffing several, which silently stops discriminating
  // when a scheme is added whose data fields differ.
  //
  // Every schema the codec will use passes through here, which is why the invertibility proof
  // belongs here and nowhere else: a caller-supplied `mix` is the extension point now, and an
  // unchecked one silently makes every id it encodes unreadable.
  if (!("mix" in mask)) return createMaskSchema(mask);
  return verifyInvertible(mask);
}

function createSentinels(definitions: readonly UuidV7SentinelDefinition[]) {
  const sentinels: UuidV7Sentinel[] = [];
  const byUuid = new Map<string, SentinelUuidV7Slug>();
  const bySlug = new Map<string, UuidV7String>();
  for (const definition of definitions) {
    // Always base64url, never the codec's `slugAlphabet`: a sentinel slug is matched against
    // MASKED input, which is base64url by definition, so one written in another alphabet could
    // never be recognised in the position it exists for.
    const slug = uuidToSlug(definition.uuid);
    if (slug instanceof Error) throw slug;
    const sentinel = {
      name: definition.name,
      // `uuidToSlug` sees only a string and returns the version-agnostic brand. The definition's
      // `uuid` is typed `UuidV7String`, so v7-ness is established here and nowhere deeper.
      slug: slug as SentinelUuidV7Slug,
      uuid: definition.uuid,
    };
    sentinels.push(sentinel);
    byUuid.set(definition.uuid, sentinel.slug);
    bySlug.set(sentinel.slug, definition.uuid);
  }
  return { bySlug, byUuid, sentinels };
}

/**
 * Randomness is drawn into a private buffer and copied out instead of filled through a view
 * of the caller's array. `fillRandom` requires a plain `ArrayBuffer` because Web Crypto
 * rejects a `SharedArrayBuffer` view, and a caller-supplied `out` carries no such guarantee.
 * Reused rather than allocated per call, matching the v7 generator, so the cost is one
 * 16-byte copy.
 */
const v4Random = new Uint8Array(16);

function generateUuidV4Bytes(out?: Uint8Array, offset = 0): Error | Uint8Array {
  const target = out ?? new Uint8Array(16);
  if (offset < 0 || offset + 16 > target.length)
    return new UuidSlugError("invalid_buffer", "Output buffer is too small.");
  runtime.fillRandom(v4Random);
  target.set(v4Random, offset);
  target[offset + 6] = ((target[offset + 6] ?? 0) & 0x0f) | 0x40;
  target[offset + 8] = ((target[offset + 8] ?? 0) & 0x3f) | 0x80;
  return target;
}

function errorOrThrow<T>(value: Error | T): T {
  if (value instanceof Error) throw value;
  return value;
}

export function createUuidSlugCodec(options: UuidSlugCodecOptions = {}): UuidSlugCodec {
  const schema = errorOrThrow(schemaFromOption(options.mask));
  // Every schema a decode may try, and NOTHING a caller did not list. A codec once appended two
  // schemas of its own — a substitution partner derived from any seed, and the default seed's
  // pre-Feistel scheme — on the reasoning that a marker bit would select one outright. No marker
  // exists: each schema is tried in turn and the first whose check passes wins, so the codec's
  // false-accept rate is the SUM over the list and is set by its weakest member. Measured
  // 2026-08-12 over 200,000 wrong-key decodes, the auto-added 6-bit partner accepted 211 while
  // the 16-bit schema it accompanied accepted 2 — a 16x widening nobody asked for.
  const previousMasks = (options.previousMasks ?? []).map((mask) =>
    errorOrThrow(schemaFromOption(mask)),
  );
  const generator = options.generator ?? createRuntimeGenerator(runtime);
  const slugAlphabet = options.slugAlphabet ?? BASE64URL;
  // The runtime's own slug generator emits base64url and nothing else, so it can only serve the
  // default. Resolved once here rather than per call: the branch is on configuration, which cannot
  // change after construction.
  const nativeSlug = slugAlphabet === BASE64URL ? runtime.uuidV7Slug : undefined;
  const sentinelState = createSentinels(options.sentinels ?? UUID_V7_SENTINEL_DEFINITIONS);

  function decodeMasked(slug: string): Error | UuidString {
    const sentinel = sentinelState.bySlug.get(slug);
    if (sentinel) return sentinel;
    const primary = maskedSlugToUuidWithSchema(slug, schema);
    if (!(primary instanceof Error)) return primary;
    for (const previous of previousMasks) {
      const decoded = maskedSlugToUuidWithSchema(slug, previous);
      if (!(decoded instanceof Error)) return decoded;
    }
    if (options.acceptUnmaskedSlugs === true) return slugToUuid(slug);
    return primary;
  }

  function uuidV7ToMaskedSlug(uuid: string): Error | PublicUuidV7Slug {
    const sentinel = sentinelState.byUuid.get(uuid);
    if (sentinel) return sentinel;
    return uuidToMaskedSlugWithSchema(uuid, schema);
  }

  return {
    sentinels: sentinelState.sentinels,
    uuidV4() {
      const native = runtime.uuidV4?.();
      if (native) return native;
      return errorOrThrow(formatUuid(errorOrThrow(generateUuidV4Bytes()))) as UuidV4String;
    },
    uuidV7() {
      return generator.uuidV7();
    },
    uuidV4Bytes: generateUuidV4Bytes,
    uuidV7Bytes: generator.uuidV7Bytes,
    uuidV7At: generator.uuidV7At,
    uuidV7BytesAt: generator.uuidV7BytesAt,
    uuidV4Slug() {
      // The bytes came from `generateUuidV4Bytes`, which stamps version 4; the encoder sees only
      // bytes and cannot carry that through.
      return errorOrThrow(
        formatUuidSlug(errorOrThrow(generateUuidV4Bytes()), 0, slugAlphabet),
      ) as UuidV4Slug;
    },
    uuidV7Slug() {
      if (nativeSlug) return nativeSlug();
      return errorOrThrow(formatUuidSlug(errorOrThrow(generator.uuidV7Bytes()), 0, slugAlphabet));
    },
    uuidV7MaskedSlug() {
      return errorOrThrow(uuidV7BytesToMaskedSlug(errorOrThrow(generator.uuidV7Bytes()), schema));
    },
    uuidV7ToMaskedSlug,
    maskedSlugToUuidV7(slug) {
      const decoded = decodeMasked(slug);
      if (decoded instanceof Error) return decoded;
      return isUuidV7String(decoded)
        ? decoded
        : new UuidSlugError("invalid_uuid_version", "Decoded UUID is not UUIDv7.");
    },
    maskedSlugToUuid: decodeMasked,
  };
}

export const defaultCodec = createUuidSlugCodec();

export function validateUuidV7Fresh(
  uuid: string,
  options: FreshValidationOptions = {},
): Error | UuidV7String {
  if (!isUuidV7String(uuid))
    return new UuidSlugError("invalid_uuid", "Expected canonical UUIDv7 string.");
  const bytes = parseUuid(uuid);
  if (bytes instanceof Error) return bytes;
  const windowMs = options.windowMs ?? 86_400_000;
  const now = options.now?.() ?? Date.now();
  const timestamp = extractUuidV7Timestamp(bytes);
  if (timestamp instanceof Error) return timestamp;
  if (timestamp < now - windowMs || timestamp > now + windowMs)
    return new UuidSlugError("stale_uuid", "UUIDv7 timestamp is outside the accepted window.");
  if (!hasUuidV7Entropy(bytes))
    return new UuidSlugError("invalid_uuid", "UUIDv7 random payload is degenerate.");
  return uuid;
}

export function validateUuidV7SlugFresh(
  slug: string,
  options?: FreshValidationOptions,
): Error | UuidV7Slug {
  const uuid = slugToUuid(slug);
  if (uuid instanceof Error) return uuid;
  const valid = validateUuidV7Fresh(uuid, options);
  return valid instanceof Error ? valid : slug;
}

export function validateMaskedUuidV7SlugFresh(
  slug: string,
  options?: FreshValidationOptions,
): Error | MaskedUuidV7Slug {
  const uuid = defaultCodec.maskedSlugToUuidV7(slug);
  if (uuid instanceof Error) return uuid;
  const valid = validateUuidV7Fresh(uuid, options);
  return valid instanceof Error ? valid : slug;
}

export { isUuidSlug, isUuidString, isUuidV4Slug, isUuidV4String, isUuidV7Slug, isUuidV7String };
