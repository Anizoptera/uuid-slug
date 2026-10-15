// SPDX-License-Identifier: Apache-2.0

import {
  BASE32HEX,
  BASE64URL,
  BASE64URL_NAME,
  encode as encodeUuidBytes,
  isEncoded,
} from "./alphabet.ts";
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
import { decodeKeylessUuid, extractUuidV7Payload, resolveSlugAlphabet } from "./slug.ts";
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
  ParsedUuidResult,
  Uuid,
  UuidBytesForVersion,
  UuidInput,
  UuidInspection,
  UuidStringForVersion,
  UuidOutput,
  UuidTextCase,
  UuidTextCaseArguments,
  UuidV7MaskingCodec,
  UuidV7Payload,
  UuidV7PayloadLayout,
  UuidVariant,
  UuidVersion,
} from "./types.ts";
import {
  formatUuidBytesUnchecked,
  isUuidV7Bytes,
  resolveUuidTextCase,
  uuidTimestampFromBytesUnchecked,
  uuidVersion,
} from "./uuid.ts";
import { LocalUuidValue, UUID_VALUE_BYTES, UUID_VALUE_CONTEXT } from "./uuid-value-protocol.ts";
import { readUuidV7PayloadLayout } from "./v7-payload.ts";

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
  // Private bytes are already a complete immutable UUID; public conversion would validate them
  // again. Resolve caller selectors, then use the same writers directly without caching spellings.
  // Revisit if private storage becomes mutable or borrowed; measurements live in bench/decisions.md.
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
      uuid: formatUuidBytesUnchecked(bytes) as UuidStringForVersion<
        Version,
        typeof UUID_TEXT_LOWERCASE
      >,
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
    ...textCase: UuidTextCaseArguments<Case>
  ): UuidStringForVersion<Version, Case>;
  toString(
    textCase: unknown = UUID_TEXT_LOWERCASE,
  ): UuidStringForVersion<Version, UuidTextCase> | UuidSlugError {
    const selectedCase = resolveUuidTextCase(textCase);
    if (selectedCase instanceof Error) return selectedCase;
    return formatUuidBytesUnchecked(
      LocalUuidValue.ownBytes(this),
      0,
      selectedCase,
    ) as UuidStringForVersion<Version, UuidTextCase>;
  }

  toBytes(): UuidBytesForVersion<Version>;
  toBytes<Output extends Uint8Array>(
    output: Output,
    outputOffset?: number,
  ): UuidOutput<Output> | UuidSlugError;
  toBytes(output?: Uint8Array, outputOffset = 0): Uint8Array | UuidSlugError {
    const bytes = LocalUuidValue.ownBytes(this);
    if (!output) return new Uint8Array(bytes);
    const badRange = checkByteRange(output, outputOffset, 16);
    if (badRange) return badRange;
    output.set(bytes, outputOffset);
    return output;
  }

  toPlainSlug(alphabet?: SlugAlphabet): PlainUuidSlugForVersion<Version>;
  toPlainSlug(
    alphabet: SlugAlphabet = BASE64URL_NAME,
  ): PlainUuidSlugForVersion<Version> | UuidSlugError {
    const selectedAlphabet = resolveSlugAlphabet(alphabet);
    if (selectedAlphabet instanceof Error) return selectedAlphabet;
    return encodeUuidBytes(
      LocalUuidValue.ownBytes(this),
      selectedAlphabet,
    ) as PlainUuidSlugForVersion<Version>;
  }

  toMaskedSlug(
    ...codecArgument: [HasMaskingCodec] extends [true]
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
    ...layoutArgument: [HasPayloadLayout] extends [true]
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
    return formatUuidBytesUnchecked(LocalUuidValue.ownBytes(this)) as UuidStringForVersion<
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

function readForeignUuidContext(value: unknown):
  | {
      readonly maskingCodec: UuidV7MaskingCodec | undefined;
      readonly payloadLayout: UuidV7PayloadLayout | undefined;
    }
  | UuidSlugError
  | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  try {
    const read = Reflect.get(value, UUID_VALUE_CONTEXT);
    if (typeof read !== "function") return undefined;
    const context: unknown = Reflect.apply(read, value, []);
    if (typeof context !== "object" || context === null)
      return new UuidSlugError(INVALID_OPTIONS, "UUID construction context must be an object.");
    const source = context as { readonly maskingCodec?: unknown; readonly payloadLayout?: unknown };
    const maskingCodec = source.maskingCodec;
    if (
      maskingCodec !== undefined &&
      (typeof maskingCodec !== "object" ||
        maskingCodec === null ||
        typeof (maskingCodec as { readonly uuidToMaskedSlug?: unknown }).uuidToMaskedSlug !==
          "function")
    )
      return new UuidSlugError(INVALID_OPTIONS, MASKING_CODEC_REQUIRED);
    const layout = source.payloadLayout;
    const payloadLayout = layout === undefined ? undefined : readUuidV7PayloadLayout(layout);
    if (payloadLayout instanceof Error) return payloadLayout;
    return { maskingCodec: maskingCodec as UuidV7MaskingCodec | undefined, payloadLayout };
  } catch (cause) {
    return new UuidSlugError(INVALID_OPTIONS, "Reading UUID construction context failed.", {
      cause,
    });
  }
}

/** Parse any keyless UUID form once; an existing UUID retains its codec and payload-layout presets. */
export function parseUuid<Input extends UuidInput>(
  uuid: KeylessUuidInput<Input>,
): ParsedUuidResult<Input> | UuidSlugError;
/**
 * Parse through a masking codec, replacing any preset codec and retaining an existing payload layout.
 * A plain UUIDv4 slug can resolve to UUIDv7 when the codec's mask check passes.
 * External codec bytes are validated and copied. Malformed results return `invalid_options`;
 * thrown exceptions remain available as the error's `cause`.
 */
export function parseUuid<Input extends UuidInput>(
  uuid: Input,
  maskingCodec: UuidV7MaskingCodec,
): ParsedUuidResult<Input, true> | UuidSlugError;
export function parseUuid(
  uuid: unknown,
  maskingCodec?: UuidV7MaskingCodec,
): Uuid<UuidVersion, boolean, boolean> | UuidSlugError {
  const existing = LocalUuidValue.is(uuid) ? uuid : undefined;
  if (existing && (!maskingCodec || LocalUuidValue.ownMaskingCodec(existing) === maskingCodec))
    return uuid as Uuid<UuidVersion, boolean, boolean>;
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
  // Read context only after successful parsing, so preceding failures skip protocol callbacks.
  // A borrowed array is the decoded input itself; it has no parsed-value presets. Reuse that
  // observation instead of probing raw storage again. Foreign values need a validated snapshot.
  const foreignContext =
    existing || parsed === uuid || typeof uuid === "string"
      ? undefined
      : readForeignUuidContext(uuid);
  if (foreignContext instanceof Error) return foreignContext;
  // Text decoders and local codecs own fresh bytes; external codec storage was isolated above.
  return createUuidValue(
    maskingCodec || typeof uuid === "string" ? parsed : new Uint8Array(parsed),
    maskingCodec ?? foreignContext?.maskingCodec,
    existing ? LocalUuidValue.ownPayloadLayout(existing) : foreignContext?.payloadLayout,
  );
}

/** Parse with the supplied masking codec preset by an owner method. */
export function parseUuidWithCodec<Input extends UuidInput>(
  uuid: Input,
  maskingCodec: UuidV7MaskingCodec,
): ParsedUuidResult<Input, true> | UuidSlugError {
  return parseUuid(uuid, maskingCodec);
}
