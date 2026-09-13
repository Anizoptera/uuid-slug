// SPDX-License-Identifier: Apache-2.0

import { UuidSlugError } from "../errors.ts";
import { pooledFill } from "./pool.ts";
import type { Runtime } from "./types.ts";

let utf8Encoder: TextEncoder | undefined;

/** Create the shared encoder only when mask construction needs it; generation imports this adapter too. */
export const encodeUtf8 = (text: string): Uint8Array =>
  (utf8Encoder ??= new TextEncoder()).encode(text);

const runtimeCapabilities: Runtime = {
  /**
   * Pooled for the same reason as Node's: `getRandomValues` costs far more per call than per
   * byte, and a v7 id needs 16. Bun draws this path too, where pooling measured 16x.
   */
  fillRandom: /*#__PURE__*/ pooledFill((into) => {
    // Resolve per draw so instrumentation installed after import observes the source.
    const crypto = globalThis.crypto;
    if (!crypto?.getRandomValues)
      return new UuidSlugError("rng_unavailable", "Web Crypto getRandomValues is unavailable.");
    crypto.getRandomValues(into);
    return undefined;
  }),
};

// Deno's Web Crypto UUID method is faster than the portable formatter; Chromium's is slower.
// Runtime identity decides only this measured performance split—the entropy and UUID contracts
// are the same, and both paths remain covered by the shared runtime corpus.
if (typeof (globalThis as { Deno?: unknown }).Deno !== "undefined" && globalThis.crypto?.randomUUID)
  runtimeCapabilities.uuidV4 = globalThis.crypto.randomUUID.bind(globalThis.crypto);

/**
 * Browser `randomUUID` is intentionally not selected. Chromium measured it about five times
 * slower than this package's pooled byte generator and formatter, while insecure contexts can
 * expose `getRandomValues` without `randomUUID`. Leaving the shortcut absent gives every browser
 * context the faster common path. Reconsider when another browser engine or Chromium release
 * overturns the complete public-route measurement.
 */
export const runtime: Runtime = runtimeCapabilities;
