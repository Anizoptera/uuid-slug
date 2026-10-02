// SPDX-License-Identifier: Apache-2.0

import { BASE32HEX, BASE64URL, BASE64URL_NAME, isEncoded } from "./alphabet.ts";
import {
  checkByteRange,
  INVALID_OPTIONS,
  INVALID_UUID_VERSION,
  isUint8Array,
  isUuidSlugError,
  UuidSlugError,
} from "./errors.ts";
import { isLocalMaskingCodec } from "./masking-codec-protocol.ts";
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
  isUuidV7Bytes,
  resolveUuidTextCase,
  uuidTimestampFromBytesUnchecked,
  uuidVersion,
} from "./uuid.ts";
import { LocalUuidValue, UUID_VALUE_BYTES } from "./uuid-value-protocol.ts";

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
>
  extends LocalUuidValue
  implements Uuid<Version, HasMaskingCodec, HasPayloadLayout>
{
  get version(): Version {
    return uuidVersion(LocalUuidValue.ownBytes(this), 0) as Version;
  }

  inspect(): UuidInspection<Version> {
    const bytes = LocalUuidValue.ownBytes(this);
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
    const selectedCase = resolveUuidTextCase(textCase);
    if (selectedCase instanceof Error) return selectedCase;
    return bytesToUuidString(LocalUuidValue.ownBytes(this), selectedCase) as UuidStringForVersion<
      Version,
      UuidTextCase
    >;
  }

  toBytes(): UuidBytesForVersion<Version>;
  toBytes<Output extends Uint8Array>(output: Output, outputOffset?: number): Output | UuidSlugError;
  toBytes(output?: Uint8Array, outputOffset = 0): Uint8Array | UuidSlugError {
    const bytes = LocalUuidValue.ownBytes(this);
    if (!output) return new Uint8Array(bytes);
    const badRange = checkByteRange(output, outputOffset, 16);
    if (badRange) return badRange;
    output.set(bytes, outputOffset);
    return output;
  }

  toPlainSlug(alphabet: SlugAlphabet = BASE64URL_NAME): PlainUuidSlugForVersion<Version> {
    return uuidBytesToPlainSlug(
      LocalUuidValue.ownBytes(this),
      alphabet,
    ) as PlainUuidSlugForVersion<Version>;
  }

  toMaskedSlug(
    ...codecArgument: HasMaskingCodec extends true
      ? readonly [maskingCodec?: UuidV7MaskingCodec]
      : readonly [maskingCodec: UuidV7MaskingCodec]
  ): MaskedOrSentinelUuidV7Slug | UuidSlugError {
    const bytes = LocalUuidValue.ownBytes(this);
    const codec = codecArgument[0] ?? LocalUuidValue.ownMaskingCodec(this);
    if (!codec) return new UuidSlugError(INVALID_OPTIONS, MASKING_CODEC_REQUIRED);
    if (isLocalMaskingCodec(codec)) return codec.uuidToMaskedSlug(bytes);
    if (!isUuidV7Bytes(bytes))
      return new UuidSlugError(
        INVALID_UUID_VERSION,
        "Masked output requires RFC-variant UUIDv7 bytes.",
      );
    try {
      const encode = codec.uuidToMaskedSlug;
      if (typeof encode !== "function")
        return new UuidSlugError(INVALID_OPTIONS, MASKING_CODEC_REQUIRED);
      // A callback may keep its argument beyond this call; freezing the UUID does not freeze bytes.
      const result: unknown = Reflect.apply(encode, undefined, [new Uint8Array(bytes)]);
      if (isUuidSlugError(result)) return result;
      if (
        typeof result === "string" &&
        (isEncoded(result, BASE64URL, 16, false, 4) ||
          isEncoded(result, BASE32HEX, 16, false, 4) ||
          isEncoded(result, BASE32HEX, 16))
      )
        return result as MaskedOrSentinelUuidV7Slug;
      return new UuidSlugError(
        INVALID_OPTIONS,
        "Masking codec must return a canonical masked slug or sentinel.",
      );
    } catch (cause) {
      return new UuidSlugError(INVALID_OPTIONS, "Masking codec UUID encoding failed.", { cause });
    }
  }

  extractV7Payload(
    ...layoutArgument: HasPayloadLayout extends true
      ? readonly [payloadLayout?: UuidV7PayloadLayout]
      : readonly [payloadLayout: UuidV7PayloadLayout]
  ): UuidV7Payload | UuidSlugError {
    const bytes = LocalUuidValue.ownBytes(this);
    const layout = layoutArgument[0] ?? LocalUuidValue.ownPayloadLayout(this);
    return layout
      ? extractUuidV7Payload(bytes, layout)
      : new UuidSlugError(INVALID_OPTIONS, PAYLOAD_LAYOUT_REQUIRED);
  }

  toJSON(): UuidStringForVersion<Version, typeof UUID_TEXT_LOWERCASE> {
    return bytesToUuidString(LocalUuidValue.ownBytes(this)) as UuidStringForVersion<
      Version,
      typeof UUID_TEXT_LOWERCASE
    >;
  }

  [UUID_VALUE_BYTES](): Uint8Array {
    return this.toBytes();
  }
}

Object.freeze(ParsedUuidValue.prototype);
Object.freeze(LocalUuidValue.prototype);

/**
 * Build an immutable parsed UUID. The value keeps `bytes` and `payloadLayout` without copying, so
 * both must be package-owned: nothing may write the bytes, and no caller may reach the layout.
 */
export function createUuidValue<
  Version extends UuidVersion = UuidVersion,
  HasMaskingCodec extends boolean = false,
  HasPayloadLayout extends boolean = false,
>(
  bytes: Uint8Array,
  maskingCodec?: UuidV7MaskingCodec,
  payloadLayout?: UuidV7PayloadLayout,
): Uuid<Version, HasMaskingCodec, HasPayloadLayout> {
  return Object.freeze(
    new ParsedUuidValue<Version, HasMaskingCodec, HasPayloadLayout>(
      bytes,
      maskingCodec,
      payloadLayout,
    ),
  );
}

/** Parse any keyless UUID form once into an immutable reusable UUID value. */
export function parseUuid<Input extends UuidInput>(
  uuid: KeylessUuidInput<Input>,
): Uuid<UuidVersionOf<Input>> | UuidSlugError;
/**
 * Parse through a masking codec and retain that codec for later masked conversions.
 * External codec bytes are validated and copied. Malformed results return `invalid_options`;
 * thrown exceptions remain available as the error's `cause`.
 */
export function parseUuid<Input extends UuidInput>(
  uuid: Input,
  maskingCodec: UuidV7MaskingCodec,
): Uuid<UuidVersionOf<Input>, true> | UuidSlugError;
export function parseUuid(uuid: unknown, maskingCodec?: UuidV7MaskingCodec): Uuid | UuidSlugError {
  const existing = LocalUuidValue.is(uuid) ? uuid : undefined;
  if (existing && (!maskingCodec || LocalUuidValue.ownMaskingCodec(existing) === maskingCodec))
    return uuid as Uuid;
  let parsed: Uint8Array | UuidSlugError;
  if (!maskingCodec) parsed = decodeKeylessUuid(uuid);
  else {
    const localCodec = isLocalMaskingCodec(maskingCodec);
    if (!localCodec && isUuidSlugError(uuid)) return uuid;
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
      if (isUint8Array(parsed) && parsed.length === 16) {
        if (!localCodec) parsed = new Uint8Array(parsed);
      } else if (!isUuidSlugError(parsed))
        return new UuidSlugError(
          INVALID_OPTIONS,
          "Masking codec must return exactly 16 UUID bytes.",
        );
    } catch (cause) {
      return new UuidSlugError(INVALID_OPTIONS, "Masking codec UUID parsing failed.", { cause });
    }
  }
  if (isUuidSlugError(parsed)) return parsed;
  // Text decoders and local codecs own fresh bytes; external codec storage was isolated above.
  return createUuidValue(
    maskingCodec || typeof uuid === "string" ? parsed : new Uint8Array(parsed),
    maskingCodec,
    existing ? LocalUuidValue.ownPayloadLayout(existing) : undefined,
  );
}

/** Parse with the supplied masking codec preset by an owner method. */
export function parseUuidWithCodec<Input extends UuidInput>(
  uuid: Input,
  maskingCodec: UuidV7MaskingCodec,
): Uuid<UuidVersionOf<Input>, true> | UuidSlugError {
  return parseUuid(uuid, maskingCodec);
}
