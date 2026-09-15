// SPDX-License-Identifier: Apache-2.0

import {
  findUnknownOption,
  INVALID_TIMESTAMP,
  INVALID_UUID_VERSION,
  TIMESTAMP_OUTSIDE_WINDOW,
  invalidUuidStringInput,
  UuidSlugError,
} from "./errors.ts";
import { UUID_TEXT_LOWERCASE } from "./types.ts";
import type {
  UuidTextCase,
  UuidV7StringFor,
  UuidV7StringInput,
  UuidV7TimestampWindow,
} from "./types.ts";
import {
  formatUuidBytesUnchecked,
  invalidUuidTextCase,
  isUuidTextCase,
  isUuidV7Bytes,
  uuidTimestampFromBytesUnchecked,
  uuidStringToBytes,
} from "./uuid.ts";

const TIMESTAMP_WINDOW_OPTIONS = {
  maxTimestampDeltaMs: true,
  referenceUnixMs: true,
} as const satisfies Record<keyof UuidV7TimestampWindow, true>;

/** Decode before reading the reference time so validation performs one clock observation. */
export function validateTimestampBytes(
  bytes: Uint8Array,
  window: UuidV7TimestampWindow,
): undefined | UuidSlugError {
  if (!isUuidV7Bytes(bytes))
    return new UuidSlugError(
      INVALID_UUID_VERSION,
      "Timestamp validation requires an RFC-variant UUIDv7.",
    );
  const timestamp = uuidTimestampFromBytesUnchecked(bytes, 0);
  let maxTimestampDeltaMs: number;
  let referenceUnixMs: number;
  try {
    if (typeof window !== "object" || window === null || Array.isArray(window))
      return new UuidSlugError(INVALID_TIMESTAMP, "Timestamp window must be an object.");
    const unknown = findUnknownOption(window, TIMESTAMP_WINDOW_OPTIONS);
    if (unknown !== undefined)
      return new UuidSlugError(INVALID_TIMESTAMP, `Unknown timestamp window option: ${unknown}.`);
    maxTimestampDeltaMs = window.maxTimestampDeltaMs;
    referenceUnixMs = window.referenceUnixMs ?? Date.now();
  } catch (cause) {
    return new UuidSlugError(INVALID_TIMESTAMP, "Timestamp window could not be read.", { cause });
  }
  if (!Number.isFinite(maxTimestampDeltaMs) || maxTimestampDeltaMs < 0)
    return new UuidSlugError(
      INVALID_TIMESTAMP,
      "maxTimestampDeltaMs must be a finite, nonnegative number of milliseconds.",
    );
  if (!Number.isFinite(referenceUnixMs))
    return new UuidSlugError(
      INVALID_TIMESTAMP,
      "referenceUnixMs must be a finite number of Unix milliseconds.",
    );
  if (
    timestamp < referenceUnixMs - maxTimestampDeltaMs ||
    timestamp > referenceUnixMs + maxTimestampDeltaMs
  )
    return new UuidSlugError(
      TIMESTAMP_OUTSIDE_WINDOW,
      `UUIDv7 timestamp ${timestamp} is outside ${referenceUnixMs - maxTimestampDeltaMs}..${referenceUnixMs + maxTimestampDeltaMs} Unix milliseconds.`,
    );
  return undefined;
}

/**
 * Validate accepted UUIDv7 text and return its normalized hyphenated spelling when its timestamp is
 * inside the inclusive symmetric window. Return `timestamp_outside_window` when it is not. This checks clock plausibility, not
 * expiry, authentication, replay, or issuance. TypeScript rejects known slug and UUIDv4 values. A
 * preceding `UuidSlugError` is returned unchanged.
 *
 * @param uuid - UUIDv7 text in an accepted spelling to validate and normalize.
 * @param window - Inclusive maximum distance from an explicit or current reference time.
 * @param textCase - Built-in output spelling. Omit for lowercase.
 */
export function validateUuidV7StringUnixMs<
  Input extends string | UuidSlugError,
  Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE,
>(
  uuid: UuidV7StringInput<Input>,
  window: UuidV7TimestampWindow,
  textCase?: Case,
): UuidV7StringFor<Case> | UuidSlugError {
  if (typeof uuid !== "string") return invalidUuidStringInput(uuid);
  const selectedCase = textCase ?? (UUID_TEXT_LOWERCASE as Case);
  if (!isUuidTextCase(selectedCase)) return invalidUuidTextCase();
  const uuidText: string = uuid;
  const bytes = uuidStringToBytes(uuidText);
  if (bytes instanceof Error) return bytes;
  const valid = validateTimestampBytes(bytes, window);
  if (valid instanceof Error) return valid;
  const alreadySelected =
    uuidText.length === 36 &&
    (selectedCase === UUID_TEXT_LOWERCASE
      ? uuidText === uuidText.toLowerCase()
      : uuidText === uuidText.toUpperCase());
  if (alreadySelected) return uuidText as UuidV7StringFor<Case>;
  return formatUuidBytesUnchecked(bytes, 0, selectedCase) as UuidV7StringFor<Case>;
}
