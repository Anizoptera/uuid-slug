import { runtime } from "#runtime";
import { UuidSlugError } from "./errors";
import {
  uuidToMaskedSlugWithSchema,
  uuidV7BytesToMaskedSlug,
  maskedSlugToUuidWithSchema,
} from "./mask";
import { createMaskSchema, DEFAULT_MASK_SCHEMA } from "./schema";
import type {
  MaskSchema,
  MaskedUuidSlug,
  MaskedUuidV7Slug,
  PublicUuidV7Slug,
  SentinelUuidV7Slug,
  UuidSlug,
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
  parseUuidSlug,
  slugToUuid,
  uuidBytesToSlug,
  uuidToSlug,
  extractUuidV7Timestamp,
} from "./uuid";
import type { FreshValidationOptions, UuidV7SentinelDefinition } from "./types";

export const UUID_V7_SENTINEL_DEFINITIONS: readonly UuidV7SentinelDefinition[] =
  [
    {
      name: "nil",
      uuid: "00000000-0000-7000-8000-000000000000" as UuidV7String,
    },
    {
      name: "anonymousUser",
      uuid: "00000000-0001-7000-8000-000000000000" as UuidV7String,
    },
    {
      name: "unknownUser",
      uuid: "00000000-0002-7000-8000-000000000000" as UuidV7String,
    },
  ];

function schemaFromOption(
  mask: UuidSlugCodecOptions["mask"],
): Error | MaskSchema {
  if (!mask) return DEFAULT_MASK_SCHEMA;
  if ("xor" in mask && "permute" in mask && "inverse" in mask) return mask;
  return createMaskSchema(mask);
}

function createSentinels(definitions: readonly UuidV7SentinelDefinition[]) {
  const sentinels: UuidV7Sentinel[] = [];
  const byUuid = new Map<string, SentinelUuidV7Slug>();
  const bySlug = new Map<string, UuidV7String>();
  for (const definition of definitions) {
    const slug = uuidToSlug(definition.uuid);
    if (slug instanceof Error) throw slug;
    const sentinel = {
      name: definition.name,
      slug: slug as SentinelUuidV7Slug,
      uuid: definition.uuid,
    };
    sentinels.push(sentinel);
    byUuid.set(definition.uuid, sentinel.slug);
    bySlug.set(sentinel.slug, definition.uuid);
  }
  return { bySlug, byUuid, sentinels };
}

function generateUuidV4Bytes(out?: Uint8Array, offset = 0): Error | Uint8Array {
  const target = out ?? new Uint8Array(16);
  if (offset < 0 || offset + 16 > target.length)
    return new UuidSlugError("invalid_buffer", "Output buffer is too small.");
  runtime.fillRandom(target.subarray(offset, offset + 16));
  target[offset + 6] = ((target[offset + 6] ?? 0) & 0x0f) | 0x40;
  target[offset + 8] = ((target[offset + 8] ?? 0) & 0x3f) | 0x80;
  return target;
}

function errorOrThrow<T>(value: Error | T): T {
  if (value instanceof Error) throw value;
  return value;
}

export function createUuidSlugCodec(
  options: UuidSlugCodecOptions = {},
): UuidSlugCodec {
  const schema = errorOrThrow(schemaFromOption(options.mask));
  const legacyMasks = options.legacy?.masks ?? [];
  const generator = options.generator ?? createRuntimeGenerator(runtime);
  const sentinelState = createSentinels(
    options.sentinels ?? UUID_V7_SENTINEL_DEFINITIONS,
  );

  function decodeMasked(slug: string): Error | UuidString {
    const sentinel = sentinelState.bySlug.get(slug);
    if (sentinel) return sentinel;
    const primary = maskedSlugToUuidWithSchema(slug, schema);
    if (!(primary instanceof Error)) return primary;
    for (const legacy of legacyMasks) {
      const decoded = maskedSlugToUuidWithSchema(slug, legacy);
      if (!(decoded instanceof Error)) return decoded;
    }
    if (options.legacy?.directDecode === true) return slugToUuid(slug);
    return primary;
  }

  function uuidV7ToMaskedSlug(uuid: string): Error | PublicUuidV7Slug {
    const sentinel = sentinelState.byUuid.get(uuid);
    if (sentinel) return sentinel;
    return uuidToMaskedSlugWithSchema(uuid, schema) as Error | PublicUuidV7Slug;
  }

  return {
    sentinels: sentinelState.sentinels,
    uuidV4() {
      const native = runtime.uuidV4?.();
      if (native) return native as UuidV4String;
      return errorOrThrow(
        formatUuid(errorOrThrow(generateUuidV4Bytes())),
      ) as UuidV4String;
    },
    uuidV7() {
      return generator.uuidV7();
    },
    uuidV4Bytes: generateUuidV4Bytes,
    uuidV7Bytes: generator.uuidV7Bytes,
    uuidV4Slug() {
      return errorOrThrow(
        uuidBytesToSlug(errorOrThrow(generateUuidV4Bytes())),
      ) as UuidV4Slug;
    },
    uuidV7Slug() {
      if (runtime.uuidV7Slug) return runtime.uuidV7Slug() as UuidV7Slug;
      return errorOrThrow(
        uuidBytesToSlug(errorOrThrow(generator.uuidV7Bytes())),
      ) as UuidV7Slug;
    },
    uuidV7MaskedSlug() {
      return errorOrThrow(
        uuidV7BytesToMaskedSlug(errorOrThrow(generator.uuidV7Bytes()), schema),
      );
    },
    uuidToSlug,
    slugToUuid,
    uuidToMaskedSlug(uuid) {
      return uuidV7ToMaskedSlug(uuid) as Error | MaskedUuidSlug;
    },
    maskedSlugToUuid: decodeMasked,
    uuidV7ToMaskedSlug,
    maskedSlugToUuidV7(slug) {
      const decoded = decodeMasked(slug);
      if (decoded instanceof Error) return decoded;
      return isUuidV7String(decoded)
        ? decoded
        : new UuidSlugError(
            "invalid_uuid_version",
            "Decoded UUID is not UUIDv7.",
          );
    },
    parseUuid,
    formatUuid,
    parseUuidSlug,
    formatUuidSlug,
  };
}

export const defaultCodec = createUuidSlugCodec();

export function validateUuidV7Fresh(
  uuid: string,
  options: FreshValidationOptions = {},
): Error | UuidV7String {
  if (!isUuidV7String(uuid))
    return new UuidSlugError(
      "invalid_uuid",
      "Expected canonical UUIDv7 string.",
    );
  const bytes = parseUuid(uuid);
  if (bytes instanceof Error) return bytes;
  const windowMs = options.windowMs ?? 86_400_000;
  const now = options.now?.() ?? Date.now();
  const timestamp = extractUuidV7Timestamp(bytes);
  if (timestamp < now - windowMs || timestamp > now + windowMs)
    return new UuidSlugError(
      "stale_uuid",
      "UUIDv7 timestamp is outside the accepted window.",
    );
  if (!hasUuidV7Entropy(bytes))
    return new UuidSlugError(
      "invalid_uuid",
      "UUIDv7 random payload is degenerate.",
    );
  return uuid;
}

export function validateUuidV7SlugFresh(
  slug: string,
  options?: FreshValidationOptions,
): Error | UuidV7Slug {
  const uuid = slugToUuid(slug);
  if (uuid instanceof Error) return uuid;
  const valid = validateUuidV7Fresh(uuid, options);
  return valid instanceof Error ? valid : (slug as UuidV7Slug);
}

export function validateMaskedUuidV7SlugFresh(
  slug: string,
  options?: FreshValidationOptions,
): Error | MaskedUuidV7Slug {
  const uuid = defaultCodec.maskedSlugToUuidV7(slug);
  if (uuid instanceof Error) return uuid;
  const valid = validateUuidV7Fresh(uuid, options);
  return valid instanceof Error ? valid : (slug as MaskedUuidV7Slug);
}

export {
  isUuidSlug,
  isUuidString,
  isUuidV4Slug,
  isUuidV4String,
  isUuidV7Slug,
  isUuidV7String,
};
