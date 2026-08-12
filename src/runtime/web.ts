// SPDX-License-Identifier: Apache-2.0

import { UuidRuntimeError } from "../errors";
import { pooledFill } from "./pool";
import type { Runtime } from "./types";

/**
 * Resolved per call rather than bound once at load, which looks like a missed hoist and is not.
 * Binding `globalThis.crypto.getRandomValues` at import time makes this adapter permanently
 * invisible to any harness that installs a counting wrapper afterwards — which is exactly how
 * `bench/instrument.ts` proves the randomness is cryptographic, and it says so in its own words.
 * A hoist would leave that gate reporting "no source observed" for a package that draws on every
 * call, a false finding indistinguishable from a real one.
 */
function cryptoObject(): Crypto {
  const value = globalThis.crypto;
  if (!value?.getRandomValues)
    throw new UuidRuntimeError("Web Crypto getRandomValues is unavailable.");
  return value;
}

const runtimeCapabilities: Runtime = {
  /**
   * Pooled for the same reason as Node's: `getRandomValues` costs far more per call than per
   * byte, and a v7 id needs 16. Bun draws this path too, where pooling measured 16x.
   */
  fillRandom: pooledFill((into) => {
    cryptoObject().getRandomValues(into);
  }),
};

/**
 * `randomUUID` is probed ONCE here and the method left undefined when it is absent — the rule
 * `runtime/node.ts` already follows and the reason `Runtime`'s methods are optional.
 *
 * It is not the same capability as `getRandomValues`, and a browser can have one without the
 * other: `crypto.randomUUID` is restricted to secure contexts, `getRandomValues` is not. Defined
 * unconditionally with a throw inside, `uuidV4()` was the only one of four entry points that
 * failed on such a page — `uuidV4Slug`, `uuidV4Bytes` and `uuidV7` all answered, because they
 * reach the byte generator rather than this method. Leaving it undefined routes `uuidV4` to that
 * same generator, so the four agree.
 */
/*
 * Probed through `Partial<Crypto>` because the DOM lib declares `randomUUID` as always present,
 * so the plain condition is "always true" to the compiler (TS2774) while being false on any
 * insecure page. The cast states the divergence rather than suppressing it: the types describe a
 * secure context, the check describes every context.
 */
if ((globalThis.crypto as Partial<Crypto> | undefined)?.randomUUID)
  runtimeCapabilities.uuidV4 = () => cryptoObject().randomUUID();

export const runtime: Runtime = runtimeCapabilities;
