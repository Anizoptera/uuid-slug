// SPDX-License-Identifier: Apache-2.0

// Profile the public package with varying inputs; keep setup, GC and reporting outside timed batches.
import { performance } from "node:perf_hooks";
import { Buffer } from "node:buffer";
import { setImmediate as yieldToLoop } from "node:timers/promises";
import { writeFile } from "node:fs/promises";
import inspector from "node:inspector/promises";
import * as v8 from "node:v8";
import originalFixtures from "../rust/uuid-slug/tests/fixtures/fixtures-original-slugs.json" with { type: "json" };
import { assertProfileOutcome, createProfileCases, selectProfileCases } from "./profile-cases";
import { sampleCallLatency } from "./call-latency";
import { uuidObjectChecksum } from "./profile-case";

const nativeDirectory = process.env.UUID_SLUG_PROFILE_NATIVE_DIR;
const nativeName = process.env.UUID_SLUG_PROFILE_NATIVE_NAME;
const session = nativeDirectory ? new inspector.Session() : undefined;
const gcProfiler = session ? new v8.GCProfiler() : undefined;
const versions = process.versions as typeof process.versions & { deno?: string };
// Process CPU includes JIT and worker threads. Retain it, but measure the caller thread too
// so helper work cannot be mistaken for synchronous call cost. Older hosts omit this metric.
const threadCpuUsage = (
  process as { threadCpuUsage?: (previous?: NodeJS.CpuUsage) => NodeJS.CpuUsage }
).threadCpuUsage?.bind(process);
const isNode = !versions.bun && !versions.deno;
const captureV8State = () => ({
  code: v8.getHeapCodeStatistics(),
  cpp: v8.getCppHeapStatistics("brief"),
  heap: v8.getHeapStatistics(),
  spaces: v8.getHeapSpaceStatistics(),
});
if (nativeDirectory && !nativeName)
  throw new Error("UUID_SLUG_PROFILE_NATIVE_NAME is required with native profiling");
if (session) {
  session.connect();
  await Promise.all([session.post("Profiler.enable"), session.post("HeapProfiler.enable")]);
}

const beforeImport = performance.now();
const api: typeof import("../src/index") = await import(
  process.env.UUID_SLUG_PROFILE_MODULE ?? "@anizoptera/uuid-slug"
);
const privateV4Api = process.env.UUID_SLUG_PROFILE_PRIVATE_MODULE
  ? await import(process.env.UUID_SLUG_PROFILE_PRIVATE_MODULE)
  : process.env.UUID_SLUG_PROFILE_PRIVATE === "1"
    ? await import("../src/v4")
    : undefined;
const privateAlphabetApi = process.env.UUID_SLUG_PROFILE_ALPHABET_MODULE
  ? await import(process.env.UUID_SLUG_PROFILE_ALPHABET_MODULE)
  : process.env.UUID_SLUG_PROFILE_PRIVATE === "1"
    ? await import("../src/alphabet")
    : undefined;
const importMs = performance.now() - beforeImport;
const suite = createProfileCases(
  api,
  originalFixtures.issued,
  privateV4Api,
  privateAlphabetApi,
  Buffer,
);
suite.verify();
const generationName = process.env.UUID_SLUG_PROFILE_GENERATION_CASE;
if (generationName) {
  // The qualified corpus owns the complete rival call and its payload/ownership witness.
  // It honors PROFILE_MODULE for package rows too; retain the same graph as the profiler API.
  // Select before sampling; corpus setup and imports are not per-identifier allocation.
  const { generationCases } = await import("./generation-cases");
  const { verifyGenerationCase } = await import("./generation-case");
  const selected = generationCases.find(({ name }) => name === generationName);
  if (!selected || selected.qualification !== "qualified")
    throw new Error(`No qualified generation case named ${generationName}`);
  verifyGenerationCase(selected);
  suite.cases[generationName] = () => selected.operation();
}
const { cases } = suite;
let sink = 0;
function batch(
  name: string,
  fn: (i: number) => ReturnType<(typeof cases)[string]>,
  count: number,
  expectedError: boolean,
) {
  for (let i = 0; i < count; i += 1) {
    const value = fn(i);
    if (expectedError !== value instanceof Error)
      throw new Error(
        `Profile operation changed its expected success/failure outcome: ${name} at index ${i}${value instanceof Error ? `: ${value.message}` : ""}`,
        { cause: value },
      );
    if (typeof value === "string") sink ^= value.charCodeAt(i % value.length);
    else if (typeof value === "number") sink ^= value;
    else if (typeof value === "boolean") sink ^= Number(value);
    else if (value instanceof Uint8Array) sink ^= value[i % value.length] as number;
    else if (value instanceof Error) sink ^= value.message.length;
    else sink ^= uuidObjectChecksum(value, i) ?? 1;
  }
}
const gc = (globalThis as { gc?: () => void }).gc;
const filter = generationName ? `=${generationName}` : process.env.UUID_SLUG_PROFILE_FILTER;
const samples = Number(process.env.UUID_SLUG_PROFILE_SAMPLES ?? 7);
const duration = Number(process.env.UUID_SLUG_PROFILE_MS ?? 20);
const warmup = Number(process.env.UUID_SLUG_PROFILE_WARMUP_MS ?? 16);
const warmupCalls =
  process.env.UUID_SLUG_PROFILE_WARMUP_CALLS === undefined
    ? undefined
    : Number(process.env.UUID_SLUG_PROFILE_WARMUP_CALLS);
const measuredCalls =
  process.env.UUID_SLUG_PROFILE_CALLS === undefined
    ? undefined
    : Number(process.env.UUID_SLUG_PROFILE_CALLS);
if (measuredCalls !== undefined && (!Number.isSafeInteger(measuredCalls) || measuredCalls < 1))
  throw new Error("Measured calls must be a positive safe integer");
if (warmupCalls !== undefined && (!Number.isSafeInteger(warmupCalls) || warmupCalls < 1))
  throw new Error("Warm-up calls must be a positive safe integer");
const latencySamples =
  process.env.UUID_SLUG_PROFILE_LATENCY_SAMPLES === undefined
    ? undefined
    : Number(process.env.UUID_SLUG_PROFILE_LATENCY_SAMPLES);
if (
  latencySamples !== undefined &&
  (!Number.isSafeInteger(latencySamples) || latencySamples < 1 || session)
)
  throw new Error(
    "Latency samples must be a positive safe integer and run without native profiling",
  );
if (
  !Number.isSafeInteger(samples) ||
  samples < 1 ||
  !Number.isFinite(duration) ||
  duration <= 0 ||
  !Number.isFinite(warmup) ||
  warmup <= 0
)
  throw new Error(
    "Profile samples must be positive, with positive duration and warm-up milliseconds",
  );
const selected = selectProfileCases(cases, filter);
const beforeCaseFilter = process.env.UUID_SLUG_PROFILE_BEFORE_CASE_FILTER;
if (beforeCaseFilter && (selected.length !== 1 || warmupCalls === undefined))
  throw new Error(
    "Prior-work comparison requires one measured case and UUID_SLUG_PROFILE_WARMUP_CALLS; select the preceding operations with UUID_SLUG_PROFILE_BEFORE_CASE_FILTER.",
  );
// Elapsed warm-up time can include descheduling. Record executed work so comparisons can expose
// unequal preparation; neither elapsed time nor these counts prove that an engine is optimized.
const warmupWork = new Map<
  string,
  { operations: number; wallMs: number; threadCpuUs: number | undefined }
>();
for (const [name, fn] of selected) {
  const expectedError = assertProfileOutcome(name, fn(0));
  let operations = 0;
  const threadBefore = threadCpuUsage?.();
  const started = performance.now();
  if (warmupCalls !== undefined) {
    // Equal call counts control executed preparation under interruption; they do not prove JIT readiness.
    batch(name, fn, warmupCalls, expectedError);
    operations = warmupCalls;
  } else {
    do {
      batch(name, fn, 64, expectedError);
      operations += 64;
    } while (performance.now() - started < warmup);
  }
  const wallMs = performance.now() - started;
  const thread = threadBefore && threadCpuUsage?.(threadBefore);
  warmupWork.set(name, { operations, wallMs, threadCpuUs: thread && thread.user + thread.system });
}
// Faster preceding calls execute more work in fixed time windows. Equal completed calls expose
// their effect on a later control without attributing unequal GC/engine preparation to its code.
const beforeCaseWork = beforeCaseFilter
  ? selectProfileCases(cases, beforeCaseFilter).map(([name, fn]) => {
      batch(name, fn, warmupCalls!, assertProfileOutcome(name, fn(0)));
      return { name, operations: warmupCalls! };
    })
  : undefined;
if (session) {
  gc?.();
  gcProfiler?.start();
  await session.post("Profiler.setSamplingInterval", { interval: 100 });
  await session.post("HeapProfiler.startSampling", {
    samplingInterval: 4096,
    includeObjectsCollectedByMajorGC: true,
    includeObjectsCollectedByMinorGC: true,
  });
  await session.post("Profiler.start");
}
const v8Before = session && isNode ? captureV8State() : undefined;
const runtime = versions.bun
  ? `bun ${versions.bun}`
  : versions.deno
    ? `deno ${versions.deno}`
    : `node ${process.version}`;
console.log(
  JSON.stringify({
    runtime,
    executable: process.execPath,
    importMs,
    gc: Boolean(gc),
    samples,
    duration,
    warmup,
    ...(measuredCalls === undefined ? {} : { measuredCallsPerSample: measuredCalls }),
    ...(beforeCaseWork ? { beforeCaseWork } : {}),
  }),
);
for (const [name, fn] of selected) {
  const witness = fn(0);
  const expectedError = assertProfileOutcome(name, witness);
  gc?.();
  const heapBefore = process.memoryUsage();
  const cpuBefore = process.cpuUsage();
  const threadCpuBefore = threadCpuUsage?.();
  const resourceBefore = process.resourceUsage();
  const ns: number[] = [];
  let maxBatchMs = 0;
  let maxUninterruptedMs = 0;
  let operations = 0;
  for (let sample = 0; sample < samples; sample += 1) {
    let count = 0;
    const start = performance.now();
    let elapsed = 0;
    do {
      const began = performance.now();
      // Equal completed calls control allocation comparisons; time windows remain the default.
      const block = measuredCalls === undefined ? 64 : Math.min(64, measuredCalls - count);
      batch(name, fn, block, expectedError);
      maxBatchMs = Math.max(maxBatchMs, performance.now() - began);
      count += block;
      elapsed = performance.now() - start;
    } while (measuredCalls === undefined ? elapsed < duration : count < measuredCalls);
    maxUninterruptedMs = Math.max(maxUninterruptedMs, elapsed);
    ns.push((elapsed * 1e6) / count);
    operations += count;
    await yieldToLoop();
  }
  const cpu = process.cpuUsage(cpuBefore);
  const threadCpu = threadCpuBefore && threadCpuUsage?.(threadCpuBefore);
  const resourceAfter = process.resourceUsage();
  const heapAfter = process.memoryUsage();
  gc?.();
  const retained = process.memoryUsage();
  ns.sort((a, b) => a - b);
  console.log(
    JSON.stringify({
      name,
      ns,
      operations,
      warmupWork: warmupWork.get(name),
      maxBatchMs,
      maxUninterruptedMs,
      sink,
      cpuUs: cpu.user + cpu.system,
      threadCpuUs: threadCpu && threadCpu.user + threadCpu.system,
      resourceDelta: {
        fsRead: resourceAfter.fsRead - resourceBefore.fsRead,
        fsWrite: resourceAfter.fsWrite - resourceBefore.fsWrite,
        majorPageFault: resourceAfter.majorPageFault - resourceBefore.majorPageFault,
        minorPageFault: resourceAfter.minorPageFault - resourceBefore.minorPageFault,
        voluntaryContextSwitches:
          resourceAfter.voluntaryContextSwitches - resourceBefore.voluntaryContextSwitches,
        involuntaryContextSwitches:
          resourceAfter.involuntaryContextSwitches - resourceBefore.involuntaryContextSwitches,
      },
      heapDelta: heapAfter.heapUsed - heapBefore.heapUsed,
      retainedDelta: retained.heapUsed - heapBefore.heapUsed,
      rss: retained.rss,
      arrayBuffers: retained.arrayBuffers,
    }),
  );
}
// Keep per-call clocks out of throughput batches and native profiler captures.
if (latencySamples !== undefined) {
  for (const [name, fn] of selected) {
    const witness = fn(0);
    if (typeof witness === "object" && !(witness instanceof Uint8Array))
      throw new Error(`Call latency requires a scalar or byte result; narrow the filter: ${name}`);
    const latency = await sampleCallLatency(
      fn,
      (value, index) => {
        if (value instanceof Error) throw value;
        if (typeof value === "string") sink ^= value.charCodeAt(index % value.length);
        else if (typeof value === "number") sink ^= value;
        else if (typeof value === "boolean") sink ^= Number(value);
        else if (value instanceof Uint8Array) sink ^= value[index % value.length] as number;
        else throw new Error(`Call latency result changed shape: ${name}`);
      },
      latencySamples,
      yieldToLoop,
    );
    console.log(
      JSON.stringify({ name, measurement: "instrumented-call-latency", ...latency, sink }),
    );
  }
}
if (session && nativeDirectory) {
  const [cpu, heap] = await Promise.all([
    session.post("Profiler.stop"),
    session.post("HeapProfiler.stopSampling"),
  ]);
  const gcProfile = gcProfiler?.stop();
  if (!gcProfile) throw new Error("Native profiling did not start the GC profiler");
  const v8After = isNode ? captureV8State() : undefined;
  session.disconnect();
  v8.writeHeapSnapshot(`${nativeDirectory}/${nativeName}.heapsnapshot`);
  await Promise.all([
    writeFile(`${nativeDirectory}/${nativeName}.cpuprofile`, JSON.stringify(cpu.profile)),
    writeFile(`${nativeDirectory}/${nativeName}.gc.json`, JSON.stringify(gcProfile)),
    writeFile(`${nativeDirectory}/${nativeName}.heapprofile`, JSON.stringify(heap.profile)),
    ...(v8Before && v8After
      ? [
          writeFile(
            `${nativeDirectory}/${nativeName}.v8.json`,
            JSON.stringify({ before: v8Before, after: v8After }),
          ),
        ]
      : []),
  ]);
}
