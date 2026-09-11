import {
  createMaskSchemaAsync,
  createUuidSlugCodec,
  extractUuidV7Timestamp,
  formatUuid,
  formatUuidSlug,
  isUuidV7String,
  parseUuid,
  parseUuidSlug,
  PUBLIC_MASK_SCHEMA,
  slugToUuid,
  unwrapUuidSlug,
  uuidV4,
  validateUuidV7SlugFresh,
  validateUuidV7Fresh,
  uuidToSlug,
  uuidV4Bytes,
  uuidV4Slug,
  uuidV7Bytes,
  uuidV7BytesAt,
  uuidV7Slug,
} from "@anizoptera/uuid-slug";
import type * as UuidSlugApi from "@anizoptera/uuid-slug";
import type {
  AsyncMaskSchemaOptions,
  FreshValidationOptions,
  MaskSchema,
  MaskedUuidV7Slug,
  PublicUuidV7Slug,
  UuidBytes,
  UuidSlug,
  UuidSlugError,
  UuidV7BytesSource,
  UuidV4Slug,
  UuidV4Bytes,
  UuidV4String,
  UuidV7Slug,
  UuidV7Bytes,
  UuidV7String,
  UuidV7Generator,
  UuidString,
  UuidSlugMigration,
} from "@anizoptera/uuid-slug";

type IsAny<Type> = 0 extends 1 & Type ? true : false;
type IsExact<Actual, Expected> =
  IsAny<Actual> extends true
    ? IsAny<Expected>
    : IsAny<Expected> extends true
      ? false
      : [Actual] extends [Expected]
        ? [Expected] extends [Actual]
          ? true
          : false
        : false;
declare function expectType<Expected>(): <Actual>(
  actual: IsExact<Actual, Expected> extends true ? Actual : never,
) => void;
declare const untypedValue: ReturnType<typeof JSON.parse>;
// @ts-expect-error Exact assertions must reject `any` or every inferred result can pass unchecked.
expectType<string>()(untypedValue);

declare const generator: UuidV7Generator;

// The emitted declarations must infer strict brands without requiring branded inputs.
const plainResult = uuidV7Slug();
expectType<UuidV7Slug | UuidSlugError>()(plainResult);
const unwrappedPlain: UuidV7Slug = unwrapUuidSlug(plainResult);
if (plainResult instanceof Error) throw plainResult;
const plain: UuidV7Slug = plainResult;
// @ts-expect-error Unchecked bytes are not a validated UUID payload.
const uncheckedBytes: UuidBytes = new Uint8Array(16);
// @ts-expect-error Unchecked text is not a validated UUIDv7 string.
const uncheckedUuid: UuidV7String = "019ff19b-58b8-7000-9b1b-df713bd5562c";
const parsedBytes = parseUuid("019ff19b-58b8-7000-9b1b-df713bd5562c");
expectType<UuidBytes | UuidSlugError>()(parsedBytes);
if (parsedBytes instanceof Error) throw parsedBytes;
const storedBytes: UuidBytes = parsedBytes;
const directlySelectedAlphabet: UuidSlug | UuidSlugError = formatUuidSlug(parsedBytes, "base32hex");
const externalUuid: unknown = "019ff19b-58b8-7000-9b1b-df713bd5562c";
if (!isUuidV7String(externalUuid)) throw new Error("Expected a UUIDv7 string.");
const checkedUuid: UuidV7String = externalUuid;
const checkedUuidBytes = parseUuid(checkedUuid);
if (checkedUuidBytes instanceof Error) throw checkedUuidBytes;
const versionedBytes: UuidV7Bytes = checkedUuidBytes;
const formattedUuid = formatUuid(versionedBytes);
if (formattedUuid instanceof Error) throw formattedUuid;
// @ts-expect-error Mutable bytes may no longer contain the version their stale brand records.
const versionedUuid: UuidV7String = formattedUuid;
const convertedSlug = uuidToSlug(checkedUuid);
if (convertedSlug instanceof Error) throw convertedSlug;
const versionedSlug: UuidV7Slug = convertedSlug;
// @ts-expect-error Known slug text cannot enter a UUID text operation.
parseUuid(versionedSlug);
// @ts-expect-error UUID freshness accepts UUID text, not known slug text.
validateUuidV7Fresh(versionedSlug);
const convertedUuid = slugToUuid(versionedSlug);
if (convertedUuid instanceof Error) throw convertedUuid;
const roundTripUuid: UuidV7String = convertedUuid;
const parsedSlugBytes = parseUuidSlug(versionedSlug);
if (parsedSlugBytes instanceof Error) throw parsedSlugBytes;
const versionedSlugBytes: UuidV7Bytes = parsedSlugBytes;
// @ts-expect-error Known UUID text cannot enter a slug text operation.
parseUuidSlug(checkedUuid);
// @ts-expect-error Slug freshness accepts slug text, not known UUID text.
validateUuidV7SlugFresh(checkedUuid);
const formattedSlug = formatUuidSlug(versionedSlugBytes);
if (formattedSlug instanceof Error) throw formattedSlug;
// @ts-expect-error Mutable bytes may no longer contain the version their stale brand records.
const roundTripSlug: UuidV7Slug = formattedSlug;
class ConsumerBuffer extends Uint8Array {}
const destination = new ConsumerBuffer(32);
expectType<ConsumerBuffer | UuidSlugError>()(generator.uuidV7Bytes(destination, 8));
expectType<ConsumerBuffer | UuidSlugError>()(generator.uuidV7BytesAt(0, destination, 8));
const parsedInto: ConsumerBuffer | UuidSlugError = parseUuid(checkedUuid, destination, 8);
const parsedSlugInto: ConsumerBuffer | UuidSlugError = parseUuidSlug(plain, destination, 8);
// @ts-expect-error Supplying storage must not let known slug text enter a UUID text operation.
parseUuid(versionedSlug, destination);
// @ts-expect-error Supplying storage must not let known UUID text enter a slug text operation.
parseUuidSlug(checkedUuid, destination);
const v4Into: ConsumerBuffer | UuidSlugError = uuidV4Bytes(destination, 8);
const v7Into: ConsumerBuffer | UuidSlugError = uuidV7Bytes(destination, 8);
const v7AtInto: ConsumerBuffer | UuidSlugError = uuidV7BytesAt(0, destination, 8);
const ownedV4: UuidV4Bytes | UuidSlugError = uuidV4Bytes();
const ownedV7: UuidV7Bytes | UuidSlugError = uuidV7Bytes();
if (ownedV4 instanceof Error) throw ownedV4;
if (ownedV7 instanceof Error) throw ownedV7;
// @ts-expect-error A known UUIDv4 has no UUIDv7 timestamp.
extractUuidV7Timestamp(ownedV4);
const generatedV4 = unwrapUuidSlug(uuidV4());
// @ts-expect-error UUIDv7 freshness is undefined for a known UUIDv4.
validateUuidV7Fresh(generatedV4);
expectType<(UuidV7String & "019ff19b-58b8-7000-9b1b-df713bd5562c") | UuidSlugError>()(
  validateUuidV7Fresh("019ff19b-58b8-7000-9b1b-df713bd5562c"),
);
const generatedV4Slug = unwrapUuidSlug(uuidV4Slug());
// @ts-expect-error UUIDv7 freshness is undefined for a known UUIDv4 slug.
validateUuidV7SlugFresh(generatedV4Slug);
expectType<(UuidV7Slug & "AZ_xnLf5cACbG99xO9VWLAAAAAAAAAAAAAAAAA") | UuidSlugError>()(
  validateUuidV7SlugFresh("AZ_xnLf5cACbG99xO9VWLAAAAAAAAAAAAAAAAA"),
);
const formattedV4 = formatUuid(ownedV4);
if (formattedV4 instanceof Error) throw formattedV4;
// @ts-expect-error Mutable bytes may no longer contain the version their stale brand records.
const versionedV4: UuidV4String = formattedV4;
// @ts-expect-error An offset has no meaning without a destination buffer.
uuidV4Bytes(undefined, 8);
// @ts-expect-error An offset has no meaning without a destination buffer.
uuidV7Bytes(undefined, 8);
// @ts-expect-error An offset has no meaning without a destination buffer.
uuidV7BytesAt(0, undefined, 8);
const codecResult = createUuidSlugCodec({ mask: PUBLIC_MASK_SCHEMA });
if (codecResult instanceof Error) throw codecResult;
const codec = codecResult;
// @ts-expect-error UUIDv4 cannot enter UUIDv7-only masking.
codec.uuidV7ToMaskedSlug(generatedV4);
// @ts-expect-error UUID text masking accepts UUID text, not known slug text.
codec.uuidV7ToMaskedSlug(versionedSlug);
// @ts-expect-error Masked decoding accepts slug text, not known UUID text.
codec.maskedSlugToUuidV7(checkedUuid);
// @ts-expect-error Masked freshness accepts slug text, not known UUID text.
codec.validateMaskedSlugFresh(checkedUuid);
const knownSentinel = codec.sentinels[0]?.slug;
if (knownSentinel) {
  slugToUuid(knownSentinel);
}
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
// @ts-expect-error Migration readers accept encoded slug text, not known UUID text.
migration.decode(checkedUuid);
// @ts-expect-error Candidate discovery accepts encoded slug text, not known UUID text.
migration.candidates(checkedUuid);
const migrated: UuidString | UuidSlugError = migration.decode("AAAAAAABcACAAAAAAAAAAA");
const candidates: UuidString[] | UuidSlugError = migration.candidates(
  "AAAAAAABcACAAAAAAAAAAA",
  "original",
);
const plainOnlyMigration = codec.migration({ plain: true });
expectType<UuidSlugMigration<"current" | "plain">>()(plainOnlyMigration);
plainOnlyMigration.decode("AAAAAAAAcACAAAAAAAAAAA", "plain");
// @ts-expect-error This reader was not configured to accept the original masked format.
plainOnlyMigration.decode("AAAAAAAAcACAAAAAAAAAAA", "original");
const currentOnlyMigration = codec.migration({ plain: false });
expectType<UuidSlugMigration<"current">>()(currentOnlyMigration);
// @ts-expect-error A false option does not enable the plain format.
currentOnlyMigration.decode("AAAAAAAAcACAAAAAAAAAAA", "plain");
const defaultMigration = codec.migration();
expectType<UuidSlugMigration<"current">>()(defaultMigration);
// @ts-expect-error An omitted option does not enable the plain format.
defaultMigration.decode("AAAAAAAAcACAAAAAAAAAAA", "plain");
// @ts-expect-error A current-only reader must not widen to a reader for formats it does not accept.
const widenedMigration: UuidSlugMigration = defaultMigration;
const dynamicMigration = codec.migration({ plain: Boolean(Date.now()) });
expectType<UuidSlugMigration<"current" | "plain">>()(dynamicMigration);
dynamicMigration.decode("AAAAAAAAcACAAAAAAAAAAA", "plain");
void [
  uncheckedBytes,
  uncheckedUuid,
  storedBytes,
  directlySelectedAlphabet,
  checkedUuid,
  versionedBytes,
  versionedUuid,
  versionedSlug,
  roundTripUuid,
  versionedSlugBytes,
  roundTripSlug,
  parsedInto,
  parsedSlugInto,
  v4Into,
  v7Into,
  v7AtInto,
  ownedV4,
  ownedV7,
  versionedV4,
  migrated,
  candidates,
  widenedMigration,
  unwrappedPlain,
];
const publicSlugResult = codec.uuidV7MaskedSlug();
expectType<PublicUuidV7Slug | UuidSlugError>()(publicSlugResult);
if (publicSlugResult instanceof Error) throw publicSlugResult;
const publicSlug: PublicUuidV7Slug = publicSlugResult;
// @ts-expect-error A masked-or-sentinel result is not always a canonical direct UUID slug.
const directPublicSlug: UuidSlug = publicSlug;
// @ts-expect-error A possibly masked slug must be decoded by the codec that owns its key.
parseUuidSlug(publicSlug);
// @ts-expect-error Supplying storage must not bypass codec-owned masked decoding.
parseUuidSlug(publicSlug, destination);
// @ts-expect-error A possibly masked slug must be decoded by the codec that owns its key.
slugToUuid(publicSlug);
// @ts-expect-error Masked freshness requires the codec that owns the key.
validateUuidV7SlugFresh(publicSlug);
const uncheckedPublicSlug: string = publicSlug;
const checkedPublicSlugResult = codec.validateMaskedSlugFresh(uncheckedPublicSlug);
expectType<PublicUuidV7Slug | UuidSlugError>()(checkedPublicSlugResult);
if (checkedPublicSlugResult instanceof Error) throw checkedPublicSlugResult;
const checkedPublicSlug: PublicUuidV7Slug = checkedPublicSlugResult;
codec.uuidV7ToMaskedSlug("019ff19b-58b8-7000-9b1b-df713bd5562c");
// @ts-expect-error A plain slug does not carry the masked brand.
const masked: MaskedUuidV7Slug = plain;
// @ts-expect-error A v7 slug is not a v4 slug.
const v4: UuidV4Slug = plain;
// @ts-expect-error A generated public slug may be a raw sentinel.
const onlyMasked: MaskedUuidV7Slug = publicSlug;
// @ts-expect-error A known masked slug must be decoded by its codec.
parseUuidSlug(onlyMasked);
// @ts-expect-error A known masked slug requires codec-owned freshness validation.
validateUuidV7SlugFresh(onlyMasked);
void [checkedPublicSlug, directPublicSlug, masked, v4, onlyMasked];

const freshness: FreshValidationOptions = {};
// @ts-expect-error Validation options are captured input, not mutable package state.
freshness.windowMs = 1;

const schemaOptions: AsyncMaskSchemaOptions = {
  seed: "consumer-schema-seed",
  signal: new AbortController().signal,
};
const pendingSchema: Promise<MaskSchema | UuidSlugError> = createMaskSchemaAsync(schemaOptions);
// @ts-expect-error A pending schema cannot be used as a codec key before awaiting its result.
createUuidSlugCodec({ mask: pendingSchema });
void pendingSchema;

// @ts-expect-error Consumers branch on UuidSlugErrorCode; no runtime-specific error class exists.
type _RuntimeErrorIsInternal = UuidSlugApi.UuidRuntimeError;
// @ts-expect-error Masking produces UUIDv7 slugs, so no broader masked-slug type is public.
type _GenericMaskedSlugIsInternal = UuidSlugApi.MaskedUuidSlug;
// @ts-expect-error Migration option projection is an implementation detail, not a consumer concept.
type _MigrationProjectionIsInternal = UuidSlugApi.EnabledMigrationFormat;
declare const internalTypes: readonly [
  _RuntimeErrorIsInternal,
  _GenericMaskedSlugIsInternal,
  _MigrationProjectionIsInternal,
];
void internalTypes;
