// SPDX-License-Identifier: Apache-2.0

import { producesOrderedValues } from "./monotonic";
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

/**
 * One probe covers all three forms below: they are the same generator behind three encodings,
 * so if the hex form is ordered the others carry the same bytes. A runtime whose native v7 is
 * unordered inside a millisecond gets none of them and falls through to the portable generator,
 * which is what keeps this package's sortability from depending on which engine runs it.
 */
if (nativeUuidV7 && producesOrderedValues(() => nativeUuidV7("hex") as string)) {
  bunRuntime.uuidV7 = () => nativeUuidV7("hex") as string;
  bunRuntime.uuidV7Slug = () => nativeUuidV7("base64url") as string;
  bunRuntime.uuidV7Bytes = (out?: Uint8Array, offset = 0) => {
    const bytes = nativeUuidV7("buffer") as Uint8Array;
    // Bun hands back a node `Buffer`, which IS a Uint8Array and so satisfies the declared return
    // type while behaving differently in ways nothing catches: `Buffer.toString("hex")` yields
    // hex, `Uint8Array.toString("hex")` ignores the argument and yields "1,159,242,…", and
    // `JSON.stringify` emits `{"type":"Buffer","data":[…]}` against `{"0":1,…}`. Code written and
    // tested on Bun would silently produce different bytes on Node. Copying 16 bytes into a plain
    // Uint8Array costs less than the generation it follows and makes the return type mean one
    // thing everywhere; a view would share Bun's ArrayBuffer and tie this to its allocator.
    if (!out) return new Uint8Array(bytes);
    out.set(bytes, offset);
    return out;
  };
}

export const runtime = bunRuntime;
