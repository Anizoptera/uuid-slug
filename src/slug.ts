// SPDX-License-Identifier: Apache-2.0

import {
  BASE32HEX,
  BASE32HEX_NAME,
  BASE64URL,
  BASE64URL_NAME,
  decodeInto,
  encode,
  isEncoded,
} from "./alphabet.ts";
import type { Alphabet } from "./alphabet.ts";
import {
  checkByteRange,
  checkRange,
  exactLocalUuidBytes,
  INVALID_OPTIONS,
  INVALID_UUID,
  INVALID_UUID_SLUG,
  INVALID_UUID_VERSION,
  isUuidSlugError,
  isUint8Array,
  normalizeUuidSlugInput,
  normalizeUuidStringInput,
  stringInput,
  uuidByteView,
  UuidSlugError,
} from "./errors.ts";
import type {
  PlainUuidSlugInput,
  PreserveUuidVersion,
  PlainUuidSlug,
  UuidBytes,
  UuidByteInput,
  UuidV4Bytes,
  UuidV7Bytes,
  UuidStringInput,
  PlainUuidV4Slug,
  PlainUuidV7Slug,
  PlainUuidV7SlugInput,
  UuidV7BytesInput,
  UuidV7TimestampInput,
  UuidV7TimestampWindow,
  UuidV7Payload,
  UuidV7PayloadLayout,
  UuidStringFor,
  UuidInput,
  UuidStringResult,
  UuidBytesResult,
  PlainUuidSlugResult,
  UuidTextCase,
  UuidV4StringFor,
  UuidV7StringFor,
  UuidVersion,
  KeylessUuidInput,
} from "./types.ts";
import { UUID_TEXT_LOWERCASE } from "./types.ts";
import { uuidValueBytes } from "./uuid-value-protocol.ts";
import { extractPayloadFields } from "./v7-payload.ts";

import { validateTimestampBytes } from "./timestamp.ts";
import { runtime } from "#runtime";
import {
  bytesToUuidString,
  exactUuidByteView,
  formatUuidBytesUnchecked,
  invalidUuidBytes,
  isUuidString,
  resolveUuidTextCase,
  isUuidV7Text,
  isRfcVariant,
  uuidTimestampFromBytesUnchecked,
  uuidStringToBytes,
  uuidVersion,
} from "./uuid.ts";

export { isUuidSlugError } from "./errors.ts";
export { UuidSlugError };
export type { UuidSlugErrorCode } from "./errors.ts";
export type { PlainUuidSlug, PlainUuidV4Slug, PlainUuidV7Slug } from "./types.ts";

const UUID_V7_TIMESTAMP_ONLY = "Timestamp is only defined for UUIDv7.";
// Capture the intrinsic once so caller-owned methods cannot replace encoding. Other hosts keep
// their existing writer; a throwing optional capability is disabled rather than retried per ID.
let nativePlainUuidBase64 =
  typeof Bun === "undefined"
    ? undefined
    : (
        Uint8Array.prototype as {
          toBase64?: (options: { alphabet: typeof BASE64URL_NAME; omitPadding: boolean }) => string;
        }
      ).toBase64;
const NATIVE_PLAIN_UUID_BASE64_OPTIONS = { alphabet: BASE64URL_NAME, omitPadding: true } as const;
// Keep general normalization separate from ordinary exact-array presets so its branch count does
// not grow their hot body. Remeasure complete calls if accepted input forms or dispatch change.
function uuidBytesToPlainSlugGeneral(
  bytes: UuidByteInput | UuidSlugError,
  offsetOrAlphabet: number | SlugAlphabet,
  alphabet?: SlugAlphabet,
): PlainUuidSlug | UuidSlugError {
  const alphabetIsSecond = typeof offsetOrAlphabet !== "number";
  const offset = alphabetIsSecond ? 0 : offsetOrAlphabet;
  const view = isUint8Array(bytes) ? bytes : exactUuidByteView(bytes);
  if (view instanceof Error) return view;
  const badRange = checkRange(view.length, offset, 16);
  if (badRange) return badRange;
  if (alphabetIsSecond && alphabet !== undefined)
    return new UuidSlugError(
      INVALID_OPTIONS,
      "Pass the alphabet once: second for a whole UUID, or third after a numeric offset.",
    );
  // Unreachable from TypeScript, where the name is a two-member union. Reached from JavaScript,
  // which is why it answers rather than indexing into `undefined`.
  // Scalar presets already identify the alphabet; a resolver call repeats normalization work.
  // Keep that resolver for boxed and invalid selectors. Remeasure if the alphabet set grows.
  const selectedAlphabet = alphabetIsSecond ? offsetOrAlphabet : (alphabet ?? BASE64URL_NAME);
  const alpha =
    selectedAlphabet === BASE64URL_NAME
      ? BASE64URL
      : selectedAlphabet === BASE32HEX_NAME
        ? BASE32HEX
        : resolveSlugAlphabet(selectedAlphabet);
  if (alpha instanceof Error) return alpha;
  return encode(
    view.length === 16 ? view : view.subarray(offset, offset + 16),
    alpha,
  ) as PlainUuidSlug;
}
/*
 * The alphabets a plain slug may be written in. base64url is the default and the shortest;
 * base32hex costs four more characters and buys the one property base64url cannot offer: its
 * characters are in ASCII order, so base32hex slugs of UUIDv7s sort chronologically as plain
 * strings. Writers and guards use lowercase; decoders also accept the RFC uppercase spelling.
 *
 * Masked output selects its alphabet independently: base32hex preserves case-insensitive filenames,
 * but sorting masked ciphertext does not recover chronological order.
 */
const ALTERNATIVE_SEPARATOR = " or ";
const textSlugScratch = new Uint8Array(16);
/*
 * A byteOffset of zero is the spelling of "no offset", so it must read exactly like the standalone
 * form for every accepted input, or a caller forwarding `offset ?? 0` through a wrapper would see
 * text and buffers fail on the value the documentation calls the default. Only a non-zero offset
 * needs bytes around the UUID, and `Uint8Array` is the one accepted form that can carry them:
 * text, slugs and the exact buffer views each hold one UUID and nothing else.
 */
const BYTE_OFFSET_NEEDS_BYTES =
  "Only Uint8Array input accepts a non-zero byteOffset. Wrap another buffer in a Uint8Array, or omit the offset.";

/**
 * Select plain-slug output: 22-character base64url, or 26-character lowercase base32hex.
 * Base64url is shorter. Base32hex UUIDv7 slugs sort by timestamp as plain strings and are safe on
 * case-insensitive filesystems. Decoders infer the alphabet from length. JavaScript also accepts
 * genuine `String` objects where an alphabet is selected.
 */
export type SlugAlphabet = typeof BASE64URL_NAME | typeof BASE32HEX_NAME;

const SLUG_ALPHABET_CODECS = {
  base32hex: BASE32HEX,
  base64url: BASE64URL,
} as const satisfies Record<SlugAlphabet, Alphabet>;

/** Reject values outside the public alphabet union when untyped JavaScript bypasses TypeScript. */
/*#__NO_SIDE_EFFECTS__*/
export function resolveSlugAlphabet(alphabet: SlugAlphabet): Alphabet | UuidSlugError {
  const name = typeof alphabet === "string" ? alphabet : stringInput(alphabet);
  // Fixed comparisons avoid an own-property call and keyed lookup on every conversion.
  // Packed complete-call comparisons favor this over SLUG_ALPHABET_CODECS; remeasure if
  // the supported alphabet vocabulary grows. Wrapper normalization remains shared.
  if (name === BASE64URL_NAME) return BASE64URL;
  if (name === BASE32HEX_NAME) return BASE32HEX;
  return new UuidSlugError(
    INVALID_OPTIONS,
    `Unknown slug alphabet; expected ${BASE64URL_NAME}${ALTERNATIVE_SEPARATOR}${BASE32HEX_NAME}.`,
  );
}

/** Characters needed for 16 bytes: 22 in base64url, 26 in base32hex. */
/*#__NO_SIDE_EFFECTS__*/
function slugLength(alpha: Alphabet) {
  return Math.ceil(128 / alpha.bitsPerChar);
}

/**
 * Length -> alphabet, which is why decoding takes no alphabet argument: the two lengths are
 * disjoint, so a slug names its own encoding and a caller cannot pick the wrong one. Indexed
 * rather than searched because every decode and every type guard pays this lookup.
 */
const SLUG_ALPHABET_BY_LENGTH: readonly (Alphabet | undefined)[] = /*#__PURE__*/ Object.values(
  SLUG_ALPHABET_CODECS,
).reduce<(Alphabet | undefined)[]>((table, alpha) => {
  table[slugLength(alpha)] = alpha;
  return table;
}, []);

const SLUG_LENGTHS = /*#__PURE__*/ Object.values(SLUG_ALPHABET_CODECS)
  .map((alpha) => `${slugLength(alpha)} (${alpha.name})`)
  .join(ALTERNATIVE_SEPARATOR);

/**
 * Encode a standalone 16-byte UUID as a plain slug, using base64url by default. An `ArrayBuffer`
 * uses its whole contents; a `DataView` uses its declared range. Invalid input or alphabet returns
 * `UuidSlugError`. A preceding `UuidSlugError` is returned unchanged.
 *
 * @param bytes - One exact 16-byte UUID source.
 * @param alphabet - Output spelling. Omit for the shorter 22-character base64url form.
 */
export function uuidBytesToPlainSlug(
  bytes: UuidByteInput | UuidSlugError,
  alphabet?: SlugAlphabet,
): PlainUuidSlug | UuidSlugError;
/**
 * Encode 16 bytes within a larger array as a plain slug. A preceding `UuidSlugError` is returned
 * unchanged.
 *
 * @param bytes - Array containing at least one complete 16-byte UUID.
 * @param byteOffset - Zero-based index where the UUID starts.
 * @param alphabet - Output spelling. Omit for the shorter 22-character base64url form.
 */
export function uuidBytesToPlainSlug(
  bytes: Uint8Array | UuidSlugError,
  byteOffset: number,
  alphabet?: SlugAlphabet,
): PlainUuidSlug | UuidSlugError;
/*#__NO_SIDE_EFFECTS__*/
export function uuidBytesToPlainSlug(
  bytes: UuidByteInput | UuidSlugError,
  offsetOrAlphabet: number | SlugAlphabet = 0,
  alphabet?: SlugAlphabet,
): PlainUuidSlug | UuidSlugError {
  // Exact-array presets share one payload check and one writer choice. Duplicate selectors and
  // non-zero offsets must retain general validation; they cannot become successful preset calls.
  if (isUint8Array(bytes) && bytes.length === 16) {
    const selectedAlphabet =
      offsetOrAlphabet === 0
        ? (alphabet ?? BASE64URL_NAME)
        : alphabet === undefined
          ? offsetOrAlphabet
          : undefined;
    if (selectedAlphabet === BASE32HEX_NAME) return encode(bytes, BASE32HEX) as PlainUuidSlug;
    // Native encoding owns this exact plain-payload job. Offset windows and non-array forms retain
    // general conversion; masked tails never enter here. Keep base32 controls in the comparison
    // when changing this dispatch (bench/PERFORMANCE.md).
    if (selectedAlphabet === BASE64URL_NAME) {
      if (nativePlainUuidBase64) {
        try {
          return nativePlainUuidBase64.call(
            bytes,
            NATIVE_PLAIN_UUID_BASE64_OPTIONS,
          ) as PlainUuidSlug;
        } catch {
          nativePlainUuidBase64 = undefined;
        }
      }
      // An absent capability must not add a normalization call for an already validated payload.
      return encode(bytes, BASE64URL) as PlainUuidSlug;
    }
  }
  return uuidBytesToPlainSlugGeneral(bytes, offsetOrAlphabet, alphabet);
}

/**
 * Decode a canonical plain slug into a new plain 16-byte `Uint8Array`. Its length selects
 * base64url or base32hex. Known UUID and masked values are rejected by TypeScript; invalid input
 * returns `UuidSlugError`. A preceding `UuidSlugError` is returned unchanged.
 *
 * @param plainUuidSlug - Canonical 22-character base64url or 26-character base32hex plain UUID slug.
 * JavaScript also accepts a genuine `String` object.
 */
export function plainSlugToUuidBytes<Input extends string | UuidSlugError>(
  plainUuidSlug: PlainUuidSlugInput<Input>,
): PreserveUuidVersion<Input, UuidBytes, UuidV4Bytes, UuidV7Bytes> | UuidSlugError;
/**
 * Decode a canonical plain slug into caller-owned storage after validating the full input. A
 * preceding `UuidSlugError` is returned unchanged without writing.
 *
 * @param plainUuidSlug - Canonical 22-character base64url or 26-character base32hex plain UUID slug.
 * JavaScript also accepts a genuine `String` object.
 * @param output - Caller-owned array that receives the 16 UUID bytes.
 * @param outputOffset - Zero-based index where writing starts. Omit to start at index 0. Bytes
 * outside the written range stay unchanged.
 */
export function plainSlugToUuidBytes<
  Input extends string | UuidSlugError,
  Output extends Uint8Array,
>(
  plainUuidSlug: PlainUuidSlugInput<Input>,
  output: Output,
  outputOffset?: number,
): Output | UuidSlugError;
export function plainSlugToUuidBytes(
  plainUuidSlug: string | UuidSlugError,
  output?: Uint8Array,
  outputOffset = 0,
): Uint8Array | UuidSlugError {
  let slug = plainUuidSlug;
  if (typeof slug !== "string") {
    slug = normalizeUuidSlugInput(slug);
    if (typeof slug !== "string") return slug;
  }
  const alpha = SLUG_ALPHABET_BY_LENGTH[slug.length];
  if (!alpha)
    return new UuidSlugError(
      INVALID_UUID_SLUG,
      slug.length === 27
        ? "27 characters is a masked base32hex slug; decode it with the codec that issued it."
        : `UUID slug must be ${SLUG_LENGTHS} characters, got ${slug.length}.`,
    );
  const target = output ?? new Uint8Array(16);
  const badRange =
    output === undefined
      ? checkRange(16, outputOffset, 16)
      : checkByteRange(output, outputOffset, 16);
  if (badRange) return badRange;
  if (output && !isEncoded(slug, alpha, 16, true)) {
    for (let i = 0; i < slug.length; i += 1) {
      const code = slug.charCodeAt(i);
      if (code >= 128 || (alpha.decode[code] as number) < 0)
        return new UuidSlugError(
          alpha.code,
          `Invalid ${alpha.name} character ${JSON.stringify(slug[i])} at offset ${i}.`,
        );
    }
    return new UuidSlugError(alpha.code, `${alpha.name} value has non-canonical trailing bits.`);
  }
  const result = decodeInto(slug, alpha, target, outputOffset, 16);
  return result instanceof Error ? result : target;
}

/**
 * Encode accepted mixed-case UUID text as a reversible plain slug, using base64url by default.
 * A known UUID version is preserved in the result type. TypeScript rejects known slug
 * values; invalid text or alphabet returns `UuidSlugError`. A preceding `UuidSlugError` is returned
 * unchanged.
 *
 * @param uuid - UUID text in an accepted spelling. JavaScript also accepts a genuine `String` object.
 * @param alphabet - Output spelling. Omit for the shorter 22-character base64url form.
 */
export function uuidStringToPlainSlug<Input extends string | UuidSlugError>(
  uuid: UuidStringInput<Input>,
  alphabet?: SlugAlphabet,
): PreserveUuidVersion<Input, PlainUuidSlug, PlainUuidV4Slug, PlainUuidV7Slug> | UuidSlugError;
/*#__NO_SIDE_EFFECTS__*/
export function uuidStringToPlainSlug(
  uuid: string | UuidSlugError,
  alphabet: SlugAlphabet = BASE64URL_NAME,
): PlainUuidSlug | UuidSlugError {
  let uuidText = uuid;
  if (typeof uuidText !== "string") {
    uuidText = normalizeUuidStringInput(uuidText);
    if (typeof uuidText !== "string") return uuidText;
  }
  const alpha = resolveSlugAlphabet(alphabet);
  if (alpha instanceof Error) return alpha;
  // Resolve caller selectors before scratch is live, then parse and encode without callbacks.
  // Separate text-to-slug
  // writers read hex pairs and concatenated characters, and were slower on every runtime
  // (bench/PERFORMANCE.md). Reassess scratch ownership if encoding adds caller-controlled work.
  const bytes = uuidStringToBytes(uuidText, textSlugScratch);
  if (bytes instanceof Error) return bytes;
  return encode(bytes, alpha) as PlainUuidSlug;
}

/**
 * Decode a plain slug to hyphenated UUID text; its length selects base64url or base32hex.
 * Base32hex input accepts uppercase or lowercase. Base64url remains case-sensitive.
 * A known UUID version is preserved in the result type. TypeScript rejects known UUID and masked
 * values; invalid input returns `UuidSlugError`. A preceding `UuidSlugError` is returned unchanged.
 *
 * @param plainUuidSlug - Canonical 22-character base64url or 26-character base32hex plain UUID slug.
 * @param textCase - Built-in output spelling. Omit for lowercase.
 */
export function plainSlugToUuidString<
  Input extends string | UuidSlugError,
  Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE,
>(
  plainUuidSlug: PlainUuidSlugInput<Input>,
  textCase?: Case,
):
  | PreserveUuidVersion<Input, UuidStringFor<Case>, UuidV4StringFor<Case>, UuidV7StringFor<Case>>
  | UuidSlugError;
/*#__NO_SIDE_EFFECTS__*/
export function plainSlugToUuidString(
  plainUuidSlug: string | UuidSlugError,
  textCase: UuidTextCase = UUID_TEXT_LOWERCASE,
): string | UuidSlugError {
  const selectedCase = resolveUuidTextCase(textCase);
  if (selectedCase instanceof Error) return selectedCase;
  const bytes = plainSlugToUuidBytes(plainUuidSlug);
  if (bytes instanceof Error) return bytes;
  // A successful decode yields exactly 16 bytes, so the checked formatter would repeat work.
  return formatUuidBytesUnchecked(bytes, 0, selectedCase);
}

// Package-created decode failures are local Errors. A caller-owned cross-realm package error is
// the only failure arm that can bypass `instanceof`, and this function returns it unchanged;
// identity keeps marker recognition off successful conversion paths.
export function decodeKeylessUuid(uuid: unknown): Uint8Array | UuidSlugError {
  let text: string;
  if (typeof uuid === "string") text = uuid;
  else {
    const input = readObjectUuidInput(uuid);
    if (typeof input !== "string") return input;
    text = input;
  }
  return text.length === 22 || text.length === 26
    ? plainSlugToUuidBytes(text)
    : uuidStringToBytes(text);
}

/**
 * Read a non-string UUID input as borrowed bytes, a parsed UUID's bytes, recovered `String` text, or
 * the failure it carries. An error is built only when nothing matches: a discarded error would make
 * every accepted object pay for a stack capture that costs more than the conversion.
 */
export function readObjectUuidInput(uuid: unknown): Uint8Array | string | UuidSlugError {
  const view = uuidByteView(uuid);
  if (view) return view.length === 16 ? view : invalidUuidBytes();
  const valueBytes = uuidValueBytes(uuid);
  if (valueBytes) return valueBytes;
  if (isUuidSlugError(uuid)) return uuid;
  return stringInput(uuid) ?? invalidUuidBytes();
}

/**
 * Return the four-bit UUID version field from UUID text, exact bytes, or a plain slug after full
 * input validation. This reports the stored field, including zero for nil and 15 for max; it does
 * not prove that the UUID has the RFC variant or that the version is assigned.
 *
 * @param uuid - Any unmasked UUID representation supported by the package.
 */
export function extractUuidVersion<Input extends UuidInput>(
  uuid: KeylessUuidInput<Input>,
): UuidVersion | UuidSlugError {
  const localBytes = exactLocalUuidBytes(uuid);
  if (localBytes) return uuidVersion(localBytes, 0);
  const bytes = decodeKeylessUuid(uuid);
  if (bytes instanceof Error || (bytes === uuid && isUuidSlugError(bytes))) return bytes;
  return uuidVersion(bytes, 0);
}

/**
 * Convert UUID text, bytes, or a plain UUID slug to new or caller-owned UUID bytes.
 * Only `Uint8Array` input accepts a non-zero offset; `0` means the same as omitting it.
 *
 * @param byteOffset - Zero-based index where the UUID starts. Omit for a standalone UUID.
 */
export function uuidToBytes<Input extends UuidInput>(
  uuid: KeylessUuidInput<Input>,
): UuidBytesResult<Input>;
export function uuidToBytes<Input extends UuidInput, Output extends Uint8Array>(
  uuid: KeylessUuidInput<Input>,
  output: Output,
  outputOffset?: number,
): Output | UuidSlugError;
export function uuidToBytes(uuid: Uint8Array, byteOffset: number): UuidBytesResult<Uint8Array>;
export function uuidToBytes<Output extends Uint8Array>(
  uuid: Uint8Array,
  byteOffset: number,
  output: Output,
  outputOffset?: number,
): Output | UuidSlugError;
export function uuidToBytes(
  uuid: unknown,
  outputOrByteOffset?: unknown,
  outputOrOutputOffset?: unknown,
  offsetAfterOutput = 0,
): Uint8Array | UuidSlugError {
  const readsAtOffset = typeof outputOrByteOffset === "number";
  const output = readsAtOffset ? outputOrOutputOffset : outputOrByteOffset;
  const outputOffset = readsAtOffset
    ? offsetAfterOutput
    : ((outputOrOutputOffset as number | undefined) ?? 0);
  const badRange = output === undefined ? undefined : checkByteRange(output, outputOffset, 16);
  if (badRange) return badRange;
  const destination = output as Uint8Array | undefined;
  if (readsAtOffset) {
    const byteOffset = outputOrByteOffset;
    if (isUint8Array(uuid)) {
      const badSource = checkRange(uuid.length, byteOffset, 16);
      if (badSource) return badSource;
      const source = uuid.subarray(byteOffset, byteOffset + 16);
      if (!destination) return new Uint8Array(source);
      destination.set(source, outputOffset);
      return destination;
    }
    if (byteOffset !== 0) return new UuidSlugError(INVALID_OPTIONS, BYTE_OFFSET_NEEDS_BYTES);
  }
  const localBytes = exactLocalUuidBytes(uuid);
  if (localBytes) {
    if (!destination) return new Uint8Array(localBytes);
    destination.set(localBytes, outputOffset);
    return destination;
  }
  const bytes = decodeKeylessUuid(uuid);
  if (bytes instanceof Error || (bytes === uuid && isUuidSlugError(bytes))) return bytes;
  // Text decoders already own fresh bytes; only borrowed binary or parsed input needs a copy.
  if (!destination) return typeof uuid === "string" ? bytes : new Uint8Array(bytes);
  destination.set(bytes, outputOffset);
  return destination;
}

/**
 * Convert UUID text, bytes, or a plain UUID slug to normalized UUID text.
 * Only `Uint8Array` input accepts a non-zero offset; `0` means the same as omitting it.
 *
 * @param byteOffset - Zero-based index where the UUID starts. Omit for a standalone UUID.
 */
export function uuidToString<
  Input extends UuidInput,
  Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE,
>(uuid: KeylessUuidInput<Input>, textCase?: Case): UuidStringResult<Input, Case>;
export function uuidToString<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
  uuid: Uint8Array,
  byteOffset: number,
  textCase?: Case,
): UuidStringResult<Uint8Array, Case>;
export function uuidToString(
  uuid: unknown,
  byteOffsetOrCase: number | UuidTextCase = UUID_TEXT_LOWERCASE,
  caseAfterOffset: UuidTextCase = UUID_TEXT_LOWERCASE,
): string | UuidSlugError {
  let textCase: UuidTextCase;
  if (typeof byteOffsetOrCase === "number") {
    if (isUint8Array(uuid)) return bytesToUuidString(uuid, byteOffsetOrCase, caseAfterOffset);
    if (byteOffsetOrCase !== 0) return new UuidSlugError(INVALID_OPTIONS, BYTE_OFFSET_NEEDS_BYTES);
    textCase = caseAfterOffset;
  } else textCase = byteOffsetOrCase;
  // Canonical lowercase text is already the default output, so it is returned without decoding.
  // An inline `typeof` guard ahead of the helper slowed Node mixed-case text (bench/PERFORMANCE.md).
  if (textCase === UUID_TEXT_LOWERCASE && isUuidString(uuid)) return uuid;
  const localBytes = exactLocalUuidBytes(uuid);
  if (localBytes) {
    const selectedCase = resolveUuidTextCase(textCase);
    if (selectedCase instanceof Error) return selectedCase;
    return formatUuidBytesUnchecked(localBytes, 0, selectedCase);
  }
  const bytes = decodeKeylessUuid(uuid);
  if (bytes instanceof Error || (bytes === uuid && isUuidSlugError(bytes))) return bytes;
  const selectedCase = resolveUuidTextCase(textCase);
  if (selectedCase instanceof Error) return selectedCase;
  // A successful decode yields exactly 16 bytes, so the checked formatter's range and argument
  // dispatch would repeat work.
  return formatUuidBytesUnchecked(bytes, 0, selectedCase);
}

/**
 * Convert UUID text, bytes, or a plain UUID slug to a plain slug.
 * Only `Uint8Array` input accepts a non-zero offset; `0` means the same as omitting it.
 *
 * @param byteOffset - Zero-based index where the UUID starts. Omit for a standalone UUID.
 */
export function uuidToPlainSlug<Input extends UuidInput>(
  uuid: KeylessUuidInput<Input>,
  alphabet?: SlugAlphabet,
): PlainUuidSlugResult<Input>;
export function uuidToPlainSlug(
  uuid: Uint8Array,
  byteOffset: number,
  alphabet?: SlugAlphabet,
): PlainUuidSlugResult<Uint8Array>;
export function uuidToPlainSlug(
  uuid: unknown,
  byteOffsetOrAlphabet: number | SlugAlphabet = BASE64URL_NAME,
  alphabetAfterOffset: SlugAlphabet = BASE64URL_NAME,
): PlainUuidSlug | UuidSlugError {
  let alphabet: SlugAlphabet;
  if (typeof byteOffsetOrAlphabet === "number") {
    if (isUint8Array(uuid))
      return uuidBytesToPlainSlug(uuid, byteOffsetOrAlphabet, alphabetAfterOffset);
    if (byteOffsetOrAlphabet !== 0)
      return new UuidSlugError(INVALID_OPTIONS, BYTE_OFFSET_NEEDS_BYTES);
    alphabet = alphabetAfterOffset;
  } else alphabet = byteOffsetOrAlphabet;
  const localBytes = exactLocalUuidBytes(uuid);
  if (localBytes) return uuidBytesToPlainSlug(localBytes, alphabet);
  const bytes = decodeKeylessUuid(uuid);
  if (bytes instanceof Error || (bytes === uuid && isUuidSlugError(bytes))) return bytes;
  return uuidBytesToPlainSlug(bytes, alphabet);
}

/** Check a canonical 22-character base64url or 26-character lowercase base32hex plain slug. */
/*#__NO_SIDE_EFFECTS__*/
export function isPlainUuidSlug(value: unknown): value is PlainUuidSlug {
  if (typeof value !== "string" || !value) return false;
  const alpha = SLUG_ALPHABET_BY_LENGTH[value.length];
  return alpha !== undefined && isEncoded(value, alpha, 16);
}

/** Read only the version/variant bytes after canonical validation, without decoding a whole UUID. */
/*#__NO_SIDE_EFFECTS__*/
function slugByte(slug: string, alpha: Alphabet, offset: number): number {
  const start = Math.floor((offset * 8) / alpha.bitsPerChar);
  const end = Math.floor((offset * 8 + 7) / alpha.bitsPerChar);
  let value = 0;
  for (let i = start; i <= end; i += 1)
    value = (value << alpha.bitsPerChar) | (alpha.decode[slug.charCodeAt(i)] as number);
  return (value >>> ((end + 1) * alpha.bitsPerChar - (offset + 1) * 8)) & 255;
}

/*#__NO_SIDE_EFFECTS__*/
function isVersionedSlug(slug: unknown, version: number): slug is PlainUuidSlug {
  if (!isPlainUuidSlug(slug)) return false;
  const alpha = SLUG_ALPHABET_BY_LENGTH[slug.length] as Alphabet;
  return slugByte(slug, alpha, 6) >>> 4 === version && slugByte(slug, alpha, 8) >>> 6 === 2;
}

/** Check a canonical plain slug whose payload is an RFC-variant UUIDv4. */
/*#__NO_SIDE_EFFECTS__*/
export function isPlainUuidV4Slug(value: unknown): value is PlainUuidV4Slug {
  return isVersionedSlug(value, 4);
}

/** Check a canonical plain slug whose payload is an RFC-variant UUIDv7. */
/*#__NO_SIDE_EFFECTS__*/
export function isPlainUuidV7Slug(value: unknown): value is PlainUuidV7Slug {
  return isVersionedSlug(value, 7);
}

function validatedHexNibble(text: string, index: number): number {
  // Full text validation precedes this read; both ASCII hex cases share their low four bits.
  const code = text.charCodeAt(index);
  return (code & 15) + (code > 57 ? 9 : 0);
}

function fixedCanonicalUuidV7UnixMs(text: string): number {
  // Fixed reads avoid parseInt's sliced/joined strings. Split at 32 bits and unsigned-coerce the
  // low word so timestamps above its sign bit preserve all 48 bits. Only validated canonical text
  // reaches this helper; compact text retains its contiguous parse. Table reads slightly favor
  // Bun but lose on Node in the source screen; remeasure complete calls after parser or engine
  // changes (bench/PERFORMANCE.md).
  const high =
    (validatedHexNibble(text, 0) << 12) |
    (validatedHexNibble(text, 1) << 8) |
    (validatedHexNibble(text, 2) << 4) |
    validatedHexNibble(text, 3);
  const low =
    ((validatedHexNibble(text, 4) << 28) |
      (validatedHexNibble(text, 5) << 24) |
      (validatedHexNibble(text, 6) << 20) |
      (validatedHexNibble(text, 7) << 16) |
      (validatedHexNibble(text, 9) << 12) |
      (validatedHexNibble(text, 10) << 8) |
      (validatedHexNibble(text, 11) << 4) |
      validatedHexNibble(text, 12)) >>>
    0;
  return high * 0x1_0000_0000 + low;
}

function parsedCanonicalUuidV7UnixMs(text: string): number {
  // Native radix parsing avoids interpreted digit calls when Node disables its JIT.
  return parseInt(text.slice(0, 8) + text.slice(9, 13), 16);
}

// Reuse the runtime's settled JIT selection; no flag parsing or table construction belongs here.
// Recheck both complete calls after engine changes against bench/PERFORMANCE.md.
const canonicalUuidV7UnixMsUnchecked = runtime.jitless
  ? parsedCanonicalUuidV7UnixMs
  : fixedCanonicalUuidV7UnixMs;

/*#__NO_SIDE_EFFECTS__*/
function extractStringTimestamp(value: string): number | UuidSlugError {
  let timestamp = 0;
  if (isUuidV7Text(value) && (value.length === 32 || value.length === 36))
    return value.length === 36
      ? canonicalUuidV7UnixMsUnchecked(value)
      : parseInt(value.slice(0, 12), 16);
  if (isPlainUuidV7Slug(value)) {
    const alpha = SLUG_ALPHABET_BY_LENGTH[value.length] as Alphabet;
    for (let index = 0; index < 6; index += 1)
      timestamp = timestamp * 256 + slugByte(value, alpha, index);
    return timestamp;
  }
  const bytes = uuidStringToBytes(value);
  if (!(bytes instanceof Error)) {
    if (uuidVersion(bytes) !== 7 || !isRfcVariant(bytes))
      return new UuidSlugError(INVALID_UUID_VERSION, UUID_V7_TIMESTAMP_ONLY);
    return uuidTimestampFromBytesUnchecked(bytes, 0);
  }
  if (isPlainUuidSlug(value))
    return new UuidSlugError(INVALID_UUID_VERSION, UUID_V7_TIMESTAMP_ONLY);
  return new UuidSlugError(INVALID_UUID, "Expected UUIDv7 text or a plain UUIDv7 slug.");
}

/**
 * Return the 48-bit Unix millisecond encoded by accepted UUIDv7 text, a plain UUIDv7 slug, or
 * UUIDv7 bytes. Compact and canonical text and both plain slug alphabets avoid a byte allocation.
 * Use `codec.extractMaskedUuidV7UnixMs` for masked or sentinel slugs. Other UUID versions and malformed
 * values return `UuidSlugError`. A preceding `UuidSlugError` is returned unchanged.
 *
 * @param value - UUIDv7 text in an accepted spelling, or a plain UUIDv7 slug in either alphabet.
 */
export function extractUuidV7UnixMs<Input extends string | UuidSlugError>(
  value: UuidV7TimestampInput<Input>,
): number | UuidSlugError;
/**
 * Return the 48-bit Unix millisecond encoded by UUIDv7 bytes. An `ArrayBuffer` uses its whole
 * contents; a `DataView` uses its declared range. Only `Uint8Array` input accepts a non-zero
 * offset; `0` means the same as omitting it.
 *
 * @param value - One supported UUIDv7 byte source.
 * @param byteOffset - Zero-based index where the UUID starts. Omit for a standalone UUID.
 */
export function extractUuidV7UnixMs<Input extends UuidByteInput | UuidSlugError>(
  value: UuidV7BytesInput<Input>,
  byteOffset?: number,
): number | UuidSlugError;
/*#__NO_SIDE_EFFECTS__*/
export function extractUuidV7UnixMs(
  value: string | UuidByteInput | UuidSlugError,
  byteOffset = 0,
): number | UuidSlugError {
  if (typeof value === "string")
    return byteOffset === 0
      ? extractStringTimestamp(value)
      : new UuidSlugError(INVALID_OPTIONS, BYTE_OFFSET_NEEDS_BYTES);
  if (isUuidSlugError(value)) return value;
  if (byteOffset !== 0 && !isUint8Array(value))
    return new UuidSlugError(INVALID_OPTIONS, BYTE_OFFSET_NEEDS_BYTES);
  const bytes = isUint8Array(value) ? value : exactUuidByteView(value);
  if (bytes instanceof Error) {
    const text = stringInput(value);
    return text === undefined ? bytes : extractStringTimestamp(text);
  }
  const badRange = checkRange(bytes.length, byteOffset, 16);
  if (badRange) return badRange;
  if (uuidVersion(bytes, byteOffset) !== 7 || !isRfcVariant(bytes, byteOffset))
    return new UuidSlugError(INVALID_UUID_VERSION, UUID_V7_TIMESTAMP_ONLY);
  return uuidTimestampFromBytesUnchecked(bytes, byteOffset);
}

/**
 * Decode the UUIDv7 payload under a layout supplied by the caller. The UUID does not identify its
 * generator or payload layout, so this operation never guesses. Fraction bits follow RFC 9562
 * Method 3; counter bits immediately follow them as in Method 1. All other bits remain uninterpreted.
 *
 * @param value - UUIDv7 text in an accepted spelling, or a plain UUIDv7 slug in either alphabet.
 * @param layout - Known leading fraction and fixed-counter widths.
 * @returns The millisecond timestamp, declared fields, and every undeclared low payload bit; or a
 * `UuidSlugError` for an invalid UUID, byte range, or layout.
 * @remarks A fraction value `n` in `b` bits identifies the half-open interval
 * `[unixMs + n / 2**b, unixMs + (n + 1) / 2**b)` milliseconds, not an exact instant.
 */
export function extractUuidV7Payload<Input extends string | UuidSlugError>(
  value: UuidV7TimestampInput<Input>,
  layout: UuidV7PayloadLayout,
): UuidV7Payload | UuidSlugError;
/**
 * Decode a UUIDv7 byte source under the same caller-supplied payload layout. Only `Uint8Array`
 * input accepts a non-zero offset; `0` means the same as omitting it.
 *
 * @param byteOffset - Zero-based index where the UUID starts. Omit for a standalone UUID.
 */
export function extractUuidV7Payload<Input extends UuidByteInput | UuidSlugError>(
  value: UuidV7BytesInput<Input>,
  layout: UuidV7PayloadLayout,
  byteOffset?: number,
): UuidV7Payload | UuidSlugError;
/*#__NO_SIDE_EFFECTS__*/
export function extractUuidV7Payload(
  value: string | UuidByteInput | UuidSlugError,
  layout: UuidV7PayloadLayout,
  byteOffset = 0,
): UuidV7Payload | UuidSlugError {
  let bytes: Uint8Array | UuidSlugError;
  if (typeof value === "string") {
    if (byteOffset !== 0) return new UuidSlugError(INVALID_OPTIONS, BYTE_OFFSET_NEEDS_BYTES);
    bytes = decodeKeylessUuid(value);
  } else if (isUuidSlugError(value)) {
    return value;
  } else {
    if (byteOffset !== 0 && !isUint8Array(value))
      return new UuidSlugError(INVALID_OPTIONS, BYTE_OFFSET_NEEDS_BYTES);
    bytes = isUint8Array(value) ? value : exactUuidByteView(value);
    if (bytes instanceof Error) {
      const text = stringInput(value);
      if (text !== undefined) bytes = uuidToBytes(text);
    }
  }
  if (bytes instanceof Error) return bytes;
  const badRange = checkRange(bytes.length, byteOffset, 16);
  if (badRange) return badRange;
  if (uuidVersion(bytes, byteOffset) !== 7 || !isRfcVariant(bytes, byteOffset))
    return new UuidSlugError(INVALID_UUID_VERSION, UUID_V7_TIMESTAMP_ONLY);
  return extractPayloadFields(
    bytes,
    byteOffset,
    uuidTimestampFromBytesUnchecked(bytes, byteOffset),
    layout,
  );
}

/**
 * Return the same plain UUIDv7 slug when its timestamp is inside the inclusive symmetric window.
 * Return `timestamp_outside_window` when it is not. Use a codec method for masked or sentinel
 * input. TypeScript rejects known UUID text, masked slugs, and UUIDv4 slugs. A preceding
 * `UuidSlugError` is returned unchanged.
 *
 * @param slug - Canonical plain UUIDv7 slug to validate and return. JavaScript also accepts a
 * genuine `String` object.
 * @param window - Inclusive maximum distance from an explicit or current reference time.
 */
export function validatePlainUuidV7SlugUnixMs<Input extends string | UuidSlugError>(
  slug: PlainUuidV7SlugInput<Input>,
  window: UuidV7TimestampWindow,
): (Input & PlainUuidV7Slug) | UuidSlugError;
export function validatePlainUuidV7SlugUnixMs(
  slug: unknown,
  window: UuidV7TimestampWindow,
): PlainUuidV7Slug | UuidSlugError {
  let plainSlug: string;
  if (typeof slug === "string") {
    plainSlug = slug;
  } else {
    const normalized = normalizeUuidSlugInput(slug);
    if (typeof normalized !== "string") return normalized;
    plainSlug = normalized;
  }
  const bytes = plainSlugToUuidBytes(plainSlug);
  if (bytes instanceof Error) return bytes;
  const valid = validateTimestampBytes(bytes, window);
  return valid instanceof Error ? valid : (plainSlug as PlainUuidV7Slug);
}
