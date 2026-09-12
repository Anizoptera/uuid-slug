// SPDX-License-Identifier: Apache-2.0

import { mkdir, mkdtemp, readFile, readdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import type { Page } from "playwright";

import { command } from "../scripts/command";
import { medianConfidence95 } from "./statistics";

type Revision = "baseline" | "candidate";
type Runtime = "node" | "bun" | "deno" | "chromium";
const RUNTIMES = ["node", "bun", "deno", "chromium"] as const satisfies readonly Runtime[];

interface ArtifactSet {
  readonly api: Readonly<Record<Runtime, string>>;
  readonly privateAlphabetApi: Readonly<Record<Runtime, string>>;
  readonly privateV4Api: Readonly<Record<Runtime, string>>;
}

interface ProfileRow {
  readonly name: string;
  readonly ns: readonly number[];
  readonly operations: number;
}

const project = join(import.meta.dir, "..");
const smoke = process.argv.includes("--smoke");
const positional = process.argv.slice(2).filter((value) => value !== "--smoke");
const baselineRef = positional[0] ?? "HEAD^";
if (positional.length > 1) throw new Error("Usage: bun bench/compare.ts [baseline-ref] [--smoke]");
const rounds = Number(process.env.UUID_SLUG_COMPARE_ROUNDS ?? (smoke ? 2 : 6));
const duration = process.env.UUID_SLUG_PROFILE_MS ?? (smoke ? "1" : "5");
const warmup = process.env.UUID_SLUG_PROFILE_WARMUP_MS ?? (smoke ? "2" : "16");
const filter = process.env.UUID_SLUG_PROFILE_FILTER ?? "";
const selectedRuntimes = (process.env.UUID_SLUG_COMPARE_RUNTIMES?.split(":").filter(Boolean) ?? [
  ...RUNTIMES,
]) as Runtime[];
if (!Number.isSafeInteger(rounds) || rounds < 1)
  throw new Error("UUID_SLUG_COMPARE_ROUNDS must be a positive safe integer");
if (
  selectedRuntimes.length === 0 ||
  new Set(selectedRuntimes).size !== selectedRuntimes.length ||
  selectedRuntimes.some((runtime) => !RUNTIMES.includes(runtime))
)
  throw new Error("UUID_SLUG_COMPARE_RUNTIMES must list distinct node:bun:deno:chromium values");

function shuffledRuntimes(seed: number): Runtime[] {
  const values = [...selectedRuntimes];
  let state = seed >>> 0;
  for (let index = values.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const selected = state % (index + 1);
    const current = values[index];
    const chosen = values[selected];
    if (!current || !chosen) throw new Error("Runtime shuffle selected an invalid index");
    values[index] = chosen;
    values[selected] = current;
  }
  return values;
}

async function packArtifacts(root: string, outdir: string): Promise<ArtifactSet> {
  await command("bun", [join(project, "node_modules/.bin/tsdown")], root);
  await mkdir(outdir, { recursive: true });
  await command(
    "bun",
    [
      join(project, "node_modules/.bin/publish-clean"),
      "--dry-run",
      "--no-git-checks",
      "--tarball-out",
      outdir,
      root,
    ],
    project,
  );
  const archives = (await readdir(outdir)).filter((name) => name.endsWith(".tgz"));
  if (archives.length !== 1)
    throw new Error(`Expected one package archive, found ${archives.length}`);
  const archive = archives[0];
  if (!archive) throw new Error("Package archive disappeared before extraction");
  const extracted = join(outdir, "extracted");
  await mkdir(extracted);
  await command("tar", ["-xzf", join(outdir, archive), "-C", extracted], project);
  const packed = join(extracted, "package");
  return {
    api: {
      node: join(packed, "dist/node/index.js"),
      bun: join(packed, "src/index.ts"),
      deno: join(packed, "dist/index.js"),
      chromium: join(packed, "dist/index.js"),
    },
    privateAlphabetApi: {
      node: join(packed, "dist/node/alphabet.js"),
      bun: join(packed, "src/alphabet.ts"),
      deno: join(packed, "dist/alphabet.js"),
      chromium: join(packed, "dist/alphabet.js"),
    },
    privateV4Api: {
      node: join(packed, "dist/node/v4.js"),
      bun: join(packed, "src/v4.ts"),
      deno: join(packed, "dist/v4.js"),
      chromium: join(packed, "dist/v4.js"),
    },
  };
}

async function buildHostDriver(outdir: string): Promise<string> {
  const result = await Bun.build({
    entrypoints: [join(import.meta.dir, "profile.ts")],
    target: "node",
    outdir,
    naming: "host-profile.mjs",
  });
  if (!result.success) throw new AggregateError(result.logs, "Could not build host profile driver");
  return join(outdir, "host-profile.mjs");
}

async function buildBrowserDriver(
  api: string,
  privateAlphabetApi: string,
  privateV4Api: string,
  outdir: string,
  revision: Revision,
): Promise<string> {
  const result = await Bun.build({
    entrypoints: [join(import.meta.dir, "profile-browser.ts")],
    target: "browser",
    outdir,
    naming: `${revision}-browser-profile.mjs`,
    plugins: [
      {
        name: "profile-api",
        setup(builder) {
          builder.onResolve({ filter: /^\.\.\/src\/index$/ }, () => ({ path: api }));
          builder.onResolve({ filter: /^\.\.\/src\/alphabet$/ }, () => ({
            path: privateAlphabetApi,
          }));
          builder.onResolve({ filter: /^\.\.\/src\/v4$/ }, () => ({ path: privateV4Api }));
        },
      },
    ],
  });
  if (!result.success)
    throw new AggregateError(result.logs, `Could not build ${revision} browser profile driver`);
  return join(outdir, `${revision}-browser-profile.mjs`);
}

function isProfileRow(value: unknown): value is ProfileRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<ProfileRow>;
  return (
    typeof row.name === "string" &&
    typeof row.operations === "number" &&
    row.operations > 0 &&
    Array.isArray(row.ns) &&
    row.ns.length > 0 &&
    row.ns.every((sample) => typeof sample === "number" && Number.isFinite(sample) && sample > 0)
  );
}

function validateRows(value: unknown, source: string): ProfileRow[] {
  if (!Array.isArray(value) || !value.length || !value.every(isProfileRow))
    throw new Error(`${source} emitted an incomplete profile`);
  return value;
}

function parseHost(output: string): ProfileRow[] {
  const lines = output.trim().split("\n");
  const rows: ProfileRow[] = [];
  for (const line of lines.slice(1)) {
    const value: unknown = JSON.parse(line);
    if (!isProfileRow(value)) throw new Error("Comparison host emitted an incomplete profile");
    rows.push(value);
  }
  return validateRows(rows, "Comparison host");
}

async function runHost(
  runtime: Exclude<Runtime, "chromium">,
  driver: string,
  api: string,
  privateAlphabetApi: string,
  privateV4Api: string,
) {
  const args = runtime === "deno" ? ["run", "--allow-env", "--allow-read", driver] : [driver];
  return parseHost(
    await command(runtime, args, project, {
      UUID_SLUG_PROFILE_FILTER: filter,
      UUID_SLUG_PROFILE_ALPHABET_MODULE: pathToFileURL(privateAlphabetApi).href,
      UUID_SLUG_PROFILE_MODULE: pathToFileURL(api).href,
      UUID_SLUG_PROFILE_PRIVATE_MODULE: pathToFileURL(privateV4Api).href,
      UUID_SLUG_PROFILE_MS: duration,
      UUID_SLUG_PROFILE_SAMPLES: "1",
      UUID_SLUG_PROFILE_WARMUP_MS: warmup,
    }),
  );
}

async function runBrowser(page: Page, origin: string, revision: Revision): Promise<ProfileRow[]> {
  await page.goto(
    `${origin}?duration=${duration}&warmup=${warmup}&samples=1&private=1&filter=${encodeURIComponent(filter)}`,
  );
  await page.addScriptTag({ type: "module", url: `/${revision}.mjs` });
  await page.waitForFunction(() => "runUuidSlugProfile" in globalThis);
  const rows: unknown = await page.evaluate(async () => {
    const run = (
      globalThis as typeof globalThis & {
        runUuidSlugProfile?: () => Promise<ProfileRow[]>;
      }
    ).runUuidSlugProfile;
    if (!run) throw new Error("Browser comparison profile did not prepare");
    return run();
  });
  return validateRows(rows, "Browser comparison");
}

function emit(
  runtime: Runtime,
  revision: Revision,
  round: number,
  order: number,
  rows: readonly ProfileRow[],
  observations: Map<string, number[]>,
): void {
  for (const row of rows) {
    const key = `${runtime}\0${revision}\0${row.name}`;
    const values = observations.get(key) ?? [];
    values.push(...row.ns);
    observations.set(key, values);
    console.log(JSON.stringify({ runtime, revision, round, order, ...row }));
  }
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

function emitSummary(observations: ReadonlyMap<string, readonly number[]>): void {
  for (const runtime of selectedRuntimes) {
    const prefix = `${runtime}\0baseline\0`;
    for (const [key, baseline] of observations) {
      if (!key.startsWith(prefix)) continue;
      const name = key.slice(prefix.length);
      const candidate = observations.get(`${runtime}\0candidate\0${name}`);
      if (!candidate?.length) throw new Error(`${runtime} candidate omitted ${name}`);
      if (candidate.length !== baseline.length)
        throw new Error(`${runtime} ${name} has unpaired baseline and candidate samples`);
      const pairedRatios = candidate.map((value, index) => value / (baseline[index] as number));
      const medianRatio95 = medianConfidence95(pairedRatios);
      console.log(
        JSON.stringify({
          kind: "summary",
          runtime,
          name,
          baseline,
          candidate,
          medianRatio: median(candidate) / median(baseline),
          pairedMedianRatio: median(pairedRatios),
          medianRatio95,
          statisticallyDistinct: medianRatio95
            ? medianRatio95[0] > 1 || medianRatio95[1] < 1
            : undefined,
        }),
      );
    }
  }
}

async function main(): Promise<void> {
  const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-compare-"));
  const baselineRoot = join(scratch, "baseline");
  try {
    await command("git", ["worktree", "add", "--detach", baselineRoot, baselineRef], project);
    await symlink(join(project, "node_modules"), join(baselineRoot, "node_modules"), "dir");
    const baselineOut = join(scratch, "baseline-artifacts");
    const candidateOut = join(scratch, "candidate-artifacts");
    const [baseline, candidate, driver] = await Promise.all([
      packArtifacts(baselineRoot, baselineOut),
      packArtifacts(project, candidateOut),
      buildHostDriver(scratch),
    ]);
    const [baselineBrowser, candidateBrowser] = await Promise.all([
      buildBrowserDriver(
        baseline.api.chromium,
        baseline.privateAlphabetApi.chromium,
        baseline.privateV4Api.chromium,
        scratch,
        "baseline",
      ),
      buildBrowserDriver(
        candidate.api.chromium,
        candidate.privateAlphabetApi.chromium,
        candidate.privateV4Api.chromium,
        scratch,
        "candidate",
      ),
    ]);
    const scripts = {
      baseline: await readFile(baselineBrowser, "utf8"),
      candidate: await readFile(candidateBrowser, "utf8"),
    };
    const server = Bun.serve({
      port: 0,
      fetch(request) {
        const name = new URL(request.url).pathname;
        if (name === "/baseline.mjs" || name === "/candidate.mjs")
          return new Response(scripts[name === "/baseline.mjs" ? "baseline" : "candidate"], {
            headers: { "content-type": "text/javascript" },
          });
        return new Response("<!doctype html>", { headers: { "content-type": "text/html" } });
      },
    });
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const observations = new Map<string, number[]>();
      for (let round = 0; round < rounds; round += 1) {
        const runtimeOrder = shuffledRuntimes(0x9e3779b9 ^ round);
        const revisionOrder: readonly Revision[] =
          round % 2 ? ["candidate", "baseline"] : ["baseline", "candidate"];
        for (const [order, runtime] of runtimeOrder.entries()) {
          for (const revision of revisionOrder) {
            const rows =
              runtime === "chromium"
                ? await runBrowser(page, server.url.href, revision)
                : await runHost(
                    runtime,
                    driver,
                    (revision === "baseline" ? baseline : candidate).api[runtime],
                    (revision === "baseline" ? baseline : candidate).privateAlphabetApi[runtime],
                    (revision === "baseline" ? baseline : candidate).privateV4Api[runtime],
                  );
            emit(runtime, revision, round, order, rows, observations);
          }
        }
      }
      emitSummary(observations);
    } finally {
      await browser.close();
      await server.stop(true);
    }
    console.error(`Compared ${baselineRef} with the current worktree.`);
  } finally {
    await command("git", ["worktree", "remove", "--force", baselineRoot], project).catch(() => {});
    await rm(scratch, { recursive: true, force: true });
  }
}

await main();
