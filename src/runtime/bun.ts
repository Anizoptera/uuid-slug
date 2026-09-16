// SPDX-License-Identifier: Apache-2.0

import { Buffer } from "node:buffer";
import { bufferLatin1Scratch, runtime as portableRuntime } from "./portable.ts";
import type { Runtime } from "./types.ts";

export { encodeUtf8 } from "./portable.ts";

const bunRuntime: Runtime = {
  fillRandom: portableRuntime.fillRandom,
  latin1Scratch: bufferLatin1Scratch(Buffer),
};

// Bun's native v4 text is materially faster than the pooled portable formatter; browsers show the
// opposite result, so this capability belongs to Bun rather than the portable adapter.
if (globalThis.crypto.randomUUID)
  bunRuntime.uuidV4 = globalThis.crypto.randomUUID.bind(globalThis.crypto);

// `Bun.randomUUIDv7` is faster than the package generator but must not replace it: when its 12-bit
// counter overflows it advances the encoded millisecond, so a sustained burst encodes timestamps
// ahead of the clock, and passing `Date.now()` as its time leaves them ahead. Recheck when Bun changes
// that overflow policy; bench/PERFORMANCE.md owns the measurements.

export const runtime = bunRuntime;
