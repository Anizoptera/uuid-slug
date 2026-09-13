import {
  bytesToUuidString,
  createUuidV7Mask,
  createUuidV7MaskAsync,
  createUuidV7Generator,
  createUuidV7SlugCodec,
  extractUuidV7Timestamp,
  bytesToUuidSlug,
  isUuidBytes,
  isUuidV4Bytes,
  isUuidV7String,
  uuidStringToBytes,
  uuidSlugToBytes,
  UUID_V7_TEST_MASK,
  uuidSlugToString,
  generateUuidV4,
  validateUuidV7SlugTimestamp,
  validateUuidV7Timestamp,
  uuidStringToSlug,
  generateUuidV4Bytes,
  generateUuidV4Slug,
  generateUuidV7Bytes,
  generateUuidV7BytesAt,
  generateUuidV7,
  generateUuidV7Slug,
} from "@anizoptera/uuid-slug";
import type * as UuidSlugApi from "@anizoptera/uuid-slug";
import type {
  AsyncUuidV7MaskOptions,
  UuidV7TimestampWindow,
  UuidV7Mask,
  MaskedUuidV7Slug,
  UuidV7CodecSlug,
  UuidBytes,
  UuidSlug,
  UuidSlugError,
  UuidV4Slug,
  UuidV4Bytes,
  UuidV4String,
  UuidV7Slug,
  UuidV7Bytes,
  UuidV7String,
  UuidV7Generator,
  UuidV7SlugCodec,
  UuidString,
  UuidSlugMigrationDecoder,
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
const plainResult = generateUuidV7Slug();
expectType<UuidV7Slug | UuidSlugError>()(plainResult);
if (plainResult instanceof Error) throw plainResult;
const directSlug: UuidV7Slug = plainResult;
// @ts-expect-error Unchecked bytes are not a validated UUID payload.
const uncheckedBytes: UuidBytes = new Uint8Array(16);
// @ts-expect-error Unchecked text is not a validated UUIDv7 string.
const uncheckedUuid: UuidV7String = "019ff19b-58b8-7000-9b1b-df713bd5562c";
const parsedBytes = uuidStringToBytes("019ff19b-58b8-7000-9b1b-df713bd5562c");
expectType<UuidBytes | UuidSlugError>()(parsedBytes);
expectType<UuidV7Slug | UuidSlugError>()(uuidStringToSlug(generateUuidV7()));
expectType<UuidV7String | UuidSlugError>()(uuidSlugToString(uuidStringToSlug(generateUuidV7())));
expectType<UuidSlug | UuidSlugError>()(bytesToUuidSlug(uuidStringToBytes(generateUuidV7())));
expectType<UuidString | UuidSlugError>()(
  bytesToUuidString(uuidSlugToBytes(uuidStringToSlug(generateUuidV7()))),
);
if (parsedBytes instanceof Error) throw parsedBytes;
const storedBytes: UuidBytes = parsedBytes;
const directlySelectedAlphabet: UuidSlug | UuidSlugError = bytesToUuidSlug(
  parsedBytes,
  "base32hex",
);
const externalUuid: unknown = "019ff19b-58b8-7000-9b1b-df713bd5562c";
if (!isUuidV7String(externalUuid)) throw new Error("Expected a UUIDv7 string.");
const checkedUuid: UuidV7String = externalUuid;
const checkedUuidBytes = uuidStringToBytes(checkedUuid);
if (checkedUuidBytes instanceof Error) throw checkedUuidBytes;
const versionedBytes: UuidV7Bytes = checkedUuidBytes;
const formattedUuid = bytesToUuidString(versionedBytes);
if (formattedUuid instanceof Error) throw formattedUuid;
// @ts-expect-error Mutable bytes may no longer contain the version their stale brand records.
const versionedUuid: UuidV7String = formattedUuid;
const convertedSlug = uuidStringToSlug(checkedUuid);
if (convertedSlug instanceof Error) throw convertedSlug;
const versionedSlug: UuidV7Slug = convertedSlug;
expectType<number | UuidSlugError>()(extractUuidV7Timestamp(checkedUuid));
expectType<number | UuidSlugError>()(extractUuidV7Timestamp(versionedSlug));
// @ts-expect-error Known slug text cannot enter a UUID text operation.
uuidStringToBytes(versionedSlug);
// @ts-expect-error UUID timestamp validation accepts UUID text, not known slug text.
validateUuidV7Timestamp(versionedSlug);
const convertedUuid = uuidSlugToString(versionedSlug);
if (convertedUuid instanceof Error) throw convertedUuid;
const roundTripUuid: UuidV7String = convertedUuid;
const parsedSlugBytes = uuidSlugToBytes(versionedSlug);
if (parsedSlugBytes instanceof Error) throw parsedSlugBytes;
const versionedSlugBytes: UuidV7Bytes = parsedSlugBytes;
expectType<number | UuidSlugError>()(extractUuidV7Timestamp(versionedSlugBytes));
// @ts-expect-error Known UUID text cannot enter a slug text operation.
uuidSlugToBytes(checkedUuid);
// @ts-expect-error Slug timestamp validation accepts slug text, not known UUID text.
validateUuidV7SlugTimestamp(checkedUuid);
const formattedSlug = bytesToUuidSlug(versionedSlugBytes);
if (formattedSlug instanceof Error) throw formattedSlug;
// @ts-expect-error Mutable bytes may no longer contain the version their stale brand records.
const roundTripSlug: UuidV7Slug = formattedSlug;
class ConsumerBuffer extends Uint8Array {}
const destination = new ConsumerBuffer(32);
expectType<number | UuidSlugError>()(extractUuidV7Timestamp(destination, 8));
const externalBinary: unknown = versionedBytes;
if (!isUuidBytes(externalBinary)) throw new Error("Expected UUID bytes.");
const checkedBinary: UuidBytes = externalBinary;
if (!isUuidV4Bytes(externalBinary)) throw new Error("Expected UUIDv4 bytes for type narrowing.");
const checkedV4Binary: UuidV4Bytes = externalBinary;
const directionalBytes = uuidStringToBytes(checkedUuid);
expectType<UuidV7Bytes | UuidSlugError>()(directionalBytes);
expectType<ConsumerBuffer | UuidSlugError>()(uuidStringToBytes(checkedUuid, destination, 8));
expectType<UuidString | UuidSlugError>()(bytesToUuidString(versionedBytes));
expectType<ConsumerBuffer | UuidSlugError>()(generator.generateUuidV7Bytes(destination, 8));
expectType<ConsumerBuffer | UuidSlugError>()(generator.generateUuidV7BytesAt(0, destination, 8));
const parsedInto: ConsumerBuffer | UuidSlugError = uuidStringToBytes(checkedUuid, destination, 8);
const parsedSlugInto: ConsumerBuffer | UuidSlugError = uuidSlugToBytes(directSlug, destination, 8);
// @ts-expect-error Supplying storage must not let known slug text enter a UUID text operation.
uuidStringToBytes(versionedSlug, destination);
// @ts-expect-error Supplying storage must not let known UUID text enter a slug text operation.
uuidSlugToBytes(checkedUuid, destination);
const v4Into: ConsumerBuffer | UuidSlugError = generateUuidV4Bytes(destination, 8);
const v7Into: ConsumerBuffer | UuidSlugError = generateUuidV7Bytes(destination, 8);
const v7AtInto: ConsumerBuffer | UuidSlugError = generateUuidV7BytesAt(0, destination, 8);
const ownedV4: UuidV4Bytes | UuidSlugError = generateUuidV4Bytes();
const ownedV7: UuidV7Bytes | UuidSlugError = generateUuidV7Bytes();
if (ownedV4 instanceof Error) throw ownedV4;
if (ownedV7 instanceof Error) throw ownedV7;
// @ts-expect-error A known UUIDv4 has no UUIDv7 timestamp.
extractUuidV7Timestamp(ownedV4);
const generatedV4Result = generateUuidV4();
if (generatedV4Result instanceof Error) throw generatedV4Result;
const generatedV4 = generatedV4Result;
// @ts-expect-error UUIDv7 timestamp validation is undefined for a known UUIDv4.
validateUuidV7Timestamp(generatedV4, { maxTimestampDeltaMs: 0 });
expectType<(UuidV7String & "019ff19b-58b8-7000-9b1b-df713bd5562c") | UuidSlugError>()(
  validateUuidV7Timestamp("019ff19b-58b8-7000-9b1b-df713bd5562c", {
    maxTimestampDeltaMs: 0,
  }),
);
const generatedV4SlugResult = generateUuidV4Slug();
if (generatedV4SlugResult instanceof Error) throw generatedV4SlugResult;
const generatedV4Slug = generatedV4SlugResult;
// @ts-expect-error UUIDv7 timestamp validation is undefined for a known UUIDv4 slug.
validateUuidV7SlugTimestamp(generatedV4Slug, { maxTimestampDeltaMs: 0 });
expectType<(UuidV7Slug & "AZ_xnLf5cACbG99xO9VWLAAAAAAAAAAAAAAAAA") | UuidSlugError>()(
  validateUuidV7SlugTimestamp("AZ_xnLf5cACbG99xO9VWLAAAAAAAAAAAAAAAAA", {
    maxTimestampDeltaMs: 0,
  }),
);
const formattedV4 = bytesToUuidString(ownedV4);
if (formattedV4 instanceof Error) throw formattedV4;
// @ts-expect-error Mutable bytes may no longer contain the version their stale brand records.
const versionedV4: UuidV4String = formattedV4;
// @ts-expect-error An offset has no meaning without a destination buffer.
generateUuidV4Bytes(undefined, 8);
// @ts-expect-error An offset has no meaning without a destination buffer.
generateUuidV7Bytes(undefined, 8);
// @ts-expect-error An offset has no meaning without a destination buffer.
generateUuidV7BytesAt(0, undefined, 8);
const codecResult = createUuidV7SlugCodec({ mask: UUID_V7_TEST_MASK });
expectType<UuidV7SlugCodec | UuidSlugError>()(
  createUuidV7SlugCodec({ mask: createUuidV7Mask({ seed: "composed" }) }),
);
if (codecResult instanceof Error) throw codecResult;
const codec = codecResult;
expectType<UuidV7SlugCodec>()(codec);
expectType<UuidV7CodecSlug | UuidSlugError>()(codec.generateUuidSlug());
expectType<UuidV7CodecSlug | UuidSlugError>()(codec.uuidBytesToSlug(versionedBytes));
expectType<UuidV7CodecSlug | UuidSlugError>()(codec.uuidBytesToSlug(generateUuidV7Bytes()));
expectType<UuidV7String | UuidSlugError>()(
  codec.uuidSlugToString(codec.uuidStringToSlug(generateUuidV7())),
);
expectType<UuidV7Bytes | UuidSlugError>()(
  codec.uuidSlugToBytes(codec.uuidStringToSlug(generateUuidV7())),
);
expectType<number | UuidSlugError>()(
  codec.extractUuidSlugTimestamp(codec.uuidStringToSlug(generateUuidV7())),
);
expectType<UuidV7String | UuidSlugError>()(codec.uuidSlugToString("AZ_xnLf5cACbG99xO9VWLw"));
expectType<number | UuidSlugError>()(codec.extractUuidSlugTimestamp("AZ_xnLf5cACbG99xO9VWLw"));
expectType<UuidV7Bytes | UuidSlugError>()(codec.uuidSlugToBytes("AZ_xnLf5cACbG99xO9VWLw"));
expectType<ConsumerBuffer | UuidSlugError>()(
  codec.uuidSlugToBytes("AZ_xnLf5cACbG99xO9VWLw", destination, 8),
);
expectType<(UuidV7CodecSlug & "AZ_xnLf5cACbG99xO9VWLw") | UuidSlugError>()(
  codec.validateUuidSlugTimestamp("AZ_xnLf5cACbG99xO9VWLw", { maxTimestampDeltaMs: 0 }),
);
// @ts-expect-error Removed codec methods are not part of the public interface.
codec.uuidV7MaskedSlug();
// @ts-expect-error Removed codec types are not exported.
type _RemovedCodec = import("@anizoptera/uuid-slug")["UuidSlugCodec"];
// @ts-expect-error Removed codec factories are not exported.
type _RemovedCodecFactory = (typeof import("@anizoptera/uuid-slug"))["createUuidSlugCodec"];
// @ts-expect-error Visibility did not describe the codec-owned slug value.
type _RemovedPublicSlug = import("@anizoptera/uuid-slug")["PublicUuidV7Slug"];
createUuidV7SlugCodec({ mask: UUID_V7_TEST_MASK, outputAlphabet: "base32hex" });
createUuidV7SlugCodec({
  mask: UUID_V7_TEST_MASK,
  // @ts-expect-error The writer-only option names its output effect.
  slugAlphabet: "base32hex",
});
const maskedFromBytes = codec.uuidBytesToSlug(versionedBytes);
expectType<UuidV7CodecSlug | UuidSlugError>()(maskedFromBytes);
const uuidTextOrBytes = (true as boolean) ? "019ff19b-58b8-7000-9b1b-df713bd5562c" : versionedBytes;
// @ts-expect-error A mixed representation must be narrowed to select the matching operation.
codec.uuidStringToSlug(uuidTextOrBytes);
const decodedMaskedBytes = codec.uuidSlugToBytes("AZ_xnLf5cACbG99xO9VWLw");
expectType<UuidV7Bytes | UuidSlugError>()(decodedMaskedBytes);
const decodedMaskedInto = codec.uuidSlugToBytes("AZ_xnLf5cACbG99xO9VWLw", destination, 8);
expectType<ConsumerBuffer | UuidSlugError>()(decodedMaskedInto);
// @ts-expect-error UUIDv4 cannot enter UUIDv7-only masking.
codec.uuidStringToSlug(generatedV4);
// @ts-expect-error Known UUIDv4 bytes cannot enter UUIDv7-only masking.
codec.uuidBytesToSlug(ownedV4);
const knownV4TextOrBytes = (true as boolean) ? generatedV4 : ownedV4;
// @ts-expect-error One known UUIDv4 member makes the whole input union invalid.
codec.uuidStringToSlug(knownV4TextOrBytes);
// @ts-expect-error UUID text masking accepts UUID text, not known slug text.
codec.uuidStringToSlug(versionedSlug);
// @ts-expect-error Masked decoding accepts slug text, not known UUID text.
codec.uuidSlugToString(checkedUuid);
// @ts-expect-error Masked timestamp validation accepts slug text, not known UUID text.
codec.validateUuidSlugTimestamp(checkedUuid, { maxTimestampDeltaMs: 0 });
const knownSentinel = codec.sentinels[0]?.slug;
if (knownSentinel) {
  uuidSlugToString(knownSentinel);
}
createUuidV7SlugCodec({
  mask: UUID_V7_TEST_MASK,
  // @ts-expect-error Codec generation always uses the package's cryptographic runtime source.
  generateUuidV7Bytes: () => new Uint8Array(16),
});
const migrationResult = codec.createMigrationDecoder({
  originalMask: true,
  directSlug: true,
});
if (migrationResult instanceof Error) throw migrationResult;
const migration: UuidSlugMigrationDecoder = migrationResult;
// @ts-expect-error Migration readers accept encoded slug text, not known UUID text.
migration.uuidSlugToString(checkedUuid);
// @ts-expect-error Candidate discovery accepts encoded slug text, not known UUID text.
migration.uuidSlugToStringCandidates(checkedUuid);
const migrated: UuidString | UuidSlugError = migration.uuidSlugToString("AAAAAAABcACAAAAAAAAAAA");
const candidates: UuidString[] | UuidSlugError = migration.uuidSlugToStringCandidates(
  "AAAAAAABcACAAAAAAAAAAA",
  "original-mask",
);
const plainOnlyMigration = codec.createMigrationDecoder({ directSlug: true });
if (plainOnlyMigration instanceof Error) throw plainOnlyMigration;
plainOnlyMigration.uuidSlugToString("AAAAAAAAcACAAAAAAAAAAA", "direct-slug");
// @ts-expect-error This reader was not configured to accept the original masked format.
plainOnlyMigration.uuidSlugToString("AAAAAAAAcACAAAAAAAAAAA", "original-mask");
const currentOnlyMigration = codec.createMigrationDecoder();
if (currentOnlyMigration instanceof Error) throw currentOnlyMigration;
// @ts-expect-error A current-only reader cannot select a disabled historical format.
currentOnlyMigration.uuidSlugToString("AAAAAAAAcACAAAAAAAAAAA", "direct-slug");
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
  maskedFromBytes,
  decodedMaskedBytes,
  decodedMaskedInto,
  checkedBinary,
  checkedV4Binary,
];
const publicSlugResult = codec.generateUuidSlug();
expectType<UuidV7CodecSlug | UuidSlugError>()(publicSlugResult);
if (publicSlugResult instanceof Error) throw publicSlugResult;
const publicSlug: UuidV7CodecSlug = publicSlugResult;
// @ts-expect-error A masked-or-sentinel result is not always a canonical direct UUID slug.
const directPublicSlug: UuidSlug = publicSlug;
// @ts-expect-error A possibly masked slug must be decoded by the codec that owns its key.
uuidSlugToBytes(publicSlug);
// @ts-expect-error Supplying storage must not bypass codec-owned masked decoding.
uuidSlugToBytes(publicSlug, destination);
// @ts-expect-error A possibly masked slug must be decoded by the codec that owns its key.
uuidSlugToString(publicSlug);
// @ts-expect-error Masked timestamp validation requires the codec that owns the key.
validateUuidV7SlugTimestamp(publicSlug, { maxTimestampDeltaMs: 0 });
const uncheckedPublicSlug: string = publicSlug;
const checkedPublicSlugResult = codec.validateUuidSlugTimestamp(uncheckedPublicSlug, {
  maxTimestampDeltaMs: 0,
});
expectType<UuidV7CodecSlug | UuidSlugError>()(checkedPublicSlugResult);
if (checkedPublicSlugResult instanceof Error) throw checkedPublicSlugResult;
const checkedPublicSlug: UuidV7CodecSlug = checkedPublicSlugResult;
codec.uuidStringToSlug("019ff19b-58b8-7000-9b1b-df713bd5562c");
// @ts-expect-error A plain slug does not carry the masked brand.
const masked: MaskedUuidV7Slug = plain;
// @ts-expect-error A v7 slug is not a v4 slug.
const v4: UuidV4Slug = plain;
// @ts-expect-error A generated public slug may be a raw sentinel.
const onlyMasked: MaskedUuidV7Slug = publicSlug;
// @ts-expect-error A known masked slug must be decoded by its codec.
uuidSlugToBytes(onlyMasked);
// @ts-expect-error A known masked slug requires codec-owned timestamp validation.
validateUuidV7SlugTimestamp(onlyMasked, { maxTimestampDeltaMs: 0 });
void [checkedPublicSlug, directPublicSlug, masked, v4, onlyMasked];

const timestampWindow: UuidV7TimestampWindow = { maxTimestampDeltaMs: 0 };
// @ts-expect-error Validation options are captured input, not mutable package state.
timestampWindow.maxTimestampDeltaMs = 1;

const maskOptions: AsyncUuidV7MaskOptions = {
  seed: "consumer-mask-seed",
  signal: new AbortController().signal,
};
const pendingMask: Promise<UuidV7Mask | UuidSlugError> = createUuidV7MaskAsync(maskOptions);
// @ts-expect-error A pending mask cannot be used as a codec key before awaiting its result.
createUuidV7SlugCodec({ mask: pendingMask });
void pendingMask;

// @ts-expect-error Public generators always use the package's cryptographic runtime source.
createUuidV7Generator({ fillRandom: (bytes: Uint8Array) => bytes.fill(0) });

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
  _RemovedPublicSlug,
];
void internalTypes;
