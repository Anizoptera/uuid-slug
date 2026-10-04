// SPDX-License-Identifier: Apache-2.0

import { mkdir, mkdtemp, readFile, readdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, firefox, webkit } from "playwright";
import type { Page } from "playwright";

import { command } from "../scripts/command";
import { describeSamples, medianConfidence95 } from "./statistics";
import { CANDIDATE_FILES, CANDIDATE_GROUPS, createSourceCandidates } from "./candidate-sources";
import type { CandidateGroup } from "./candidate-sources";

type Revision = "baseline" | "candidate";
type BrowserRuntime = "chromium" | "firefox" | "webkit";
type Runtime = "node" | "bun" | BrowserRuntime | "deno" | "node-jitless";
type ArtifactRuntime = "node" | "bun" | "chromium" | "deno";
const RUNTIMES = [
  "node",
  "bun",
  "chromium",
  "firefox",
  "webkit",
  "deno",
  "node-jitless",
] as const satisfies readonly Runtime[];

interface ArtifactSet {
  readonly denoImportMap: string;
  readonly api: Readonly<Record<ArtifactRuntime, string>>;
  readonly privateAlphabetApi: Readonly<Record<ArtifactRuntime, string>>;
  readonly privateV4Api: Readonly<Record<ArtifactRuntime, string>>;
}

interface ProfileRow {
  readonly name: string;
  readonly ns: readonly number[];
  readonly operations: number;
}

const project = join(import.meta.dir, "..");
const smoke = process.argv.includes("--smoke");
const sourceOptions = process.argv
  .slice(2)
  .filter((value) => value.startsWith("--source-candidate="));
if (sourceOptions.length > 1) throw new Error("Choose one source candidate per packed comparison.");
const sourceOption = sourceOptions[0];
const positional = process.argv
  .slice(2)
  .filter((value) => value !== "--smoke" && value !== sourceOption);
const baselineRef = positional[0] ?? "HEAD^";
const candidateRef = positional[1];
if (positional.length > 2)
  throw new Error(
    "Usage: bun bench/compare.ts [baseline-ref] [candidate-ref] [--smoke] [--source-candidate=group:name]",
  );
const sourceParts = sourceOption?.slice("--source-candidate=".length).split(":");
if (
  sourceParts &&
  (sourceParts.length !== 2 ||
    !CANDIDATE_GROUPS.some((group) => group === sourceParts[0]) ||
    !sourceParts[1])
)
  throw new Error(
    `Source candidates require a known group and name: ${CANDIDATE_GROUPS.join(", ")}.`,
  );
const rounds = Number(process.env.UUID_SLUG_COMPARE_ROUNDS ?? (smoke ? 2 : 6));
const duration = process.env.UUID_SLUG_PROFILE_MS ?? (smoke ? "1" : "5");
const warmup = process.env.UUID_SLUG_PROFILE_WARMUP_MS ?? (smoke ? "2" : "16");
const filter = process.env.UUID_SLUG_PROFILE_FILTER ?? "";
const nodeExecutable = process.env.UUID_SLUG_COMPARE_NODE_EXECUTABLE ?? "node";
// Every record names the runtime release it measured, so a result file cannot be attributed to a
// release other than the one that produced it.
const runtimeVersions = new Map<Runtime, string>();
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
  throw new Error(
    `UUID_SLUG_COMPARE_RUNTIMES must list distinct values from ${RUNTIMES.join(":")}`,
  );

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

const browserEngines = { chromium, firefox, webkit };
const isBrowserRuntime = (runtime: Runtime): runtime is BrowserRuntime =>
  runtime === "chromium" || runtime === "firefox" || runtime === "webkit";
const artifactRuntime = (runtime: Runtime): ArtifactRuntime =>
  isBrowserRuntime(runtime) ? "chromium" : runtime === "node-jitless" ? "node" : runtime;

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
  const manifest = JSON.parse(await readFile(join(packed, "package.json"), "utf8")) as {
    exports: { ".": { bun: string; default: string; deno: string; node?: string } };
    imports: { "#runtime": { default: string; deno: string } };
  };
  const nodeApi = join(packed, manifest.exports["."].node ?? manifest.exports["."].default);
  const bunApi = join(packed, manifest.exports["."].bun);
  const denoApi = join(packed, manifest.exports["."].deno);
  const nodeModules = dirname(nodeApi);
  const bunModules = dirname(bunApi);
  const denoModules = dirname(denoApi);
  const denoImportMap = join(outdir, "deno-import-map.json");
  await Bun.write(
    denoImportMap,
    JSON.stringify({
      imports: {
        "#runtime": pathToFileURL(join(packed, manifest.imports["#runtime"].deno)).href,
      },
    }),
  );
  return {
    denoImportMap,
    api: {
      node: nodeApi,
      bun: bunApi,
      deno: denoApi,
      chromium: join(packed, "dist/index.js"),
    },
    privateAlphabetApi: {
      node: join(nodeModules, "alphabet.js"),
      bun: join(bunModules, "alphabet.ts"),
      deno: join(denoModules, "alphabet.ts"),
      chromium: join(packed, "dist/alphabet.js"),
    },
    privateV4Api: {
      node: join(nodeModules, "v4.js"),
      bun: join(bunModules, "v4.ts"),
      deno: join(denoModules, "v4.ts"),
      chromium: join(packed, "dist/v4.js"),
    },
  };
}

async function buildHostDriver(root: string, outdir: string): Promise<string> {
  const result = await Bun.build({
    entrypoints: [join(root, "bench/profile.ts")],
    target: "node",
    outdir,
    naming: "host-profile.mjs",
  });
  if (!result.success) throw new AggregateError(result.logs, "Could not build host profile driver");
  return join(outdir, "host-profile.mjs");
}

async function buildBrowserDriver(
  root: string,
  api: string,
  privateAlphabetApi: string,
  privateV4Api: string,
  outdir: string,
  revision: Revision,
): Promise<string> {
  const result = await Bun.build({
    entrypoints: [join(root, "bench/profile-browser.ts")],
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
  runtime: Exclude<Runtime, BrowserRuntime>,
  driver: string,
  api: string,
  privateAlphabetApi: string,
  privateV4Api: string,
  denoImportMap: string,
) {
  const args =
    runtime === "deno"
      ? ["run", "--import-map", denoImportMap, "--allow-env", "--allow-read", driver]
      : runtime === "node-jitless"
        ? ["--jitless", driver]
        : [driver];
  return parseHost(
    await command(
      runtime === "node" || runtime === "node-jitless" ? nodeExecutable : runtime,
      args,
      project,
      {
        UUID_SLUG_PROFILE_FILTER: filter,
        UUID_SLUG_PROFILE_ALPHABET_MODULE: pathToFileURL(privateAlphabetApi).href,
        UUID_SLUG_PROFILE_MODULE: pathToFileURL(api).href,
        UUID_SLUG_PROFILE_PRIVATE_MODULE: pathToFileURL(privateV4Api).href,
        UUID_SLUG_PROFILE_MS: duration,
        UUID_SLUG_PROFILE_SAMPLES: "1",
        UUID_SLUG_PROFILE_WARMUP_MS: warmup,
      },
    ),
  );
}

async function runBrowser(page: Page, origin: string, revision: Revision): Promise<ProfileRow[]> {
  const errors: Error[] = [];
  const onPageError = (error: Error) => errors.push(error);
  page.on("pageerror", onPageError);
  await page.goto(
    `${origin}?duration=${duration}&warmup=${warmup}&samples=1&private=1&filter=${encodeURIComponent(filter)}`,
  );
  try {
    await page.addScriptTag({ type: "module", url: `/${revision}.mjs` });
    await page.waitForFunction(() => "runUuidSlugProfile" in globalThis, undefined, {
      timeout: 5_000,
    });
  } catch (cause) {
    const detail = errors.map((error) => error.message).join("\n");
    throw new Error(`Browser ${revision} profile did not prepare${detail ? `:\n${detail}` : ""}`, {
      cause,
    });
  } finally {
    page.off("pageerror", onPageError);
  }
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

async function runFreshBrowser(
  runtime: BrowserRuntime,
  origin: string,
  revision: Revision,
): Promise<ProfileRow[]> {
  // A new page alone can share engine caches with the preceding revision; fork before warm-up.
  const browser = await browserEngines[runtime].launch({ headless: true });
  try {
    const version = browser.version();
    const previous = runtimeVersions.get(runtime);
    if (previous !== undefined && previous !== version)
      throw new Error(`${runtime} changed version between comparison rounds`);
    runtimeVersions.set(runtime, version);
    return await runBrowser(await browser.newPage(), origin, revision);
  } finally {
    await browser.close();
  }
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
    console.log(
      JSON.stringify({
        runtime,
        runtimeVersion: runtimeVersions.get(runtime),
        revision,
        round,
        order,
        ...row,
      }),
    );
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
          runtimeVersion: runtimeVersions.get(runtime),
          name,
          baseline,
          candidate,
          medianRatio: median(candidate) / median(baseline),
          pairedMedianRatio: median(pairedRatios),
          baselineStatistics: describeSamples(baseline),
          candidateStatistics: describeSamples(candidate),
          pairedRatioStatistics: describeSamples(pairedRatios),
          medianRatio95,
          statisticallyDistinct: medianRatio95
            ? medianRatio95[0] > 1 || medianRatio95[1] < 1
            : undefined,
        }),
      );
      // One readable verdict per row on stderr, so a reader needs no script to see the release,
      // the medians, and whether the interval excludes no change; stdout stays JSON Lines.
      const interval = medianRatio95
        ? `[${medianRatio95[0].toFixed(2)}, ${medianRatio95[1].toFixed(2)}] ` +
          (medianRatio95[0] > 1 ? "slower" : medianRatio95[1] < 1 ? "faster" : "unresolved")
        : "no interval from this few rounds";
      console.error(
        `${runtime} ${runtimeVersions.get(runtime)} ${name}: ` +
          `${median(baseline).toFixed(0)} -> ${median(candidate).toFixed(0)} ns, ` +
          `ratio ${(median(candidate) / median(baseline)).toFixed(3)} ${interval}`,
      );
    }
  }
}

async function main(): Promise<void> {
  for (const runtime of selectedRuntimes) {
    if (isBrowserRuntime(runtime)) continue;
    const executable = runtime === "bun" || runtime === "deno" ? runtime : nodeExecutable;
    const output = await command(executable, ["--version"], project);
    // Node prints `v26.8.2` and Deno `deno 2.9.6 (stable, ...)`; keep only the release number.
    runtimeVersions.set(runtime, /\d+\.\d+\.\d+\S*/.exec(output)?.[0] ?? output.trim());
  }
  const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-compare-"));
  const baselineRoot = join(scratch, "baseline");
  const isolatedCandidate = candidateRef !== undefined || sourceParts !== undefined;
  const candidateRoot = isolatedCandidate ? join(scratch, "candidate") : project;
  try {
    // Committed archives isolate package builds without changing branches or Git worktrees.
    const baselineArchive = join(scratch, "baseline.tar");
    await command(
      "git",
      ["archive", "--format=tar", "--output", baselineArchive, baselineRef],
      project,
    );
    await mkdir(baselineRoot);
    await command("tar", ["-xf", baselineArchive, "-C", baselineRoot], project);
    await symlink(join(project, "node_modules"), join(baselineRoot, "node_modules"), "dir");
    if (isolatedCandidate) {
      const candidateArchive = join(scratch, "candidate.tar");
      await command(
        "git",
        ["archive", "--format=tar", "--output", candidateArchive, candidateRef ?? "HEAD"],
        project,
      );
      await mkdir(candidateRoot);
      await command("tar", ["-xf", candidateArchive, "-C", candidateRoot], project);
      await symlink(join(project, "node_modules"), join(candidateRoot, "node_modules"), "dir");
    }
    if (sourceParts) {
      // Pack the same committed graph with one maintained substitution. Never edit production
      // merely to measure a candidate, and retain the exact replacement outside the scratch tree.
      const group = sourceParts[0] as CandidateGroup;
      const filename = CANDIDATE_FILES[group];
      const source = await readFile(join(candidateRoot, filename), "utf8");
      const uuidSource =
        group === "v7-draw"
          ? await readFile(join(candidateRoot, "src/uuid.ts"), "utf8")
          : undefined;
      const candidate = createSourceCandidates(group, source, uuidSource).find(
        ({ name }) => name === sourceParts[1],
      );
      if (!candidate) throw new Error(`Unknown ${group} source candidate: ${sourceParts[1]}`);
      const candidateSource = candidate.source;
      const reportRoot = join(project, "bench/reports");
      await mkdir(reportRoot, { recursive: true });
      const report = await mkdtemp(join(reportRoot, "packed-source-"));
      await Bun.write(join(report, "source.txt"), candidateSource);
      await Bun.write(
        join(report, "manifest.json"),
        JSON.stringify({
          baselineRef,
          candidateRef: candidateRef ?? "HEAD",
          group,
          name: candidate.name,
          filename,
        }),
      );
      await Bun.write(join(candidateRoot, filename), candidateSource);
      if (candidate.uuidSource !== undefined) {
        await Bun.write(join(candidateRoot, "src/uuid.ts"), candidate.uuidSource);
        await Bun.write(join(report, "uuid-source.txt"), candidate.uuidSource);
      }
      console.error(`Packed source candidate evidence: ${report}`);
    }
    const baselineOut = join(scratch, "baseline-artifacts");
    const candidateOut = join(scratch, "candidate-artifacts");
    const driverRoot = project;
    const [baseline, candidate, driver] = await Promise.all([
      packArtifacts(baselineRoot, baselineOut),
      packArtifacts(candidateRoot, candidateOut),
      buildHostDriver(driverRoot, scratch),
    ]);
    // Browser engines share one compiled corpus per revision. Host-only comparisons need neither
    // that compilation nor browser startup; this matters when comparing several installed hosts.
    const needsBrowser = selectedRuntimes.some(isBrowserRuntime);
    const [baselineBrowser, candidateBrowser] = await Promise.all(
      needsBrowser
        ? [
            buildBrowserDriver(
              driverRoot,
              baseline.api.chromium,
              baseline.privateAlphabetApi.chromium,
              baseline.privateV4Api.chromium,
              scratch,
              "baseline",
            ),
            buildBrowserDriver(
              driverRoot,
              candidate.api.chromium,
              candidate.privateAlphabetApi.chromium,
              candidate.privateV4Api.chromium,
              scratch,
              "candidate",
            ),
          ]
        : [],
    );
    const scripts = {
      baseline: baselineBrowser ? await readFile(baselineBrowser, "utf8") : "",
      candidate: candidateBrowser ? await readFile(candidateBrowser, "utf8") : "",
    };
    const server = needsBrowser
      ? Bun.serve({
          port: 0,
          fetch(request) {
            const name = new URL(request.url).pathname;
            if (name === "/baseline.mjs" || name === "/candidate.mjs")
              return new Response(scripts[name === "/baseline.mjs" ? "baseline" : "candidate"], {
                headers: { "content-type": "text/javascript" },
              });
            return new Response("<!doctype html>", { headers: { "content-type": "text/html" } });
          },
        })
      : undefined;
    try {
      for (const [runtime, version] of runtimeVersions)
        console.error(`Comparison runtime ${runtime}: ${version}`);
      const observations = new Map<string, number[]>();
      for (let round = 0; round < rounds; round += 1) {
        const runtimeOrder = shuffledRuntimes(0x9e3779b9 ^ round);
        const revisionOrder: readonly Revision[] =
          round % 2 ? ["candidate", "baseline"] : ["baseline", "candidate"];
        for (const [order, runtime] of runtimeOrder.entries()) {
          for (const revision of revisionOrder) {
            const artifacts = revision === "baseline" ? baseline : candidate;
            const target = artifactRuntime(runtime);
            let rows: ProfileRow[];
            if (isBrowserRuntime(runtime)) {
              if (!server) throw new Error(`${runtime} comparison did not prepare`);
              rows = await runFreshBrowser(runtime, server.url.href, revision);
            } else {
              rows = await runHost(
                runtime,
                driver,
                artifacts.api[target],
                artifacts.privateAlphabetApi[target],
                artifacts.privateV4Api[target],
                artifacts.denoImportMap,
              );
            }
            emit(runtime, revision, round, order, rows, observations);
          }
        }
      }
      emitSummary(observations);
    } finally {
      await server?.stop(true);
    }
    console.error(`Compared ${baselineRef} with ${candidateRef ?? "the current worktree"}.`);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

await main();
