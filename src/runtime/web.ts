// SPDX-License-Identifier: Apache-2.0

import { UuidSlugError } from "../errors";
import { pooledFill } from "./pool";
import type { Runtime } from "./types";

const utf8Encoder = new TextEncoder();

/** Reuse the platform encoder because schema construction owns no state that requires a fresh instance. */
export const encodeUtf8 = (text: string): Uint8Array => utf8Encoder.encode(text);

const runtimeCapabilities: Runtime = {
  /**
   * Pooled for the same reason as Node's: `getRandomValues` costs far more per call than per
   * byte, and a v7 id needs 16. Bun draws this path too, where pooling measured 16x.
   */
  fillRandom: pooledFill((into) => {
    // Resolve per draw so instrumentation installed after import observes the source.
    const crypto = globalThis.crypto;
    if (!crypto?.getRandomValues)
      return new UuidSlugError("rng_unavailable", "Web Crypto getRandomValues is unavailable.");
    crypto.getRandomValues(into);
    return undefined;
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
  runtimeCapabilities.uuidV4 = () => globalThis.crypto.randomUUID();

export const runtime: Runtime = runtimeCapabilities;
