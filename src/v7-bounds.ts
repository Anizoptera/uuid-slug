// SPDX-License-Identifier: Apache-2.0

import { INVALID_TIMESTAMP, UuidSlugError } from "./errors.ts";
import { UUID_TEXT_LOWERCASE, UUID_TEXT_UPPERCASE } from "./types.ts";
import type { UuidTextCase, UuidV7Bounds, UuidV7Bytes, UuidV7StringFor } from "./types.ts";
import { resolveUuidTextCase } from "./uuid.ts";
import { rejectUuidV7UnixMs } from "./v7-timestamp.ts";

function intervalEnd(startUnixMs: number, endUnixMs: number): number | UuidSlugError {
  const invalid = rejectUuidV7UnixMs(startUnixMs) ?? rejectUuidV7UnixMs(endUnixMs);
  if (invalid) return invalid;
  return startUnixMs <= endUnixMs
    ? endUnixMs
    : new UuidSlugError(
        INVALID_TIMESTAMP,
        "UUIDv7 range start must not be after its inclusive end.",
      );
}

function endpoint(unixMs: number, upper: boolean): UuidV7Bytes {
  const bytes = new Uint8Array(16);
  if (upper) bytes.fill(0xff);
  const high = Math.floor(unixMs / 0x1_0000_0000);
  bytes[0] = high >>> 8;
  bytes[1] = high;
  bytes[2] = unixMs >>> 24;
  bytes[3] = unixMs >>> 16;
  bytes[4] = unixMs >>> 8;
  bytes[5] = unixMs;
  bytes[6] = upper ? 0x7f : 0x70;
  bytes[8] = upper ? 0xbf : 0x80;
  return bytes as UuidV7Bytes;
}

/**
 * Return owned byte bounds containing every RFC-variant UUIDv7 from `startUnixMs` through
 * `endUnixMs`. Omit the end to select one millisecond. Compare the bytes in UUID wire order.
 *
 * @param startUnixMs - First whole Unix millisecond, inclusive.
 * @param endUnixMs - Last whole Unix millisecond, inclusive. Defaults to `startUnixMs`.
 * @returns Two separate plain 16-byte arrays, or `invalid_timestamp` for an invalid interval.
 */
export function uuidV7ByteBounds(
  startUnixMs: number,
  endUnixMs: number = startUnixMs,
): UuidV7Bounds<UuidV7Bytes> | UuidSlugError {
  const end = intervalEnd(startUnixMs, endUnixMs);
  if (typeof end !== "number") return end;
  return {
    startInclusive: endpoint(startUnixMs, false),
    endInclusive: endpoint(end, true),
  };
}

function textEndpoint<Case extends UuidTextCase>(
  unixMs: number,
  upper: boolean,
  textCase: Case,
): UuidV7StringFor<Case> {
  const timestamp = unixMs.toString(16).padStart(12, "0");
  const suffix = upper ? "7fff-bfff-ffffffffffff" : "7000-8000-000000000000";
  const value = `${timestamp.slice(0, 8)}-${timestamp.slice(8)}-${suffix}`;
  return (textCase === UUID_TEXT_UPPERCASE ? value.toUpperCase() : value) as UuidV7StringFor<Case>;
}

/**
 * Return canonical bounds containing every RFC-variant UUIDv7 at one Unix millisecond. The
 * comparison must preserve UUID byte order; SQL Server `uniqueidentifier`, base64url text, and
 * masked slugs do not.
 *
 * @param startUnixMs - Whole Unix millisecond to select.
 * @param textCase - Built-in output spelling. Omit for lowercase.
 * @returns Canonical UUIDv7 endpoints, or `invalid_timestamp` for an invalid millisecond.
 */
export function uuidV7StringBounds<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
  startUnixMs: number,
  textCase?: Case,
): UuidV7Bounds<UuidV7StringFor<Case>> | UuidSlugError;
/**
 * Return canonical bounds containing every RFC-variant UUIDv7 in an inclusive Unix-millisecond
 * interval. The comparison must preserve UUID byte order.
 *
 * @param startUnixMs - First whole Unix millisecond, inclusive.
 * @param endUnixMs - Last whole Unix millisecond, inclusive.
 * @param textCase - Built-in output spelling. Omit for lowercase.
 * @returns Canonical UUIDv7 endpoints, or `invalid_timestamp` for an invalid interval.
 */
export function uuidV7StringBounds<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(
  startUnixMs: number,
  endUnixMs: number,
  textCase?: Case,
): UuidV7Bounds<UuidV7StringFor<Case>> | UuidSlugError;
export function uuidV7StringBounds(
  startUnixMs: number,
  endOrCase: number | UuidTextCase = startUnixMs,
  requestedCase: UuidTextCase = UUID_TEXT_LOWERCASE,
): UuidV7Bounds<UuidV7StringFor<UuidTextCase>> | UuidSlugError {
  const endUnixMs = typeof endOrCase === "number" ? endOrCase : startUnixMs;
  const textCase = resolveUuidTextCase(typeof endOrCase === "number" ? requestedCase : endOrCase);
  if (textCase instanceof Error) return textCase;
  const end = intervalEnd(startUnixMs, endUnixMs);
  if (typeof end !== "number") return end;
  // Direct formatting avoids two temporary byte arrays. Keep the byte writer independent unless
  // repeated public-route measurements reverse this result; bench/PERFORMANCE.md owns that trigger.
  return {
    startInclusive: textEndpoint(startUnixMs, false, textCase),
    endInclusive: textEndpoint(end, true, textCase),
  };
}
