// SPDX-License-Identifier: Apache-2.0

import { isUuidSlugError, UuidSlugError } from "./errors.ts";
import type { UuidV7String, UuidV7StringInput, UuidV7TimestampWindow } from "./types.ts";
import { isUuidV7Bytes, uuidTimestampFromBytesUnchecked, uuidStringToBytes } from "./uuid.ts";

/** Decode before reading the reference time so validation performs one clock observation. */
export function validateTimestampBytes(
  bytes: Uint8Array,
  window: UuidV7TimestampWindow,
): undefined | UuidSlugError {
  if (!isUuidV7Bytes(bytes)) return new UuidSlugError("invalid_uuid_version", "Expected UUIDv7.");
  const timestamp = uuidTimestampFromBytesUnchecked(bytes, 0);
  let maxTimestampDeltaMs: number;
  let referenceUnixMs: number;
  try {
    if (typeof window !== "object" || window === null || Array.isArray(window))
      return new UuidSlugError("invalid_timestamp", "Timestamp window must be an object.");
    maxTimestampDeltaMs = window.maxTimestampDeltaMs;
    referenceUnixMs = window.referenceUnixMs ?? Date.now();
  } catch (cause) {
    return new UuidSlugError("invalid_timestamp", "Timestamp window could not be read.", { cause });
  }
  if (!Number.isFinite(maxTimestampDeltaMs) || maxTimestampDeltaMs < 0)
    return new UuidSlugError(
      "invalid_timestamp",
      "maxTimestampDeltaMs must be a finite, nonnegative number of milliseconds.",
    );
  if (!Number.isFinite(referenceUnixMs))
    return new UuidSlugError(
      "invalid_timestamp",
      "referenceUnixMs must be a finite number of Unix milliseconds.",
    );
  if (
    timestamp < referenceUnixMs - maxTimestampDeltaMs ||
    timestamp > referenceUnixMs + maxTimestampDeltaMs
  )
    return new UuidSlugError(
      "timestamp_outside_window",
      "UUIDv7 timestamp is outside the accepted window.",
    );
  return undefined;
}

/**
 * Return canonical UUIDv7 text when its timestamp is inside the inclusive symmetric window.
 * Return `timestamp_outside_window` when it is not. This checks clock plausibility, not expiry,
 * authentication, replay, or issuance. TypeScript rejects known slug and UUIDv4 values. A
 * preceding `UuidSlugError` is returned unchanged.
 *
 * @param uuid - Canonical UUIDv7 text to validate and return.
 * @param window - Inclusive maximum distance from an explicit or current reference time.
 */
export function validateUuidV7Timestamp<Input extends string | UuidSlugError>(
  uuid: UuidV7StringInput<Input>,
  window: UuidV7TimestampWindow,
): (Input & UuidV7String) | UuidSlugError {
  if (isUuidSlugError(uuid)) return uuid;
  const uuidText: string = uuid;
  const bytes = uuidStringToBytes(uuidText);
  if (isUuidSlugError(bytes)) return bytes;
  const valid = validateTimestampBytes(bytes, window);
  return isUuidSlugError(valid) ? valid : (uuidText as Input & UuidV7String);
}
