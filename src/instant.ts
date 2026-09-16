// SPDX-License-Identifier: Apache-2.0

import { INVALID_TIMESTAMP, stringInput, UuidSlugError } from "./errors.ts";
import type { UuidV7Instant } from "./types.ts";
import { MAX_UUID_V7_UNIX_MS } from "./v7-timestamp.ts";

const INVALID_INSTANT =
  "UUIDv7 instant must be a finite Unix-millisecond value, a valid Date, zoned ISO timestamp text, or a supported epoch timestamp object.";
const ZONED_TIMESTAMP =
  /^([+-]\d{6}|\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(?:[Zz]|([+-])(\d{2}):(\d{2}))$/;
const MAX_UUID_V7_UNIX_MS_BIGINT = BigInt(MAX_UUID_V7_UNIX_MS);
const NANOS_PER_MILLISECOND = 1_000_000n;
const MAX_FRACTION_BITS = 12;
const FRACTION_BUCKETS = 2 ** MAX_FRACTION_BITS;
const DECIMAL_FRACTION_SCALE = 1_000_000_000_000;
const NEGATIVE_OFFSET_SIGN = "-";
const ZERO_DIGIT = "0";

/** The UUIDv7 millisecond field and the remaining fraction of that millisecond. */
export interface NormalizedUuidV7Instant {
  readonly unixMs: number;
  /** Exact bucket at the maximum UUIDv7 fraction width; narrower layouts use its leading bits. */
  readonly fractionBucket12: number;
}

const invalidInstant = (cause?: unknown) =>
  new UuidSlugError(
    INVALID_TIMESTAMP,
    INVALID_INSTANT,
    cause === undefined ? undefined : { cause },
  );

function readUnixMilliseconds(value: unknown): NormalizedUuidV7Instant | UuidSlugError {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0 || value >= MAX_UUID_V7_UNIX_MS + 1)
      return invalidInstant();
    const unixMs = Math.floor(value);
    return {
      unixMs,
      fractionBucket12: Math.min(
        FRACTION_BUCKETS - 1,
        Math.floor((value - unixMs) * FRACTION_BUCKETS),
      ),
    };
  }
  if (typeof value !== "bigint" || value < 0n || value > MAX_UUID_V7_UNIX_MS_BIGINT)
    return invalidInstant();
  return { unixMs: Number(value), fractionBucket12: 0 };
}

function readEpochNanoseconds(value: unknown): NormalizedUuidV7Instant | UuidSlugError {
  if (typeof value !== "bigint" || value < 0n) return invalidInstant();
  const unixMs = value / NANOS_PER_MILLISECOND;
  if (unixMs > MAX_UUID_V7_UNIX_MS_BIGINT) return invalidInstant();
  return {
    unixMs: Number(unixMs),
    fractionBucket12: Number(
      ((value % NANOS_PER_MILLISECOND) * BigInt(FRACTION_BUCKETS)) / NANOS_PER_MILLISECOND,
    ),
  };
}

function readDecimalFraction(fractionDigits: string) {
  const wholeMilliseconds = Number(fractionDigits.slice(0, 3).padEnd(3, ZERO_DIGIT));
  // Every k / 4096 boundary terminates within twelve decimal places. Digits beyond this window
  // can refine the source instant but cannot change its exact 12-bit UUID fraction bucket.
  const subMillisecondDigits = fractionDigits.slice(3, 15).padEnd(12, ZERO_DIGIT);
  const fractionBucket12 = Math.floor(
    (Number(subMillisecondDigits) * FRACTION_BUCKETS) / DECIMAL_FRACTION_SCALE,
  );
  return { wholeMilliseconds, fractionBucket12 };
}

function readZonedTimestamp(instant: string): NormalizedUuidV7Instant | UuidSlugError {
  const match = ZONED_TIMESTAMP.exec(instant);
  if (match === null) return invalidInstant();
  const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const fractionDigits = match[7] ?? "";
  const offsetSign = match[8];
  const offsetHour = Number(match[9] ?? 0);
  const offsetMinute = Number(match[10] ?? 0);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 23 ||
    offsetMinute > 59 ||
    (offsetSign === NEGATIVE_OFFSET_SIGN && offsetHour === 0 && offsetMinute === 0)
  )
    return invalidInstant();

  const local = new Date(0);
  local.setUTCFullYear(year, month - 1, day);
  local.setUTCHours(hour, minute, second, 0);
  if (
    local.getUTCFullYear() !== year ||
    local.getUTCMonth() !== month - 1 ||
    local.getUTCDate() !== day ||
    local.getUTCHours() !== hour ||
    local.getUTCMinutes() !== minute ||
    local.getUTCSeconds() !== second
  )
    return invalidInstant();

  const fraction = readDecimalFraction(fractionDigits);
  const offset = (offsetHour * 60 + offsetMinute) * 60_000;
  const unixMs =
    local.getTime() +
    fraction.wholeMilliseconds +
    (offsetSign === "+" ? -offset : offsetSign === NEGATIVE_OFFSET_SIGN ? offset : 0);
  if (unixMs < 0 || unixMs > MAX_UUID_V7_UNIX_MS) return invalidInstant();
  return { unixMs, fractionBucket12: fraction.fractionBucket12 };
}

/** Read an explicit UUIDv7 instant once and retain the precision its source provides. */
export function readUuidV7Instant(instant: UuidV7Instant): NormalizedUuidV7Instant | UuidSlugError;
export function readUuidV7Instant(instant: unknown): NormalizedUuidV7Instant | UuidSlugError;
export function readUuidV7Instant(instant: unknown): NormalizedUuidV7Instant | UuidSlugError {
  if (typeof instant === "number" || typeof instant === "bigint")
    return readUnixMilliseconds(instant);
  if (typeof instant === "string") return readZonedTimestamp(instant);
  if (instant === null || typeof instant !== "object") return invalidInstant();

  let dateCause: unknown;
  try {
    // The intrinsic brand check works across realms and runs before record access so attaching
    // fields to a Date cannot change its meaning or invoke caller code only in another realm.
    return readUnixMilliseconds(Date.prototype.getTime.call(instant));
  } catch (cause) {
    dateCause = cause;
  }

  const timestamp = stringInput(instant);
  if (timestamp !== undefined) return readZonedTimestamp(timestamp);

  try {
    const source = instant as {
      readonly epochMilliseconds?: unknown;
      readonly epochNanoseconds?: unknown;
      readonly seconds?: unknown;
      readonly nanoseconds?: unknown;
    };
    const epochMilliseconds = source.epochMilliseconds;
    const epochNanoseconds = source.epochNanoseconds;
    const seconds = source.seconds;
    const nanoseconds = source.nanoseconds;
    if (
      (seconds !== undefined || nanoseconds !== undefined) &&
      (epochMilliseconds !== undefined || epochNanoseconds !== undefined)
    )
      return invalidInstant();
    if (epochNanoseconds !== undefined) {
      const normalized = readEpochNanoseconds(epochNanoseconds);
      if (normalized instanceof Error || epochMilliseconds === undefined) return normalized;
      const stated = readUnixMilliseconds(epochMilliseconds);
      return stated instanceof Error ||
        stated.unixMs !== normalized.unixMs ||
        (stated.fractionBucket12 !== normalized.fractionBucket12 &&
          (stated.fractionBucket12 !== 0 ||
            (typeof epochMilliseconds === "number" && !Number.isInteger(epochMilliseconds))))
        ? invalidInstant()
        : normalized;
    }

    if (epochMilliseconds !== undefined) return readUnixMilliseconds(epochMilliseconds);

    if (seconds !== undefined) {
      const resolvedNanoseconds = nanoseconds ?? 0;
      if (
        (typeof seconds !== "bigint" &&
          (typeof seconds !== "number" || !Number.isSafeInteger(seconds))) ||
        (typeof resolvedNanoseconds !== "bigint" &&
          (typeof resolvedNanoseconds !== "number" ||
            !Number.isSafeInteger(resolvedNanoseconds))) ||
        resolvedNanoseconds < 0 ||
        resolvedNanoseconds > 999_999_999
      )
        return invalidInstant();
      return readEpochNanoseconds(BigInt(seconds) * 1_000_000_000n + BigInt(resolvedNanoseconds));
    }
  } catch (cause) {
    return invalidInstant(cause);
  }

  return invalidInstant(dateCause);
}
