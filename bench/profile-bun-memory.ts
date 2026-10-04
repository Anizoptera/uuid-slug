// SPDX-License-Identifier: Apache-2.0

import { heapStats, memoryUsage, profile } from "bun:jsc";
import { Buffer } from "node:buffer";
import originalFixtures from "../rust/uuid-slug/tests/fixtures/fixtures-original-slugs.json" with { type: "json" };
import { createProfileCases, selectProfileCases } from "./profile-cases";
import { uuidObjectChecksum } from "./profile-case";

const reports = process.env.UUID_SLUG_PROFILE_NATIVE_DIR;
if (!reports) throw new Error("UUID_SLUG_PROFILE_NATIVE_DIR is required");
// Load the same isolated public graph as the timing driver; a static source import would
// profile the baseline even when the caller requests a candidate module.
const api: typeof import("../src/index") = await import(
  process.env.UUID_SLUG_PROFILE_MODULE ?? "../src/index"
);
const calls = Number(process.env.UUID_SLUG_PROFILE_CALLS ?? 32_768);
if (!Number.isSafeInteger(calls) || calls < 1)
  throw new Error("UUID_SLUG_PROFILE_CALLS must be a positive safe integer");
const filter = process.env.UUID_SLUG_PROFILE_FILTER;
const suite = createProfileCases(
  api,
  originalFixtures.issued,
  process.env.UUID_SLUG_PROFILE_PRIVATE === "1" ? await import("../src/v4") : undefined,
  process.env.UUID_SLUG_PROFILE_PRIVATE === "1" ? await import("../src/alphabet") : undefined,
  Buffer,
);
suite.verify();
const cases = selectProfileCases(suite.cases, filter);

/** Consume results so JavaScriptCore cannot discard the public calls under study. */
let sink = 0;
function consume(value: ReturnType<(typeof cases)[number][1]>, index: number): void {
  if (typeof value === "string") sink ^= value.charCodeAt(index % value.length);
  else if (typeof value === "number") sink ^= value;
  else if (typeof value === "boolean") sink ^= Number(value);
  else if (value instanceof Uint8Array) sink ^= value[index % value.length] as number;
  else if (value instanceof Error) sink ^= value.message.length;
  else sink ^= uuidObjectChecksum(value, index) ?? 1;
}

Bun.gc(true);
const before = heapStats();
const nativeBefore = memoryUsage();
console.error("UUID_SLUG_MIMALLOC_BEFORE");
Bun.unsafe.mimallocDump();
const sampling = profile(() => {
  for (const [name, operation] of cases) {
    const expectedError = name.startsWith("invalid.");
    for (let index = 0; index < calls; index += 1) {
      const value = operation(index);
      if (expectedError !== value instanceof Error)
        throw new Error(`Unexpected outcome for ${name}`, { cause: value });
      consume(value, index);
    }
  }
}, 100);
Bun.gc(true);
const after = heapStats();
const nativeAfter = memoryUsage();
console.error("UUID_SLUG_MIMALLOC_AFTER");
Bun.unsafe.mimallocDump();

await Promise.all([
  Bun.write(
    `${reports}/bun-jsc-heap-stats.json`,
    JSON.stringify({
      before,
      after,
      nativeBefore,
      nativeAfter,
      sink,
      calls,
      cases: cases.map(([name]) => name),
    }),
  ),
  Bun.write(`${reports}/bun-jsc-sampling.json`, JSON.stringify(sampling)),
  Bun.write(`${reports}/bun-jsc.heapsnapshot`, JSON.stringify(Bun.generateHeapSnapshot())),
]);
