import crypto from "node:crypto";
import { UuidRuntimeError } from "../errors";
import type { Runtime } from "./types";

type NodeCryptoWithV7 = {
  randomUUIDv7?: () => string;
};

const cryptoWithV7 = crypto as typeof crypto & NodeCryptoWithV7;

export const runtime: Runtime = {
  fillRandom(bytes) {
    bytes.set(crypto.randomBytes(bytes.length));
  },
  uuidV4() {
    return crypto.randomUUID();
  },
  uuidV7() {
    if (!cryptoWithV7.randomUUIDv7)
      throw new UuidRuntimeError("Node crypto.randomUUIDv7 is unavailable.");
    return cryptoWithV7.randomUUIDv7();
  },
};
