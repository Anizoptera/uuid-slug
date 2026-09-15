// SPDX-License-Identifier: Apache-2.0

import type { UuidV7MaskingCodec, UuidV7PayloadLayout } from "./types.ts";
import { isUint8Array } from "./errors.ts";

export interface UuidValueState {
  readonly bytes: Uint8Array;
  readonly maskingCodec?: UuidV7MaskingCodec;
  readonly payloadLayout?: UuidV7PayloadLayout;
}

export const UUID_VALUE_BYTES = Symbol.for("@anizoptera/uuid-slug.uuid-value-bytes");
const UUID_VALUE_STATES = new WeakMap<object, UuidValueState>();

export function registerUuidValue(value: object, state: UuidValueState): void {
  UUID_VALUE_STATES.set(value, state);
}

export function localUuidValueState(value: unknown): UuidValueState | undefined {
  return typeof value === "object" && value !== null ? UUID_VALUE_STATES.get(value) : undefined;
}

/** Recognize local values without allocation and duplicate-package values through one stable protocol. */
export function uuidValueBytes(value: unknown): Uint8Array | undefined {
  const local = localUuidValueState(value);
  if (local) return local.bytes;
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
