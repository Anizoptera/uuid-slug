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
   * `this: void` throughout, because these are read off the adapter and stored (a generator keeps
   * `runtime.fillRandom`; the codec keeps `runtime.uuidV7Slug`). An implementation that reached
   * for `this` would work when called through the object and break once detached, which the
   * annotation turns into a compile error at the adapter instead.
   */
  /**
   * BRANDED rather than `string`, which is load-bearing. These values are returned straight out of
   * the codec's own branded signatures, and `Brand`'s marker property is optional, so a bare
   * `string` satisfies every one of them: typed loosely, the native fast paths widened silently
   * while the portable fallbacks beside them needed a visible cast, and only the fallbacks were
   * ever checked. Measured 2026-08-12 — `uuidV7Slug` returned `string | UuidSlug`, which collapses
   * to `string`, so `codec.uuidV7Slug()` promised a `UuidV7Slug` the compiler never examined.
   *
   * No adapter asserts the brand, and none has to — that optional marker means the platform's
   * plain `string` already satisfies it, which is exactly why the loose typing was invisible. The
   * work is done by the DECLARATION here: it makes every CALLER of the hook see the branded type,
   * so a hook returning the wrong shape is a compile error at the call site rather than a silent
   * widening. Nothing in the type system can catch the shape itself, where `nativeUuidV7("hex")`
   * and `nativeUuidV7("base64url")` sit one literal apart and produce completely different
   * strings — so both runners pin the actual shapes by execution instead.
   */
  uuidV4?(this: void): UuidV4String;
  uuidV7?(this: void): UuidV7String;
  uuidV7Bytes?(this: void, out?: Uint8Array, offset?: number): Uint8Array;
  uuidV7Slug?(this: void): UuidV7Slug;
  /**
   * Generate at a caller-supplied millisecond. SEPARATE from `uuidV7` on purpose, because
   * accepting a timestamp is a capability a native generator has independently of generating at
   * all, and getting that wrong is silent: Node's `crypto.randomUUIDv7` takes an options object
   * and IGNORES an unknown key, so passing a timestamp through it returns the current time with
   * no error anywhere. Defined only where the platform provably honours the value — measured
   * 2026-08-11, `Bun.randomUUIDv7("hex", 1577836800000)` yields the 2020 prefix `016f5e66e800`.
   * Left undefined otherwise, which routes the call to the portable generator.
   */
  uuidV7At?(this: void, timestamp: number): UuidV7String;
  uuidV7BytesAt?(this: void, timestamp: number, out?: Uint8Array, offset?: number): Uint8Array;
}
