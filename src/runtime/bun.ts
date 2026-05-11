import { UuidRuntimeError } from "../errors";
import { runtime as webRuntime } from "./web";
import type { Runtime } from "./types";

type BunUuid = {
  randomUUIDv7(format?: "base64url" | "buffer" | "hex"): string | Uint8Array;
};

function bunObject(): BunUuid {
  const candidate = globalThis as typeof globalThis & { Bun?: BunUuid };
  if (!candidate.Bun?.randomUUIDv7)
    throw new UuidRuntimeError("Bun.randomUUIDv7 is unavailable.");
  return candidate.Bun;
}

const bunRuntime: Runtime = {
  fillRandom: webRuntime.fillRandom,
  uuidV7() {
    return bunObject().randomUUIDv7("hex") as string;
  },
  uuidV7Bytes(out?: Uint8Array, offset = 0) {
    const bytes = bunObject().randomUUIDv7("buffer") as Uint8Array;
    if (!out) return bytes;
    out.set(bytes, offset);
    return out;
  },
  uuidV7Slug() {
    return bunObject().randomUUIDv7("base64url") as string;
  },
};

if (webRuntime.uuidV4) bunRuntime.uuidV4 = webRuntime.uuidV4;

export const runtime = bunRuntime;
