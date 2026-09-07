import { createMaskSchemaAsync, createUuidSlugCodec, uuidV7Slug } from "@anizoptera/uuid-slug";
import type {
  AsyncMaskSchemaOptions,
  MaskSchema,
  UuidSlugError,
  MaskedUuidV7Slug,
  PublicUuidV7Slug,
  UuidV4Slug,
  UuidV7Slug,
} from "@anizoptera/uuid-slug";

// The emitted declarations must preserve produced brands without requiring branded inputs.
const plain: UuidV7Slug = uuidV7Slug();
const codec = createUuidSlugCodec();
const publicSlug: PublicUuidV7Slug = codec.uuidV7MaskedSlug();
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
