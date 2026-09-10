// SPDX-License-Identifier: Apache-2.0

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
  /** Native values are untrusted until the public generator validates their representation. */
  uuidV4?(this: void): string;
  uuidV7?(this: void): string;
  /** Return native-owned bytes; caller-buffer validation and writes belong to the public generator. */
  uuidV7Bytes?(this: void): Uint8Array;
  uuidV7Slug?(this: void): string;
  /**
   * Generate at a caller-supplied millisecond. SEPARATE from `uuidV7` on purpose, because
   * accepting a timestamp is independent of generation. Define it only when the platform honors
   * the timestamp; otherwise the portable generator handles the request.
   */
  uuidV7At?(this: void, timestamp: number): string;
  uuidV7BytesAt?(this: void, timestamp: number): Uint8Array;
}
