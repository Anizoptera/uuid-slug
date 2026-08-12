// SPDX-License-Identifier: Apache-2.0

import crypto from "node:crypto";
import { pooledFill } from "./pool";
import type { Runtime } from "./types";

/**
 * Node grew `crypto.randomUUIDv7` in 26.6.0, so on every earlier release this is `undefined`
 * and the capability is simply absent. Probed once here rather than inside the method:
 * `Runtime.uuidV7` is optional precisely so a consumer can branch on its presence, and a
 * method that exists but always throws defeats that — the caller reaches for it, catches, and
 * falls back on EVERY call. Measured 2026-08-11 on Node 24.15.0, that throw cost 64% of v7
 * throughput (400k against 1.11M ops/s).
 */
// Cast to a NARROW shape, never `typeof crypto & {...}`. `@types/node` is pinned ahead of the
// runtime in `.tool-versions` and declares `randomUUIDv7` unconditionally, so intersecting keeps it
// non-optional and the guard below reads as always-true to the compiler — the type would license a
// refactor that drops the check and breaks every Node under 26.6, where the value is `undefined`.
// A narrow cast is the only spelling that makes the optionality the code relies on visible.
const nativeUuidV7: (() => string) | undefined = (crypto as { randomUUIDv7?: () => string })
  .randomUUIDv7;

const nodeRuntime: Runtime = {
  /**
   * `randomFillSync` writes into the buffer it is given. `randomBytes` would allocate a fresh
   * `Buffer` per call and copy out of it, leaving a second, unzeroed copy of the random
   * material on the heap for the collector to get to whenever it does. Measured 14% faster
   * as well, but the copy is the reason. Pooled because the per-call cost dominates at 16
   * bytes; see `pool.ts`.
   */
  fillRandom: pooledFill((into) => {
    crypto.randomFillSync(into);
  }),
  uuidV4() {
    return crypto.randomUUID();
  },
};

if (nativeUuidV7) nodeRuntime.uuidV7 = () => nativeUuidV7.call(crypto);

export const runtime = nodeRuntime;
