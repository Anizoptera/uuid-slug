// SPDX-License-Identifier: Apache-2.0

import { runtime as webRuntime } from "./web";
import type { Runtime } from "./types";

type BunUuid = (format?: "base64url" | "buffer" | "hex") => string | Uint8Array;

/**
 * Probed once at module load, not per call. This module is only ever selected by the `bun`
 * export condition, so the global is there; what can differ is the version, and a Bun old
 * enough to lack `randomUUIDv7` should degrade to the portable generator rather than throw
 * from a method that claims to exist. `Runtime.uuidV7` and friends are optional so that
 * absence is representable — a method that exists but throws makes the caller catch and fall
 * back on every single call instead.
 */
const bun = (globalThis as typeof globalThis & { Bun?: { randomUUIDv7?: BunUuid } }).Bun;
const nativeUuidV7 = bun?.randomUUIDv7?.bind(bun);

const bunRuntime: Runtime = { fillRandom: webRuntime.fillRandom };

if (webRuntime.uuidV4) bunRuntime.uuidV4 = webRuntime.uuidV4;

if (nativeUuidV7) {
  bunRuntime.uuidV7 = () => nativeUuidV7("hex") as string;
  bunRuntime.uuidV7Slug = () => nativeUuidV7("base64url") as string;
  bunRuntime.uuidV7Bytes = (out?: Uint8Array, offset = 0) => {
    const bytes = nativeUuidV7("buffer") as Uint8Array;
    if (!out) return bytes;
    out.set(bytes, offset);
    return out;
  };
}

export const runtime = bunRuntime;
