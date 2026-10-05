// SPDX-License-Identifier: Apache-2.0

import { heapStats, memoryUsage, profile } from "bun:jsc";
import { Buffer } from "node:buffer";
import originalFixtures from "../rust/uuid-slug/tests/fixtures/fixtures-original-slugs.json" with { type: "json" };
import { createProfileCases, selectProfileCases } from "./profile-cases";
import { createConversionCases } from "./conversion-cases";
import { uuidObjectChecksum } from "./profile-case";
import type { ProfileCase } from "./profile-case";

const reports = process.env.UUID_SLUG_PROFILE_NATIVE_DIR;
if (!reports) throw new Error("UUID_SLUG_PROFILE_NATIVE_DIR is required");
// Load the same isolated public graph as the timing driver; a static source import would
// profile the baseline even when the caller requests a candidate module.
const api: typeof import("../src/index") = await import(
  process.env.UUID_SLUG_PROFILE_MODULE ?? "../src/index"
);
const calls = Number(process.env.UUID_SLUG_PROFILE_CALLS ?? 32_768);
const memoryWindows = Number(process.env.UUID_SLUG_PROFILE_MEMORY_WINDOWS ?? 1);
const warmupCalls =
  process.env.UUID_SLUG_PROFILE_WARMUP_CALLS === undefined
    ? 0
    : Number(process.env.UUID_SLUG_PROFILE_WARMUP_CALLS);
// Sampling counts depend on profiler scheduling; use caller CPU for the unsampled fixed-call pass.
// Process CPU also includes helper threads, so keep the two observations distinct.
const threadCpuUsage = (
  process as { threadCpuUsage?: (previous?: NodeJS.CpuUsage) => NodeJS.CpuUsage }
).threadCpuUsage?.bind(process);
if (!Number.isSafeInteger(calls) || calls < 1)
  throw new Error("UUID_SLUG_PROFILE_CALLS must be a positive safe integer");
if (!Number.isSafeInteger(memoryWindows) || memoryWindows < 1)
  throw new Error("UUID_SLUG_PROFILE_MEMORY_WINDOWS must be a positive safe integer");
if (!Number.isSafeInteger(warmupCalls) || warmupCalls < 0)
  throw new Error("UUID_SLUG_PROFILE_WARMUP_CALLS must be a nonnegative safe integer");
const filter = process.env.UUID_SLUG_PROFILE_FILTER;
const generationName = process.env.UUID_SLUG_PROFILE_GENERATION_CASE;
const cases: [string, ProfileCase][] = [];
if (generationName) {
  if (process.env.UUID_SLUG_PROFILE_MODULE)
    throw new Error(
      "Generation-case profiles use the corpus package graph; omit UUID_SLUG_PROFILE_MODULE.",
    );
  // Reuse the qualified generation corpus so rival profiles measure the same complete call.
  // Selection precedes memory snapshots; import and corpus setup are not per-ID allocations.
  const { generationCases } = await import("./generation-cases");
  const { verifyGenerationCase } = await import("./generation-case");
  const selected = [
    ...generationCases,
    ...createConversionCases(Buffer, undefined, generationCases).cases,
  ].find(({ name }) => name === generationName);
  if (!selected || selected.qualification !== "qualified")
    throw new Error(`No qualified generation case named ${generationName}`);
  verifyGenerationCase(selected);
  cases.push([selected.name, selected.operation]);
} else {
  const suite = createProfileCases(
    api,
    originalFixtures.issued,
    process.env.UUID_SLUG_PROFILE_PRIVATE === "1" ? await import("../src/v4") : undefined,
    process.env.UUID_SLUG_PROFILE_PRIVATE === "1" ? await import("../src/alphabet") : undefined,
    Buffer,
  );
  suite.verify();
  cases.push(...selectProfileCases(suite.cases, filter));
}

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

// Explicit equal-count preparation separates repeated-call retention from initialization;
// leaving it absent preserves cold captures. Both modes include the same successful calls.
if (warmupCalls > 0) runCases(warmupCalls);
Bun.gc(true);
const before = heapStats();
const nativeBefore = memoryUsage();
console.error("UUID_SLUG_MIMALLOC_BEFORE");
Bun.unsafe.mimallocDump();
function runCases(callsToRun = calls): void {
  for (const [name, operation] of cases) {
    const expectedError = name.startsWith("invalid.");
    for (let index = 0; index < callsToRun; index += 1) {
      const value = operation(index);
      if (expectedError !== value instanceof Error)
        throw new Error(`Unexpected outcome for ${name}`, { cause: value });
      consume(value, index);
    }
  }
}
// Measure the workload without retaining CPU sample records in its final heap reading.
// Sampling needs its own pass: its returned arrays and strings are harness-owned memory.
const cpuBefore = process.cpuUsage();
const threadBefore = threadCpuUsage?.();
runCases();
const threadCpu = threadBefore && threadCpuUsage?.(threadBefore);
const cpu = process.cpuUsage(cpuBefore);
Bun.gc(true);
const after = heapStats();
const nativeAfter = memoryUsage();
console.error("UUID_SLUG_MIMALLOC_AFTER");
Bun.unsafe.mimallocDump();

// Equal windows in one process distinguish continuing native growth from initialization.
// Emit observations instead of retaining them; snapshots and sampling must follow all windows.
for (let window = 1; window < memoryWindows; window += 1) {
  Bun.gc(true);
  const start = memoryUsage();
  const cpuStart = process.cpuUsage();
  runCases();
  const windowCpu = process.cpuUsage(cpuStart);
  Bun.gc(true);
  console.log(
    JSON.stringify({
      kind: "memory-window",
      window,
      calls,
      before: start,
      after: memoryUsage(),
      cpuUs: windowCpu.user + windowCpu.system,
    }),
  );
}

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
      // Each selected case executes this many calls in each pass.
      memoryCalls: calls,
      memoryWindows,
      warmupCalls,
      cpuUs: cpu.user + cpu.system,
      threadCpuUs: threadCpu && threadCpu.user + threadCpu.system,
      samplingCalls: calls,
      cases: cases.map(([name]) => name),
    }),
  ),
  Bun.write(`${reports}/bun-jsc.heapsnapshot`, JSON.stringify(Bun.generateHeapSnapshot())),
]);
await Bun.write(`${reports}/bun-jsc-sampling.json`, JSON.stringify(profile(runCases, 100)));
