// SPDX-License-Identifier: Apache-2.0

/**
 * The implementations measured against each other, in one place so the speed benchmark and
 * the entropy audit can never disagree about what was compared. Adding a candidate here adds
 * it to both.
 *
 * Two lists, because two different questions are being asked. `candidates` holds distinct v7
 * IMPLEMENTATIONS, each of which needs its randomness audited; `nativeVariants` holds the
 * alternative surfaces a runtime offers over the same generator — encodings, entropy-cache
 * toggles, the v4 and v5 entry points — where only the cost differs and auditing the bits again
 * would re-measure a constant. A row appears only where its runtime provides it, so the same
 * files run under Bun and under Node and each report states what that runtime actually has.
 */
import { uuidv7 as kripodUuidV7 } from "@kripod/uuidv7";
import { uuid as fastUuidV7 } from "fastv7";
import { v4 as uuidV4, v7 as uuidV7 } from "uuid";
import { uuidv7 as uuidv7Js } from "uuidv7-js";
import { uuidv7 as uuidv7Package } from "uuidv7";
import nodeCrypto from "node:crypto";

import { generateUuidV4 as packageUuidV4, generateUuidV7 as packageUuidV7 } from "../src/index";
import { unwrap } from "../dev/unwrap";

export interface BenchCandidate {
  readonly name: string;
  readonly uuidV4?: () => string;
  readonly uuidV7?: () => string;
}

/**
 * A runtime surface measured for cost alone. `bytes` rows return the raw 16 bytes, so they are
 * timed by a loop that never touches a string — the whole point of asking for that encoding.
 */
interface NativeVariant {
  readonly name: string;
  readonly note: string;
  readonly text?: () => string;
  readonly bytes?: () => Uint8Array;
}

/** Bun's UUID surface. `randomUUIDv7` takes an encoding; base64url yields a 22-character slug. */
interface BunGlobal {
  readonly Bun?: {
    readonly version: string;
    readonly randomUUIDv7?: {
      (): string;
      (encoding: "hex" | "base64" | "base64url"): string;
      (encoding: "buffer"): Uint8Array;
    };
    readonly randomUUIDv5?: (name: string, namespace: string) => string;
  };
}

/**
 * Node 26 added `randomUUIDv7`, so it is absent on every earlier LTS line. Both it
 * and `randomUUID` cache entropy for up to 128 identifiers unless told not to, which is a real
 * cost difference worth measuring rather than a detail — the cached path is what a consumer gets
 * by default.
 */
// NOT intersected with `typeof nodeCrypto`. `@types/node` is pinned ahead of the runtime in
// `.tool-versions` and declares `randomUUIDv7` unconditionally, so an intersection keeps it
// non-optional and every `nodeUuidV7 ? ... : []` below reads as always-true to the compiler — while
// the value is genuinely `undefined` on Node before 26, which is why those rows are absent from
// the Node 24 column of `bench/results/matrix.md`. A narrow shape is what makes the optionality checkable.
type NodeCryptoWithV7 = {
  randomUUIDv7?: (options?: { disableEntropyCache?: boolean }) => string;
};

const bun = (globalThis as BunGlobal).Bun;
const bunUuidV7 = bun?.randomUUIDv7;
const bunUuidV5 = bun?.randomUUIDv5;
const nodeUuidV7 = (nodeCrypto as NodeCryptoWithV7).randomUUIDv7;

export const runtimeName = bun ? `bun ${bun.version}` : `node ${process.version}`;

export const candidates: readonly BenchCandidate[] = [
  {
    name: "package",
    uuidV4: () => unwrap(packageUuidV4()),
    uuidV7: () => unwrap(packageUuidV7()),
  },
  { name: "uuid", uuidV4, uuidV7 },
  { name: "uuidv7", uuidV7: uuidv7Package },
  { name: "fastv7", uuidV7: fastUuidV7 },
  { name: "uuidv7-js", uuidV7: uuidv7Js },
  { name: "@kripod/uuidv7", uuidV7: kripodUuidV7 },
  // The two native v7 generators are separate implementations with separate entropy behaviour,
  // so both belong here rather than among the variants. Named for the engine that provides them.
  ...(bunUuidV7 ? [{ name: "bun-native", uuidV7: () => bunUuidV7("hex") }] : []),
  ...(nodeUuidV7 ? [{ name: "node-native", uuidV7: () => nodeUuidV7() }] : []),
];

export const nativeVariants: readonly NativeVariant[] = [
  ...(bunUuidV7
    ? [
        { name: "bun.v7.hex", note: "canonical 36-char form", text: () => bunUuidV7("hex") },
        // 16 bytes in base64url is 22 characters with no padding — the same shape this package
        // produces, straight from the engine, which makes it the native rival to `uuidV7Slug`.
        { name: "bun.v7.base64url", note: "22-char slug", text: () => bunUuidV7("base64url") },
        { name: "bun.v7.base64", note: "24-char padded", text: () => bunUuidV7("base64") },
        { name: "bun.v7.buffer", note: "raw 16 bytes", bytes: () => bunUuidV7("buffer") },
      ]
    : []),
  ...(bunUuidV5
    ? [
        // Deterministic, not random: a name hashed into a namespace. Included because it is a
        // native UUID entry point, never as an alternative to the generators above.
        {
          name: "bun.v5",
          note: "deterministic, name-based",
          text: () => bunUuidV5("bench", "6ba7b810-9dad-11d1-80b4-00c04fd430c8"),
        },
      ]
    : []),
  ...(nodeUuidV7
    ? [
        { name: "node.v7", note: "entropy cached", text: () => nodeUuidV7() },
        {
          name: "node.v7.nocache",
          note: "fresh entropy per call",
          text: () => nodeUuidV7({ disableEntropyCache: true }),
        },
      ]
    : []),
  { name: "node.v4", note: "entropy cached", text: () => nodeCrypto.randomUUID() },
  {
    name: "node.v4.nocache",
    note: "fresh entropy per call",
    text: () => nodeCrypto.randomUUID({ disableEntropyCache: true }),
  },
  // The Web Crypto binding, which is the one portable code reaches for and need not share an
  // implementation with `node:crypto` on either runtime.
  { name: "web.v4", note: "globalThis.crypto", text: () => globalThis.crypto.randomUUID() },
];
