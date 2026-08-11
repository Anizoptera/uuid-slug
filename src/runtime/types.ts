// SPDX-License-Identifier: Apache-2.0

export interface Runtime {
  /**
   * The buffer is pinned to a plain `ArrayBuffer` because Web Crypto's `getRandomValues`
   * rejects a `SharedArrayBuffer` view at runtime, and the unparameterised `Uint8Array`
   * admits one. Narrowing here makes that refusal unrepresentable instead of a throw.
   */
  fillRandom(this: void, bytes: Uint8Array<ArrayBuffer>): void;
  /**
   * `this: void` throughout, because these are read off the adapter and stored (a generator keeps
   * `runtime.fillRandom`; the codec keeps `runtime.uuidV7Slug`). An implementation that reached
   * for `this` would work when called through the object and break once detached, which the
   * annotation turns into a compile error at the adapter instead.
   */
  uuidV4?(this: void): string;
  uuidV7?(this: void): string;
  uuidV7Bytes?(this: void, out?: Uint8Array, offset?: number): Uint8Array;
  uuidV7Slug?(this: void): string;
  /**
   * Generate at a caller-supplied millisecond. SEPARATE from `uuidV7` on purpose, because
   * accepting a timestamp is a capability a native generator has independently of generating at
   * all, and getting that wrong is silent: Node's `crypto.randomUUIDv7` takes an options object
   * and IGNORES an unknown key, so passing a timestamp through it returns the current time with
   * no error anywhere. Defined only where the platform provably honours the value — measured
   * 2026-08-11, `Bun.randomUUIDv7("hex", 1577836800000)` yields the 2020 prefix `016f5e66e800`.
   * Left undefined otherwise, which routes the call to the portable generator.
   */
  uuidV7At?(this: void, timestamp: number): string;
  uuidV7BytesAt?(this: void, timestamp: number, out?: Uint8Array, offset?: number): Uint8Array;
}
