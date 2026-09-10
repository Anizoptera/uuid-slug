// SPDX-License-Identifier: Apache-2.0

import type { UuidV4String, UuidV7Slug, UuidV7String } from "../types";

export interface Runtime {
  /**
   * The buffer is pinned to a plain `ArrayBuffer` because Web Crypto's `getRandomValues`
   * rejects a `SharedArrayBuffer` view at runtime, and the unparameterised `Uint8Array`
   * admits one. Narrowing here makes that refusal unrepresentable instead of a throw.
   */
  fillRandom(this: void, bytes: Uint8Array<ArrayBuffer>): void;
  /**
   * Hooks are detached from the adapter, so `this: void` rejects implementations that depend on
   * method binding.
   */
  /**
   * Exact branded returns prevent native hooks from widening the codec's public return types.
   * Runtime tests still verify the platform call emits the expected representation.
   */
  uuidV4?(this: void): UuidV4String;
  uuidV7?(this: void): UuidV7String;
  /** Return native-owned bytes; caller-buffer validation and writes belong to the public generator. */
  uuidV7Bytes?(this: void): Uint8Array;
  uuidV7Slug?(this: void): UuidV7Slug;
  /**
   * Generate at a caller-supplied millisecond. SEPARATE from `uuidV7` on purpose, because
   * accepting a timestamp is independent of generation. Define it only when the platform honors
   * the timestamp; otherwise the portable generator handles the request.
   */
  uuidV7At?(this: void, timestamp: number): UuidV7String;
  uuidV7BytesAt?(this: void, timestamp: number): Uint8Array;
}
