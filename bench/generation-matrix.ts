// SPDX-License-Identifier: Apache-2.0

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

import { command } from "../scripts/command";
import type { BenchmarkObservationUnit } from "./statistics";
import {
  WITHIN_PROCESS_BATCH_SAMPLE_UNIT,
  aggregateForkSamples,
  describeSamples,
  medianConfidence95,
  sampleMedian,
} from "./statistics";

interface Measurement {
  readonly comparable: string;
  readonly implementation: string;
  readonly kind: "measurement";
  readonly name: string;
  readonly ns: readonly number[];
  readonly operations: number;
  readonly qualification: "qualified" | "rejected";
  readonly rejectionReason?: string;
  readonly runtime: string;
  readonly secure?: boolean;
  readonly sampleUnit?: BenchmarkObservationUnit;
}

interface Environment {
  readonly caseNames: readonly string[];
  readonly kind: "environment";
  readonly runtime: string;
  readonly samples: number;
}

const project = join(import.meta.dir, "..");
const smoke = process.argv.includes("--smoke");
const duration = process.env.UUID_SLUG_GENERATION_MS ?? (smoke ? "1" : "20");
const samples = process.env.UUID_SLUG_GENERATION_SAMPLES ?? (smoke ? "1" : "9");
const warmup = process.env.UUID_SLUG_GENERATION_WARMUP_MS ?? (smoke ? "2" : "32");
const filter = process.env.UUID_SLUG_GENERATION_FILTER ?? "";
const forks = Number(process.env.UUID_SLUG_GENERATION_FORKS ?? 1);
if (!Number.isSafeInteger(forks) || forks < 1)
  throw new Error("UUID_SLUG_GENERATION_FORKS must be a positive safe integer");
const nodeCurrentExecutable = process.env.UUID_SLUG_BENCH_NODE_CURRENT_EXECUTABLE;
const environment = {
  UUID_SLUG_GENERATION_FILTER: filter,
  UUID_SLUG_GENERATION_MS: duration,
  UUID_SLUG_GENERATION_SAMPLES: samples,
  UUID_SLUG_GENERATION_WARMUP_MS: warmup,
};

function parseMeasurements(output: string, runtime: string): Measurement[] {
  const values: unknown[] = output
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  const inventory = values.find(
    (value): value is Environment =>
      Boolean(value) &&
      typeof value === "object" &&
      (value as Partial<Environment>).kind === "environment",
  );
  const rows = values.filter(
    (value): value is Measurement =>
      Boolean(value) &&
      typeof value === "object" &&
      (value as Partial<Measurement>).kind === "measurement" &&
      Array.isArray((value as Partial<Measurement>).ns) &&
      ((value as Partial<Measurement>).ns?.length ?? 0) > 0,
  );
  if (!inventory) throw new Error(`${runtime} emitted no benchmark inventory`);
  const names = rows.map(({ name }) => name);
  if (
    rows.length !== inventory.caseNames.length ||
    new Set(names).size !== names.length ||
    inventory.caseNames.some((name) => !names.includes(name)) ||
    rows.some(
      ({ ns, operations, qualification, rejectionReason }) =>
        ns.length !== inventory.samples ||
        operations < 1 ||
        ns.some((value) => !Number.isFinite(value) || value <= 0) ||
        (qualification !== "qualified" && qualification !== "rejected") ||
        (qualification === "rejected" && !rejectionReason) ||
        (qualification === "qualified" && rejectionReason !== undefined),
    )
  )
    throw new Error(`${runtime} emitted incomplete or malformed benchmark measurements`);
  return rows;
}

function print(runtime: string, rows: readonly Measurement[]): void {
  const measured = rows.map((row) => ({ ...row, medianNs: sampleMedian(row.ns) }));
  for (const row of measured) {
    const interval = medianConfidence95(row.ns);
    console.log(
      JSON.stringify({
        ...row,
        runtime,
        medianOpsPerSecond: Math.round(1e9 / row.medianNs),
        median95: interval,
        sampleUnit: row.sampleUnit ?? WITHIN_PROCESS_BATCH_SAMPLE_UNIT,
        statistics: describeSamples(row.ns),
      }),
    );
  }
  for (const group of new Set(measured.map(({ comparable }) => comparable))) {
    const candidates = measured.filter(
      (row) => row.comparable === group && row.qualification === "qualified",
    );
    const packageRows = candidates.filter(({ name }) => name.startsWith("package."));
    const otherRows = candidates.filter(({ name }) => !name.startsWith("package."));
    if (packageRows.length === 0 || otherRows.length === 0) continue;
    const packageBest = packageRows.reduce((best, row) =>
      row.medianNs < best.medianNs ? row : best,
    );
    const otherBest = otherRows.reduce((best, row) => (row.medianNs < best.medianNs ? row : best));
    console.log(
      JSON.stringify({
        comparable: group,
        kind: "comparison",
        packageBest: packageBest.name,
        packageToBestRatio: packageBest.medianNs / otherBest.medianNs,
        referenceBest: otherBest.name,
        runtime,
      }),
    );
  }
  for (const row of rows) {
    if (row.qualification !== "rejected") continue;
    console.log(
      JSON.stringify({
        kind: "rejection",
        name: row.name,
        reason: row.rejectionReason,
        runtime,
      }),
    );
  }
}

/**
 * Bundle one entry per runtime with the export conditions its consumers resolve. One shared host
 * bundle selected the Node adapter on Bun and Deno, so their rows measured Node crypto instead of
 * the Bun and Deno native routes the package publishes.
 */
async function build(
  entry: string,
  name: "browser" | "bun" | "deno" | "node",
  outdir: string,
): Promise<string> {
  const result = await Bun.build({
    entrypoints: [join(import.meta.dir, entry)],
    outdir,
    naming: `${name}.mjs`,
    ...(name === "deno" ? { conditions: ["deno"], target: "node" as const } : { target: name }),
  });
  if (!result.success) throw new AggregateError(result.logs, `${name} benchmark build failed`);
  return join(outdir, `${name}.mjs`);
}

async function runBrowser(origin: string): Promise<Measurement[]> {
  const browser = await chromium.launch({ headless: true });
  const runtime = `chromium ${browser.version()}`;
  try {
    const page = await browser.newPage();
    await page.goto(origin);
    await page.addScriptTag({ type: "module", url: "/bench.mjs" });
    const rows: unknown = await page.evaluate(
      async (parameters) => {
        const run = (globalThis as { runGenerationBenchmark?: (query: string) => Promise<unknown> })
          .runGenerationBenchmark;
        if (!run) throw new Error("Browser benchmark did not initialize");
        return run(new URLSearchParams(parameters).toString());
      },
      { duration, filter, samples, warmup },
    );
    return parseMeasurements(
      [
        JSON.stringify({
          caseNames: (rows as Measurement[]).map(({ name }) => name),
          kind: "environment",
          runtime,
          samples: Number(samples),
        }),
        ...(rows as Measurement[]).map((row) =>
          JSON.stringify({ ...row, kind: "measurement", runtime }),
        ),
      ].join("\n"),
      "chromium",
    );
  } finally {
    await browser.close();
  }
}

async function collectForks(run: () => Promise<Measurement[]>): Promise<Measurement[]> {
  // Each fresh process supplies one observation; extra batches do not create independent runs.
  const runs: Measurement[][] = [];
  for (let index = 0; index < forks; index += 1) {
    const rows = await run();
    if (runs[0] && runs[0][0]?.runtime !== rows[0]?.runtime)
      throw new Error("Runtime version changed between benchmark processes");
    runs.push(rows);
  }
  return forks === 1 ? runs[0]! : aggregateForkSamples(runs);
}

const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-generation-"));
try {
  const [nodeHost, bunHost, denoHost, browser] = await Promise.all([
    build("generation-host.ts", "node", scratch),
    build("generation-host.ts", "bun", scratch),
    build("generation-host.ts", "deno", scratch),
    build("generation-browser.ts", "browser", scratch),
  ]);
  // CPU workloads run sequentially; concurrent runtimes contend for cores and turn scheduler
  // interference into apparent implementation variance.
  const nodeArguments = [nodeHost, ...(smoke ? ["--smoke"] : [])];
  const runtimes: readonly [string, string[]][] = [
    ["node", nodeArguments],
    ...(nodeCurrentExecutable
      ? ([[nodeCurrentExecutable, nodeArguments]] satisfies [string, string[]][])
      : []),
    ["bun", [bunHost, ...(smoke ? ["--smoke"] : [])]],
    ["deno", ["run", "--allow-env", "--allow-read", denoHost]],
  ];
  for (const [executable, arguments_] of runtimes) {
    const rows = await collectForks(async () =>
      parseMeasurements(await command(executable, arguments_, project, environment), "host"),
    );
    print(rows[0]?.runtime ?? "unknown", rows);
  }
  const source = await Bun.file(browser).text();
  const server = Bun.serve({
    port: 0,
    fetch(request) {
      return new URL(request.url).pathname === "/bench.mjs"
        ? new Response(source, { headers: { "content-type": "text/javascript" } })
        : new Response("<!doctype html>");
    },
  });
  try {
    const rows = await collectForks(() => runBrowser(server.url.href));
    print(rows[0]!.runtime, rows);
  } finally {
    await server.stop(true);
  }
  console.log(
    JSON.stringify({
      kind: "unsupported",
      name: "crypto-randomuuid.v4.text",
      reason: "Node crypto package; no browser export",
      runtime: "chromium",
    }),
  );
} finally {
  await rm(scratch, { force: true, recursive: true });
}
