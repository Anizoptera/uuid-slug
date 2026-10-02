// SPDX-License-Identifier: Apache-2.0

import { RNG_UNAVAILABLE, UuidSlugError } from "../errors.ts";
import { pooledFill } from "./pool.ts";
import type { Latin1Scratch, Runtime } from "./types.ts";

let utf8Encoder: TextEncoder | undefined;
const nativeToHex = (Uint8Array.prototype as { toHex?: () => string }).toHex;

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
      return new UuidSlugError(RNG_UNAVAILABLE, "Web Crypto getRandomValues is unavailable.");
    crypto.getRandomValues(into);
    return undefined;
  }),
};

// WebKit's fixed formatter slowed unrelated successful calls in mixed comparisons. Native hex
// did not reproduce a repeated loss while other engines retain their fixed writers. This identity
// selects cost only; absent hex support still uses the portable writer. Remeasure after browser
// changes (bench/PERFORMANCE.md); the shared ASCII decoder also slowed slug output.
if (
  typeof navigator !== "undefined" &&
  navigator.vendor === "Apple Computer, Inc." &&
  typeof nativeToHex === "function"
)
  runtimeCapabilities.uuidHex = (bytes) => nativeToHex.call(bytes);

type Latin1Buffer = Uint8Array & {
  toString(encoding: "latin1", start: number, end: number): string;
};
type HostBuffer = { alloc(size: number): Latin1Buffer } | undefined;

/** Build scratch text through a Node-compatible `Buffer` constructor. */
export function bufferLatin1Scratch(hostBuffer: NonNullable<HostBuffer>) {
  return (length: number): Latin1Scratch => {
    const bytes = hostBuffer.alloc(length);
    return { bytes, text: () => bytes.toString("latin1", 0, length) };
  };
}

// Deno's Web Crypto UUID method is faster than the portable formatter; Chromium's is slower.
// Runtime identity decides only this measured performance split—the entropy and UUID contracts
// are the same, and both paths remain covered by the shared runtime corpus.
if (typeof (globalThis as { Deno?: unknown }).Deno !== "undefined") {
  if (globalThis.crypto?.randomUUID)
    runtimeCapabilities.uuidV4 = globalThis.crypto.randomUUID.bind(globalThis.crypto);
}

/**
 * Browser `randomUUID` is intentionally not selected. Chromium measured it about five times
 * slower than this package's pooled byte generator and formatter, while insecure contexts can
 * expose `getRandomValues` without `randomUUID`. Leaving the shortcut absent gives every browser
 * context the faster common path. Reconsider when another browser engine or Chromium release
 * overturns the complete public-route measurement.
 */
export const runtime: Runtime = runtimeCapabilities;
