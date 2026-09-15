import {
  BASE32HEX,
  BASE64URL,
  bytesToUuidString,
  UUID_TEXT_LOWERCASE,
  UUID_TEXT_UPPERCASE,
  MAX_MASKED_UUID_V7_TIMESTAMP_OFFSET_MS,
  MAX_UUID,
  NIL_UUID,
  createCustomUuidV7Mask,
  deriveUuidV7Mask,
  deriveUuidV7MaskAsync,
  createUuidV7Generator,
  createUuidV7GeneratorWithRandomFill,
  createUuidV7MaskingCodec,
  SEEDED_MASK_FORMAT,
  PLAIN_SLUG_FORMAT,
  extractUuidV7Payload,
  extractUuidV7UnixMs,
  extractUuidVersion,
  parseUuid,
  uuidBytesToPlainSlug,
  isUuidBytes,
  isPlainUuidSlug,
  isUuidSlugError,
  isUuidString,
  isUuidText,
  isUuidV4Bytes,
  isPlainUuidV4Slug,
  isUuidV4String,
  isUuidV4Text,
  isUuidV7Bytes,
  isPlainUuidV7Slug,
  isUuidV7String,
  isUuidV7Text,
  INVALID_BUFFER,
  FIXED_MASK_FORMAT,
  uuidStringToBytes,
  plainSlugToUuidBytes,
  UUID_V7_TEST_MASK,
  uuidToString,
  uuidToBytes,
  uuidToPlainSlug,
  generateUuidV4,
  generateUuidV4WithRandomFill,
  validatePlainUuidV7SlugUnixMs,
  validateUuidV7StringUnixMs,
  uuidStringToPlainSlug,
  UuidSlugError,
  generateUuidV4Bytes,
  generatePlainUuidV4Slug,
  generateUuidV7Bytes,
  generateUuidV7,
  generateUuidV7Value,
  uuidV7StringBounds,
  uuidV7ByteBounds,
  generatePlainUuidV7Slug,
  generateUuidV7WithPlainSlug,
  UUID_V7_ROLLBACK_ERROR,
  UUID_V7_ROLLBACK_PRESERVE,
  UUID_V7_ROLLBACK_RESET,
} from "@anizoptera/uuid-slug";

expectType<number>()(MAX_MASKED_UUID_V7_TIMESTAMP_OFFSET_MS);
expectType<UuidString>()(NIL_UUID);
expectType<UuidString>()(MAX_UUID);
import type * as UuidSlugApi from "@anizoptera/uuid-slug";
import type {
  AsyncUuidV7MaskOptions,
  UppercaseUuidString,
  UppercaseUuidV4String,
  UppercaseUuidV7String,
  GeneratedUuidV7,
  GeneratePlainUuidV7SlugOptions,
  GenerateUuidV7BytesIntoOptions,
  GenerateUuidV7BytesOptions,
  GenerateUuidV7Options,
  GenerateUuidV7WithMaskedSlugOptions,
  GenerateUuidV7WithPlainSlugOptions,
  UuidV7TimestampWindow,
  UuidV7Mask,
  MaskedUuidV7Slug,
  MaskedOrSentinelUuidV7Slug,
  UuidBytes,
  UuidByteInput,
  PlainUuidSlug,
  PlainUuidV4Slug,
  UuidV4Bytes,
  UuidV4String,
  PlainUuidV7Slug,
  UuidV7Bytes,
  UuidV7Bounds,
  UuidV7String,
  UuidV7Text,
  UuidV7Generator,
  UuidV7MaskingCodec,
  UuidV7Payload,
  UuidV7PayloadLayout,
  UuidString,
  UuidVersion,
  Uuid,
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
type IsAssignable<Source, Target> = [Source] extends [Target] ? true : false;
type HasPublicExport<Name extends PropertyKey> = Name extends keyof typeof UuidSlugApi
  ? true
  : false;
declare function expectType<Expected>(): <Actual>(
  actual: IsExact<Actual, Expected> extends true ? Actual : never,
) => void;
declare const untypedValue: ReturnType<typeof JSON.parse>;
// @ts-expect-error Exact assertions must reject `any` or every inferred result can pass unchecked.
expectType<string>()(untypedValue);

declare const generator: UuidV7Generator;

// The emitted declarations must infer strict brands without requiring branded inputs.
const plainResult = generatePlainUuidV7Slug();
expectType<PlainUuidV7Slug | UuidSlugError>()(plainResult);
expectType<GeneratedUuidV7<PlainUuidV7Slug> | UuidSlugError>()(generateUuidV7WithPlainSlug());
if (plainResult instanceof Error) throw plainResult;
const plainSlug: PlainUuidV7Slug = plainResult;
// @ts-expect-error Unchecked bytes are not a validated UUID payload.
const uncheckedBytes: UuidBytes = new Uint8Array(16);
// @ts-expect-error Unchecked text is not a validated UUIDv7 string.
const uncheckedUuid: UuidV7String = "019ff19b-58b8-7000-9b1b-df713bd5562c";
const parsedBytes = uuidStringToBytes("019ff19b-58b8-7000-9b1b-df713bd5562c");
expectType<UuidBytes | UuidSlugError>()(parsedBytes);
expectType<PlainUuidV7Slug | UuidSlugError>()(uuidStringToPlainSlug(generateUuidV7()));
expectType<UuidV7String | UuidSlugError>()(uuidToString(uuidStringToPlainSlug(generateUuidV7())));
expectType<PlainUuidSlug | UuidSlugError>()(
  uuidBytesToPlainSlug(uuidStringToBytes(generateUuidV7())),
);
expectType<UuidString | UuidSlugError>()(
  bytesToUuidString(plainSlugToUuidBytes(uuidStringToPlainSlug(generateUuidV7()))),
);
if (parsedBytes instanceof Error) throw parsedBytes;
const storedBytes: UuidBytes = parsedBytes;
const bufferInput: UuidByteInput = new Uint8Array(parsedBytes).buffer;
const viewInput: UuidByteInput = new DataView(new Uint8Array(parsedBytes).buffer);
expectType<UuidString | UuidSlugError>()(bytesToUuidString(bufferInput));
expectType<PlainUuidSlug | UuidSlugError>()(uuidBytesToPlainSlug(viewInput));
expectType<UuidBytes | UuidSlugError>()(uuidToBytes(viewInput));
expectType<number | UuidSlugError>()(extractUuidV7UnixMs(viewInput));
const directlySelectedAlphabet: PlainUuidSlug | UuidSlugError = uuidBytesToPlainSlug(
  parsedBytes,
  BASE32HEX,
);
const namedBase64url: "base64url" = BASE64URL;
const namedInvalidBuffer: "invalid_buffer" = INVALID_BUFFER;
const namedError = new UuidSlugError(INVALID_BUFFER, "Caller buffer is too short.");
void [namedBase64url, namedInvalidBuffer, namedError];
expectType<boolean>()(isUuidSlugError(namedError));
expectType<boolean>()(isUuidString("019ff19b-58b8-7000-9b1b-df713bd5562c"));
expectType<boolean>()(isUuidText("019FF19B58B870009B1BDF713BD5562C"));
expectType<boolean>()(isUuidV4String("00000000-0000-4000-8000-000000000000"));
expectType<boolean>()(isUuidV4Text("00000000000040008000000000000000"));
expectType<boolean>()(isUuidV7Text("019FF19B58B870009B1BDF713BD5562C"));
expectType<boolean>()(isPlainUuidSlug("AZ_xnLf5cACbG99xO9VWLw"));
expectType<boolean>()(isPlainUuidV4Slug("AAAAAAAAQACAAAAAAAAAAA"));
expectType<boolean>()(isPlainUuidV7Slug("AZ_xnLf5cACbG99xO9VWLw"));
expectType<boolean>()(isUuidV7Bytes(parsedBytes));
const externalUuid: unknown = "019ff19b-58b8-7000-9b1b-df713bd5562c";
if (!isUuidV7String(externalUuid)) throw new Error("Expected a UUIDv7 string.");
const checkedUuid: UuidV7Text = externalUuid;
const checkedUuidBytes = uuidStringToBytes(checkedUuid);
if (checkedUuidBytes instanceof Error) throw checkedUuidBytes;
const versionedBytes: UuidV7Bytes = checkedUuidBytes;
const formattedUuid = bytesToUuidString(versionedBytes);
expectType<UuidString | UuidSlugError>()(bytesToUuidString(versionedBytes, UUID_TEXT_LOWERCASE));
expectType<UppercaseUuidString | UuidSlugError>()(
  bytesToUuidString(versionedBytes, UUID_TEXT_UPPERCASE),
);
if (formattedUuid instanceof Error) throw formattedUuid;
// @ts-expect-error Mutable bytes may no longer contain the version their stale brand records.
const versionedUuid: UuidV7String = formattedUuid;
const convertedSlug = uuidStringToPlainSlug(checkedUuid);
if (convertedSlug instanceof Error) throw convertedSlug;
const versionedSlug: PlainUuidV7Slug = convertedSlug;
const parsedValue = parseUuid(versionedSlug);
if (parsedValue instanceof Error) throw parsedValue;
expectType<Uuid<7>>()(parsedValue);
expectType<UuidV7String>()(parsedValue.toString());
expectType<UppercaseUuidV7String>()(parsedValue.toString(UUID_TEXT_UPPERCASE));
expectType<UuidV7Bytes>()(parsedValue.toBytes());
expectType<PlainUuidV7Slug>()(parsedValue.toPlainSlug());
expectType<UuidV7String>()(parsedValue.inspect().uuid);
expectType<7>()(parsedValue.inspect().version);
// @ts-expect-error An unbound UUID requires a masking codec for masked output.
parsedValue.toMaskedSlug();
// @ts-expect-error A UUID without a generated layout requires an explicit payload layout.
parsedValue.extractV7Payload();
expectType<UppercaseUuidV7String | UuidSlugError>()(
  uuidToString(versionedSlug, UUID_TEXT_UPPERCASE),
);
expectType<number | UuidSlugError>()(extractUuidV7UnixMs(checkedUuid));
const payloadLayout: UuidV7PayloadLayout = {
  subMillisecondFractionBits: 12,
  counterBits: 30,
};
expectType<UuidV7Payload | UuidSlugError>()(parsedValue.extractV7Payload(payloadLayout));
expectType<UuidV7Payload | UuidSlugError>()(extractUuidV7Payload(checkedUuid, payloadLayout));
expectType<number | UuidSlugError>()(extractUuidV7UnixMs(versionedSlug));
// @ts-expect-error Known slug text cannot enter a UUID text operation.
uuidStringToBytes(versionedSlug);
// @ts-expect-error UUID timestamp validation accepts UUID text, not known slug text.
validateUuidV7StringUnixMs(versionedSlug, { maxTimestampDeltaMs: 0 });
const convertedUuid = uuidToString(versionedSlug);
if (convertedUuid instanceof Error) throw convertedUuid;
const roundTripUuid: UuidV7String = convertedUuid;
const parsedSlugBytes = plainSlugToUuidBytes(versionedSlug);
if (parsedSlugBytes instanceof Error) throw parsedSlugBytes;
const versionedSlugBytes: UuidV7Bytes = parsedSlugBytes;
expectType<UuidV7Bytes | UuidSlugError>()(uuidToBytes(versionedSlug));
expectType<PlainUuidV7Slug | UuidSlugError>()(uuidToPlainSlug(versionedSlugBytes));
expectType<UppercaseUuidV7String | UuidSlugError>()(
  uuidToString(versionedSlugBytes, UUID_TEXT_UPPERCASE),
);
expectType<number | UuidSlugError>()(extractUuidV7UnixMs(versionedSlugBytes));
// @ts-expect-error Known UUID text cannot enter a slug text operation.
plainSlugToUuidBytes(checkedUuid);
// @ts-expect-error Slug timestamp validation accepts slug text, not known UUID text.
validatePlainUuidV7SlugUnixMs(checkedUuid, { maxTimestampDeltaMs: 0 });
const formattedSlug = uuidBytesToPlainSlug(versionedSlugBytes);
if (formattedSlug instanceof Error) throw formattedSlug;
// @ts-expect-error Mutable bytes may no longer contain the version their stale brand records.
const roundTripSlug: PlainUuidV7Slug = formattedSlug;
class ConsumerBuffer extends Uint8Array {}
const destination = new ConsumerBuffer(32);
expectType<number | UuidSlugError>()(extractUuidV7UnixMs(destination, 8));
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
expectType<UppercaseUuidV7String | UuidSlugError>()(generator.generateUuidV7(UUID_TEXT_UPPERCASE));
expectType<UppercaseUuidV7String | UuidSlugError>()(
  generator.generateUuidV7({ at: 0, textCase: UUID_TEXT_UPPERCASE }),
);
expectType<ConsumerBuffer | UuidSlugError>()(
  generator.generateUuidV7Bytes({ at: 0, output: destination, outputOffset: 8 }),
);
const parsedInto: ConsumerBuffer | UuidSlugError = uuidStringToBytes(checkedUuid, destination, 8);
const parsedSlugInto: ConsumerBuffer | UuidSlugError = plainSlugToUuidBytes(
  plainSlug,
  destination,
  8,
);
// @ts-expect-error Supplying storage must not let known slug text enter a UUID text operation.
uuidStringToBytes(versionedSlug, destination);
// @ts-expect-error Supplying storage must not let known UUID text enter a slug text operation.
plainSlugToUuidBytes(checkedUuid, destination);
const v4Into: ConsumerBuffer | UuidSlugError = generateUuidV4Bytes(destination, 8);
const v7Into: ConsumerBuffer | UuidSlugError = generateUuidV7Bytes(destination, 8);
const v7AtInto: ConsumerBuffer | UuidSlugError = generateUuidV7Bytes({
  at: 0,
  output: destination,
  outputOffset: 8,
});
const ownedV4: UuidV4Bytes | UuidSlugError = generateUuidV4Bytes();
const ownedV7: UuidV7Bytes | UuidSlugError = generateUuidV7Bytes();
if (ownedV4 instanceof Error) throw ownedV4;
if (ownedV7 instanceof Error) throw ownedV7;
// @ts-expect-error A known UUIDv4 has no UUIDv7 timestamp.
extractUuidV7UnixMs(ownedV4);
const generatedV4Result = generateUuidV4();
expectType<UppercaseUuidV4String | UuidSlugError>()(generateUuidV4(UUID_TEXT_UPPERCASE));
expectType<UppercaseUuidV7String | UuidSlugError>()(generateUuidV7(UUID_TEXT_UPPERCASE));
expectType<UppercaseUuidV7String | UuidSlugError>()(
  generateUuidV7({ at: new Date(0), textCase: UUID_TEXT_UPPERCASE }),
);
expectType<UuidV7String | UuidSlugError>()(generateUuidV7({ generator }));
expectType<UuidV7Bytes | UuidSlugError>()(generateUuidV7Bytes({ generator }));
expectType<ConsumerBuffer | UuidSlugError>()(
  generateUuidV7Bytes({ generator, output: destination, outputOffset: 8 }),
);
// @ts-expect-error A generator method already owns its generator.
generator.generateUuidV7({ generator });
// @ts-expect-error A generator method already owns its generator.
generator.generateUuidV7Bytes({ generator });
expectType<PlainUuidV7Slug | UuidSlugError>()(
  generatePlainUuidV7Slug({ at: 0n, alphabet: BASE32HEX }),
);
expectType<UuidV7Bytes | UuidSlugError>()(generateUuidV7Bytes({ at: "1970-01-01T00:00:00Z" }));
expectType<ConsumerBuffer | UuidSlugError>()(
  generateUuidV7Bytes({ at: { epochMilliseconds: 0 }, output: destination, outputOffset: 8 }),
);
expectType<GeneratedUuidV7<PlainUuidV7Slug, typeof UUID_TEXT_UPPERCASE> | UuidSlugError>()(
  generateUuidV7WithPlainSlug({
    at: { seconds: 0n, nanoseconds: 0 },
    textCase: UUID_TEXT_UPPERCASE,
  }),
);
// @ts-expect-error An output offset has no meaning without caller-owned output storage.
generateUuidV7Bytes({ at: 0, outputOffset: 8 });
// @ts-expect-error A misspelled time option must not generate at the current clock reading.
generateUuidV7({ att: new Date(0) });
const uppercaseV7 = generateUuidV7("uppercase");
if (uppercaseV7 instanceof Error) throw uppercaseV7;
expectType<PlainUuidV7Slug | UuidSlugError>()(uuidStringToPlainSlug(uppercaseV7));
expectType<UppercaseUuidV7String | UuidSlugError>()(
  generateUuidV7({ at: 0, textCase: UUID_TEXT_UPPERCASE }),
);
expectType<UuidV7Bounds<UuidV7String> | UuidSlugError>()(uuidV7StringBounds(0));
expectType<UuidV7Bounds<UppercaseUuidV7String> | UuidSlugError>()(
  uuidV7StringBounds(0, UUID_TEXT_UPPERCASE),
);
expectType<UuidV7Bounds<UuidV7Bytes> | UuidSlugError>()(uuidV7ByteBounds(0, 1));
const uppercaseV4 = generateUuidV4("uppercase");
if (uppercaseV4 instanceof Error) throw uppercaseV4;
// @ts-expect-error A known uppercase UUIDv4 cannot enter UUIDv7 timestamp validation.
validateUuidV7StringUnixMs(uppercaseV4, { maxTimestampDeltaMs: 0 });
expectType<GeneratedUuidV7<PlainUuidV7Slug, typeof UUID_TEXT_UPPERCASE> | UuidSlugError>()(
  generateUuidV7WithPlainSlug(UUID_TEXT_UPPERCASE),
);
if (generatedV4Result instanceof Error) throw generatedV4Result;
const generatedV4 = generatedV4Result;
// @ts-expect-error UUIDv7 timestamp validation is undefined for a known UUIDv4.
validateUuidV7StringUnixMs(generatedV4, { maxTimestampDeltaMs: 0 });
expectType<UuidV7String | UuidSlugError>()(
  validateUuidV7StringUnixMs("019ff19b-58b8-7000-9b1b-df713bd5562c", {
    maxTimestampDeltaMs: 0,
  }),
);
expectType<UppercaseUuidV7String | UuidSlugError>()(
  validateUuidV7StringUnixMs(
    "019ff19b-58b8-7000-9b1b-df713bd5562c",
    { maxTimestampDeltaMs: 0 },
    UUID_TEXT_UPPERCASE,
  ),
);
const generatedV4SlugResult = generatePlainUuidV4Slug();
if (generatedV4SlugResult instanceof Error) throw generatedV4SlugResult;
const generatedV4Slug = generatedV4SlugResult;
// @ts-expect-error UUIDv7 timestamp validation is undefined for a known UUIDv4 slug.
validatePlainUuidV7SlugUnixMs(generatedV4Slug, { maxTimestampDeltaMs: 0 });
expectType<(PlainUuidV7Slug & "AZ_xnLf5cACbG99xO9VWLAAAAAAAAAAAAAAAAA") | UuidSlugError>()(
  validatePlainUuidV7SlugUnixMs("AZ_xnLf5cACbG99xO9VWLAAAAAAAAAAAAAAAAA", {
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
const codecResult = createUuidV7MaskingCodec({ mask: UUID_V7_TEST_MASK });
const customMask = createCustomUuidV7Mask({
  diagnosticLabel: "consumer-mask",
  mask: (bytes) => bytes,
  unmask: (bytes) => bytes,
});
expectType<UuidV7Mask | UuidSlugError>()(customMask);
expectType<UuidV7MaskingCodec | UuidSlugError>()(
  createUuidV7MaskingCodec({ mask: deriveUuidV7Mask({ seed: "composed" }) }),
);
if (codecResult instanceof Error) throw codecResult;
const codec = codecResult;
expectType<UuidV7MaskingCodec>()(codec);
const codecParsedValue = codec.parseUuid(codec.generateMaskedUuidV7Slug());
expectType<Uuid<7, true> | UuidSlugError>()(codecParsedValue);
const topLevelCodecValue = parseUuid(codec.generateMaskedUuidV7Slug(), codec);
expectType<Uuid<7, true> | UuidSlugError>()(topLevelCodecValue);
expectType<Uuid<7, false, true> | UuidSlugError>()(generator.generateUuidV7Value());
expectType<Uuid<7, true, true> | UuidSlugError>()(
  generator.generateUuidV7Value({ maskingCodec: codec }),
);
expectType<Uuid<7, true, true> | UuidSlugError>()(codec.generateUuidV7Value({ at: 0, generator }));
const generatedUuidValue = generateUuidV7Value({ at: 0, generator, maskingCodec: codec });
expectType<Uuid<7, true, true> | UuidSlugError>()(generatedUuidValue);
// @ts-expect-error UUIDv7 value options reject unrelated work.
generateUuidV7Value({ textCase: UUID_TEXT_UPPERCASE });
// @ts-expect-error A generator method already owns its generator.
generator.generateUuidV7Value({ generator });
// @ts-expect-error A masking-codec method already owns its masking codec.
codec.generateUuidV7Value({ maskingCodec: codec });
if (generatedUuidValue instanceof Error) throw generatedUuidValue;
expectType<MaskedOrSentinelUuidV7Slug | UuidSlugError>()(generatedUuidValue.toMaskedSlug());
expectType<UuidV7Payload | UuidSlugError>()(generatedUuidValue.extractV7Payload());
const parsedV4Value = parseUuid(versionedV4);
if (parsedV4Value instanceof Error) throw parsedV4Value;
// @ts-expect-error A UUID proved to be v4 cannot enter UUIDv7 masking.
codec.uuidToMaskedSlug(parsedV4Value);
// @ts-expect-error A parsed UUIDv4 cannot produce a masked UUIDv7 slug.
parsedV4Value.toMaskedSlug(codec);
// @ts-expect-error A parsed UUIDv4 has no UUIDv7 payload.
parsedV4Value.extractV7Payload(payloadLayout);
expectType<MaskedOrSentinelUuidV7Slug | UuidSlugError>()(codec.generateMaskedUuidV7Slug());
expectType<MaskedOrSentinelUuidV7Slug | UuidSlugError>()(
  codec.generateMaskedUuidV7Slug({ at: new Date(0), generator }),
);
expectType<GeneratedUuidV7<MaskedOrSentinelUuidV7Slug> | UuidSlugError>()(
  codec.generateUuidV7WithMaskedSlug(),
);
expectType<
  GeneratedUuidV7<MaskedOrSentinelUuidV7Slug, typeof UUID_TEXT_UPPERCASE> | UuidSlugError
>()(codec.generateUuidV7WithMaskedSlug(UUID_TEXT_UPPERCASE));
expectType<
  GeneratedUuidV7<MaskedOrSentinelUuidV7Slug, typeof UUID_TEXT_UPPERCASE> | UuidSlugError
>()(codec.generateUuidV7WithMaskedSlug({ generator, textCase: UUID_TEXT_UPPERCASE }));
expectType<PlainUuidV7Slug | UuidSlugError>()(
  generatePlainUuidV7Slug({ at: { epochNanoseconds: 1n }, generator }),
);
expectType<GeneratedUuidV7<PlainUuidV7Slug> | UuidSlugError>()(
  generateUuidV7WithPlainSlug({ at: { seconds: 0n, nanoseconds: 1n }, generator }),
);
// @ts-expect-error Representation generation requires a generator, not a lookalike callback bag.
generatePlainUuidV7Slug({ generator: { generateUuidV7Bytes: () => new Uint8Array(16) } });
// @ts-expect-error Masked pair options reject work unrelated to generation or text spelling.
codec.generateUuidV7WithMaskedSlug({ alphabet: BASE32HEX });
expectType<MaskedOrSentinelUuidV7Slug | UuidSlugError>()(codec.uuidToMaskedSlug(versionedBytes));
expectType<MaskedOrSentinelUuidV7Slug | UuidSlugError>()(
  codec.uuidToMaskedSlug(generateUuidV7Bytes()),
);
expectType<MaskedOrSentinelUuidV7Slug | UuidSlugError>()(
  codec.plainToMaskedUuidSlug(uuidStringToPlainSlug(generateUuidV7())),
);
expectType<PlainUuidV7Slug | UuidSlugError>()(
  codec.maskedToPlainUuidSlug(codec.generateMaskedUuidV7Slug()),
);
expectType<PlainUuidV7Slug | UuidSlugError>()(
  codec.maskedToPlainUuidSlug(codec.generateMaskedUuidV7Slug(), BASE32HEX),
);
expectType<PlainUuidV7Slug | UuidSlugError>()(
  codec.uuidToPlainSlug(codec.generateMaskedUuidV7Slug()),
);
expectType<UuidV7String | UuidSlugError>()(
  codec.uuidToString(codec.uuidToMaskedSlug(generateUuidV7())),
);
expectType<UuidV7Bytes | UuidSlugError>()(
  codec.uuidToBytes(codec.uuidToMaskedSlug(generateUuidV7())),
);
expectType<number | UuidSlugError>()(
  codec.extractMaskedUuidV7UnixMs(codec.uuidToMaskedSlug(generateUuidV7())),
);
expectType<UuidString | UuidSlugError>()(codec.uuidToString("AZ_xnLf5cACbG99xO9VWLw"));
expectType<UppercaseUuidString | UuidSlugError>()(
  codec.uuidToString("AZ_xnLf5cACbG99xO9VWLw", UUID_TEXT_UPPERCASE),
);
expectType<number | UuidSlugError>()(codec.extractMaskedUuidV7UnixMs("AZ_xnLf5cACbG99xO9VWLw"));
expectType<UuidBytes | UuidSlugError>()(codec.uuidToBytes("AZ_xnLf5cACbG99xO9VWLw"));
expectType<ConsumerBuffer | UuidSlugError>()(
  codec.uuidToBytes("AZ_xnLf5cACbG99xO9VWLw", destination, 8),
);
expectType<(MaskedOrSentinelUuidV7Slug & "AZ_xnLf5cACbG99xO9VWLw") | UuidSlugError>()(
  codec.validateMaskedUuidV7SlugUnixMs("AZ_xnLf5cACbG99xO9VWLw", { maxTimestampDeltaMs: 0 }),
);
// @ts-expect-error Removed codec methods are not part of the public interface.
codec.uuidV7MaskedSlug();
declare const removedCodecExports: readonly [
  HasPublicExport<"UuidSlugCodec">,
  HasPublicExport<"PublicUuidV7Slug">,
];
expectType<readonly [false, false]>()(removedCodecExports);
// @ts-expect-error Removed codec factories are not exported.
type _RemovedCodecFactory = (typeof import("@anizoptera/uuid-slug"))["createUuidSlugCodec"];
createUuidV7MaskingCodec({ mask: UUID_V7_TEST_MASK, maskedSlugAlphabet: BASE32HEX });
createUuidV7MaskingCodec({
  mask: UUID_V7_TEST_MASK,
  // @ts-expect-error The writer-only option names its output effect.
  slugAlphabet: "base32hex",
});
const maskedFromBytes = codec.uuidToMaskedSlug(versionedBytes);
expectType<MaskedOrSentinelUuidV7Slug | UuidSlugError>()(maskedFromBytes);
expectType<UuidV7Payload | UuidSlugError>()(
  codec.extractMaskedUuidV7Payload("AZ_xnLf5cACbG99xO9VWLw", payloadLayout),
);
const uuidTextOrBytes = (true as boolean) ? "019ff19b-58b8-7000-9b1b-df713bd5562c" : versionedBytes;
codec.uuidToMaskedSlug(uuidTextOrBytes);
const decodedMaskedBytes = codec.uuidToBytes("AZ_xnLf5cACbG99xO9VWLw");
expectType<UuidBytes | UuidSlugError>()(decodedMaskedBytes);
const decodedMaskedInto = codec.uuidToBytes("AZ_xnLf5cACbG99xO9VWLw", destination, 8);
expectType<ConsumerBuffer | UuidSlugError>()(decodedMaskedInto);
// @ts-expect-error UUIDv4 cannot enter UUIDv7-only masking.
codec.uuidToMaskedSlug(generatedV4);
// @ts-expect-error Known UUIDv4 bytes cannot enter UUIDv7-only masking.
codec.uuidToMaskedSlug(ownedV4);
const knownV4TextOrBytes = (true as boolean) ? generatedV4 : ownedV4;
// @ts-expect-error One known UUIDv4 member makes the whole input union invalid.
codec.uuidToMaskedSlug(knownV4TextOrBytes);
codec.uuidToMaskedSlug(versionedSlug);
// @ts-expect-error Plain input accepts plain slugs, not known UUID text.
codec.plainToMaskedUuidSlug(checkedUuid);
// @ts-expect-error Codec conversion accepts codec slugs, not known UUID text.
codec.maskedToPlainUuidSlug(checkedUuid);
codec.uuidToString(checkedUuid);
const boxedValidUuidString = new String("00000000-0000-0000-0000-000000000000");
// @ts-expect-error String wrapper objects are not primitive string inputs.
uuidToString(boxedValidUuidString);
// @ts-expect-error A masking codec also accepts primitive strings, not wrappers.
codec.uuidToString(boxedValidUuidString);
declare const arbitraryJavaScriptValue: unknown;
// @ts-expect-error Untyped JavaScript input must be narrowed before a typed call.
uuidToString(arbitraryJavaScriptValue);
// @ts-expect-error Untyped JavaScript input must be narrowed before a typed masking-codec call.
codec.uuidToString(arbitraryJavaScriptValue);
// @ts-expect-error Masked timestamp validation accepts slug text, not known UUID text.
codec.validateMaskedUuidV7SlugUnixMs(checkedUuid, { maxTimestampDeltaMs: 0 });
const knownSentinel = codec.sentinels[0]?.slug;
if (knownSentinel) {
  uuidToString(knownSentinel);
}
createUuidV7MaskingCodec({
  mask: UUID_V7_TEST_MASK,
  // @ts-expect-error Codec generation always uses the package's cryptographic runtime source.
  generateUuidV7Bytes: () => new Uint8Array(16),
});
const migration = codec.createUuidSlugMigrationDecoder({
  acceptFixedMask: true,
  acceptPlainSlug: true,
});
expectType<UuidSlugMigrationDecoder>()(migration);
// @ts-expect-error Migration readers accept encoded slug text, not known UUID text.
migration.uuidSlugToUuidString(checkedUuid);
// @ts-expect-error Candidate discovery accepts encoded slug text, not known UUID text.
migration.uuidSlugToUuidStringCandidates(checkedUuid);
const migrated: UuidString | UuidSlugError =
  migration.uuidSlugToUuidString("AAAAAAABcACAAAAAAAAAAA");
const candidates: readonly UuidString[] | UuidSlugError = migration.uuidSlugToUuidStringCandidates(
  "AAAAAAABcACAAAAAAAAAAA",
  FIXED_MASK_FORMAT,
);
expectType<UppercaseUuidString | UuidSlugError>()(
  migration.uuidSlugToUuidString("AAAAAAABcACAAAAAAAAAAA", UUID_TEXT_UPPERCASE),
);
expectType<readonly UppercaseUuidString[] | UuidSlugError>()(
  migration.uuidSlugToUuidStringCandidates(
    "AAAAAAABcACAAAAAAAAAAA",
    FIXED_MASK_FORMAT,
    UUID_TEXT_UPPERCASE,
  ),
);
const plainOnlyMigration = codec.createUuidSlugMigrationDecoder({ acceptPlainSlug: true });
plainOnlyMigration.uuidSlugToUuidString("AAAAAAAAcACAAAAAAAAAAA", PLAIN_SLUG_FORMAT);
// @ts-expect-error This reader was not configured to accept the original masked format.
plainOnlyMigration.uuidSlugToUuidString("AAAAAAAAcACAAAAAAAAAAA", FIXED_MASK_FORMAT);
const currentOnlyMigration = codec.createUuidSlugMigrationDecoder();
// @ts-expect-error Migration options state what input the reader accepts.
codec.createUuidSlugMigrationDecoder({ directSlug: true });
// @ts-expect-error A current-only reader cannot select a disabled historical format.
currentOnlyMigration.uuidSlugToUuidString("AAAAAAAAcACAAAAAAAAAAA", PLAIN_SLUG_FORMAT);
currentOnlyMigration.uuidSlugToUuidString("AAAAAAAAcACAAAAAAAAAAA", SEEDED_MASK_FORMAT);
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
const publicSlugResult = codec.generateMaskedUuidV7Slug();
expectType<MaskedOrSentinelUuidV7Slug | UuidSlugError>()(publicSlugResult);
if (publicSlugResult instanceof Error) throw publicSlugResult;
const publicSlug: MaskedOrSentinelUuidV7Slug = publicSlugResult;
// @ts-expect-error A masked-or-sentinel result is not always a canonical plain UUID slug.
const directPublicSlug: PlainUuidSlug = publicSlug;
// @ts-expect-error A possibly masked slug must be decoded by the codec that owns its key.
plainSlugToUuidBytes(publicSlug);
// @ts-expect-error Supplying storage must not bypass codec-owned masked decoding.
plainSlugToUuidBytes(publicSlug, destination);
// @ts-expect-error A possibly masked slug must be decoded by the codec that owns its key.
uuidToString(publicSlug);
// @ts-expect-error Masked timestamp validation requires the codec that owns the key.
validatePlainUuidV7SlugUnixMs(publicSlug, { maxTimestampDeltaMs: 0 });
const uncheckedPublicSlug: string = publicSlug;
const checkedPublicSlugResult = codec.validateMaskedUuidV7SlugUnixMs(uncheckedPublicSlug, {
  maxTimestampDeltaMs: 0,
});
expectType<MaskedOrSentinelUuidV7Slug | UuidSlugError>()(checkedPublicSlugResult);
if (checkedPublicSlugResult instanceof Error) throw checkedPublicSlugResult;
const checkedPublicSlug: MaskedOrSentinelUuidV7Slug = checkedPublicSlugResult;
codec.uuidToMaskedSlug("019ff19b-58b8-7000-9b1b-df713bd5562c");
declare const incompatibleSlugBrands: readonly [
  IsAssignable<PlainUuidV7Slug, MaskedUuidV7Slug>,
  IsAssignable<PlainUuidV7Slug, PlainUuidV4Slug>,
];
expectType<readonly [false, false]>()(incompatibleSlugBrands);
// @ts-expect-error A generated public slug may be a raw sentinel.
const onlyMasked: MaskedUuidV7Slug = publicSlug;
// @ts-expect-error A known masked slug must be decoded by its codec.
plainSlugToUuidBytes(onlyMasked);
// @ts-expect-error A known masked slug must be decoded before its UUID version can be read.
extractUuidVersion(onlyMasked);
// @ts-expect-error A known masked slug requires codec-owned timestamp validation.
validatePlainUuidV7SlugUnixMs(onlyMasked, { maxTimestampDeltaMs: 0 });
void [checkedPublicSlug, directPublicSlug, onlyMasked];

const timestampWindow: UuidV7TimestampWindow = { maxTimestampDeltaMs: 0 };
// @ts-expect-error Validation options are captured input, not mutable package state.
timestampWindow.maxTimestampDeltaMs = 1;

const maskOptions: AsyncUuidV7MaskOptions = {
  seed: "consumer-mask-seed",
  signal: new AbortController().signal,
};
const pendingMask: Promise<UuidV7Mask | UuidSlugError> = deriveUuidV7MaskAsync(maskOptions);
// @ts-expect-error A pending mask cannot be used as a codec key before awaiting its result.
createUuidV7MaskingCodec({ mask: pendingMask });
void pendingMask;

const deterministicFill = (bytes: Uint8Array) => {
  bytes.fill(0);
};
expectType<UuidV4String | UuidSlugError>()(generateUuidV4WithRandomFill(deterministicFill));
expectType<UppercaseUuidV4String | UuidSlugError>()(
  generateUuidV4WithRandomFill(deterministicFill, UUID_TEXT_UPPERCASE),
);
const customEntropyGenerator = createUuidV7GeneratorWithRandomFill(deterministicFill, {
  clockRollback: { action: UUID_V7_ROLLBACK_ERROR, toleranceMs: 0 },
});
expectType<UuidV7Generator | UuidSlugError>()(customEntropyGenerator);
if (customEntropyGenerator instanceof Error) throw customEntropyGenerator;
expectType<UuidV7PayloadLayout>()(customEntropyGenerator.payloadLayout);
expectType<UuidVersion | UuidSlugError>()(extractUuidVersion(versionedSlug));
void customEntropyGenerator;

createUuidV7Generator({ clockRollback: { action: UUID_V7_ROLLBACK_PRESERVE } });
createUuidV7Generator({ subMillisecondFractionBits: 12 });
expectType<UuidV7Generator | UuidSlugError>()(
  createUuidV7Generator({ subMillisecondFractionBits: 12 }),
);
createUuidV7Generator({
  clockRollback: { action: UUID_V7_ROLLBACK_RESET, toleranceMs: 0 },
});
// @ts-expect-error Preserve does not accept a tolerance because it never resets or fails.
createUuidV7Generator({ clockRollback: { action: UUID_V7_ROLLBACK_PRESERVE, toleranceMs: 0 } });
// @ts-expect-error Reset requires an explicit rollback tolerance.
createUuidV7Generator({ clockRollback: { action: UUID_V7_ROLLBACK_RESET } });

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
];
void internalTypes;

declare const reusableGenerationOptions: readonly [
  GenerateUuidV7Options,
  GeneratePlainUuidV7SlugOptions,
  GenerateUuidV7BytesOptions,
  GenerateUuidV7BytesIntoOptions<Uint8Array>,
  GenerateUuidV7WithPlainSlugOptions,
  GenerateUuidV7WithMaskedSlugOptions,
];
void reusableGenerationOptions;
