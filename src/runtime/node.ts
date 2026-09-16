// SPDX-License-Identifier: Apache-2.0

import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import { pooledFill } from "./pool.ts";
import { bufferLatin1Scratch } from "./portable.ts";
import type { Runtime } from "./types.ts";

/**
 * Node's native UTF-8 encoder materially reduces string-seed construction; the portable adapter
 * remains the compatibility boundary. bench/PERFORMANCE.md owns the measured runtime scope.
 */
export const encodeUtf8 = /* @__NO_SIDE_EFFECTS__ */ (text: string): Uint8Array =>
  Buffer.from(text, "utf8");

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
  // No `uuidV4`: formatting pooled `randomFillSync` bytes beats `crypto.randomUUID` on Node 24 and 26
  // with the JIT, and loses without it; bench/PERFORMANCE.md owns both results and the recheck.
  latin1Scratch: bufferLatin1Scratch(Buffer),
};

export const runtime = nodeRuntime;
