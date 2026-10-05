// SPDX-License-Identifier: Apache-2.0

import { bytesToUuidString, plainSlugToUuidBytes } from "../src/index";

export type GenerationValue =
  | number
  | string
  | boolean
  | Uint8Array
  | Readonly<Uint8Array>
  | { readonly uuid: string; readonly slug: string };

export interface GenerationCase {
  readonly comparable: string;
  readonly implementation: string;
  readonly name: string;
  readonly note?: string;
  readonly outputOffset?: number;
  readonly operation: () => GenerationValue;
  readonly expectedTimestamps?: readonly number[];
  readonly expectedValues?: readonly GenerationValue[];
  /** Require fresh plain arrays, rather than Buffer subclasses or reused backing storage. */
  readonly ownedBytes?: true;
  readonly secure?: boolean;
  readonly qualification: "qualified" | "rejected";
  readonly rejectionReason?: string;
  readonly version: 4 | 7;
}

/** Keep the host-only rival's timing and profiling on the same qualified consumer call. */
export function cryptoRandomUuidCase(operation: () => string): GenerationCase {
  return {
    comparable: "v4.text.secure",
    implementation: "node-native-or-polyfill",
    name: "crypto-randomuuid.v4.text",
    operation,
    qualification: "qualified",
    secure: true,
    version: 4,
  };
}

/** Select related complete jobs in one build; a single term retains its substring meaning. */
export function generationNameFilter(filter: string | null | undefined): (name: string) => boolean {
  if (!filter) return () => true;
  const terms = filter.split(",").map((term) => term.trim());
  if (terms.some((term) => term.length === 0))
    throw new Error("Generation filters must contain nonempty comma-separated name terms.");
  return (name) => terms.some((term) => name.includes(term));
}

/** Fail before timing when a row no longer returns the representation it claims. */
export function verifyGenerationCase(candidate: GenerationCase): void {
  // Fixed conversions need exact payload witnesses; a version nibble cannot detect lost bytes.
  if (candidate.expectedValues) {
    if (candidate.expectedValues.length === 0)
      throw new Error(`${candidate.name} has no fixed conversion witnesses`);
    let previousBuffer: ArrayBufferLike | undefined;
    for (const expected of candidate.expectedValues) {
      const value = candidate.operation();
      const matches =
        expected instanceof Uint8Array
          ? value instanceof Uint8Array &&
            value.length === expected.length &&
            expected.every((byte, index) => byte === value[index])
          : value === expected;
      if (!matches) throw new Error(`${candidate.name} returned the wrong fixed conversion value`);
      // Payload equality alone lets pooled Buffer views or a reused scratch masquerade as
      // owned results. Keep this proof outside timing and apply it only to rows promising ownership.
      if (candidate.ownedBytes) {
        if (
          !(value instanceof Uint8Array) ||
          value.constructor !== Uint8Array ||
          value.buffer === previousBuffer
        )
          throw new Error(`${candidate.name} must return fresh plain Uint8Array storage`);
        previousBuffer = value.buffer;
      }
    }
    return;
  }
  const value = candidate.operation();
  if (candidate.comparable.includes(".pair.")) {
    // Valid independent identifiers are not a pair: both spellings must preserve the same bits.
    if (typeof value !== "object" || !("uuid" in value) || !("slug" in value))
      throw new Error(`${candidate.name} did not return a UUID and slug pair`);
    const bytes = plainSlugToUuidBytes(value.slug);
    if (
      !(bytes instanceof Uint8Array) ||
      bytes[6]! >>> 4 !== candidate.version ||
      (bytes[8]! & 0xc0) !== 0x80 ||
      bytesToUuidString(bytes) !== value.uuid
    )
      throw new Error(`${candidate.name} returned mismatched UUID and slug payloads`);
    return;
  }
  if (candidate.expectedTimestamps !== undefined) {
    if (typeof value !== "number" || !candidate.expectedTimestamps.includes(value))
      throw new Error(`${candidate.name} returned the wrong UUIDv7 timestamp`);
    return;
  }
  if (candidate.comparable.includes(".text.")) {
    if (
      typeof value !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[47][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value) ||
      value[14] !== String(candidate.version)
    )
      throw new Error(`${candidate.name} did not return canonical UUIDv${candidate.version} text`);
    return;
  }
  if (candidate.comparable.includes(".slug.")) {
    const bytes = typeof value === "string" ? plainSlugToUuidBytes(value) : undefined;
    if (
      typeof value !== "string" ||
      value.length !== 22 ||
      !(bytes instanceof Uint8Array) ||
      bytes[6]! >>> 4 !== candidate.version
    )
      throw new Error(
        `${candidate.name} did not return a base64url UUIDv${candidate.version} slug`,
      );
    return;
  }
  const offset = candidate.outputOffset ?? 0;
  if (
    !(value instanceof Uint8Array) ||
    value.length < offset + 16 ||
    value[offset + 6]! >>> 4 !== candidate.version ||
    (value[offset + 8]! & 0xc0) !== 0x80
  )
    throw new Error(`${candidate.name} did not return UUID bytes`);
  // Qualified allocated-byte rows promise caller-private plain storage. Checking only the
  // version bits would let a reused scratch or Buffer win a comparison for a different result.
  if (
    candidate.ownedBytes ||
    (candidate.qualification === "qualified" && candidate.comparable.includes(".bytes.allocate."))
  ) {
    const next = candidate.operation();
    if (
      value.constructor !== Uint8Array ||
      !(next instanceof Uint8Array) ||
      next.constructor !== Uint8Array ||
      next.length !== 16 ||
      value.length !== 16 ||
      next.buffer === value.buffer
    )
      throw new Error(`${candidate.name} must return fresh plain Uint8Array storage`);
  }
}
