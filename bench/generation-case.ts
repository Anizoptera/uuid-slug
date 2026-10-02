// SPDX-License-Identifier: Apache-2.0

import { plainSlugToUuidBytes } from "../src/index";

export type GenerationValue = number | string | Uint8Array | Readonly<Uint8Array>;

export interface GenerationCase {
  readonly comparable: string;
  readonly implementation: string;
  readonly name: string;
  readonly note?: string;
  readonly outputOffset?: number;
  readonly operation: () => GenerationValue;
  readonly expectedTimestamps?: readonly number[];
  readonly secure?: boolean;
  readonly qualification: "qualified" | "rejected";
  readonly rejectionReason?: string;
  readonly version: 4 | 7;
}

/** Fail before timing when a row no longer returns the representation it claims. */
export function verifyGenerationCase(candidate: GenerationCase): void {
  const value = candidate.operation();
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
}
