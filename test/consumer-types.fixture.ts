import {
  createMaskSchemaAsync,
  createUuidSlugCodec,
  PUBLIC_MASK_SCHEMA,
  uuidV7Slug,
} from "@anizoptera/uuid-slug";
import type {
  AsyncMaskSchemaOptions,
  MaskSchema,
  MaskedUuidV7Slug,
  PublicUuidV7Slug,
  UuidBytes,
  UuidSlugError,
  UuidV7BytesSource,
  UuidV4Slug,
  UuidV7Slug,
  UuidString,
  UuidSlugMigration,
} from "@anizoptera/uuid-slug";

// The emitted declarations must preserve produced brands without requiring branded inputs.
const plainResult = uuidV7Slug();
if (plainResult instanceof Error) throw plainResult;
const plain: UuidV7Slug = plainResult;
const storedBytes: UuidBytes = new Uint8Array(16);
const codecResult = createUuidSlugCodec({ mask: PUBLIC_MASK_SCHEMA });
if (codecResult instanceof Error) throw codecResult;
const codec = codecResult;
const bytesOnlyGenerator: UuidV7BytesSource = {
  uuidV7Bytes: () => new Uint8Array(16),
};
// @ts-expect-error A codec byte source does not promise caller-owned output storage.
bytesOnlyGenerator.uuidV7Bytes(new Uint8Array(16));
createUuidSlugCodec({
  mask: PUBLIC_MASK_SCHEMA,
  generator: bytesOnlyGenerator,
});
const migration: UuidSlugMigration = codec.migration({ original: true, plain: true });
const migrated: UuidString | UuidSlugError = migration.decode("AAAAAAABcACAAAAAAAAAAA");
const candidates: UuidString[] | UuidSlugError = migration.candidates(
  "AAAAAAABcACAAAAAAAAAAA",
  "original",
);
void [storedBytes, migrated, candidates];
const publicSlugResult = codec.uuidV7MaskedSlug();
if (publicSlugResult instanceof Error) throw publicSlugResult;
const publicSlug: PublicUuidV7Slug = publicSlugResult;
codec.uuidV7ToMaskedSlug("019ff19b-58b8-7000-9b1b-df713bd5562c");
// @ts-expect-error A plain slug does not carry the masked brand.
const masked: MaskedUuidV7Slug = plain;
// @ts-expect-error A v7 slug is not a v4 slug.
const v4: UuidV4Slug = plain;
// @ts-expect-error A generated public slug may be a raw sentinel.
const onlyMasked: MaskedUuidV7Slug = publicSlug;
void [masked, v4, onlyMasked];

const schemaOptions: AsyncMaskSchemaOptions = {
  seed: "consumer-schema-seed",
  signal: new AbortController().signal,
};
const pendingSchema: Promise<MaskSchema | UuidSlugError> = createMaskSchemaAsync(schemaOptions);
// @ts-expect-error A pending schema cannot be used as a codec key before awaiting its result.
createUuidSlugCodec({ mask: pendingSchema });
void pendingSchema;

// @ts-expect-error Consumers branch on UuidSlugErrorCode; the runtime-specific subclass is internal.
type _RuntimeErrorIsInternal = import("@anizoptera/uuid-slug")["UuidRuntimeError"];
// @ts-expect-error Masking produces UUIDv7 slugs, so no broader masked-slug type is public.
type _GenericMaskedSlugIsInternal = import("@anizoptera/uuid-slug")["MaskedUuidSlug"];
