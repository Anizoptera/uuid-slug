// SPDX-License-Identifier: Apache-2.0

import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

import { command } from "../scripts/command";

const project = join(import.meta.dir, "..");
const reports = join(import.meta.dir, "reports");
const smoke = process.argv.includes("--smoke");
const native = process.argv.includes("--native");
const samples = process.env.UUID_SLUG_PROFILE_SAMPLES ?? (smoke ? "1" : "7");
const duration = process.env.UUID_SLUG_PROFILE_MS ?? "2";
const warmup = process.env.UUID_SLUG_PROFILE_WARMUP_MS ?? (smoke ? "2" : "20");
const filter = process.env.UUID_SLUG_PROFILE_FILTER ?? "";
const environment: Readonly<Record<string, string>> = {
  UUID_SLUG_PROFILE_FILTER: filter,
  UUID_SLUG_PROFILE_MS: duration,
  UUID_SLUG_PROFILE_SAMPLES: samples,
  UUID_SLUG_PROFILE_WARMUP_MS: warmup,
};

const nativeFiles = [
  "node-inspector.cpuprofile",
  "node-inspector.heapprofile",
  "node-inspector.heapsnapshot",
  "deno-inspector.cpuprofile",
  "deno-inspector.heapprofile",
  "deno-inspector.heapsnapshot",
  "deno-cli.cpuprofile",
  "deno-cli.md",
  "deno-cli.svg",
  "node-exit.cpuprofile",
  "node-exit.heapprofile",
  "node-v8.log",
  "node-v8.txt",
  "node-trace.json",
  "bun-cpu.cpuprofile",
  "bun-cpu.md",
  "bun-heap.heapsnapshot",
  "bun-heap.md",
  "bun-jsc-heap-stats.json",
  "bun-jsc-sampling.json",
  "bun-jsc.heapsnapshot",
  "bun-mimalloc.txt",
  "chromium.cpuprofile",
  "chromium.heapprofile",
  "chromium.heapsnapshot",
  "chromium.metrics.json",
  "chromium.trace.json",
] as const;

const nativeEnvironment = (name: string): Readonly<Record<string, string>> => ({
  ...environment,
  UUID_SLUG_PROFILE_NATIVE_DIR: reports,
  UUID_SLUG_PROFILE_NATIVE_NAME: name,
});

async function resetNativeFiles(): Promise<void> {
  await Promise.all(nativeFiles.map((name) => rm(join(reports, name), { force: true })));
}

async function requireNativeFiles(): Promise<void> {
  const sizes = await Promise.all(nativeFiles.map((name) => stat(join(reports, name))));
  const empty = nativeFiles.filter((_, index) => sizes[index]?.size === 0);
  if (empty.length) throw new Error(`Native profilers emitted empty files: ${empty.join(", ")}`);

  const contracts = {
    "node-inspector.cpuprofile": ["nodes", "samples"],
    "node-inspector.heapprofile": ["head", "samples"],
    "node-inspector.heapsnapshot": ["snapshot", "nodes", "edges", "strings"],
    "deno-inspector.cpuprofile": ["nodes", "samples"],
    "deno-inspector.heapprofile": ["head", "samples"],
    "deno-inspector.heapsnapshot": ["snapshot", "nodes", "edges", "strings"],
    "deno-cli.cpuprofile": ["nodes", "samples"],
    "node-exit.cpuprofile": ["nodes", "samples"],
    "node-exit.heapprofile": ["head", "samples"],
    "node-trace.json": ["traceEvents"],
    "bun-cpu.cpuprofile": ["nodes", "samples"],
    "bun-heap.heapsnapshot": ["snapshot", "nodes", "edges", "strings"],
    "bun-jsc-heap-stats.json": ["before", "after", "nativeBefore", "nativeAfter"],
    "bun-jsc-sampling.json": ["functions", "bytecodes", "stackTraces"],
    "bun-jsc.heapsnapshot": ["version", "nodes", "edges"],
    "chromium.cpuprofile": ["nodes", "samples"],
    "chromium.heapprofile": ["head", "samples"],
    "chromium.heapsnapshot": ["snapshot", "nodes", "edges", "strings"],
    "chromium.metrics.json": ["before", "after"],
    "chromium.trace.json": ["traceEvents"],
  } as const;
  await Promise.all(
    Object.entries(contracts).map(async ([name, keys]) => {
      const parsed: unknown = JSON.parse(await readFile(join(reports, name), "utf8"));
      if (!parsed || typeof parsed !== "object" || keys.some((key) => !(key in parsed)))
        throw new Error(`${name} does not match its profiler format`);
    }),
  );
}

async function build(entry: string, target: "browser" | "node", conditions: string[] = []) {
  const name = `${entry}.${conditions[0] ?? target}.mjs`;
  const result = await Bun.build({
    entrypoints: [join(import.meta.dir, `${entry}.ts`)],
    target,
    conditions,
    outdir: reports,
    naming: name,
    ...(target === "node" ? { packages: "external" as const } : {}),
  });
  if (!result.success)
    throw new AggregateError(
      result.logs,
      `Could not build ${entry} for ${conditions[0] ?? target}`,
    );
  return join(reports, name);
}

async function runHost(
  name: string,
  executable: string,
  args: string[],
  env = environment,
  headerRows = 1,
) {
  const output = await command(executable, args, project, env);
  const lines = output.trim().split("\n");
  if (lines.length <= headerRows || lines.some((line) => !JSON.parse(line)))
    throw new Error(`${name} emitted no complete profile`);
  await Bun.write(join(reports, `${name}.jsonl`), `${output.trim()}\n`);
  console.log(`${name}: ${lines.length - headerRows} operations`);
}

async function runBrowser(entry: string, asyncEntry: string) {
  const script = await Bun.file(entry).text();
  const asyncScript = await Bun.file(asyncEntry).text();
  const server = Bun.serve({
    port: 0,
    fetch(request) {
      const path = new URL(request.url).pathname;
      return path === "/profile.mjs" || path === "/profile-async.mjs"
        ? new Response(path === "/profile.mjs" ? script : asyncScript, {
            headers: { "content-type": "text/javascript" },
          })
        : new Response('<!doctype html><script type="module" src="/profile.mjs"></script>', {
            headers: { "content-type": "text/html" },
          });
    },
  });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const session = await page.context().newCDPSession(page);
    const traceEvents: object[] = [];
    const snapshotChunks: string[] = [];
    session.on("Tracing.dataCollected", ({ value }) => traceEvents.push(...value));
    session.on("HeapProfiler.addHeapSnapshotChunk", ({ chunk }) => snapshotChunks.push(chunk));
    const query = new URLSearchParams({ samples, duration, warmup });
    if (filter) query.set("filter", filter);
    await page.goto(`${server.url.href}?${query}`);
    await page.waitForFunction(() => "runUuidSlugProfile" in globalThis);
    if (native) {
      await Promise.all([
        session.send("Profiler.enable"),
        session.send("HeapProfiler.enable"),
        session.send("Performance.enable"),
      ]);
      await session.send("Profiler.setSamplingInterval", { interval: 100 });
      await session.send("HeapProfiler.startSampling", {
        samplingInterval: 4096,
        includeObjectsCollectedByMajorGC: true,
        includeObjectsCollectedByMinorGC: true,
      });
      await session.send("Profiler.start");
      await session.send("Tracing.start", {
        categories:
          "devtools.timeline,v8.execute,disabled-by-default-v8.cpu_profiler,disabled-by-default-v8.gc",
        transferMode: "ReportEvents",
      });
    }
    const before = native ? await session.send("Performance.getMetrics") : undefined;
    const rows = await page.evaluate(async () => {
      const run = (
        globalThis as typeof globalThis & {
          runUuidSlugProfile?: () => Promise<readonly Record<string, unknown>[]>;
        }
      ).runUuidSlugProfile;
      if (!run) throw new Error("Browser profile module did not prepare");
      return run();
    });
    const cpu = native ? await session.send("Profiler.stop") : undefined;
    const heap = native ? await session.send("HeapProfiler.stopSampling") : undefined;
    const after = native ? await session.send("Performance.getMetrics") : undefined;
    if (native) {
      const complete = new Promise<void>((resolve) =>
        session.once("Tracing.tracingComplete", () => resolve()),
      );
      await session.send("Tracing.end");
      await complete;
      await session.send("HeapProfiler.takeHeapSnapshot");
    }
    if (rows.length === 0) throw new Error("Chromium emitted no profile rows");
    await page.addScriptTag({ type: "module", url: "/profile-async.mjs" });
    const asyncRows = await page.evaluate(async () => {
      const run = (
        globalThis as typeof globalThis & {
          runUuidSlugAsyncProfile?: () => Promise<readonly Record<string, unknown>[]>;
        }
      ).runUuidSlugAsyncProfile;
      if (!run) throw new Error("Browser async profile module did not prepare");
      return run();
    });
    if (asyncRows.length === 0) throw new Error("Chromium emitted no async profile rows");
    await Bun.write(join(reports, "chromium.json"), JSON.stringify(rows));
    await Bun.write(join(reports, "chromium-async.json"), JSON.stringify(asyncRows));
    if (native) {
      if (!before || !cpu || !heap || !after)
        throw new Error("Chromium did not return every requested native profile");
      await Promise.all([
        Bun.write(join(reports, "chromium.cpuprofile"), JSON.stringify(cpu.profile)),
        Bun.write(join(reports, "chromium.heapprofile"), JSON.stringify(heap.profile)),
        Bun.write(join(reports, "chromium.heapsnapshot"), snapshotChunks.join("")),
        Bun.write(join(reports, "chromium.metrics.json"), JSON.stringify({ before, after })),
        Bun.write(join(reports, "chromium.trace.json"), JSON.stringify({ traceEvents })),
      ]);
    }
    console.log(`chromium: ${rows.length} operations`);
    console.log(`chromium async: ${asyncRows.length} operations`);
  } finally {
    await browser.close();
    await server.stop(true);
  }
}

/** Capture process-exit formats that expose data absent from inspector sampling. */
async function runExitProfiles(nodeEntry: string, denoEntry: string): Promise<void> {
  await command(
    "node",
    [
      "--cpu-prof",
      `--cpu-prof-dir=${reports}`,
      "--cpu-prof-name=node-exit.cpuprofile",
      "--heap-prof",
      `--heap-prof-dir=${reports}`,
      "--heap-prof-name=node-exit.heapprofile",
      nodeEntry,
    ],
    project,
    environment,
  );
  await command(
    "node",
    [
      "--prof",
      "--no-logfile-per-isolate",
      `--logfile=${join(reports, "node-v8.log")}`,
      "--trace-event-categories=v8,v8.execute,node,node.perf",
      `--trace-event-file-pattern=${join(reports, "node-trace.json")}`,
      nodeEntry,
    ],
    project,
    environment,
  );
  const processedV8 = await command(
    "node",
    ["--prof-process", join(reports, "node-v8.log")],
    project,
  );
  await writeFile(join(reports, "node-v8.txt"), processedV8);
  await command(
    "deno",
    [
      "run",
      "--cpu-prof",
      `--cpu-prof-dir=${reports}`,
      "--cpu-prof-name=deno-cli.cpuprofile",
      "--cpu-prof-interval=100",
      "--cpu-prof-md",
      "--cpu-prof-flamegraph",
      "--allow-env",
      "--allow-read",
      denoEntry,
    ],
    project,
    {
      ...environment,
      UUID_SLUG_PROFILE_MODULE: new URL("../dist/index.js", import.meta.url).href,
    },
  );
  const bunProfile = join(import.meta.dir, "profile.ts");
  await command(
    "bun",
    [
      "--cpu-prof",
      "--cpu-prof-md",
      "--cpu-prof-name",
      "bun-cpu",
      "--cpu-prof-dir",
      reports,
      "--heap-prof",
      "--heap-prof-name",
      "bun-heap.heapsnapshot",
      "--heap-prof-dir",
      reports,
      bunProfile,
    ],
    project,
    environment,
  );
  await command(
    "bun",
    ["--heap-prof-md", "--heap-prof-name", "bun-heap.md", "--heap-prof-dir", reports, bunProfile],
    project,
    environment,
  );
  const bunMemory = Bun.spawn(["bun", join(import.meta.dir, "profile-bun-memory.ts")], {
    cwd: project,
    env: { ...process.env, ...nativeEnvironment("bun-memory") },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(bunMemory.stdout).text(),
    new Response(bunMemory.stderr).text(),
    bunMemory.exited,
  ]);
  if (exitCode !== 0)
    throw new Error(`Bun memory probe failed with ${exitCode}: ${stdout}\n${stderr}`);
  if (!stderr.includes("UUID_SLUG_MIMALLOC_BEFORE") || !stderr.includes("UUID_SLUG_MIMALLOC_AFTER"))
    throw new Error("Bun memory probe did not capture both native allocator states");
  await writeFile(join(reports, "bun-mimalloc.txt"), stderr);
}

async function main() {
  await mkdir(reports, { recursive: true });
  if (native) await resetNativeFiles();
  await command("bun", ["run", "build"], project);
  const [nodeEntry, denoEntry, browserEntry, asyncNodeEntry, asyncDenoEntry, asyncBrowserEntry] =
    await Promise.all([
      build("profile", "node"),
      build("profile", "node", ["deno"]),
      build("profile-browser", "browser"),
      build("profile-async", "node"),
      build("profile-async", "node", ["deno"]),
      build("profile-async", "browser"),
    ]);
  await runHost(
    "node",
    "node",
    ["--expose-gc", nodeEntry],
    native ? nativeEnvironment("node-inspector") : environment,
  );
  await runHost("bun", "bun", ["--expose-gc", join(import.meta.dir, "profile.ts")]);
  await runHost(
    "deno",
    "deno",
    [
      "run",
      "--allow-env",
      "--allow-read",
      ...(native ? ["--allow-sys", `--allow-write=${reports}`] : []),
      denoEntry,
    ],
    {
      ...(native ? nativeEnvironment("deno-inspector") : environment),
      UUID_SLUG_PROFILE_MODULE: new URL("../dist/index.js", import.meta.url).href,
    },
  );
  await runBrowser(browserEntry, asyncBrowserEntry);
  await runHost("node-async", "node", [asyncNodeEntry], environment, 0);
  await runHost("bun-async", "bun", [join(import.meta.dir, "profile-async.ts")], environment, 0);
  await runHost(
    "deno-async",
    "deno",
    ["run", "--allow-env", "--allow-read", asyncDenoEntry],
    environment,
    0,
  );
  if (native) {
    await runExitProfiles(nodeEntry, denoEntry);
    await requireNativeFiles();
  }
}

await main();
