// SPDX-License-Identifier: Apache-2.0

import { runtime as webRuntime } from "./web";
import type { Runtime } from "./types";

export { encodeUtf8 } from "./web";

/** Only untimestamped native generation satisfies this adapter's contract. */
interface BunUuid {
  (format: "hex"): string;
  (format: "base64url"): string;
  (format: "buffer"): Uint8Array;
}

/**
 * Probed once at module load, not per call. This module is only ever selected by the `bun`
 * export condition, so the global is there; what can differ is the version, and a Bun old
 * enough to lack `randomUUIDv7` should degrade to the portable generator rather than throw
 * from a method that claims to exist. `Runtime.uuidV7` and friends are optional so that
 * absence is representable — a method that exists but throws makes the caller catch and fall
 * back on every single call instead.
 */
const bun = (globalThis as unknown as { Bun?: { randomUUIDv7?: BunUuid } }).Bun;
const nativeUuidV7 = bun?.randomUUIDv7?.bind(bun);

const bunRuntime: Runtime = { fillRandom: webRuntime.fillRandom };

if (webRuntime.uuidV4) bunRuntime.uuidV4 = webRuntime.uuidV4;

if (nativeUuidV7) {
  bunRuntime.uuidV7 = () => nativeUuidV7("hex");
  bunRuntime.uuidV7Slug = () => nativeUuidV7("base64url");
  // Native counter exhaustion advances even an explicit timestamp. Leave the At hooks absent
  // so the shared portable generator writes the requested instant without native counter state.
  bunRuntime.uuidV7Bytes = () => nativeUuidV7("buffer");
}

export const runtime = bunRuntime;
