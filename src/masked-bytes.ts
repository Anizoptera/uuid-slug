// SPDX-License-Identifier: Apache-2.0

import {
  checkByteRange,
  checkRange,
  INVALID_MASK,
  INVALID_OPTIONS,
  INVALID_UUID_SLUG,
  INVALID_UUID_VERSION,
  isSuccessfulUuidBytes,
  isUint8Array,
  isUuidSlugError,
  UuidSlugError,
} from "./errors.ts";
import { maskUuidV7Block, unmix } from "./payload.ts";
import type { UuidV7MaskRange } from "./payload.ts";
import {
  exactUuidByteView,
  formatUuidBytesUnchecked,
  isUuidV7Bytes,
  resolveUuidTextCase,
} from "./uuid.ts";
import { UUID_TEXT_LOWERCASE } from "./types.ts";
import type {
  MaskedOrSentinelUuidV7Bytes,
  UuidByteInput,
  UuidInput,
  UuidOutput,
  UuidTextCase,
  UuidTextCaseArguments,
  UuidV7Bytes,
  UuidV7StringFor,
  UuidV7ValueInput,
} from "./types.ts";
import type { UuidV7MaskingCodec } from "./masking-codec-types.ts";

type BinaryMethods = Pick<
  UuidV7MaskingCodec,
  "uuidToMaskedBytes" | "maskedBytesToUuidBytes" | "maskedBytesToUuidString"
>;

function readMaskedByteSource(value: unknown, byteOffset?: number): Uint8Array | UuidSlugError {
  if (byteOffset === undefined) return exactUuidByteView(value);
  if (isUint8Array(value)) return checkRange(value.length, byteOffset, 16) ?? value;
  if (isUuidSlugError(value)) return value;
  // Zero has the same meaning as omission on standalone byte forms, as on UUID readers.
  if (byteOffset === 0) return exactUuidByteView(value);
  return new UuidSlugError(INVALID_OPTIONS, "A non-zero byteOffset requires Uint8Array input.");
}

/** Keep binary provenance explicit: raw UUID bytes and mixed bytes have the same runtime shape. */
export function createMaskedByteMethods(
  decodeUuid: (uuid: unknown) => Uint8Array | UuidSlugError,
  current: UuidV7MaskRange,
  previous: readonly UuidV7MaskRange[],
  sentinels: readonly { readonly bytes: Uint8Array }[],
): BinaryMethods {
  function sentinel(bytes: Uint8Array, byteOffset = 0): Uint8Array | undefined {
    // Raw sentinels must win before a probabilistic key check, including outside the masked range.
    for (const entry of sentinels) {
      let index = 0;
      while (index < 16 && entry.bytes[index] === bytes[byteOffset + index]) index += 1;
      if (index === 16) return entry.bytes;
    }
    return undefined;
  }

  function uuidToMaskedBytes<Input extends UuidInput>(
    uuid: UuidV7ValueInput<Input>,
  ): MaskedOrSentinelUuidV7Bytes | UuidSlugError;
  function uuidToMaskedBytes<Input extends UuidInput, Output extends Uint8Array>(
    uuid: UuidV7ValueInput<Input>,
    output: Output,
    outputOffset?: number,
  ): UuidOutput<Output> | UuidSlugError;
  function uuidToMaskedBytes(
    uuid: unknown,
    output?: Uint8Array,
    outputOffset = 0,
  ): Uint8Array | UuidSlugError {
    const source = decodeUuid(uuid);
    if (!isSuccessfulUuidBytes(source)) return source;
    if (output !== undefined) {
      const invalid = checkByteRange(output, outputOffset, 16);
      if (invalid) return invalid;
    }
    if (!isUuidV7Bytes(source))
      return new UuidSlugError(INVALID_UUID_VERSION, "Masking requires an RFC-variant UUIDv7.");
    // Mutation is private until masking and collision checks succeed; output may alias input.
    const bytes = new Uint8Array(source);
    if (!sentinel(source)) {
      const tail = maskUuidV7Block(bytes, current.mask, current.timestampRangeStartUnixMs);
      if (typeof tail !== "number") return tail;
      // Binary has no outer text nibble to distinguish a reserved raw sentinel from this block.
      if (sentinel(bytes))
        return new UuidSlugError(
          INVALID_MASK,
          "Masked output collides with a reserved sentinel. Configure a different mask or sentinel set.",
        );
    }
    if (!output) return bytes;
    output.set(bytes, outputOffset);
    return output;
  }

  function read(source: Uint8Array, byteOffset?: number): Uint8Array | UuidSlugError {
    const reserved = sentinel(source, byteOffset);
    if (reserved) return new Uint8Array(reserved);
    // Snapshot once before callbacks: a callback may mutate the caller's original ciphertext.
    // Offset reads copy only their payload directly into owned scratch, not a temporary view.
    // Keep the native whole-array copy for the standalone path; no packet scan is needed.
    const bytes = byteOffset === undefined ? new Uint8Array(source) : new Uint8Array(16);
    if (byteOffset !== undefined)
      for (let index = 0; index < 16; index += 1) bytes[index] = source[byteOffset + index]!;
    const ciphertext = previous.length ? bytes.slice() : undefined;
    let candidate = unmix(bytes, undefined, current);
    if (candidate !== undefined) return candidate;
    if (ciphertext) {
      for (const range of previous) {
        bytes.set(ciphertext);
        candidate = unmix(bytes, undefined, range);
        if (candidate !== undefined) return candidate;
      }
    }
    return new UuidSlugError(
      INVALID_UUID_SLUG,
      "No configured mask and timestamp range accepts these masked bytes; use the codec configuration that issued them.",
    );
  }

  function maskedBytesToUuidBytes(
    maskedUuidBytes: UuidByteInput | UuidSlugError,
  ): UuidV7Bytes | UuidSlugError;
  function maskedBytesToUuidBytes<Output extends Uint8Array>(
    maskedUuidBytes: UuidByteInput | UuidSlugError,
    output: Output,
    outputOffset?: number,
  ): UuidOutput<Output> | UuidSlugError;
  function maskedBytesToUuidBytes(
    maskedUuidBytes: Uint8Array | UuidSlugError,
    byteOffset: number,
  ): UuidV7Bytes | UuidSlugError;
  function maskedBytesToUuidBytes<Output extends Uint8Array>(
    maskedUuidBytes: Uint8Array | UuidSlugError,
    byteOffset: number,
    output: Output,
    outputOffset?: number,
  ): UuidOutput<Output> | UuidSlugError;
  function maskedBytesToUuidBytes(
    maskedUuidBytes: unknown,
    outputOrByteOffset?: Uint8Array | number,
    outputOrOutputOffset?: Uint8Array | number,
    offsetAfterOutput = 0,
  ): Uint8Array | UuidSlugError {
    // The named reader supplies source meaning; a prior shape check does not exclude masking.
    // Recognize a preceding error before output validation or invoking any key callback.
    const readsAtOffset = typeof outputOrByteOffset === "number";
    const byteOffset = readsAtOffset ? outputOrByteOffset : undefined;
    const source = readMaskedByteSource(maskedUuidBytes, byteOffset);
    if (!isSuccessfulUuidBytes(source)) return source;
    const output = (readsAtOffset ? outputOrOutputOffset : outputOrByteOffset) as
      | Uint8Array
      | undefined;
    const outputOffset = readsAtOffset
      ? offsetAfterOutput
      : ((outputOrOutputOffset as number | undefined) ?? 0);
    if (output !== undefined) {
      const invalid = checkByteRange(output, outputOffset, 16);
      if (invalid) return invalid;
    }
    const bytes = read(source, byteOffset);
    if (bytes instanceof Error) return bytes;
    if (!output) return bytes;
    output.set(bytes, outputOffset);
    return output;
  }

  function maskedBytesToUuidString<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
    maskedUuidBytes: UuidByteInput | UuidSlugError,
    ...textCase: UuidTextCaseArguments<Case>
  ): UuidV7StringFor<Case> | UuidSlugError;
  function maskedBytesToUuidString<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
    maskedUuidBytes: Uint8Array | UuidSlugError,
    byteOffset: number,
    ...textCase: UuidTextCaseArguments<Case>
  ): UuidV7StringFor<Case> | UuidSlugError;
  function maskedBytesToUuidString(
    maskedUuidBytes: unknown,
    offsetOrCase: number | UuidTextCase = UUID_TEXT_LOWERCASE,
    textCaseAfterOffset: UuidTextCase = UUID_TEXT_LOWERCASE,
  ): string | UuidSlugError {
    const readsAtOffset = typeof offsetOrCase === "number";
    const byteOffset = readsAtOffset ? offsetOrCase : undefined;
    const source = readMaskedByteSource(maskedUuidBytes, byteOffset);
    if (!isSuccessfulUuidBytes(source)) return source;
    const selectedCase = resolveUuidTextCase(readsAtOffset ? textCaseAfterOffset : offsetOrCase);
    if (selectedCase instanceof Error) return selectedCase;
    const bytes = read(source, byteOffset);
    return bytes instanceof Error ? bytes : formatUuidBytesUnchecked(bytes, 0, selectedCase);
  }

  return { uuidToMaskedBytes, maskedBytesToUuidBytes, maskedBytesToUuidString };
}
