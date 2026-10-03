// SPDX-License-Identifier: Apache-2.0

// A successful matrix requires measurements from every requested child, not merely one survivor.
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, expect, test } from "bun:test";
import { renderGenerationReport, verdict } from "../bench/generation-report";
import type { ReportRecord } from "../bench/generation-report";
import { parseReport } from "../bench/matrix";
import { verifyGenerationCase } from "../bench/generation-case";
import type { GenerationCase } from "../bench/generation-case";
import { createConversionCases } from "../bench/conversion-cases";
import { uuidStringToPlainSlug } from "../src/index";
import {
  aggregateForkSamples,
  describeSamples,
  FRESH_PROCESS_SAMPLE_UNIT,
  medianConfidence95,
  WITHIN_PROCESS_BATCH_SAMPLE_UNIT,
} from "../bench/statistics";
import { describeCallLatency, sampleCallLatency } from "../bench/call-latency";
import { selectProfileCases, uuidObjectChecksum } from "../bench/profile-case";
import { setImmediate as yieldToLoop } from "node:timers/promises";

const speed = {
  runtime: "fixture 1",
  name: "measured",
  opsPerSecond: 100,
  elapsedMs: 10,
  iterations: 1,
};

test("exact profile filters exclude similarly named failure and configured calls", () => {
  const cases = { "v7.into": 1, "invalid.v7.into.range": 2, "v7.into.configured": 3 };
  expect(selectProfileCases(cases, "=v7.into")).toEqual([["v7.into", 1]]);
  expect(selectProfileCases(cases, "v7.into")).toHaveLength(3);
  expect(() => selectProfileCases(cases, "=absent")).toThrow("selected no cases");
});

test("conversion witnesses reject lost payload bits after a valid first result", () => {
  const first = new Uint8Array(16);
  first[6] = 0x70;
  first[8] = 0x80;
  const second = new Uint8Array(first);
  second[15] = 1;
  let calls = 0;
  const candidate: GenerationCase = {
    comparable: "conversion.text.bytes",
    implementation: "fixture",
    name: "payload loss",
    expectedValues: [first, second],
    operation: () => {
      calls += 1;
      return first;
    },
    qualification: "qualified",
    version: 7,
  };
  expect(() => verifyGenerationCase(candidate)).toThrow("wrong fixed conversion value");
  expect(calls).toBe(2);
  expect(() => verifyGenerationCase({ ...candidate, expectedValues: [] })).toThrow(
    "no fixed conversion witnesses",
  );
});
test("pair profiling consumes each returned spelling", () => {
  expect(uuidObjectChecksum({ uuid: "a", slug: "b" }, 0)).not.toBe(
    uuidObjectChecksum({ uuid: "c", slug: "b" }, 0),
  );
  expect(uuidObjectChecksum({ uuid: "a", slug: "b" }, 0)).not.toBe(
    uuidObjectChecksum({ uuid: "a", slug: "d" }, 0),
  );
});

test("immutable UUID profiling reads the generated version once", () => {
  let reads = 0;
  const value = {
    get version() {
      reads += 1;
      return 7;
    },
  };
  expect(uuidObjectChecksum(value, 0)).toBe(7);
  expect(reads).toBe(1);
  expect(uuidObjectChecksum({ version: 4 }, 0)).toBe(4);
  expect(uuidObjectChecksum({ version: "7" }, 0)).toBeUndefined();
});

test("owned decoding witnesses reject Buffer subclasses and shared backing storage", () => {
  const expected = new Uint8Array(16);
  const candidate: GenerationCase = {
    comparable: "conversion.slug.bytes",
    implementation: "fixture",
    name: "owned decoding",
    expectedValues: [expected, expected],
    ownedBytes: true,
    operation: () => new Uint8Array(16),
    qualification: "qualified",
    version: 7,
  };
  expect(() => verifyGenerationCase(candidate)).not.toThrow();
  for (const operation of [
    () => Buffer.alloc(16),
    () => expected,
    () => new Uint8Array(expected.buffer),
  ])
    expect(() => verifyGenerationCase({ ...candidate, operation })).toThrow(
      "fresh plain Uint8Array storage",
    );
});

test("allocated generation witnesses reject Buffer and reused backing storage", () => {
  const shared = new Uint8Array(16);
  shared[6] = 0x70;
  shared[8] = 0x80;
  const fresh = () => Uint8Array.from(shared);
  const candidate: GenerationCase = {
    comparable: "v7.bytes.allocate.secure",
    implementation: "fixture",
    name: "owned generation",
    operation: fresh,
    qualification: "qualified",
    version: 7,
  };
  expect(() => verifyGenerationCase(candidate)).not.toThrow();
  for (const operation of [
    () => Buffer.from(shared),
    () => shared,
    () => new Uint8Array(shared.buffer),
  ])
    expect(() => verifyGenerationCase({ ...candidate, operation })).toThrow(
      "fresh plain Uint8Array storage",
    );
  // An incomplete native floor remains measurable without entering the equivalent ranking.
  expect(() =>
    verifyGenerationCase({
      ...candidate,
      operation: () => Buffer.from(shared),
      qualification: "rejected",
      rejectionReason: "Buffer is not a plain owned array",
    }),
  ).not.toThrow();
});

test("native Buffer decoding remains timed without qualifying as an owned result", () => {
  const { cases } = createConversionCases(Buffer);
  const borrowed = cases.find(({ name }) => name === "platform.buffer.conversion.slug.bytes");
  const owned = cases.find(({ name }) => name === "platform.buffer-copy.conversion.slug.bytes");
  expect(borrowed).toBeDefined();
  expect(owned).toBeDefined();
  expect(borrowed!.qualification).toBe("rejected");
  expect(borrowed!.rejectionReason).toContain("caller-private plain Uint8Array");
  expect(() => verifyGenerationCase(borrowed!)).not.toThrow();
  // Matching bytes do not establish the ownership the qualified comparison requires.
  expect(() => verifyGenerationCase({ ...borrowed!, ownedBytes: true })).toThrow(
    "fresh plain Uint8Array storage",
  );
  expect(owned!.qualification).toBe("qualified");
  expect(() => verifyGenerationCase(owned!)).not.toThrow();
});

test("pair witnesses reject two valid spellings of different UUIDs", () => {
  const uuid = "01990d4d-e600-7000-8000-000000000000";
  const slug = uuidStringToPlainSlug(uuid);
  if (slug instanceof Error) throw slug;
  const candidate: GenerationCase = {
    comparable: "v7.pair.secure",
    implementation: "fixture",
    name: "pair",
    operation: () => ({ uuid, slug }),
    qualification: "qualified",
    version: 7,
  };
  expect(() => verifyGenerationCase(candidate)).not.toThrow();
  expect(() =>
    verifyGenerationCase({
      ...candidate,
      operation: () => ({ uuid: "01990d4d-e600-7000-8000-000000000001", slug }),
    }),
  ).toThrow("mismatched UUID and slug payloads");
});

const entropy = {
  runtime: "fixture 1",
  candidate: "measured",
  samples: 2,
  sources: [],
  distinctFields: 2,
  sameTickPairs: 1,
  orderedWithinTick: 0,
  peakDrawsPerTick: 2,
  burstClockChangeMs: 0,
  burstEndUnixMs: 0,
  latestEncodedUnixMs: 0,
  counterBits: 0,
  counterHolds: 0,
  minOnesRatio: 0,
  maxOnesRatio: 1,
};

test("Bun memory profiling executes private portable encoders", async () => {
  const directory = await mkdtemp(join(tmpdir(), "uuid-slug-memory-corpus-"));
  try {
    const child = Bun.spawn(
      [process.execPath, join(import.meta.dir, "..", "bench", "profile-bun-memory.ts")],
      {
        env: {
          ...process.env,
          UUID_SLUG_PROFILE_NATIVE_DIR: directory,
          UUID_SLUG_PROFILE_PRIVATE: "1",
          UUID_SLUG_PROFILE_FILTER: "portable.base64.encode,portable.base32.encode",
        },
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const [stdout, stderr, status] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    expect({ status, diagnostic: status === 0 ? "" : stdout + stderr }).toEqual({
      status: 0,
      diagnostic: "",
    });
    expect(await Bun.file(join(directory, "bun-jsc-sampling.json")).exists()).toBe(true);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test("median inference requires enough rounds and uses exact order-statistic bounds", () => {
  expect(medianConfidence95([1, 2, 3, 4, 5])).toBeUndefined();
  const values = [16, 3, 8, 11, 1, 15, 6, 13, 4, 10, 2, 14, 7, 12, 5, 9];
  expect(medianConfidence95(values)).toEqual([4, 13]);
  expect(values).toEqual([16, 3, 8, 11, 1, 15, 6, 13, 4, 10, 2, 14, 7, 12, 5, 9]);
});

test("sample spread and mean uncertainty preserve translation and scale", () => {
  expect(describeSamples([])).toBeUndefined();
  expect(describeSamples([9])?.meanStandardError).toBeUndefined();
  const original = describeSamples([1, 2, 3]);
  const shifted = describeSamples([1e12 + 1, 1e12 + 2, 1e12 + 3]);
  const scaled = describeSamples([2, 4, 6]);
  expect(original?.mean).toBe(2);
  expect(original?.sampleStandardDeviation).toBe(1);
  expect(original?.meanStandardError).toBeCloseTo(1 / Math.sqrt(3), 12);
  expect(shifted?.sampleStandardDeviation).toBe(original?.sampleStandardDeviation);
  expect(scaled?.sampleStandardDeviation).toBe(2);
  expect(scaled?.meanStandardError).toBeCloseTo(2 / Math.sqrt(3), 12);
});

test("call percentiles retain rare pauses and do not mutate acquisition order", () => {
  const ns = [50_000, ...Array<number>(99).fill(0)];
  expect(describeCallLatency(ns)).toEqual({
    sampleCount: 100,
    zeroCount: 99,
    p50Ns: 0,
    p99Ns: 0,
    p99Interpretation: "below-clock-resolution",
    maxNs: 50_000,
  });
  expect(ns[0]).toBe(50_000);
  expect(() => describeCallLatency([])).toThrow();
  expect(() => describeCallLatency([NaN])).toThrow();
  expect(() => describeCallLatency([-1])).toThrow();
});

test("call sampling brackets actual work and preserves every result and timer control", async () => {
  const consumed: number[] = [];
  let loopProgress = false;
  const progress = yieldToLoop().then(() => {
    loopProgress = true;
    return loopProgress;
  });
  const result = await sampleCallLatency(
    (index) => {
      const started = performance.now();
      while (performance.now() - started < 1) {
        /* Real elapsed work exposes an omitted call window. */
      }
      return index;
    },
    (value) => {
      consumed.push(value);
    },
    8,
    yieldToLoop,
  );
  expect(consumed).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  expect(result.ns).toHaveLength(8);
  expect(result.timerNs).toHaveLength(8);
  expect(Math.min(...result.ns)).toBeGreaterThanOrEqual(1e6);
  expect(loopProgress).toBe(true);
  await progress;
  const rejected = await sampleCallLatency(
    () => 0,
    () => {},
    0,
    yieldToLoop,
  ).then(
    () => false,
    (error: unknown) => error instanceof Error && error.message.includes("positive safe integer"),
  );
  expect(rejected).toBe(true);
});

test.each([
  ["malformed JSON", "run", "not JSON", "line 1"],
  ["missing fields", "run", JSON.stringify({ runtime: "fixture 1" }), "invalid measurement fields"],
  [
    "non-finite fields",
    "run",
    JSON.stringify({ ...speed, opsPerSecond: null }),
    "invalid measurement fields",
  ],
  [
    "duplicate names",
    "run",
    `${JSON.stringify(speed)}\n${JSON.stringify(speed)}`,
    "duplicate measurement",
  ],
  [
    "runtime changes",
    "run",
    `${JSON.stringify(speed)}\n${JSON.stringify({ ...speed, name: "second", runtime: "other 2" })}`,
    "runtime changes between records",
  ],
  [
    "out-of-range ratios",
    "entropy",
    JSON.stringify({ ...entropy, maxOnesRatio: 2 }),
    "invalid measurement fields",
  ],
  [
    "inconsistent counts",
    "entropy",
    JSON.stringify({ ...entropy, orderedWithinTick: 2 }),
    "invalid measurement fields",
  ],
  [
    "non-string sources",
    "entropy",
    JSON.stringify({ ...entropy, sources: [3] }),
    "invalid measurement fields",
  ],
  [
    "invalid clock observations",
    "entropy",
    JSON.stringify({ ...entropy, burstEndUnixMs: null }),
    "invalid measurement fields",
  ],
] as const)("report parsing rejects %s", (_case, entry, output, diagnostic) => {
  const parsed = parseReport("subject", entry, output);
  expect(parsed.errors.join("\n")).toContain(diagnostic);
});

test.each(["run", "entropy"] as const)("empty %s reports yield no measurements", (entry) => {
  expect(parseReport("subject", entry, "")).toEqual({
    records: [],
    version: "subject",
    errors: ["no valid measurements"],
  });
});

test("zero-valued entropy statistics remain valid observations", () => {
  expect(parseReport("subject", "entropy", JSON.stringify(entropy))).toEqual({
    records: [entropy],
    version: "fixture 1",
    errors: [],
  });
});

let directory: string;
let fixture: string;
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "uuid-slug-matrix-test-"));
  fixture = join(directory, "runtime.js");
  await Bun.write(
    fixture,
    `
const [mode, target] = process.argv.slice(2);
const speed = target.endsWith("run.ts");
const record = speed
  ? { runtime: "fixture 1", name: "measured", opsPerSecond: 100, elapsedMs: 10, iterations: 1 }
  : { runtime: "fixture 1", candidate: "measured", samples: 2, sources: [], distinctFields: 2,
      sameTickPairs: 1, orderedWithinTick: 0, peakDrawsPerTick: 2,
      burstClockChangeMs: 0, burstEndUnixMs: 0, latestEncodedUnixMs: 0, counterBits: 0,
      counterHolds: 0, minOnesRatio: 0, maxOnesRatio: 1 };
if (mode === "hang") { setInterval(() => {}, 1000); await new Promise(() => {}); }
if (mode === "entries" && !speed) record.runtime = "different 2";
console.log(JSON.stringify(record));
if (mode === "exit-after") process.exit(7);
`,
  );
});
afterAll(async () => {
  await rm(directory, { recursive: true, force: true });
});

// These cases wait on independent child processes. Concurrency overlaps those waits; each child
// owns its mutable files, while the shared fixture is read-only after beforeAll completes.
test.concurrent("failed entropy instrumentation restores globals before returning the error", async () => {
  const module = join(import.meta.dir, "instrument.ts");
  const child = Bun.spawn(
    [
      process.execPath,
      "-e",
      `
    import assert from "node:assert/strict";
    import { instrument } from ${JSON.stringify(module)};
    const original = Math.random;
    const descriptor = Object.getOwnPropertyDescriptor(crypto, "getRandomValues");
    const draw = crypto.getRandomValues;
    try {
      Object.defineProperty(crypto, "getRandomValues", { value: draw, writable: false, configurable: true });
      assert.throws(instrument);
      assert.equal(Math.random, original);
      const cause = new Error("entropy unavailable");
      const fails = () => { throw cause; };
      Object.defineProperty(crypto, "getRandomValues", { value: fails, writable: true, configurable: true });
      assert.throws(instrument, error => error === cause);
      assert.equal(Math.random, original);
      assert.equal(crypto.getRandomValues, fails);
    } finally {
      if (descriptor) Object.defineProperty(crypto, "getRandomValues", descriptor);
      else delete crypto.getRandomValues;
    }
  `,
    ],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [status, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  expect({ status, stdout, stderr }).toEqual({ status: 0, stdout: "", stderr: "" });
});

test.concurrent("profiling refuses failures after its initial success witness", async () => {
  const api = join(import.meta.dir, "../src/index.ts");
  const subject = join(directory, "fails-after-witness.mjs");
  await Bun.write(
    subject,
    `
export * from ${JSON.stringify(api)};
import { bytesToUuidString as original, UuidSlugError } from ${JSON.stringify(api)};
let calls = 0;
export function bytesToUuidString(...args) {
  return calls++ === 0 ? original(...args) : new UuidSlugError("invalid_uuid", "injected profiling failure");
}
`,
  );
  const child = Bun.spawn([process.execPath, join(import.meta.dir, "../bench/profile.ts")], {
    env: { ...process.env, UUID_SLUG_PROFILE_MODULE: subject, UUID_SLUG_PROFILE_FILTER: "format" },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, status] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  expect(status).not.toBe(0);
  expect(stderr).toContain("injected profiling failure");
  expect(stdout).not.toContain('"name":"format"');
});

test.concurrent.each([
  ["resources", 'new UuidSlugError("invalid_uuid", "discarded error");', "errors=1 exceeds 0"],
  [
    "latency",
    "for (let i = 0; i < 64; i += 1) { const result = uuidStringToBytes(value); if (result instanceof Error) throw result; }",
    "median ratio",
  ],
])("%s gate rejects a result-preserving regression", async (probe, extraWork, diagnostic) => {
  const api = join(import.meta.dir, "../src/index.ts");
  const subject = join(directory, `${probe}-regression.mjs`);
  await Bun.write(
    subject,
    `
export * from ${JSON.stringify(api)};
import { isUuidV7String as original, uuidStringToBytes, UuidSlugError } from ${JSON.stringify(api)};
export function isUuidV7String(value) { ${extraWork} return original(value); }
`,
  );
  const child = Bun.spawn([process.execPath, join(import.meta.dir, `../bench/${probe}.ts`)], {
    env: { ...process.env, UUID_SLUG_PROFILE_MODULE: subject },
    stdout: "pipe",
    stderr: "pipe",
    timeout: 5000,
  });
  const [stdout, stderr, status] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  expect(status).not.toBe(0);
  expect(stdout + stderr).toContain(diagnostic);
});

async function matrix(mode: string, timeoutMs = 30_000) {
  const matrixModule = join(import.meta.dir, "../bench/matrix.ts");
  const runtimes = [
    {
      label: "subject",
      command:
        mode === "missing"
          ? [join(directory, "absent-runtime")]
          : [process.execPath, fixture, mode],
      bundled: false,
    },
    { label: "control", command: [process.execPath, fixture, "valid"], bundled: false },
  ];
  const child = Bun.spawn(
    [
      process.execPath,
      "-e",
      `
    import { runMatrix } from ${JSON.stringify(matrixModule)};
    process.exitCode = await runMatrix(${JSON.stringify(runtimes)}, {run: "", entropy: ""}, false, ${timeoutMs});
  `,
    ],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [stdout, stderr, status] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { stdout, stderr, status };
}

test.concurrent.each([
  ["missing", "could not run"],
  ["entries", "runtime changes between speed and entropy reports"],
  ["exit-after", "exited 7"],
])("matrix fails %s and preserves the successful runtime", async (mode, diagnostic) => {
  const result = await matrix(mode);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain(diagnostic);
  expect(result.stdout).toContain("control (fixture 1)");
  expect(result.stdout).toContain("measured");
  expect(result.stdout).toContain("Randomness: control (fixture 1)");
  expect(result.stdout).toContain("| operation |");
  expect(result.stdout).toContain("| --- | ---: | ---: |");
  expect(result.stdout).toContain("| candidate | entropy source | distinct |");
  if (mode === "exit-after") expect(result.stdout).toContain("Randomness: subject (fixture 1)");
});

test.concurrent.each(["0", "-1", "1.5", "NaN", "Infinity"])(
  "benchmark rejects invalid counts %s",
  async (count) => {
    const results = await Promise.all(
      ["run", "entropy"].map(async (entry) => {
        const child = Bun.spawn([process.execPath, join(import.meta.dir, `../bench/${entry}.ts`)], {
          stdout: "pipe",
          stderr: "pipe",
          env: {
            ...process.env,
            UUID_SLUG_BENCH_ITERATIONS: count,
            UUID_SLUG_ENTROPY_SAMPLES: count,
          },
        });
        const [stdout, stderr, status] = await Promise.all([
          new Response(child.stdout).text(),
          new Response(child.stderr).text(),
          child.exited,
        ]);
        return { stdout, stderr, status };
      }),
    );
    for (const result of results) {
      expect(result.status).not.toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain("must be a positive safe integer");
    }
  },
);

// The timeout bounds a deliberately hung child. The healthy control runs under the same bound, so it
// must cover Bun startup while the commit hook runs other suites in parallel: 100 ms killed it there.
test.concurrent("hung runtime cannot hold the matrix indefinitely", async () => {
  const result = await matrix("hang", 1_000);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("exited");
  expect(result.stdout).toContain("Randomness: control (fixture 1)");
});

const row = (medianNs: number, median95?: readonly [number, number]) =>
  ({
    comparable: "v7.text",
    implementation: "x",
    kind: "measurement",
    ...(median95 ? { median95 } : {}),
    medianNs,
    name: "package.v7.text",
    qualification: "qualified",
    runtime: "node",
    sampleUnit: WITHIN_PROCESS_BATCH_SAMPLE_UNIT,
  }) as const;

const measurement = (
  name: string,
  medianNs: number,
  median95: readonly [number, number],
): ReportRecord => ({
  comparable: "v7.text",
  implementation: name,
  kind: "measurement",
  median95,
  medianNs,
  name,
  qualification: "qualified",
  runtime: "node",
  sampleUnit: WITHIN_PROCESS_BATCH_SAMPLE_UNIT,
});

// Disjoint intervals only distinguish costs when both describe the same observation unit.
test("generation report verdicts come from interval overlap", () => {
  expect(verdict(row(10, [9, 11]), row(20, [19, 21]))).toBe("leads");
  expect(verdict(row(20, [19, 21]), row(10, [9, 11]))).toBe("trails");
  expect(verdict(row(10, [9, 15]), row(12, [11, 20]))).toBe("unresolved");
  expect(verdict(row(10), row(20, [19, 21]))).toBe("unresolved");
  expect(
    verdict({ ...row(10, [9, 11]), sampleUnit: FRESH_PROCESS_SAMPLE_UNIT }, row(20, [19, 21])),
  ).toBe("unresolved");
});

test("fork statistics preserve processes instead of inflating the sample count with batches", () => {
  const a = { name: "a", ns: [9, 1, 5], operations: 3 };
  const b = { name: "b", ns: [20], operations: 1 };
  const forks = [
    [a, b],
    [
      { ...b, ns: [30, 40, 50] },
      { ...a, ns: [7] },
    ],
  ];
  const before = JSON.stringify(forks);
  const result = aggregateForkSamples(forks);
  expect(result[0]?.ns).toEqual([5, 7]);
  expect(result[1]?.ns).toEqual([20, 40]);
  expect(result[0]?.withinProcessNs).toEqual([[9, 1, 5], [7]]);
  expect(result[0]?.sampleUnit).toBe(FRESH_PROCESS_SAMPLE_UNIT);
  expect(describeSamples(result[0]!.ns)?.sampleCount).toBe(2);
  expect(JSON.stringify(forks)).toBe(before);
  expect(() => aggregateForkSamples([[a, b], [a]])).toThrow("inventory");
  expect(() =>
    aggregateForkSamples([
      [a, b],
      [a, a],
    ]),
  ).toThrow("inventory");
});

test("generation report ranks the fastest package route against the fastest rival", () => {
  const records: ReportRecord[] = [
    measurement("package.v7.text", 100, [95, 105]),
    measurement("package.v7.text.slow", 300, [290, 310]),
    measurement("uuid.v7.text", 200, [190, 210]),
    measurement("platform.v7.text", 90, [85, 95]),
    { kind: "comparison", runtime: "node" },
    { kind: "rejection", name: "fastv7.v7.text", reason: "sequence reuse", runtime: "node" },
    {
      kind: "unsupported",
      name: "crypto-randomuuid.v4.text",
      reason: "no browser export",
      runtime: "chromium",
    },
  ];
  const options = {
    durationMs: 20,
    generatedOn: "2026-01-01",
    machine: "fixture",
    samples: 9,
    warmupMs: 32,
  };
  const report = renderGenerationReport(records, options);
  expect(report).toContain("## node");
  expect(report).toContain(
    "| `v7.text` | `package.v7.text` | `uuid.v7.text` | 0.50 | leads | `platform.v7.text` | 1.11 | unresolved |",
  );
  expect(report).toContain("leads 1, trails 0, unresolved 0");
  expect(report).toContain("| `fastv7.v7.text` | sequence reuse | node |");
  expect(report).toContain("| `crypto-randomuuid.v4.text` | no browser export | chromium |");
  expect(() => renderGenerationReport([records[4] as ReportRecord], options)).toThrow(
    "No measurements",
  );
});

// The refusal must fire before any driver starts, or a smoke run could still write a file.
test.concurrent("bench:results refuses smoke settings", async () => {
  const child = Bun.spawn(
    [process.execPath, join(import.meta.dir, "..", "bench", "results.ts"), "--smoke"],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [stderr, status] = await Promise.all([new Response(child.stderr).text(), child.exited]);
  expect(status).not.toBe(0);
  expect(stderr).toContain("full runs only");
});
