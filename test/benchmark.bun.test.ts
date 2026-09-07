// SPDX-License-Identifier: Apache-2.0

// A successful matrix requires measurements from every requested child, not merely one survivor.
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, expect, test } from "bun:test";

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
      sameTickPairs: 1, orderedWithinTick: 0, peakDrawsPerTick: 2, counterBits: 0,
      counterHolds: 0, minOnesRatio: 0, maxOnesRatio: 1 };
if (mode === "hang") { setInterval(() => {}, 1000); await new Promise(() => {}); }
if (mode === "empty") process.exit(0);
if (mode === "exit") { console.error("child failure"); process.exit(7); }
if (mode === "entropy-empty" && !speed) process.exit(0);
if (mode === "malformed") console.log("not JSON");
if (mode === "fields") { console.log(JSON.stringify({ runtime: "fixture 1" })); process.exit(0); }
if (mode === "nonfinite" && speed) record.opsPerSecond = Infinity;
if (mode === "range" && !speed) record.maxOnesRatio = 2;
if (mode === "counts" && !speed) record.orderedWithinTick = 2;
if (mode === "sources" && !speed) record.sources = [3];
if (mode === "entries" && !speed) record.runtime = "different 2";
console.log(JSON.stringify(record));
if (mode === "exit-after") process.exit(7);
if (mode === "duplicate") console.log(JSON.stringify(record));
if (mode === "runtime") console.log(JSON.stringify({ ...record, runtime: "different 2" }));
`,
  );
});
afterAll(async () => {
  await rm(directory, { recursive: true, force: true });
});

test("profiling refuses failures after its initial success witness", async () => {
  const api = join(import.meta.dir, "../src/index.ts");
  const subject = join(directory, "fails-after-witness.mjs");
  await Bun.write(
    subject,
    `
export * from ${JSON.stringify(api)};
import { formatUuid as original, UuidSlugError } from ${JSON.stringify(api)};
let calls = 0;
export function formatUuid(...args) {
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

test.each([
  ["exit", "exited 7"],
  ["missing", "could not run"],
  ["empty", "no valid measurements"],
  ["entropy-empty", "entropy: no valid measurements"],
  ["malformed", "line 1"],
  ["fields", "invalid measurement fields"],
  ["nonfinite", "invalid measurement fields"],
  ["duplicate", "duplicate measurement"],
  ["runtime", "runtime changes between records"],
  ["range", "invalid measurement fields"],
  ["counts", "invalid measurement fields"],
  ["sources", "invalid measurement fields"],
  ["entries", "runtime changes between speed and entropy reports"],
  ["exit-after", "exited 7"],
])("matrix fails %s and preserves the successful runtime", async (mode, diagnostic) => {
  const result = await matrix(mode);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain(diagnostic);
  expect(result.stdout).toContain("control (fixture 1)");
  expect(result.stdout).toContain("measured");
  expect(result.stdout).toContain("Randomness — control (fixture 1)");
  if (mode === "malformed" || mode === "exit-after")
    expect(result.stdout).toContain("Randomness — subject (fixture 1)");
});

test("valid zero-valued entropy statistics do not impose quality thresholds", async () => {
  const result = await matrix("valid");
  expect(result.status).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.stdout).toContain("Randomness — subject (fixture 1)");
  expect(result.stdout).toContain("Randomness — control (fixture 1)");
});

test.each(["0", "-1", "1.5", "NaN", "Infinity"])(
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

// The timeout bounds a deliberately hung child; it does not decide readiness.
test("hung runtime cannot hold the matrix indefinitely", async () => {
  const result = await matrix("hang", 100);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("exited");
  expect(result.stdout).toContain("Randomness — control (fixture 1)");
});
