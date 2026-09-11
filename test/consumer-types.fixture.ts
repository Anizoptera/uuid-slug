import {
  createCustomMaskSchema,
  createMaskSchema,
  createMaskSchemaAsync,
  createUuidSlugCodec,
  createUuidV7Generator,
  extractUuidV7Timestamp,
  formatUuid,
  formatUuidSlug,
  isUuidSlug,
  isUuidSlugError,
  isUuidString,
  isUuidV4Slug,
  isUuidV4String,
  isUuidV7Bytes,
  isUuidV7Slug,
  isUuidV7String,
  parseUuid,
  parseUuidSlug,
  PUBLIC_MASK_SCHEMA,
  slugToUuid,
  unwrapUuidSlug,
  UUID_SLUG_ERROR_CODES,
  UUID_V7_SENTINEL_DEFINITIONS,
  UuidSlugError,
  uuidV4,
  validateUuidV7SlugFresh,
  validateUuidV7Fresh,
  uuidToSlug,
  uuidV4Bytes,
  uuidV4Slug,
  uuidV7,
  uuidV7Bytes,
  uuidV7BytesAt,
  uuidV7At,
  uuidV7Slug,
} from "@anizoptera/uuid-slug";
import type {
  AsyncMaskSchemaOptions,
  CustomMaskSchemaOptions,
  FreshValidationOptions,
  MaskSchema,
  MaskSchemaOptions,
  MaskedUuidV7Slug,
  MigrationFormat,
  PublicUuidV7Slug,
  SentinelUuidV7Slug,
  SlugAlphabet,
  UuidBytes,
  UuidSlug,
  UuidSlugCodec,
  UuidSlugCodecOptions,
  UuidSlugErrorCode,
  UuidSlugMigrationOptions,
  UuidV7BytesSource,
  UuidV4Slug,
  UuidV4Bytes,
  UuidV4String,
  UuidV7Slug,
  UuidV7Bytes,
  UuidV7String,
  UuidV7Generator,
  UuidV7GeneratorOptions,
  UuidV7Sentinel,
  UuidV7SentinelDefinition,
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

const alphabet: SlugAlphabet = "base32hex";
const errorCode: UuidSlugErrorCode = UUID_SLUG_ERROR_CODES[0];
expectType<UuidSlugError>()(new UuidSlugError(errorCode, "consumer failure"));
expectType<readonly UuidV7SentinelDefinition[]>()(UUID_V7_SENTINEL_DEFINITIONS);

const maskOptions = { seed: "consumer-seed", keyIterations: 2 } satisfies MaskSchemaOptions;
const maskResult = createMaskSchema(maskOptions);
expectType<MaskSchema | UuidSlugError>()(maskResult);
const customOptions = {
  id: "consumer-transform",
  forward: (input: Uint8Array) => input,
  reverse: (input: Uint8Array) => input,
} satisfies CustomMaskSchemaOptions;
expectType<MaskSchema | UuidSlugError>()(createCustomMaskSchema(customOptions));

const generatorOptions = {
  clock: () => 0,
  fillRandom: (bytes: Uint8Array<ArrayBuffer>) => bytes.fill(0),
} satisfies UuidV7GeneratorOptions;
const generator: UuidV7Generator = createUuidV7Generator(generatorOptions);
expectType<UuidV7String | UuidSlugError>()(generator.uuidV7());
expectType<UuidV7Bytes | UuidSlugError>()(generator.uuidV7Bytes());
expectType<UuidV7String | UuidSlugError>()(generator.uuidV7At(0));
expectType<UuidV7Bytes | UuidSlugError>()(generator.uuidV7BytesAt(0));
const codecOptions = { mask: PUBLIC_MASK_SCHEMA, generator } satisfies UuidSlugCodecOptions;
expectType<UuidSlugCodec | UuidSlugError>()(createUuidSlugCodec(codecOptions));
const migrationOptions = { original: true, plain: true } satisfies UuidSlugMigrationOptions;
const migrationFormat: MigrationFormat = "current";
void [alphabet, migrationOptions, migrationFormat];

// The emitted declarations must infer strict brands without requiring branded inputs.
const plainResult = uuidV7Slug();
expectType<UuidV7Slug | UuidSlugError>()(plainResult);
expectType<UuidV4String | UuidSlugError>()(uuidV4());
expectType<UuidV7String | UuidSlugError>()(uuidV7());
expectType<UuidV7String | UuidSlugError>()(uuidV7At(0));
expectType<UuidV4Slug | UuidSlugError>()(uuidV4Slug(alphabet));
expectType<UuidV7Slug | UuidSlugError>()(uuidV7Slug(alphabet));
expectType<UuidV4Bytes | UuidSlugError>()(uuidV4Bytes());
expectType<UuidV7Bytes | UuidSlugError>()(uuidV7Bytes());
expectType<UuidV7Bytes | UuidSlugError>()(uuidV7BytesAt(0));
const unwrappedPlain: UuidV7Slug = unwrapUuidSlug(plainResult);
expectType<UuidV7Slug>()(unwrappedPlain);
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
expectType<UuidSlug | UuidSlugError>()(directlySelectedAlphabet);
expectType<UuidSlug | UuidSlugError>()(formatUuidSlug(new Uint8Array(32), 8, alphabet));
const externalUuid: unknown = "019ff19b-58b8-7000-9b1b-df713bd5562c";
declare const unknownValue: unknown;
if (isUuidString(unknownValue)) expectType<UuidString>()(unknownValue);
if (isUuidV4String(unknownValue)) expectType<UuidV4String>()(unknownValue);
if (isUuidV7String(unknownValue)) expectType<UuidV7String>()(unknownValue);
if (isUuidSlug(unknownValue)) expectType<UuidSlug>()(unknownValue);
if (isUuidV4Slug(unknownValue)) expectType<UuidV4Slug>()(unknownValue);
if (isUuidV7Slug(unknownValue)) expectType<UuidV7Slug>()(unknownValue);
if (isUuidV7Bytes(unknownValue)) expectType<UuidV7Bytes>()(unknownValue);
if (isUuidSlugError(unknownValue)) expectType<UuidSlugError>()(unknownValue);
if (!isUuidV7String(externalUuid)) throw new Error("Expected a UUIDv7 string.");
const checkedUuid: UuidV7String = externalUuid;
const checkedUuidBytes = parseUuid(checkedUuid);
expectType<UuidV7Bytes | UuidSlugError>()(checkedUuidBytes);
if (checkedUuidBytes instanceof Error) throw checkedUuidBytes;
const versionedBytes: UuidV7Bytes = checkedUuidBytes;
const formattedUuid = formatUuid(versionedBytes);
expectType<UuidString | UuidSlugError>()(formattedUuid);
if (formattedUuid instanceof Error) throw formattedUuid;
// @ts-expect-error Mutable bytes may no longer contain the version their stale brand records.
const versionedUuid: UuidV7String = formattedUuid;
const convertedSlug = uuidToSlug(checkedUuid);
expectType<UuidV7Slug | UuidSlugError>()(convertedSlug);
if (convertedSlug instanceof Error) throw convertedSlug;
const versionedSlug: UuidV7Slug = convertedSlug;
// @ts-expect-error Known slug text cannot enter a UUID text operation.
parseUuid(versionedSlug);
// @ts-expect-error UUID freshness accepts UUID text, not known slug text.
validateUuidV7Fresh(versionedSlug);
const convertedUuid = slugToUuid(versionedSlug);
expectType<UuidV7String | UuidSlugError>()(convertedUuid);
if (convertedUuid instanceof Error) throw convertedUuid;
const roundTripUuid: UuidV7String = convertedUuid;
const parsedSlugBytes = parseUuidSlug(versionedSlug);
expectType<UuidV7Bytes | UuidSlugError>()(parsedSlugBytes);
if (parsedSlugBytes instanceof Error) throw parsedSlugBytes;
const versionedSlugBytes: UuidV7Bytes = parsedSlugBytes;
// @ts-expect-error Known UUID text cannot enter a slug text operation.
parseUuidSlug(checkedUuid);
// @ts-expect-error Slug freshness accepts slug text, not known UUID text.
validateUuidV7SlugFresh(checkedUuid);
const formattedSlug = formatUuidSlug(versionedSlugBytes);
expectType<UuidSlug | UuidSlugError>()(formattedSlug);
if (formattedSlug instanceof Error) throw formattedSlug;
// @ts-expect-error Mutable bytes may no longer contain the version their stale brand records.
const roundTripSlug: UuidV7Slug = formattedSlug;
class ConsumerBuffer extends Uint8Array {}
const destination = new ConsumerBuffer(32);
expectType<ConsumerBuffer | UuidSlugError>()(generator.uuidV7Bytes(destination, 8));
expectType<ConsumerBuffer | UuidSlugError>()(generator.uuidV7BytesAt(0, destination, 8));
const parsedInto: ConsumerBuffer | UuidSlugError = parseUuid(checkedUuid, destination, 8);
const parsedSlugInto: ConsumerBuffer | UuidSlugError = parseUuidSlug(plain, destination, 8);
expectType<ConsumerBuffer | UuidSlugError>()(parsedInto);
expectType<ConsumerBuffer | UuidSlugError>()(parsedSlugInto);
// @ts-expect-error Supplying storage must not let known slug text enter a UUID text operation.
parseUuid(versionedSlug, destination);
// @ts-expect-error Supplying storage must not let known UUID text enter a slug text operation.
parseUuidSlug(checkedUuid, destination);
const v4Into: ConsumerBuffer | UuidSlugError = uuidV4Bytes(destination, 8);
const v7Into: ConsumerBuffer | UuidSlugError = uuidV7Bytes(destination, 8);
const v7AtInto: ConsumerBuffer | UuidSlugError = uuidV7BytesAt(0, destination, 8);
expectType<ConsumerBuffer | UuidSlugError>()(v4Into);
expectType<ConsumerBuffer | UuidSlugError>()(v7Into);
expectType<ConsumerBuffer | UuidSlugError>()(v7AtInto);
const ownedV4: UuidV4Bytes | UuidSlugError = uuidV4Bytes();
const ownedV7: UuidV7Bytes | UuidSlugError = uuidV7Bytes();
if (ownedV4 instanceof Error) throw ownedV4;
if (ownedV7 instanceof Error) throw ownedV7;
expectType<number | UuidSlugError>()(extractUuidV7Timestamp(ownedV7));
// @ts-expect-error A known UUIDv4 has no UUIDv7 timestamp.
extractUuidV7Timestamp(ownedV4);
const generatedV4 = unwrapUuidSlug(uuidV4());
expectType<UuidV4String>()(generatedV4);
// @ts-expect-error UUIDv7 freshness is undefined for a known UUIDv4.
validateUuidV7Fresh(generatedV4);
expectType<UuidV7String | UuidSlugError>()(
  validateUuidV7Fresh("019ff19b-58b8-7000-9b1b-df713bd5562c"),
);
const generatedV4Slug = unwrapUuidSlug(uuidV4Slug());
expectType<UuidV4Slug>()(generatedV4Slug);
// @ts-expect-error UUIDv7 freshness is undefined for a known UUIDv4 slug.
validateUuidV7SlugFresh(generatedV4Slug);
expectType<UuidV7Slug | UuidSlugError>()(
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
expectType<UuidSlugCodec | UuidSlugError>()(codecResult);
if (codecResult instanceof Error) throw codecResult;
const codec = codecResult;
expectType<readonly UuidV7Sentinel[]>()(codec.sentinels);
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
  expectType<SentinelUuidV7Slug>()(knownSentinel);
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
expectType<UuidSlugMigration>()(migration);
// @ts-expect-error Migration readers accept encoded slug text, not known UUID text.
migration.decode(checkedUuid);
// @ts-expect-error Candidate discovery accepts encoded slug text, not known UUID text.
migration.candidates(checkedUuid);
const migrated: UuidString | UuidSlugError = migration.decode("AAAAAAABcACAAAAAAAAAAA");
const candidates: UuidString[] | UuidSlugError = migration.candidates(
  "AAAAAAABcACAAAAAAAAAAA",
  "original",
);
expectType<UuidString | UuidSlugError>()(migrated);
expectType<UuidString[] | UuidSlugError>()(candidates);
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
expectType<PublicUuidV7Slug | UuidSlugError>()(
  codec.uuidV7ToMaskedSlug("019ff19b-58b8-7000-9b1b-df713bd5562c"),
);
expectType<UuidV7String | UuidSlugError>()(codec.maskedSlugToUuidV7(uncheckedPublicSlug));
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
expectType<Promise<MaskSchema | UuidSlugError>>()(pendingSchema);
// @ts-expect-error A pending schema cannot be used as a codec key before awaiting its result.
createUuidSlugCodec({ mask: pendingSchema });
void pendingSchema;

// @ts-expect-error Consumers branch on UuidSlugErrorCode; no runtime-specific error class exists.
type _RuntimeErrorIsInternal = import("@anizoptera/uuid-slug")["UuidRuntimeError"];
// @ts-expect-error Masking produces UUIDv7 slugs, so no broader masked-slug type is public.
type _GenericMaskedSlugIsInternal = import("@anizoptera/uuid-slug")["MaskedUuidSlug"];
// @ts-expect-error Migration option projection is an implementation detail, not a consumer concept.
type _MigrationProjectionIsInternal = import("@anizoptera/uuid-slug")["EnabledMigrationFormat"];
