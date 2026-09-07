// SPDX-License-Identifier: Apache-2.0

import { runtime as webRuntime } from "./web";
import type { Runtime } from "./types";
import type { UuidV7String, UuidV7Slug } from "../types";

/**
 * `Bun.randomUUIDv7(encoding, timestamp)` honours the timestamp for every encoding, which is why
 * this runtime can supply `uuidV7At` and Node cannot.
 */
interface BunUuid {
  (format: "hex", timestamp?: number): UuidV7String;
  (format: "base64url", timestamp?: number): UuidV7Slug;
  (format: "buffer", timestamp?: number): Uint8Array;
}

/**
 * Probed once at module load, not per call. This module is only ever selected by the `bun`
 * export condition, so the global is there; what can differ is the version, and a Bun old
 * enough to lack `randomUUIDv7` should degrade to the portable generator rather than throw
 * from a method that claims to exist. `Runtime.uuidV7` and friends are optional so that
 * absence is representable — a method that exists but throws makes the caller catch and fall
 * back on every single call instead.
 */
const bun = (globalThis as { Bun?: { randomUUIDv7?: BunUuid } }).Bun;
const nativeUuidV7 = bun?.randomUUIDv7?.bind(bun);

const bunRuntime: Runtime = { fillRandom: webRuntime.fillRandom };

if (webRuntime.uuidV4) bunRuntime.uuidV4 = webRuntime.uuidV4;

/** Shared by the timestamped and untimestamped byte paths; see the copy note inside. */
const toOwnBytes = (bytes: Uint8Array, out?: Uint8Array, offset = 0) => {
  // Bun hands back a node `Buffer`, which IS a Uint8Array and so satisfies the declared return
  // type while behaving differently in ways nothing catches: `Buffer.toString("hex")` yields hex,
  // `Uint8Array.toString("hex")` ignores the argument and yields "1,159,242,…", and
  // `JSON.stringify` emits `{"type":"Buffer","data":[…]}` against `{"0":1,…}`. Code written and
  // tested on Bun would silently produce different bytes on Node. Copying 16 bytes costs less
  // than the generation it follows and makes the return type mean one thing everywhere; a view
  // would share Bun's ArrayBuffer and tie this to its allocator.
  if (!out) return new Uint8Array(bytes);
  out.set(bytes, offset);
  return out;
};

if (nativeUuidV7) {
  bunRuntime.uuidV7 = () => nativeUuidV7("hex");
  bunRuntime.uuidV7Slug = () => nativeUuidV7("base64url");
  bunRuntime.uuidV7At = (timestamp: number) => nativeUuidV7("hex", timestamp);
  bunRuntime.uuidV7BytesAt = (timestamp: number, out?: Uint8Array, offset = 0) =>
    toOwnBytes(nativeUuidV7("buffer", timestamp), out, offset);
  bunRuntime.uuidV7Bytes = (out?: Uint8Array, offset = 0) => {
    const bytes = nativeUuidV7("buffer");
    return toOwnBytes(bytes, out, offset);
  };
}

export const runtime = bunRuntime;
