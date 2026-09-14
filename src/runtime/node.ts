// SPDX-License-Identifier: Apache-2.0

import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import { pooledFill } from "./pool.ts";
import type { Runtime } from "./types.ts";

// Probe once so older supported Nodes take the portable path without per-call capability checks.
// Native text currently wins; bytes remain portable because reparsing text loses that advantage.
// bench/PERFORMANCE.md owns the evidence and the runtime-change remeasurement trigger.
// The narrow cast keeps runtime optionality visible even when ambient Node types require the method.
const nativeUuidV7 = (crypto as { randomUUIDv7?: () => string }).randomUUIDv7?.bind(crypto);

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
  uuidV4: crypto.randomUUID.bind(crypto),
};

if (nativeUuidV7) nodeRuntime.uuidV7 = nativeUuidV7;

export const runtime = nodeRuntime;
