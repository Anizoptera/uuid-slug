// SPDX-License-Identifier: Apache-2.0

import type { UuidSlugError } from "../errors.ts";

export interface Runtime {
  /**
   * The buffer is pinned to a plain `ArrayBuffer` because Web Crypto's `getRandomValues`
   * rejects a `SharedArrayBuffer` view at runtime, and the unparameterised `Uint8Array`
   * admits one. Narrowing here makes that refusal unrepresentable instead of a throw.
   */
  fillRandom(this: void, bytes: Uint8Array<ArrayBuffer>): undefined | UuidSlugError;
  /**
   * Hooks are detached from the adapter, so `this: void` rejects implementations that depend on
   * method binding.
   */
  /** Native values are untrusted until the public generator validates their representation. */
  uuidV4?(this: void): string;
}
