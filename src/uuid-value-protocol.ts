// SPDX-License-Identifier: Apache-2.0

import type { UuidV7MaskingCodec, UuidV7PayloadLayout } from "./types.ts";
import { isUint8Array } from "./errors.ts";

export const UUID_VALUE_BYTES = Symbol.for("@anizoptera/uuid-slug.uuid-value-bytes");

/**
 * Base of every UUID value this package copy creates. Readers recognize values through it without
 * importing the value class, and private fields keep the state off the frozen value's own properties.
 *
 * A module `WeakMap` keyed by value is the rejected alternative: registering each value cost more
 * than the rest of value creation (bench/PERFORMANCE.md). Remeasure if engines change how they
 * store private fields or weak collections.
 */
export class LocalUuidValue {
  readonly #bytes: Uint8Array;
  readonly #maskingCodec: UuidV7MaskingCodec | undefined;
  readonly #payloadLayout: UuidV7PayloadLayout | undefined;

  /**
   * @param bytes - Package-owned bytes that nothing else writes.
   * @param payloadLayout - Package-owned layout that no caller can reach or change.
   */
  constructor(
    bytes: Uint8Array,
    maskingCodec: UuidV7MaskingCodec | undefined,
    payloadLayout: UuidV7PayloadLayout | undefined,
  ) {
    this.#bytes = bytes;
    this.#maskingCodec = maskingCodec;
    this.#payloadLayout = payloadLayout;
  }

  /** Recognize a value this package copy created; a lookalike or proxy is not one. */
  static is(value: unknown): value is LocalUuidValue {
    return typeof value === "object" && value !== null && #bytes in value;
  }

  // The readers below trust their argument: a detached method called on another object throws
  // `TypeError` instead of reading state.
  static ownBytes(value: LocalUuidValue): Uint8Array {
    return value.#bytes;
  }

  static ownMaskingCodec(value: LocalUuidValue): UuidV7MaskingCodec | undefined {
    return value.#maskingCodec;
  }

  static ownPayloadLayout(value: LocalUuidValue): UuidV7PayloadLayout | undefined {
    return value.#payloadLayout;
  }
}

/** Recognize local values without allocation and duplicate-package values through one stable protocol. */
export function uuidValueBytes(value: unknown): Uint8Array | undefined {
  if (LocalUuidValue.is(value)) return LocalUuidValue.ownBytes(value);
  if (typeof value !== "object" || value === null) return undefined;
  try {
    const read = Reflect.get(value, UUID_VALUE_BYTES);
    if (typeof read !== "function") return undefined;
    const bytes = Reflect.apply(read, value, []);
    return isUint8Array(bytes) && bytes.length === 16 ? bytes : undefined;
  } catch {
    return undefined;
  }
}
