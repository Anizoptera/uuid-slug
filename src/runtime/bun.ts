// SPDX-License-Identifier: Apache-2.0

import { runtime as portableRuntime } from "./portable.ts";
import type { Runtime } from "./types.ts";

export { encodeUtf8 } from "./portable.ts";

interface BunUuid {
  (format: "hex"): string;
}

// Probe once so older Buns take the portable path without exception-driven fallback. Native text
// currently wins; Buffer and slug forms remain portable. Remeasure when Bun changes this primitive;
// bench/PERFORMANCE.md owns the volatile results.
const bun = (globalThis as unknown as { Bun?: { randomUUIDv7?: BunUuid } }).Bun;
const nativeUuidV7 = bun?.randomUUIDv7?.bind(bun);

const bunRuntime: Runtime = { fillRandom: portableRuntime.fillRandom };

// Bun's native v4 text is materially faster than the pooled portable formatter; browsers show the
// opposite result, so this capability belongs to Bun rather than the portable adapter.
if (globalThis.crypto.randomUUID)
  bunRuntime.uuidV4 = globalThis.crypto.randomUUID.bind(globalThis.crypto);

if (nativeUuidV7) bunRuntime.uuidV7 = () => nativeUuidV7("hex");

export const runtime = bunRuntime;
