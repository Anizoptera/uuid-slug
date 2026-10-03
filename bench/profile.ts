// SPDX-License-Identifier: Apache-2.0

// Profile the public package with varying inputs; keep setup, GC and reporting outside timed batches.
import { performance } from "node:perf_hooks";
import { setImmediate as yieldToLoop } from "node:timers/promises";
import { writeFile } from "node:fs/promises";
import inspector from "node:inspector/promises";
import * as v8 from "node:v8";
import originalFixtures from "../rust/uuid-slug/tests/fixtures/fixtures-original-slugs.json" with { type: "json" };
import { assertProfileOutcome, createProfileCases, selectProfileCases } from "./profile-cases";
import { sampleCallLatency } from "./call-latency";
import { uuidPairChecksum } from "./profile-case";

const nativeDirectory = process.env.UUID_SLUG_PROFILE_NATIVE_DIR;
const nativeName = process.env.UUID_SLUG_PROFILE_NATIVE_NAME;
const session = nativeDirectory ? new inspector.Session() : undefined;
const gcProfiler = session ? new v8.GCProfiler() : undefined;
const versions = process.versions as typeof process.versions & { deno?: string };
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
const suite = createProfileCases(api, originalFixtures.issued, privateV4Api, privateAlphabetApi);
suite.verify();
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
    else sink ^= uuidPairChecksum(value, i) ?? 1;
  }
}
const gc = (globalThis as { gc?: () => void }).gc;
const filter = process.env.UUID_SLUG_PROFILE_FILTER;
const samples = Number(process.env.UUID_SLUG_PROFILE_SAMPLES ?? 7);
const duration = Number(process.env.UUID_SLUG_PROFILE_MS ?? 20);
const warmup = Number(process.env.UUID_SLUG_PROFILE_WARMUP_MS ?? 16);
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
for (const [name, fn] of selected) {
  const expectedError = assertProfileOutcome(name, fn(0));
  const started = performance.now();
  do batch(name, fn, 64, expectedError);
  while (performance.now() - started < warmup);
}
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
  }),
);
for (const [name, fn] of selected) {
  const witness = fn(0);
  const expectedError = assertProfileOutcome(name, witness);
  gc?.();
  const heapBefore = process.memoryUsage();
  const cpuBefore = process.cpuUsage();
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
      batch(name, fn, 64, expectedError);
      maxBatchMs = Math.max(maxBatchMs, performance.now() - began);
      count += 64;
      elapsed = performance.now() - start;
    } while (elapsed < duration);
    maxUninterruptedMs = Math.max(maxUninterruptedMs, elapsed);
    ns.push((elapsed * 1e6) / count);
    operations += count;
    await yieldToLoop();
  }
  const cpu = process.cpuUsage(cpuBefore);
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
      maxBatchMs,
      maxUninterruptedMs,
      sink,
      cpuUs: cpu.user + cpu.system,
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
