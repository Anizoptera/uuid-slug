// SPDX-License-Identifier: Apache-2.0

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

import { command } from "../scripts/command";
import { medianConfidence95 } from "./statistics";

interface Measurement {
  readonly comparable: string;
  readonly implementation: string;
  readonly kind: "measurement";
  readonly name: string;
  readonly ns: readonly number[];
  readonly operations: number;
  readonly runtime: string;
  readonly secure?: boolean;
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
      ({ ns, operations }) =>
        ns.length !== inventory.samples ||
        operations < 1 ||
        ns.some((value) => !Number.isFinite(value) || value <= 0),
    )
  )
    throw new Error(`${runtime} emitted incomplete or malformed benchmark measurements`);
  return rows;
}

function median(values: readonly number[]): number {
  const middle = Math.floor(values.length / 2);
  for (const candidate of values) {
    const below = values.reduce((count, value) => count + Number(value < candidate), 0);
    const through = values.reduce((count, value) => count + Number(value <= candidate), 0);
    if (below <= middle && through > middle) return candidate;
  }
  throw new Error("Cannot select a median from an empty sample");
}

function print(runtime: string, rows: readonly Measurement[]): void {
  for (const row of rows) {
    const interval = medianConfidence95(row.ns);
    console.log(
      JSON.stringify({
        ...row,
        runtime,
        medianNs: median(row.ns),
        medianOpsPerSecond: Math.round(1e9 / median(row.ns)),
        median95: interval,
      }),
    );
  }
  for (const group of new Set(rows.map(({ comparable }) => comparable))) {
    const candidates = rows.filter((row) => row.comparable === group && row.secure !== false);
    const packageRows = candidates.filter(({ name }) => name.startsWith("package."));
    const otherRows = candidates.filter(({ name }) => !name.startsWith("package."));
    if (packageRows.length === 0 || otherRows.length === 0) continue;
    const packageBest = packageRows.reduce((best, row) =>
      median(row.ns) < median(best.ns) ? row : best,
    );
    const otherBest = otherRows.reduce((best, row) =>
      median(row.ns) < median(best.ns) ? row : best,
    );
    console.log(
      JSON.stringify({
        comparable: group,
        kind: "comparison",
        packageBest: packageBest.name,
        packageToBestRatio: median(packageBest.ns) / median(otherBest.ns),
        referenceBest: otherBest.name,
        runtime,
      }),
    );
  }
}

async function build(entry: string, target: "browser" | "node", outdir: string): Promise<string> {
  const result = await Bun.build({
    entrypoints: [join(import.meta.dir, entry)],
    target,
    outdir,
    naming: `${target}.mjs`,
  });
  if (!result.success) throw new AggregateError(result.logs, `${target} benchmark build failed`);
  return join(outdir, `${target}.mjs`);
}

async function runBrowser(entry: string): Promise<Measurement[]> {
  const source = await Bun.file(entry).text();
  const server = Bun.serve({
    port: 0,
    fetch(request) {
      return new URL(request.url).pathname === "/bench.mjs"
        ? new Response(source, { headers: { "content-type": "text/javascript" } })
        : new Response("<!doctype html>");
    },
  });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(server.url.href);
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
          runtime: "chromium",
          samples: Number(samples),
        }),
        ...(rows as Measurement[]).map((row) => JSON.stringify({ ...row, kind: "measurement" })),
      ].join("\n"),
      "chromium",
    );
  } finally {
    await browser.close();
    await server.stop(true);
  }
}

const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-generation-"));
try {
  const [host, browser] = await Promise.all([
    build("generation-host.ts", "node", scratch),
    build("generation-browser.ts", "browser", scratch),
  ]);
  // CPU workloads run sequentially; concurrent runtimes contend for cores and turn scheduler
  // interference into apparent implementation variance.
  const hostRuns = [];
  const runtimes: readonly [string, string[]][] = [
    ["node", [host, ...(smoke ? ["--smoke"] : [])]],
    ["bun", [host, ...(smoke ? ["--smoke"] : [])]],
    ["deno", ["run", "--allow-env", "--allow-read", host]],
  ];
  for (const [executable, arguments_] of runtimes)
    hostRuns.push(await command(executable, arguments_, project, environment));
  for (const output of hostRuns) {
    const rows = parseMeasurements(output, "host");
    print(rows[0]?.runtime ?? "unknown", rows);
  }
  print("chromium", await runBrowser(browser));
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
