// SPDX-License-Identifier: Apache-2.0

import { runtime as portableRuntime } from "./portable";
import type { Runtime } from "./types";

export { encodeUtf8 } from "./portable";

/** Only untimestamped native generation satisfies this adapter's contract. */
interface BunUuid {
  (format: "hex"): string;
}

/**
 * Probed once at module load, not per call. This module is only ever selected by the `bun`
 * export condition, so the global is there; what can differ is the version, and a Bun old
 * enough to lack `randomUUIDv7` should degrade to the portable generator rather than throw
 * from a method that claims to exist. `Runtime.uuidV7` is optional so that
 * absence is representable — a method that exists but throws makes the caller catch and fall
 * back on every single call instead.
 */
const bun = (globalThis as unknown as { Bun?: { randomUUIDv7?: BunUuid } }).Bun;
const nativeUuidV7 = bun?.randomUUIDv7?.bind(bun);

const bunRuntime: Runtime = { fillRandom: portableRuntime.fillRandom };

// Bun's native v4 text is materially faster than the pooled portable formatter; browsers show the
// opposite result, so this capability belongs to Bun rather than the portable adapter.
if (globalThis.crypto.randomUUID)
  bunRuntime.uuidV4 = globalThis.crypto.randomUUID.bind(globalThis.crypto);

if (nativeUuidV7) {
  // Bun 1.4.2's native hex path avoids the portable formatter, but its Buffer and base64url
  // forms cost more than generating into the package's caller-owned and native-base64 paths.
  // Keep this split until a Bun update overturns the complete-route comparison.
  bunRuntime.uuidV7 = () => nativeUuidV7("hex");
}

export const runtime = bunRuntime;
