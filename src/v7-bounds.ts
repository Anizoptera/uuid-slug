// SPDX-License-Identifier: Apache-2.0

import { INVALID_TIMESTAMP, UuidSlugError } from "./errors.ts";
import { runtime } from "#runtime";
import { UUID_TEXT_LOWERCASE, UUID_TEXT_UPPERCASE } from "./types.ts";
import type {
  UuidTextCase,
  UuidTextCaseArguments,
  UuidV7Bounds,
  UuidV7Bytes,
  UuidV7StringFor,
} from "./types.ts";
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

const START_SUFFIX = "-7000-8000-000000000000";
const END_SUFFIX = "-7fff-bfff-ffffffffffff";
let hexCodes: Uint8Array | undefined;

function fixedTextEndpoint<Case extends UuidTextCase>(
  unixMs: number,
  upper: boolean,
  textCase: Case,
): UuidV7StringFor<Case> {
  // Fixed character arguments reduce consumed bounds costs on V8 with the JIT. Byte pairs remain
  // faster on Bun and JITless Node; selection is outside per-ID calls. Remeasure engine changes
  // against bench/PERFORMANCE.md, including both endpoint reads and lazy table construction.
  const hex = (hexCodes ??= Uint8Array.from("0123456789abcdef", (digit) => digit.charCodeAt(0)));
  // Validated timestamps have 48 bits; splitting avoids truncating their upper 16 bits.
  const high = Math.floor(unixMs / 0x1_0000_0000);
  const value =
    String.fromCharCode(
      hex[high >>> 12] as number,
      hex[(high >>> 8) & 15] as number,
      hex[(high >>> 4) & 15] as number,
      hex[high & 15] as number,
      hex[unixMs >>> 28] as number,
      hex[(unixMs >>> 24) & 15] as number,
      hex[(unixMs >>> 20) & 15] as number,
      hex[(unixMs >>> 16) & 15] as number,
      45,
      hex[(unixMs >>> 12) & 15] as number,
      hex[(unixMs >>> 8) & 15] as number,
      hex[(unixMs >>> 4) & 15] as number,
      hex[unixMs & 15] as number,
    ) + (upper ? END_SUFFIX : START_SUFFIX);
  return (textCase === UUID_TEXT_UPPERCASE ? value.toUpperCase() : value) as UuidV7StringFor<Case>;
}

let hexBytes: string[] | undefined;

function textEndpoint<Case extends UuidTextCase>(
  unixMs: number,
  upper: boolean,
  textCase: Case,
): UuidV7StringFor<Case> {
  // Byte pairs avoid radix formatting and beat fixed character arguments on Bun and JITless Node.
  // Build the table on first use so imports that never request bounds pay no table construction.
  // Remeasure radix formatting and fixed arguments after engine changes (bench/PERFORMANCE.md).
  const hex = (hexBytes ??= Array.from({ length: 256 }, (_, byte) =>
    byte.toString(16).padStart(2, "0"),
  ));
  // `rejectUuidV7UnixMs` admits only whole milliseconds below 2^48, so `high` holds 16 bits and
  // the unsigned shifts read the low 32 bits exactly.
  const high = Math.floor(unixMs / 0x1_0000_0000);
  const suffix = upper ? END_SUFFIX : START_SUFFIX;
  const value =
    (hex[high >>> 8] as string) +
    (hex[high & 0xff] as string) +
    (hex[unixMs >>> 24] as string) +
    (hex[(unixMs >>> 16) & 0xff] as string) +
    "-" +
    (hex[(unixMs >>> 8) & 0xff] as string) +
    (hex[unixMs & 0xff] as string) +
    suffix;
  return (textCase === UUID_TEXT_UPPERCASE ? value.toUpperCase() : value) as UuidV7StringFor<Case>;
}

const selectedTextEndpoint =
  runtime.latin1Scratch || runtime.jitless ? textEndpoint : fixedTextEndpoint;

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
  ...textCase: UuidTextCaseArguments<Case>
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
  ...textCase: UuidTextCaseArguments<Case>
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
    startInclusive: selectedTextEndpoint(startUnixMs, false, textCase),
    endInclusive: selectedTextEndpoint(end, true, textCase),
  };
}
