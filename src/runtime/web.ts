// SPDX-License-Identifier: Apache-2.0

import { UuidRuntimeError } from "../errors";
import { pooledFill } from "./pool";
import type { Runtime } from "./types";

function cryptoObject(): Crypto {
  const value = globalThis.crypto;
  if (!value?.getRandomValues)
    throw new UuidRuntimeError("Web Crypto getRandomValues is unavailable.");
  return value;
}

export const runtime: Runtime = {
  /**
   * Pooled for the same reason as Node's: `getRandomValues` costs far more per call than per
   * byte, and a v7 id needs 16. Bun draws this path too, where pooling measured 16x.
   */
  fillRandom: pooledFill((into) => {
    cryptoObject().getRandomValues(into);
  }),
  uuidV4() {
    const crypto = cryptoObject();
    if (!crypto.randomUUID) throw new UuidRuntimeError("Web Crypto randomUUID is unavailable.");
    return crypto.randomUUID();
  },
};
