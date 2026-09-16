// SPDX-License-Identifier: Apache-2.0

import { Buffer } from "node:buffer";
import { bufferLatin1Scratch, runtime as portableRuntime } from "./portable.ts";
import type { Runtime } from "./types.ts";

export { encodeUtf8 } from "./portable.ts";

const bunRuntime: Runtime = {
  fillRandom: portableRuntime.fillRandom,
  latin1Scratch: bufferLatin1Scratch(Buffer),
};

// Bun's native v4 text is materially faster than the pooled portable formatter; browsers show the
// opposite result, so this capability belongs to Bun rather than the portable adapter.
if (globalThis.crypto.randomUUID)
  bunRuntime.uuidV4 = globalThis.crypto.randomUUID.bind(globalThis.crypto);

// Bun's native UUIDv7 text and base64url output skip the package draw and formatter. Node's native
// UUIDv7 text is slower than the package generator and Deno has none, so this also belongs to Bun;
// bench/PERFORMANCE.md owns the comparison. Bytes stay portable: Bun returns a `Buffer`.
const bunUuidV7 = (globalThis as { Bun?: { randomUUIDv7?: NonNullable<Runtime["uuidV7"]> } }).Bun
  ?.randomUUIDv7;
if (bunUuidV7) bunRuntime.uuidV7 = (encoding) => bunUuidV7(encoding);

export const runtime = bunRuntime;
