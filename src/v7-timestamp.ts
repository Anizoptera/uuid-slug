// SPDX-License-Identifier: Apache-2.0

import { INVALID_TIMESTAMP, UuidSlugError } from "./errors.ts";

/** The 48 bits RFC 9562 gives the timestamp; beyond it the value cannot be represented. */
export const MAX_UUID_V7_UNIX_MS = 0xffff_ffff_ffff;

/** Return whether a number fits the UUIDv7 millisecond field exactly. */
export const isValidUuidV7UnixMs = /* @__NO_SIDE_EFFECTS__ */ (unixMs: number): boolean =>
  Number.isInteger(unixMs) && unixMs >= 0 && unixMs <= MAX_UUID_V7_UNIX_MS;

/** Reject fractions and out-of-range values before constructing or delegating a UUIDv7 value. */
export const rejectUuidV7UnixMs = /* @__NO_SIDE_EFFECTS__ */ (
  unixMs: number,
): undefined | UuidSlugError =>
  isValidUuidV7UnixMs(unixMs)
    ? undefined
    : new UuidSlugError(
        INVALID_TIMESTAMP,
        `UUIDv7 timestamp must be a whole number of milliseconds in 0..${MAX_UUID_V7_UNIX_MS}.`,
      );
