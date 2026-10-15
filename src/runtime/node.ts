// SPDX-License-Identifier: Apache-2.0

import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import { pooledFill } from "./pool.ts";
import type { Runtime } from "./types.ts";

const JITLESS_FLAG = "--jitless";
const JIT_ENABLED_FLAG = "--no-jitless";
let jitless: boolean | undefined;
// NODE_OPTIONS is applied before command-line flags; the final explicit setting wins. Keep this
// startup-only so bounds and generation share the selection without probing each identifier.
// Quoted option words remain whole: a filename containing a flag is not a flag.
for (let index = process.execArgv.length - 1; index >= 0; index -= 1) {
  const flag = process.execArgv[index];
  if (flag === JITLESS_FLAG || flag === JIT_ENABLED_FLAG) {
    jitless = flag === JITLESS_FLAG;
    break;
  }
}

// CLI overrides settle the answer without parsing the environment. Ordinary imports allocate no
// token array; quoted environment words need tokenization only when a mode flag could be present.
const nodeOptions = jitless === undefined ? process.env.NODE_OPTIONS : undefined;
if (nodeOptions?.includes("jitless")) {
  const words = nodeOptions.match(/(?:[^\s"\\]|\\.|"(?:[^"\\]|\\.)*")+/g);
  for (let index = (words?.length ?? 0) - 1; index >= 0; index -= 1) {
    const flag = words?.[index]?.replace(/"|\\(?=.)/g, "");
    if (flag === JITLESS_FLAG || flag === JIT_ENABLED_FLAG) {
      jitless = flag === JITLESS_FLAG;
      break;
    }
  }
}

/**
 * Node's native UTF-8 encoder materially reduces string-seed construction; the portable adapter
 * remains the compatibility boundary. bench/decisions.md owns the measured runtime scope.
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
  // Pooled formatting wins with the JIT; native text wins without it. Missing native capability
  // stays undefined so the generator uses its tested portable fallback. Remeasure both modes
  // after Node changes; bench/decisions.md owns the compared calls and resource limits.
  ...(jitless ? { jitless: true, uuidV4: crypto.randomUUID } : {}),
};

export const runtime = nodeRuntime;
