// SPDX-License-Identifier: Apache-2.0

/**
 * The only check here that grades a mixing function against something other than this repository's
 * own opinion of it. `feistel.ts` records why that matters: strict avalanche, a same-millisecond
 * burst and a single-difference differential all PASS a two-round network, so every instrument in
 * this tree agrees with every setting and none discriminates. Agreement with the published
 * HalfSipHash-2-4 vectors is a different kind of evidence — it can fail, and a transcription slip is
 * exactly what it fails on.
 *
 * The vectors are the reference implementation's own: key = bytes 00..07, and the i-th vector hashes
 * the i-byte message 00, 01, ... So the set exercises every message length from 0 to 63, including
 * the partial final blocks the key derivation reaches with an odd-length seed.
 */
import { expect, test } from "vitest";

import vectors from "./fixtures-halfsiphash.json" with { type: "json" };
import { halfSipHash } from "../src/siphash";

test("HalfSipHash-2-4 matches all 64 published reference vectors", () => {
  const out = new Int32Array(2);
  const produced = vectors.halfSipHash64.map((_, byteLength) => {
    const words = new Int32Array(Math.ceil(byteLength / 4) + 1);
    for (let i = 0; i < byteLength; i += 1)
      words[i >>> 2] = (words[i >>> 2] as number) | (i << ((i & 3) * 8)) | 0;
    halfSipHash(0x03020100, 0x07060504, words, byteLength, out);
    return [0, 1]
      .flatMap((word) => [0, 1, 2, 3].map((byte) => ((out[word] as number) >>> (byte * 8)) & 0xff))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  });
  expect(produced).toEqual(vectors.halfSipHash64);
});

import { verifyHashContinuations } from "./siphash-probe";
test("interleaved hash continuations preserve every reference vector", verifyHashContinuations);
