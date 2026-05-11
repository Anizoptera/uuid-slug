import { UuidRuntimeError } from "../errors";
import type { Runtime } from "./types";

function cryptoObject(): Crypto {
  const value = globalThis.crypto;
  if (!value?.getRandomValues)
    throw new UuidRuntimeError("Web Crypto getRandomValues is unavailable.");
  return value;
}

export const runtime: Runtime = {
  fillRandom(bytes) {
    cryptoObject().getRandomValues(bytes);
  },
  uuidV4() {
    const crypto = cryptoObject();
    if (!crypto.randomUUID)
      throw new UuidRuntimeError("Web Crypto randomUUID is unavailable.");
    return crypto.randomUUID();
  },
};
