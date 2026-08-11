// SPDX-License-Identifier: Apache-2.0

/**
 * The implementations measured against each other, in one place so the speed benchmark and
 * the entropy audit can never disagree about what was compared. Adding a candidate here adds
 * it to both.
 */
import { uuidv7 as kripodUuidV7 } from "@kripod/uuidv7";
import { uuid as fastUuidV7 } from "fastv7";
import { v4 as uuidV4, v7 as uuidV7 } from "uuid";
import { uuidv7 as uuidv7Js } from "uuidv7-js";
import { uuidv7 as uuidv7Package } from "uuidv7";

import { createUuidSlugCodec } from "../src/index";

export interface BenchCandidate {
  readonly name: string;
  readonly uuidV4?: () => string;
  readonly uuidV7?: () => string;
}

interface BunUuidGlobal {
  readonly Bun?: {
    randomUUIDv7?: (encoding?: "hex" | "buffer" | "base64url") => string | Uint8Array;
  };
}

const bunUuidV7 = (globalThis as BunUuidGlobal).Bun?.randomUUIDv7;

export const codec = createUuidSlugCodec();

export const candidates: readonly BenchCandidate[] = [
  { name: "package", uuidV4: () => codec.uuidV4(), uuidV7: () => codec.uuidV7() },
  { name: "uuid", uuidV4, uuidV7 },
  { name: "uuidv7", uuidV7: uuidv7Package },
  { name: "fastv7", uuidV7: fastUuidV7 },
  { name: "uuidv7-js", uuidV7: uuidv7Js },
  { name: "@kripod/uuidv7", uuidV7: kripodUuidV7 },
  // Only present under Bun, and named so a report makes clear which runtime produced it.
  ...(bunUuidV7 ? [{ name: "bun-native", uuidV7: () => String(bunUuidV7("hex")) }] : []),
];
