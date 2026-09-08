// SPDX-License-Identifier: Apache-2.0

import { runtime } from "#runtime";
import { errorOrThrow, readClock, UuidSlugError } from "./errors";
// A v4 has ONE implementation however it is reached. The keyless module owns it because that is
// the module a consumer who never masks pulls in; importing it here costs a codec consumer nothing
// it was not already paying, whereas the reverse direction would put the codec back on the keyless
// path and undo the whole saving that split exists for.
import { uuidV4Bytes as generateUuidV4Bytes, uuidV4 as generateUuidV4 } from "./keyless";
import { uuidV7BytesToMaskedSlug, decodeMaskedSlug } from "./mask";
import { createMigration } from "./migration";
import { createMaskSchema, DEFAULT_MASK_SCHEMA, verifyInvertible } from "./schema";
import type {
  MaskSchema,
  PublicUuidV7Slug,
  SentinelUuidV7Slug,
  UuidSlugCodec,
  UuidSlugCodecOptions,
  UuidV4Slug,
  UuidV7Sentinel,
  UuidV7String,
  UuidV7Slug,
} from "./types";
import { createRuntimeGenerator } from "./v7";
import {
  formatUuidSlug,
  hasUuidV7Entropy,
  isUuidV7Bytes,
  resolveSlugAlphabet,
  parseUuid,
  formatUuid,
  parseUuidSlug,
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

function schemaFromOption(mask: UuidSlugCodecOptions["mask"]): UuidSlugError | MaskSchema {
  // Omitting `mask` yields a codec that masks under a seed published in this package's source, so
  // its masked slugs are decodable by anyone. That is a real configuration — tests and demos want
  // reproducible output — but it is never the one a caller protecting ids wants, and nothing about
  // the resulting slug reveals which they got. See `defaultCodec` and `UuidSlugCodecOptions.mask`.
  if (!mask) return DEFAULT_MASK_SCHEMA;
  // A built schema carries its mixing step; an options object carries only a seed to derive one
  // from. One discriminating property beats sniffing several, which silently stops discriminating
  // when a scheme is added whose data fields differ.
  //
  // Every schema the codec will use passes through here, which is why the invertibility smoke test
  // belongs here and nowhere else: a caller-supplied `mix` is the extension point now, and an
  // unchecked one silently makes every id it encodes unreadable.
  if (!("mix" in mask)) return createMaskSchema(mask);
  return verifyInvertible(mask);
}

function createSentinels(definitions: readonly UuidV7SentinelDefinition[]) {
  const sentinels: UuidV7Sentinel[] = [];
  const byUuid = new Set<string>();
  const encoded: { bytes: Uint8Array; slug: SentinelUuidV7Slug }[] = [];
  const bySlug = new Map<string, { uuid: UuidV7String; bytes: Uint8Array }>();
  for (const definition of definitions) {
    // `uuid` is typed `UuidV7String`, and that types NOTHING: `Brand`'s marker is optional by
    // design, so every string satisfies every brand and a v4 passed the declaration untouched.
    // It then constructed fine, masked fine, and failed on EVERY decode forever after — a
    // permanent, per-call error configured once at construction. Checked here for the same reason
    // the invertibility smoke test is checked here: this is the last point at which a bad definition is
    // still a caller's argument rather than a codec that cannot work.
    const bytes = errorOrThrow(parseUuid(definition.uuid));
    if (!isUuidV7Bytes(bytes))
      throw new UuidSlugError(
        "invalid_uuid_version",
        `Sentinel "${definition.name}" must be a UUIDv7, got ${String(definition.uuid)}.`,
      );
    // A duplicate collapses SILENTLY: both entries stay in `codec.sentinels`, while the lookup maps
    // keep only the last, so the codec reports a sentinel it will never match.
    if (byUuid.has(definition.uuid))
      throw new UuidSlugError(
        "invalid_uuid",
        `Sentinel "${definition.name}" repeats the UUID of an earlier sentinel.`,
      );
    // Always base64url, never the codec's `slugAlphabet`: a sentinel slug is matched against
    // MASKED input, which is base64url by definition, so one written in another alphabet could
    // never be recognised in the position it exists for.
    const slug = formatUuidSlug(bytes);
    if (slug instanceof Error) throw slug;
    const sentinel = Object.freeze({
      name: definition.name,
      // `formatUuidSlug` returns the version-agnostic brand; the v7-ness comes
      // from the check above.
      slug: slug as SentinelUuidV7Slug,
      uuid: definition.uuid,
    });
    sentinels.push(sentinel);
    byUuid.add(definition.uuid);
    encoded.push({ bytes, slug: sentinel.slug });
    bySlug.set(sentinel.slug, { uuid: definition.uuid, bytes });
  }
  return { bySlug, encoded, sentinels: Object.freeze(sentinels) };
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
  const slugAlphabet = options.slugAlphabet ?? "base64url";
  errorOrThrow(resolveSlugAlphabet(slugAlphabet));
  const acceptUnmaskedSlugs = options.acceptUnmaskedSlugs === true;
  // The runtime's own slug generator emits base64url and nothing else, so it can only serve the
  // default. Resolved once here rather than per call: the branch is on configuration, which cannot
  // change after construction.
  const nativeSlug =
    options.generator === undefined && slugAlphabet === "base64url"
      ? runtime.uuidV7Slug
      : undefined;
  const sentinelState = createSentinels(options.sentinels ?? UUID_V7_SENTINEL_DEFINITIONS);

  function decodeMasked(slug: string): UuidSlugError | Uint8Array {
    const primary = decodeMaskedSlug(slug, schema, previousMasks);
    if (!(primary instanceof Error)) return primary;
    if (acceptUnmaskedSlugs) {
      const unmasked = parseUuidSlug(slug);
      if (!(unmasked instanceof Error)) return unmasked;
    }
    // The fallback's error is DROPPED, deliberately, and this returns `primary` whether or not the
    // fallback ran. It answers a different question — "is this a plain slug?" — and for the failure
    // that actually brings people here, a wrong or rotated key, its answer is untrue: the input is
    // perfectly good base64url whose trailing bits ARE the mask check, so it reported
    // `invalid_base64url: non-canonical trailing bits` and sent operators hunting a typo.
    // `primary` says the schema did not match, which is what happened.
    return primary;
  }

  function encodeMasked(bytes: Uint8Array): UuidSlugError | PublicUuidV7Slug {
    if (!isUuidV7Bytes(bytes))
      return new UuidSlugError(
        "invalid_uuid_version",
        "Masked UUID slugs require 16 UUIDv7 bytes.",
      );
    for (const sentinel of sentinelState.encoded) {
      let index = 0;
      while (index < 16 && sentinel.bytes[index] === bytes[index]) index += 1;
      if (index === 16) return sentinel.slug;
    }
    const slug = uuidV7BytesToMaskedSlug(bytes, schema);
    if (slug instanceof Error) return slug;
    // Sentinel decoding takes precedence, so returning this ciphertext would recover a different UUID.
    if (sentinelState.bySlug.has(slug))
      return new UuidSlugError(
        "invalid_mask_schema",
        "Masked output collides with a reserved sentinel. Configure a different mask or sentinel set.",
      );
    return slug;
  }

  function uuidV7ToMaskedSlug(uuid: string): UuidSlugError | PublicUuidV7Slug {
    const bytes = parseUuid(uuid);
    return bytes instanceof Error ? bytes : encodeMasked(bytes);
  }

  function maskedSlugToUuidV7(slug: string): UuidSlugError | UuidV7String {
    const sentinel = sentinelState.bySlug.get(slug);
    if (sentinel) return sentinel.uuid;
    const decoded = decodeMasked(slug);
    if (decoded instanceof Error) return decoded;
    // Mask decoding restores v7 constants; only the plain fallback can carry another version.
    if (acceptUnmaskedSlugs && !isUuidV7Bytes(decoded))
      return new UuidSlugError("invalid_uuid_version", "Decoded UUID is not UUIDv7.");
    return formatUuid(decoded) as UuidSlugError | UuidV7String;
  }

  return {
    sentinels: sentinelState.sentinels,
    migration(migrationOptions) {
      return createMigration([schema, ...previousMasks], sentinelState.bySlug, migrationOptions);
    },
    uuidV4: generateUuidV4,
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
      // Same assertion `uuidV4Slug` makes for the same reason: the bytes come from a v7 generator,
      // and the encoder sees only bytes so it cannot carry the version through. Until the runtime
      // hooks were branded this cast was ABSENT and nothing complained — the native branch typed
      // the union as bare `string`, which an optional brand accepts, so the promise went unchecked.
      return errorOrThrow(
        formatUuidSlug(errorOrThrow(generator.uuidV7Bytes()), 0, slugAlphabet),
      ) as UuidV7Slug;
    },
    uuidV7MaskedSlug() {
      return errorOrThrow(encodeMasked(errorOrThrow(generator.uuidV7Bytes())));
    },
    uuidV7ToMaskedSlug,
    maskedSlugToUuidV7,
    maskedSlugToUuid(slug) {
      const sentinel = sentinelState.bySlug.get(slug);
      if (sentinel) return sentinel.uuid;
      const bytes = decodeMasked(slug);
      return bytes instanceof Error ? bytes : formatUuid(bytes);
    },
    /**
     * Unmask, then apply the same freshness rules as `validateUuidV7Fresh`, returning the slug.
     *
     * A METHOD rather than the module-level function it replaced: unmasking needs this codec's
     * key, and the old free function reached for `defaultCodec` — so it silently answered under
     * the seed published in this package's source and was wrong for every caller who supplied
     * their own. Nothing about that failure was visible at the call site; it returned a confident
     * Error for perfectly good slugs.
     *
     * Decode directly to bytes instead of formatting and reparsing a UUID. The method does not
     * access `this`, so it also works when detached from the codec.
     */
    validateMaskedSlugFresh(slug, freshness) {
      const bytes = sentinelState.bySlug.get(slug)?.bytes ?? decodeMasked(slug);
      if (bytes instanceof Error) return bytes;
      // The v7-specific decoder reports this before freshness validation does.
      if (!isUuidV7Bytes(bytes))
        return new UuidSlugError("invalid_uuid_version", "Decoded UUID is not UUIDv7.");
      const valid = validateFreshBytes(bytes, freshness);
      return valid instanceof Error ? valid : slug;
    },
  };
}

/**
 * The codec behind the keyless top-level shortcuts (`uuidV7`, `uuidV7Slug`, …), which is all it is
 * fit for.
 *
 * Its MASKED methods work and obfuscate NOTHING: no seed was supplied, so it fell back to
 * `DEFAULT_MASK_SCHEMA`, whose seed is a string literal in this published package. Anyone holding
 * the tarball decodes its masked slugs — verified 2026-08-12 by rebuilding the schema from that
 * literal and recovering the input UUID exactly. The masked methods are absent from the top-level
 * exports for this reason; reaching them still requires typing `defaultCodec`, which is the point
 * (Art's ruling, 2026-08-12 — keep the default key, remove the bare shortcuts).
 *
 * Mask anything real through `createUuidSlugCodec({ mask: { seed } })` with a seed of your own.
 */
// Annotated PURE so a bundle that never names it can drop it: a module-scope CONSTRUCTION call is
// otherwise a side effect no bundler may remove, and this one reaches the cipher, the mask schema
// and the sentinel table. Sound because `createUuidSlugCodec()` with no options cannot fail — the
// only throwing paths are caller-supplied sentinels and a caller-supplied mix — and nothing else
// observes the construction. The annotation is worth nothing on its own: it was measured saving
// ZERO bytes while `index.ts` bound its shortcuts as PROPERTY READS of this value, since a read at
// module scope forces the evaluation the annotation permits skipping. Keep the shortcuts keyless
// (see `keyless.ts`) or this goes dead again.
export const defaultCodec: UuidSlugCodec = /*#__PURE__*/ createUuidSlugCodec();

export function validateUuidV7Fresh(
  uuid: string,
  options: FreshValidationOptions = {},
): UuidSlugError | UuidV7String {
  const bytes = parseUuid(uuid);
  if (bytes instanceof Error)
    return new UuidSlugError("invalid_uuid", "Expected canonical UUIDv7 string.");
  const valid = validateFreshBytes(bytes, options);
  return valid instanceof Error ? valid : uuid;
}

/** Capture decoded fields before calling an external clock, which can reenter a custom schema. */
function validateFreshBytes(
  bytes: Uint8Array,
  options: FreshValidationOptions = {},
): UuidSlugError | undefined {
  if (!isUuidV7Bytes(bytes))
    return new UuidSlugError("invalid_uuid", "Expected canonical UUIDv7 string.");
  const timestamp = extractUuidV7Timestamp(bytes);
  if (timestamp instanceof Error) return timestamp;
  const hasEntropy = hasUuidV7Entropy(bytes);
  const windowMs = options.windowMs ?? 86_400_000;
  if (!Number.isFinite(windowMs) || windowMs < 0)
    return new UuidSlugError(
      "invalid_timestamp",
      "windowMs must be a finite, nonnegative number of milliseconds.",
    );
  const now = readClock(options.now ?? Date.now);
  if (now instanceof Error) return now;
  if (!Number.isFinite(now))
    return new UuidSlugError(
      "invalid_timestamp",
      "now must return a finite number of Unix milliseconds.",
    );
  if (timestamp < now - windowMs || timestamp > now + windowMs)
    return new UuidSlugError("stale_uuid", "UUIDv7 timestamp is outside the accepted window.");
  if (!hasEntropy) return new UuidSlugError("invalid_uuid", "UUIDv7 random payload is degenerate.");
  return undefined;
}

export function validateUuidV7SlugFresh(
  slug: string,
  options?: FreshValidationOptions,
): UuidSlugError | UuidV7Slug {
  const bytes = parseUuidSlug(slug);
  if (bytes instanceof Error) return bytes;
  const valid = validateFreshBytes(bytes, options);
  return valid instanceof Error ? valid : slug;
}
