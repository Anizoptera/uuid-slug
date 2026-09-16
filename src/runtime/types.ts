// SPDX-License-Identifier: Apache-2.0

import type { BASE64URL_NAME } from "../alphabet.ts";
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
  /**
   * Native values are untrusted until the public generator validates their representation.
   * Lowercase hyphenated UUIDv4 text.
   */
  uuidV4?(this: void): string;
  /**
   * Lowercase hyphenated UUIDv7 text, or a 22-character plain UUIDv7 slug when `encoding` selects
   * base64url; untrusted like `uuidV4`.
   */
  uuidV7?(this: void, encoding?: typeof BASE64URL_NAME): string;
  /**
   * Create a reusable buffer whose bytes a native call turns into a flat Latin-1 string. Adapters
   * provide it only where that call beats building text from JavaScript strings.
   */
  latin1Scratch?(this: void, length: number): Latin1Scratch;
}

export interface Latin1Scratch {
  readonly bytes: Uint8Array;
  /** Return every byte of `bytes` as one Latin-1 string. */
  text(this: void): string;
}
