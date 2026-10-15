// SPDX-License-Identifier: Apache-2.0

import { Buffer } from "node:buffer";
import { BASE64URL_NAME } from "../base64url-name.ts";
import { bufferLatin1Scratch, runtime as portableRuntime } from "./portable.ts";
import type { Runtime } from "./types.ts";

export { encodeUtf8 } from "./portable.ts";

const bunRuntime: Runtime = {
  fillRandom: portableRuntime.fillRandom,
  latin1Scratch: bufferLatin1Scratch(Buffer),
};

// Direct Node-compatible generation avoids Web Crypto's receiver binding on Bun. Probe once;
// absence keeps the existing Web Crypto path. Compare complete calls and module retention when
// Bun's native methods change; a faster kernel alone does not justify another static import.
const nativeUuidV4 = (
  process as {
    getBuiltinModule?: (name: string) => { randomUUID?: () => string } | undefined;
  }
).getBuiltinModule?.("node:crypto")?.randomUUID;
if (typeof nativeUuidV4 === "function") bunRuntime.uuidV4 = nativeUuidV4;
else if (globalThis.crypto.randomUUID)
  bunRuntime.uuidV4 = globalThis.crypto.randomUUID.bind(globalThis.crypto);

// Native UUIDv7 can advance logical time during counter overflow; defaults do not forbid that.
// Select it only when complete-call gains preserve configured-call speed and resource efficiency.
// Explicit generators keep their clock controls; bench/decisions.md owns drift and cost evidence.
const nativeUuidV7 = (globalThis as { Bun?: { randomUUIDv7?: (encoding?: "base64url") => string } })
  .Bun?.randomUUIDv7;
if (typeof nativeUuidV7 === "function") {
  bunRuntime.uuidV7 = nativeUuidV7;
  // Native slug output avoids portable byte generation and a second string construction.
  // Other alphabets and configured clocks keep their existing implementation.
  bunRuntime.uuidV7Slug = () => nativeUuidV7(BASE64URL_NAME);
}

export const runtime = bunRuntime;
