// SPDX-License-Identifier: Apache-2.0

import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { stripVTControlCharacters } from "node:util";
import { command } from "../scripts/command";
import { CANDIDATE_FILES, CANDIDATE_GROUPS, createSourceCandidates } from "./candidate-sources";
import type { CandidateGroup } from "./candidate-sources";
import { sampleMedian } from "./statistics";

const project = join(import.meta.dir, "..");
async function proof(
  args: string[],
  cwd: string,
  log: string,
  lane: "node" | "bun" | "resources",
  env?: Readonly<Record<string, string>>,
): Promise<void> {
  // Test runners place evidence on different pipes; retain both and fail on absent execution.
  const result = await new Promise<{ error: Error | null; stdout: string; stderr: string }>(
    (resolve) => {
      execFile(
        "bun",
        args,
        { cwd, env: { ...process.env, ...env }, timeout: 30_000, maxBuffer: 4 * 1024 * 1024 },
        (error, stdout, stderr) => resolve({ error, stdout, stderr }),
      );
    },
  );
  const output = result.stdout + result.stderr;
  await writeFile(log, output);
  if (result.error)
    throw new Error(`Candidate proof failed; inspect ${log}`, { cause: result.error });
  if (
    !(
      lane === "resources"
        ? /"name":"default UUIDv7 text-generator initialization"/
        : lane === "bun"
          ? /\b[1-9]\d* pass\b/
          : /Tests\s+[1-9]\d* passed/
    ).test(stripVTControlCharacters(output))
  )
    throw new Error(
      `No executed ${lane === "resources" ? "resource witness" : "tests"}; inspect ${log} before timing.`,
    );
}
const groupInput = process.argv[2];
if (!CANDIDATE_GROUPS.some((group) => group === groupInput) || process.argv.length < 4)
  throw new Error(
    `Usage: bun bench/source-candidates.ts <${CANDIDATE_GROUPS.join("|")}> <candidate names>. Baseline is always included; pass baseline alone for a harness control.`,
  );
const group = groupInput as CandidateGroup;
// Reuse the profile controls instead of multiplying short builds when a screen is noisy.
// These are batch observations; longer windows do not create independent call-latency samples.
const durationMs = Number(process.env.UUID_SLUG_PROFILE_MS ?? "5");
const samples = Number(process.env.UUID_SLUG_PROFILE_SAMPLES ?? "3");
const warmupMs = Number(process.env.UUID_SLUG_PROFILE_WARMUP_MS ?? "16");
for (const [name, value] of Object.entries({ durationMs, samples, warmupMs }))
  if (!Number.isSafeInteger(value) || value < 1)
    throw new Error(
      `Candidate ${name} must be a positive safe integer; inspect profile settings before running proofs.`,
    );
// Each source owner names its own caller corpus. Exhaustiveness prevents a new group silently
// inheriting another group's file or measurements while reporting a successful screen.
const groups = {
  v4: {
    names: [
      "package.v4.text.native",
      "package.v4.text.portable",
      "package.v4.bytes.allocate",
      "package.v4.bytes.into",
      "package.v4.slug.base64url",
    ],
    tests: [],
  },
  alphabet: {
    names: [
      "bytes.base64",
      "plain.encode",
      "v7.slug",
      "v7.base32",
      "v7.pair.default",
      "v7.pair.base32",
    ],
    tests: ["__test__/alphabet.test.ts"],
  },
  "v7-draw": {
    names: ["v7.string", "v7.string.uppercase", "v7.bytes", "v7.slug", "uuid.toString.bytes"],
    tests: ["__test__/v7.test.ts"],
  },
  keyless: {
    names: [
      "v7.string",
      "v7.string.uppercase",
      "v7.at",
      "v7.string.selected-generator",
      "v7.bytes",
      "v7.slug",
      "v7.base32",
      "v7.pair.default",
      "v7.pair.base32",
    ],
    tests: ["__test__/v7.test.ts"],
  },
  format: {
    names: ["v7.string", "v7.string.uppercase", "uuid.toString.bytes", "v7.bytes", "v7.slug"],
    tests: [],
  },
  latin1: {
    names: ["v7.string", "v7.string.uppercase", "uuid.toString.bytes", "v7.bytes", "v7.slug"],
    tests: [],
  },
  value: {
    names: ["value.generate", "value.generate.at", "v7.bytes"],
    tests: ["__test__/v7.test.ts"],
  },
  "value-options": {
    names: [
      "value.generate",
      "value.generate.at",
      "value.generate.generator",
      "value.generate.codec",
      "masked.generate",
      "masked.base32.generate",
    ],
    tests: ["__test__/v7.test.ts", "__test__/mask.test.ts"],
  },
  pool: {
    names: ["v7.string", "v7.bytes", "v7.slug", "v4.string", "v4.bytes"],
    tests: ["__test__/entropy.test.ts", "__test__/v7.test.ts"],
  },
} satisfies Record<CandidateGroup, { names: readonly string[]; tests: readonly string[] }>;
const filename = CANDIDATE_FILES[group];
const { names: expectedNames } = groups[group];
// A committed production graph makes the isolated snapshot match the source being screened.
if (
  (
    await command(
      "git",
      ["status", "--porcelain", "--", "src", "__test__", "package.json", "bun.lock"],
      project,
    )
  ).trim()
)
  throw new Error(
    "Commit production, test and dependency changes before screening; the isolated snapshot must use the same graph as its baseline.",
  );
const revision = (await command("git", ["rev-parse", "HEAD"], project)).trim();
const source = await command("git", ["show", `${revision}:${filename}`], project);
const uuidSource =
  group === "v7-draw"
    ? await command("git", ["show", `${revision}:src/uuid.ts`], project)
    : undefined;
const candidates = createSourceCandidates(group, source, uuidSource);
const requested = new Set(process.argv.slice(3));
for (const name of requested)
  if (!candidates.some((candidate) => candidate.name === name))
    throw new Error(
      `Unknown candidate ${name}; choose ${candidates.map((candidate) => candidate.name).join(", ")}.`,
    );
const selected = candidates.filter(({ name }) => name === "baseline" || requested.has(name));
const runtimeInputs = (process.env.UUID_SLUG_CANDIDATE_RUNTIMES ?? "node:bun").split(":");
if (
  !runtimeInputs.length ||
  new Set(runtimeInputs).size !== runtimeInputs.length ||
  runtimeInputs.some((value) => !["node", "bun", "deno"].includes(value))
)
  throw new Error(
    "UUID_SLUG_CANDIDATE_RUNTIMES must list distinct node, bun or deno values separated by colons.",
  );
const runtimes = runtimeInputs as ("node" | "bun" | "deno")[];
const workRoot = await mkdtemp(join(tmpdir(), "uuid-slug-candidates-"));
const tree = join(workRoot, "tree");
// Parallel proof runs must not overwrite each other's source, manifest or failure evidence.
const reportRoot = join(project, "bench/reports");
await mkdir(reportRoot, { recursive: true });
const report = await mkdtemp(join(reportRoot, `candidates-${group}-`));
try {
  // Proof edits never touch the shared working tree; failures cannot erase another agent's edits.
  // An archive preserves the committed graph without creating a branch or Git worktree.
  const archive = join(workRoot, "source.tar");
  await command("git", ["archive", "--format=tar", "--output", archive, revision], project);
  await mkdir(tree);
  await command("tar", ["-xf", archive, "-C", tree], project);
  await symlink(join(project, "node_modules"), join(tree, "node_modules"), "dir");
  await command("bun", ["run", "build"], tree);
  // Snapshots are text artifacts, not extra compiler inputs under bench/**/*.ts.
  await writeFile(join(report, "source.txt"), source);
  await writeFile(
    join(report, "manifest.json"),
    JSON.stringify({
      revision,
      group,
      filename,
      candidates: selected.map(({ name }) => name),
      runtimes,
      sampleUnit: "within-process batches",
      durationMs,
      samples,
      warmupMs,
    }),
  );
  for (const candidate of selected) {
    const candidateSource = candidate.source;
    await Promise.all([
      writeFile(join(tree, filename), candidateSource),
      writeFile(join(report, `${candidate.name}-source.txt`), candidateSource),
      ...(uuidSource === undefined
        ? []
        : [
            writeFile(join(tree, "src/uuid.ts"), candidate.uuidSource ?? uuidSource),
            writeFile(
              join(report, `${candidate.name}-uuid-source.txt`),
              candidate.uuidSource ?? uuidSource,
            ),
          ]),
    ]);
    await command(
      "bun",
      ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json", "--noEmit", "--pretty", "false"],
      tree,
    );
    const tests = [
      "__test__/core.test.ts",
      "__test__/runtime-boundary.test.ts",
      ...groups[group].tests,
    ];
    const proofs = await Promise.allSettled(
      (
        [
          ["node", ["run", "test:node", "--", ...tests]],
          ["bun", ["test", "__test__/runtime-boundary.bun.test.ts"]],
        ] as const
      ).map(([lane, args]) =>
        proof([...args], tree, join(report, `${candidate.name}-${lane}-proof.log`), lane),
      ),
    );
    const failures = proofs.filter((result) => result.status === "rejected");
    if (failures.length)
      throw new AggregateError(
        failures.map((result) => result.reason),
        `Candidate rejected before timing: ${candidate.name}`,
      );
    if (group === "alphabet") {
      const nativePlain =
        candidate.name === "native-branch" || candidate.name === "native-dispatch";
      for (const mode of ["present", "absent", "throw"]) {
        const output = await command("bun", ["__test__/alphabet-native-probe.ts", mode], tree, {
          UUID_SLUG_EXPECT_NATIVE_PLAIN: nativePlain ? "1" : "0",
        });
        await writeFile(join(report, `${candidate.name}-native-${mode}.jsonl`), output);
        if (!output.includes('"proof":"native plain encoding"'))
          throw new Error(`Native ${mode} proof produced no witness: ${candidate.name}`);
      }
      if (nativePlain) {
        // The injected output defect changes only the native return value. Require the fixed
        // byte oracle to reject it; a green baseline that never selected native proves nothing.
        const mutation = Bun.spawn(["bun", "__test__/alphabet-native-probe.ts", "corrupt"], {
          cwd: tree,
          timeout: 30_000,
          env: { ...process.env, UUID_SLUG_EXPECT_NATIVE_PLAIN: "1" },
          stdout: "pipe",
          stderr: "pipe",
        });
        const [stdout, stderr, exitCode] = await Promise.all([
          new Response(mutation.stdout).text(),
          new Response(mutation.stderr).text(),
          mutation.exited,
        ]);
        await writeFile(join(report, `${candidate.name}-native-corrupt.log`), stdout + stderr);
        if (exitCode === 0 || !stderr.includes("AssertionError"))
          throw new Error(`Native payload oracle did not reject corruption: ${candidate.name}`);
      }
    }
    if (group === "latin1") {
      for (const mode of ["present", "absent", "throw"]) {
        const output = await command("bun", ["__test__/latin1-native-probe.ts", mode], tree, {
          UUID_SLUG_EXPECT_DIRECT_LATIN1: candidate.name.startsWith("direct-latin1") ? "1" : "0",
        });
        await writeFile(join(report, `${candidate.name}-native-${mode}.jsonl`), output);
        if (!output.includes('"proof":"native Latin-1 text"'))
          throw new Error(`Native Latin-1 ${mode} proof produced no witness: ${candidate.name}`);
      }
    }
    for (const runtime of runtimes) {
      const entry = group === "v4" ? "bench/generation-host.ts" : "src/index.ts";
      const result = await Bun.build({
        entrypoints: [join(tree, entry)],
        target: runtime === "deno" ? "node" : runtime,
        ...(runtime === "deno" ? { conditions: ["deno"] } : {}),
        format: "esm",
      });
      if (!result.success || result.outputs.length !== 1)
        throw new AggregateError(
          result.logs,
          `Candidate build failed: ${candidate.name}/${runtime}`,
        );
      await Bun.write(join(report, `${candidate.name}-${runtime}.mjs`), result.outputs[0]!);
      if (group === "v4") {
        // The v4 timing artifact executes its corpus at import. Preserve a separate public API
        // graph for the existing profiler so its call counts and stacks measure the candidate.
        const api = await Bun.build({
          entrypoints: [join(tree, "src/index.ts")],
          target: runtime === "deno" ? "node" : runtime,
          ...(runtime === "deno" ? { conditions: ["deno"] } : {}),
          format: "esm",
        });
        if (!api.success || api.outputs.length !== 1)
          throw new AggregateError(
            api.logs,
            `Candidate API build failed: ${candidate.name}/${runtime}`,
          );
        await Bun.write(join(report, `${candidate.name}-${runtime}-api.mjs`), api.outputs[0]!);
      }
    }
    // Timing cannot justify a candidate that creates avoidable arrays or diagnostics. Use the
    // existing real-operation counter after behavioral proof and before any timed process.
    await proof(
      ["bench/resources.ts"],
      tree,
      join(report, `${candidate.name}-resources.log`),
      "resources",
      { UUID_SLUG_PROFILE_MODULE: join(tree, "src/index.ts") },
    );
    console.log(JSON.stringify({ candidate: candidate.name, proof: "passed" }));
  }
  const driverFile = join(report, "profile.mjs");
  {
    const driver = await Bun.build({
      entrypoints: [join(project, "bench/profile.ts")],
      target: "node",
      format: "esm",
    });
    if (!driver.success || driver.outputs.length !== 1)
      throw new AggregateError(driver.logs, "Candidate profile driver build failed");
    await Bun.write(driverFile, driver.outputs[0]!);
  }
  // Fresh processes and reversed second-pass order expose warmup/order sensitivity. These short
  // batches select candidates; only packed comparisons and resource profiles can retain a change.
  for (let round = 0; round < 2; round++)
    for (const runtime of runtimes) {
      const executable =
        runtime === "node" ? (process.env.UUID_SLUG_COMPARE_NODE_EXECUTABLE ?? "node") : runtime;
      for (let step = 0; step < selected.length; step++) {
        const candidate = selected[round === 0 ? step : selected.length - step - 1]!;
        const module = join(report, `${candidate.name}-${runtime}.mjs`);
        const entry = group === "v4" ? module : driverFile;
        const args = runtime === "deno" ? ["run", "-A", entry] : [entry];
        const output = await command(executable, args, project, {
          UUID_SLUG_PROFILE_MODULE: module,
          UUID_SLUG_PROFILE_FILTER: expectedNames.map((name) => `=${name}`).join(","),
          UUID_SLUG_PROFILE_MS: String(durationMs),
          UUID_SLUG_PROFILE_SAMPLES: String(samples),
          UUID_SLUG_PROFILE_WARMUP_MS: String(warmupMs),
          UUID_SLUG_GENERATION_FILTER: "package.v4.",
          UUID_SLUG_GENERATION_MS: String(durationMs),
          UUID_SLUG_GENERATION_SAMPLES: String(samples),
          UUID_SLUG_GENERATION_WARMUP_MS: String(warmupMs),
        });
        await writeFile(join(report, `${candidate.name}-${runtime}-${round}.jsonl`), output);
        const rows = output
          .trim()
          .split("\n")
          .map((line) => JSON.parse(line) as { name?: string; ns?: readonly number[] });
        const measurements = rows.filter((row) => row.name !== undefined);
        if (
          measurements.length !== expectedNames.length ||
          expectedNames.some(
            (name) => measurements.filter((row) => row.name === name).length !== 1,
          ) ||
          measurements.some(
            (row) =>
              !Array.isArray(row.ns) ||
              row.ns.length !== samples ||
              row.ns.some((value) => !Number.isFinite(value) || value <= 0),
          )
        )
          throw new Error(
            `Incomplete candidate measurements: ${candidate.name}/${runtime}. Every selected case must occur once with all finite positive samples; inspect the runtime output and filter.`,
          );
        console.log(
          JSON.stringify({
            runtime,
            candidate: candidate.name,
            round,
            rows: measurements.map((row) => ({ name: row.name, medianNs: sampleMedian(row.ns!) })),
          }),
        );
      }
    }
  console.log(JSON.stringify({ report }));
} finally {
  await rm(workRoot, { recursive: true, force: true });
}
