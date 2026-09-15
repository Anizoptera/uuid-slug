// SPDX-License-Identifier: Apache-2.0

import { findUnknownOption, INVALID_OPTIONS, UuidSlugError } from "./errors.ts";
import type { UuidV7Payload, UuidV7PayloadLayout } from "./types.ts";

const PAYLOAD_BITS = 74;
const MAX_SUB_MILLISECOND_FRACTION_BITS = 12;
const PAYLOAD_LAYOUT_OPTIONS = {
  counterBits: true,
  subMillisecondFractionBits: true,
} as const satisfies Record<keyof UuidV7PayloadLayout, true>;

const lowBits = (bits: number): bigint => (bits === 0 ? 0n : (1n << BigInt(bits)) - 1n);
const describeBitCount = (value: unknown): string =>
  typeof value === "number" ? String(value) : `type ${typeof value}`;

interface ValidatedUuidV7PayloadLayout {
  readonly subMillisecondFractionBits: number;
  readonly counterBits: number;
}

/** Read every payload-layout field once and validate the complete declared split. */
export function readUuidV7PayloadLayout(
  layout: unknown,
): ValidatedUuidV7PayloadLayout | UuidSlugError {
  let subMillisecondFractionBits: unknown;
  let counterBits: unknown;
  try {
    if (typeof layout !== "object" || layout === null || Array.isArray(layout))
      return new UuidSlugError(INVALID_OPTIONS, "UUIDv7 payload layout must be an object.");
    const unknown = findUnknownOption(layout, PAYLOAD_LAYOUT_OPTIONS);
    if (unknown !== undefined)
      return new UuidSlugError(
        INVALID_OPTIONS,
        `Unknown UUIDv7 payload layout option: ${unknown}.`,
      );
    const source = layout as Partial<Record<keyof UuidV7PayloadLayout, unknown>>;
    subMillisecondFractionBits = source.subMillisecondFractionBits;
    counterBits = source.counterBits;
  } catch (cause) {
    return new UuidSlugError(INVALID_OPTIONS, "UUIDv7 payload layout could not be read.", {
      cause,
    });
  }
  if (
    !Number.isInteger(subMillisecondFractionBits) ||
    (subMillisecondFractionBits as number) < 0 ||
    (subMillisecondFractionBits as number) > MAX_SUB_MILLISECOND_FRACTION_BITS
  )
    return new UuidSlugError(
      INVALID_OPTIONS,
      `subMillisecondFractionBits must be a whole number from 0 through 12; got ${describeBitCount(subMillisecondFractionBits)}.`,
    );
  const fractionBits = subMillisecondFractionBits as number;
  const maximumCounterBits = PAYLOAD_BITS - fractionBits;
  if (
    !Number.isInteger(counterBits) ||
    (counterBits as number) < 0 ||
    (counterBits as number) > maximumCounterBits
  )
    return new UuidSlugError(
      INVALID_OPTIONS,
      `counterBits must be a whole number from 0 through ${maximumCounterBits} when subMillisecondFractionBits is ${fractionBits}; got ${describeBitCount(counterBits)}.`,
    );
  return { subMillisecondFractionBits: fractionBits, counterBits: counterBits as number };
}

/** Join `rand_a` and `rand_b`; version and variant bits are separators, not payload. */
export function uuidV7PayloadFromBytesUnchecked(bytes: Uint8Array, offset: number): bigint {
  let payload = BigInt((bytes[offset + 6] ?? 0) & 0x0f) << 70n;
  payload |= BigInt(bytes[offset + 7] ?? 0) << 62n;
  payload |= BigInt((bytes[offset + 8] ?? 0) & 0x3f) << 56n;
  for (let index = 9; index < 16; index++)
    payload |= BigInt(bytes[offset + index] ?? 0) << BigInt((15 - index) * 8);
  return payload;
}

export function extractPayloadFields(
  bytes: Uint8Array,
  offset: number,
  unixMs: number,
  layout: UuidV7PayloadLayout,
): UuidV7Payload | UuidSlugError {
  const validated = readUuidV7PayloadLayout(layout);
  if (validated instanceof Error) return validated;
  const { subMillisecondFractionBits, counterBits } = validated;
  const maximumCounterBits = PAYLOAD_BITS - subMillisecondFractionBits;

  const payload = uuidV7PayloadFromBytesUnchecked(bytes, offset);
  const remainingBits = maximumCounterBits - counterBits;
  const fractionShift = PAYLOAD_BITS - subMillisecondFractionBits;
  return {
    unixMs,
    subMillisecondFraction:
      subMillisecondFractionBits === 0
        ? undefined
        : {
            value: Number(payload >> BigInt(fractionShift)),
            bits: subMillisecondFractionBits,
          },
    counter:
      counterBits === 0
        ? undefined
        : {
            value: (payload >> BigInt(remainingBits)) & lowBits(counterBits),
            bits: counterBits,
          },
    remaining: { value: payload & lowBits(remainingBits), bits: remainingBits },
  };
}
