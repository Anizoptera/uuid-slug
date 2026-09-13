// SPDX-License-Identifier: Apache-2.0

import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import { pooledFill } from "./pool";
import type { Runtime } from "./types";

/**
 * Node releases without `crypto.randomUUIDv7` expose `undefined`, so the capability is simply
 * absent. Probed once here rather than inside the method:
 * `Runtime.uuidV7` is optional precisely so a consumer can branch on its presence, and a
 * method that exists but always throws defeats that and pays exception-driven fallback per call.
 */
// Cast to a NARROW shape, never `typeof crypto & {...}`. `@types/node` is pinned ahead of the
// runtime in `.tool-versions` and declares `randomUUIDv7` unconditionally, so intersecting keeps it
// non-optional and the guard below reads as always-true to the compiler — the type would license a
// refactor that drops the check and breaks any supported Node where the value is `undefined`.
// A narrow cast is the only spelling that makes the optionality the code relies on visible.
const nativeUuidV7 = (crypto as { randomUUIDv7?: () => string }).randomUUIDv7?.bind(crypto);

/**
 * Node's native UTF-8 encoder materially reduces string-seed construction; the portable adapter
 * remains the compatibility boundary. bench/PERFORMANCE.md owns the measured runtime scope.
 */
export const encodeUtf8 = (text: string): Uint8Array => Buffer.from(text, "utf8");

const nodeRuntime: Runtime = {
  /**
   * `randomFillSync` writes into the buffer it is given. `randomBytes` would allocate a fresh
   * `Buffer` per call and copy out of it, leaving a second, unzeroed copy of the random
   * material on the heap for the collector to get to whenever it does. Pooled because the
   * per-call cost dominates at 16 bytes; see `pool.ts`.
   */
  fillRandom: /*#__PURE__*/ pooledFill((into) => {
    crypto.randomFillSync(into);
    return undefined;
  }),
  uuidV4: crypto.randomUUID.bind(crypto),
};

if (nativeUuidV7) {
  // Native text avoids portable entropy and formatting work. Other representations stay portable
  // because converting native text back to bytes or base32 adds work; remeasure by output form when
  // Node changes this API. bench/PERFORMANCE.md owns the runtime versions and comparisons.
  nodeRuntime.uuidV7 = nativeUuidV7;
}

export const runtime = nodeRuntime;
