// SPDX-License-Identifier: Apache-2.0

import {
  checkByteRange,
  INVALID_MASK,
  INVALID_UUID_SLUG,
  INVALID_UUID_VERSION,
  isSuccessfulUuidBytes,
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
  MaskedUuidBytesInput,
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

/** Keep binary provenance explicit: raw UUID bytes and mixed bytes have the same runtime shape. */
export function createMaskedByteMethods(
  decodeUuid: (uuid: unknown) => Uint8Array | UuidSlugError,
  current: UuidV7MaskRange,
  previous: readonly UuidV7MaskRange[],
  sentinels: readonly { readonly bytes: Uint8Array }[],
): BinaryMethods {
  function sentinel(bytes: Uint8Array): Uint8Array | undefined {
    // Raw sentinels must win before a probabilistic key check, including outside the masked range.
    for (const entry of sentinels) {
      let index = 0;
      while (index < 16 && entry.bytes[index] === bytes[index]) index += 1;
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

  function read(source: Uint8Array): Uint8Array | UuidSlugError {
    const reserved = sentinel(source);
    if (reserved) return new Uint8Array(reserved);
    // Snapshot once before callbacks: a callback may mutate the caller's original ciphertext.
    const bytes = new Uint8Array(source);
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

  function maskedBytesToUuidBytes<Input extends UuidByteInput | UuidSlugError>(
    maskedUuidBytes: MaskedUuidBytesInput<Input>,
  ): UuidV7Bytes | UuidSlugError;
  function maskedBytesToUuidBytes<
    Input extends UuidByteInput | UuidSlugError,
    Output extends Uint8Array,
  >(
    maskedUuidBytes: MaskedUuidBytesInput<Input>,
    output: Output,
    outputOffset?: number,
  ): UuidOutput<Output> | UuidSlugError;
  function maskedBytesToUuidBytes(
    maskedUuidBytes: unknown,
    output?: Uint8Array,
    outputOffset = 0,
  ): Uint8Array | UuidSlugError {
    // Recognize a preceding error before output validation or invoking any key callback.
    const source = exactUuidByteView(maskedUuidBytes);
    if (!isSuccessfulUuidBytes(source)) return source;
    if (output !== undefined) {
      const invalid = checkByteRange(output, outputOffset, 16);
      if (invalid) return invalid;
    }
    const bytes = read(source);
    if (bytes instanceof Error) return bytes;
    if (!output) return bytes;
    output.set(bytes, outputOffset);
    return output;
  }

  function maskedBytesToUuidString<
    Input extends UuidByteInput | UuidSlugError,
    Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE,
  >(
    maskedUuidBytes: MaskedUuidBytesInput<Input>,
    ...textCase: UuidTextCaseArguments<Case>
  ): UuidV7StringFor<Case> | UuidSlugError;
  function maskedBytesToUuidString(
    maskedUuidBytes: unknown,
    textCase: UuidTextCase = UUID_TEXT_LOWERCASE,
  ): string | UuidSlugError {
    const source = exactUuidByteView(maskedUuidBytes);
    if (!isSuccessfulUuidBytes(source)) return source;
    const selectedCase = resolveUuidTextCase(textCase);
    if (selectedCase instanceof Error) return selectedCase;
    const bytes = read(source);
    return bytes instanceof Error ? bytes : formatUuidBytesUnchecked(bytes, 0, selectedCase);
  }

  return { uuidToMaskedBytes, maskedBytesToUuidBytes, maskedBytesToUuidString };
}
