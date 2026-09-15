// SPDX-License-Identifier: Apache-2.0

import { BASE64URL_NAME } from "./alphabet.ts";
import { checkByteRange, INVALID_OPTIONS, UuidSlugError } from "./errors.ts";
import type { SlugAlphabet } from "./slug.ts";
import { decodeKeylessUuid, extractUuidV7Payload, uuidBytesToPlainSlug } from "./slug.ts";
import {
  UUID_TEXT_LOWERCASE,
  UUID_VARIANT_FUTURE,
  UUID_VARIANT_MICROSOFT,
  UUID_VARIANT_NCS,
  UUID_VARIANT_RFC,
} from "./types.ts";
import type {
  KeylessUuidInput,
  MaskedOrSentinelUuidV7Slug,
  PlainUuidSlugForVersion,
  Uuid,
  UuidBytesForVersion,
  UuidInput,
  UuidInspection,
  UuidStringForVersion,
  UuidTextCase,
  UuidV7MaskingCodec,
  UuidV7Payload,
  UuidV7PayloadLayout,
  UuidVariant,
  UuidVersion,
  UuidVersionOf,
} from "./types.ts";
import {
  bytesToUuidString,
  invalidUuidTextCase,
  isUuidTextCase,
  uuidTimestampFromBytesUnchecked,
  uuidVersion,
} from "./uuid.ts";
import { localUuidValueState, registerUuidValue, UUID_VALUE_BYTES } from "./uuid-value-protocol.ts";

const MASKING_CODEC_REQUIRED = "A masking codec is required for masked UUID output.";
const PAYLOAD_LAYOUT_REQUIRED = "A UUIDv7 payload layout is required.";

function variantOf(bytes: Uint8Array): UuidVariant {
  const field = bytes[8] as number;
  if ((field & 0x80) === 0) return UUID_VARIANT_NCS;
  if ((field & 0xc0) === 0x80) return UUID_VARIANT_RFC;
  return (field & 0xe0) === 0xc0 ? UUID_VARIANT_MICROSOFT : UUID_VARIANT_FUTURE;
}

class ParsedUuidValue<
  Version extends UuidVersion,
  HasMaskingCodec extends boolean,
  HasPayloadLayout extends boolean,
> implements Uuid<Version, HasMaskingCodec, HasPayloadLayout> {
  get version(): Version {
    return uuidVersion(localUuidValueState(this)!.bytes, 0) as Version;
  }

  inspect(): UuidInspection<Version> {
    const { bytes } = localUuidValueState(this)!;
    const version = uuidVersion(bytes, 0);
    const variant = variantOf(bytes);
    let isNil = true;
    let isMax = true;
    for (let index = 0; index < 16; index += 1) {
      const byte = bytes[index];
      isNil &&= byte === 0;
      isMax &&= byte === 255;
    }
    return Object.freeze({
      uuid: bytesToUuidString(bytes) as UuidStringForVersion<Version, typeof UUID_TEXT_LOWERCASE>,
      version: version as Version,
      variant,
      unixMs:
        version === 7 && variant === UUID_VARIANT_RFC
          ? uuidTimestampFromBytesUnchecked(bytes, 0)
          : undefined,
      isNil,
      isMax,
    });
  }

  toString<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
    textCase?: Case,
  ): UuidStringForVersion<Version, Case>;
  toString(
    textCase: unknown = UUID_TEXT_LOWERCASE,
  ): UuidStringForVersion<Version, UuidTextCase> | UuidSlugError {
    if (!isUuidTextCase(textCase)) return invalidUuidTextCase();
    return bytesToUuidString(localUuidValueState(this)!.bytes, textCase) as UuidStringForVersion<
      Version,
      UuidTextCase
    >;
  }

  toBytes(): UuidBytesForVersion<Version>;
  toBytes<Output extends Uint8Array>(output: Output, outputOffset?: number): Output | UuidSlugError;
  toBytes(output?: Uint8Array, outputOffset = 0): Uint8Array | UuidSlugError {
    const { bytes } = localUuidValueState(this)!;
    if (!output) return new Uint8Array(bytes);
    const badRange = checkByteRange(output, outputOffset, 16);
    if (badRange) return badRange;
    output.set(bytes, outputOffset);
    return output;
  }

  toPlainSlug(alphabet: SlugAlphabet = BASE64URL_NAME): PlainUuidSlugForVersion<Version> {
    return uuidBytesToPlainSlug(
      localUuidValueState(this)!.bytes,
      alphabet,
    ) as PlainUuidSlugForVersion<Version>;
  }

  toMaskedSlug(
    ...codecArgument: HasMaskingCodec extends true
      ? readonly [maskingCodec?: UuidV7MaskingCodec]
      : readonly [maskingCodec: UuidV7MaskingCodec]
  ): MaskedOrSentinelUuidV7Slug | UuidSlugError {
    const state = localUuidValueState(this)!;
    const codec = codecArgument[0] ?? state.maskingCodec;
    return codec
      ? codec.uuidToMaskedSlug(state.bytes)
      : new UuidSlugError(INVALID_OPTIONS, MASKING_CODEC_REQUIRED);
  }

  extractV7Payload(
    ...layoutArgument: HasPayloadLayout extends true
      ? readonly [payloadLayout?: UuidV7PayloadLayout]
      : readonly [payloadLayout: UuidV7PayloadLayout]
  ): UuidV7Payload | UuidSlugError {
    const state = localUuidValueState(this)!;
    const layout = layoutArgument[0] ?? state.payloadLayout;
    return layout
      ? extractUuidV7Payload(state.bytes, layout)
      : new UuidSlugError(INVALID_OPTIONS, PAYLOAD_LAYOUT_REQUIRED);
  }

  toJSON(): UuidStringForVersion<Version, typeof UUID_TEXT_LOWERCASE> {
    return bytesToUuidString(localUuidValueState(this)!.bytes) as UuidStringForVersion<
      Version,
      typeof UUID_TEXT_LOWERCASE
    >;
  }

  [UUID_VALUE_BYTES](): Uint8Array {
    return this.toBytes();
  }
}

Object.freeze(ParsedUuidValue.prototype);

/** Build an immutable parsed UUID from validated package-owned bytes. */
export function createUuidValue<
  Version extends UuidVersion = UuidVersion,
  HasMaskingCodec extends boolean = false,
  HasPayloadLayout extends boolean = false,
>(
  bytes: Uint8Array,
  maskingCodec?: UuidV7MaskingCodec,
  payloadLayout?: UuidV7PayloadLayout,
): Uuid<Version, HasMaskingCodec, HasPayloadLayout> {
  const value = new ParsedUuidValue<Version, HasMaskingCodec, HasPayloadLayout>();
  registerUuidValue(value, {
    bytes,
    ...(maskingCodec ? { maskingCodec } : {}),
    ...(payloadLayout ? { payloadLayout: Object.freeze({ ...payloadLayout }) } : {}),
  });
  return Object.freeze(value);
}

/** Parse any keyless UUID form once into an immutable reusable UUID value. */
export function parseUuid<Input extends UuidInput>(
  uuid: KeylessUuidInput<Input>,
): Uuid<UuidVersionOf<Input>> | UuidSlugError;
/** Parse through a masking codec and retain that codec for later masked conversions. */
export function parseUuid<Input extends UuidInput>(
  uuid: Input,
  maskingCodec: UuidV7MaskingCodec,
): Uuid<UuidVersionOf<Input>, true> | UuidSlugError;
export function parseUuid(uuid: unknown, maskingCodec?: UuidV7MaskingCodec): Uuid | UuidSlugError {
  const existing = localUuidValueState(uuid);
  if (existing && (!maskingCodec || existing.maskingCodec === maskingCodec)) return uuid as Uuid;
  let parsed: Uint8Array | UuidSlugError;
  if (!maskingCodec) parsed = decodeKeylessUuid(uuid);
  else {
    let decode: unknown;
    try {
      decode = maskingCodec.uuidToBytes;
    } catch (cause) {
      return new UuidSlugError(INVALID_OPTIONS, "Reading masking codec failed.", { cause });
    }
    if (typeof decode !== "function")
      return new UuidSlugError(INVALID_OPTIONS, "maskingCodec must be a UUIDv7 masking codec.");
    try {
      parsed = Reflect.apply(decode, undefined, [uuid]);
    } catch (cause) {
      return new UuidSlugError(INVALID_OPTIONS, "Masking codec UUID parsing failed.", { cause });
    }
  }
  if (parsed instanceof Error) return parsed;
  return createUuidValue(new Uint8Array(parsed), maskingCodec, existing?.payloadLayout);
}

/** Parse with the supplied masking codec preset by an owner method. */
export function parseUuidWithCodec<Input extends UuidInput>(
  uuid: Input,
  maskingCodec: UuidV7MaskingCodec,
): Uuid<UuidVersionOf<Input>, true> | UuidSlugError {
  return parseUuid(uuid, maskingCodec);
}
