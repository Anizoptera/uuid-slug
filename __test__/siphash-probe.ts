// SPDX-License-Identifier: Apache-2.0

// Interleave partially absorbed messages and compare every result with the published vectors.
import { strict as assert } from "node:assert";
import { halfSipHash as defaultHash } from "../src/siphash";
import vectors from "../rust/uuid-slug/tests/fixtures/fixtures-halfsiphash.json";

export function verifyHashContinuations(): void {
  verifyHashContinuationsWith(defaultHash);
}

export function verifyHashContinuationsWith<State>(
  halfSipHash: (
    key0: number,
    key1: number,
    words: Int32Array,
    byteLength: number,
    out: Int32Array,
    state?: State,
    blockLimit?: number,
  ) => State | undefined,
): void {
  for (const blockLimit of [1, 2, 3, 7, 16, Infinity]) {
    const jobs = vectors.halfSipHash64.map((expected, byteLength) => {
      const words = new Int32Array(Math.ceil(byteLength / 4) + 1);
      for (let i = 0; i < byteLength; i += 1)
        words[i >>> 2] = (words[i >>> 2] as number) | (i << ((i & 3) * 8));
      return {
        expected,
        byteLength,
        words,
        out: new Int32Array(2).fill(123),
        state: undefined as State | undefined,
        done: false,
      };
    });
    while (jobs.some((job) => !job.done)) {
      for (const job of jobs) {
        if (job.done) continue;
        job.state = halfSipHash(
          0x03020100,
          0x07060504,
          job.words,
          job.byteLength,
          job.out,
          job.state,
          blockLimit,
        );
        if (job.state)
          assert.deepEqual([...job.out], [123, 123], "partial absorption published an output");
        else {
          job.done = true;
          const output = Buffer.alloc(8);
          output.writeInt32LE(job.out[0] as number, 0);
          output.writeInt32LE(job.out[1] as number, 4);
          assert.equal(
            output.toString("hex"),
            job.expected,
            `length ${job.byteLength}, block limit ${blockLimit}`,
          );
        }
      }
    }
  }
}
