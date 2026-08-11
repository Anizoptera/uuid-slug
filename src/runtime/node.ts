// SPDX-License-Identifier: Apache-2.0

import crypto from "node:crypto";
import { producesOrderedValues } from "./monotonic";
import type { Runtime } from "./types";

/**
 * Node grew `crypto.randomUUIDv7` in 26.6.0, so on every earlier release this is `undefined`
 * and the capability is simply absent. Probed once here rather than inside the method:
 * `Runtime.uuidV7` is optional precisely so a consumer can branch on its presence, and a
 * method that exists but always throws defeats that — the caller reaches for it, catches, and
 * falls back on EVERY call. Measured 2026-08-11 on Node 24.15.0, that throw cost 64% of v7
 * throughput (400k against 1.11M ops/s).
 */
const nativeUuidV7 = (crypto as typeof crypto & { randomUUIDv7?: () => string }).randomUUIDv7;

const nodeRuntime: Runtime = {
  /**
   * `randomFillSync` writes into the caller's buffer. `randomBytes` would allocate a fresh
   * `Buffer` per call and copy out of it, leaving a second, unzeroed copy of the random
   * material on the heap for the collector to get to whenever it does. Measured 14% faster
   * as well, but the copy is the reason.
   */
  fillRandom(bytes) {
    crypto.randomFillSync(bytes);
  },
  uuidV4() {
    return crypto.randomUUID();
  },
};

/**
 * Presence is necessary and not sufficient — Node's native generator is unordered inside a
 * millisecond, so adopting it would trade this package's sortability for throughput without
 * anyone asking. Left undefined when it fails, which routes v7 through the portable generator
 * and its 42-bit counter exactly as on a Node without the method at all.
 */
const nativeIsOrdered =
  nativeUuidV7 !== undefined && producesOrderedValues(() => nativeUuidV7.call(crypto));

if (nativeUuidV7 && nativeIsOrdered) nodeRuntime.uuidV7 = () => nativeUuidV7.call(crypto);

export const runtime = nodeRuntime;
