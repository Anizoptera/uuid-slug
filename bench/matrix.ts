// SPDX-License-Identifier: Apache-2.0

/**
 * Compare speed and sampled randomness across runtimes without overlapping their workloads.
 * Node needs a bundle because its ESM resolver rejects extensionless TypeScript imports;
 * bundler inlining is a measurement caveat. Each child must identify its runtime and emit
 * valid records. Failed children leave partial results visible and fail the overall command.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const extras = (process.env.UUID_SLUG_BENCH_RUNTIMES ?? "").split(":").filter(Boolean);

interface Runtime {
  readonly label: string;
  readonly command: readonly string[];
  /** Bun executes the TypeScript directly; everything else gets the bundle built below. */
  readonly bundled: boolean;
}

const runtimes: readonly Runtime[] = [
  { label: "bun", command: ["bun"], bundled: false },
  { label: "node", command: ["node"], bundled: true },
  ...extras.map((executable) => ({
    label: executable.split("/").pop() ?? executable,
    command: [executable],
    bundled: true,
  })),
];

async function bundle(entry: string, reports: string): Promise<string> {
  const outfile = join(reports, `${entry}.node.mjs`);
  const built = await Bun.build({
    entrypoints: [join(here, `${entry}.ts`)],
    target: "node",
    outdir: reports,
    naming: `${entry}.node.mjs`,
  });
  if (!built.success)
    throw new Error(`bundling ${entry}.ts for Node failed: ${built.logs.map(String).join("\n")}`);
  return outfile;
}

/**
 * Returns the runtime's own name as it reported it, so a row is attributed to the engine that
 * produced it rather than to the label this file guessed from an executable path.
 */
async function run(
  runtime: Runtime,
  entry: "run" | "entropy",
  target: string,
  smoke: boolean,
): Promise<{ records: Record<string, unknown>[]; version: string; failed: boolean }> {
  const argv = [...runtime.command, target, ...(smoke ? ["--smoke"] : [])];
  // Bound the default matrix sample without overriding an explicit caller-selected sample.
  const records: Record<string, unknown>[] = [];
  let version = "";
  let failed = false;
  const fail = (message: string) => {
    failed = true;
    console.error(`${runtime.label}: ${entry}: ${message}`);
  };
  try {
    const child = Bun.spawn(argv, {
      stdout: "pipe",
      stderr: "pipe",
      env: { UUID_SLUG_ENTROPY_SAMPLES: smoke ? "20000" : "50000", ...process.env },
    });
    const [stdout, stderr, status] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    if (status !== 0) fail(`exited ${status}\n${stderr}`);
    const names = new Set<string>();
    for (const [index, line] of stdout.split("\n").entries()) {
      if (!line.trim()) continue;
      try {
        const record: unknown = JSON.parse(line);
        if (!validRecord(record, entry)) throw new Error("invalid measurement fields");
        const reported = record.runtime as string;
        const name = record[entry === "run" ? "name" : "candidate"] as string;
        if (version && reported !== version) throw new Error("runtime changes between records");
        if (names.has(name)) throw new Error(`duplicate measurement ${name}`);
        version = reported;
        names.add(name);
        records.push(record);
      } catch (cause) {
        fail(`line ${index + 1}: ${String(cause)}`);
      }
    }
  } catch (cause) {
    fail(`could not run ${argv[0]}: ${String(cause)}`);
  }
  if (records.length === 0) fail("no valid measurements");
  return { records, version: version || runtime.label, failed };
}

/** Reject broken report transport, not poor performance or weak randomness. */
function validRecord(value: unknown, entry: "run" | "entropy"): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (typeof record.runtime !== "string" || !record.runtime.trim()) return false;
  const name = record[entry === "run" ? "name" : "candidate"];
  if (typeof name !== "string" || !name.trim()) return false;
  const fields =
    entry === "run"
      ? ["opsPerSecond", "elapsedMs", "iterations"]
      : [
          "samples",
          "distinctFields",
          "sameTickPairs",
          "orderedWithinTick",
          "peakDrawsPerTick",
          "counterBits",
          "counterHolds",
          "minOnesRatio",
          "maxOnesRatio",
        ];
  if (
    !fields.every(
      (field) =>
        typeof record[field] === "number" && Number.isFinite(record[field]) && record[field] >= 0,
    )
  )
    return false;
  if (entry === "run")
    return (
      (record.elapsedMs as number) > 0 &&
      Number.isSafeInteger(record.iterations) &&
      (record.iterations as number) > 0
    );
  return (
    Number.isSafeInteger(record.samples) &&
    (record.samples as number) > 0 &&
    [
      "distinctFields",
      "sameTickPairs",
      "orderedWithinTick",
      "peakDrawsPerTick",
      "counterBits",
    ].every((field) => Number.isSafeInteger(record[field])) &&
    (record.distinctFields as number) <= (record.samples as number) &&
    (record.peakDrawsPerTick as number) <= (record.samples as number) &&
    (record.sameTickPairs as number) < (record.samples as number) &&
    (record.orderedWithinTick as number) <= (record.sameTickPairs as number) &&
    (record.counterBits as number) <= 74 &&
    (record.counterHolds as number) <= 1 &&
    (record.minOnesRatio as number) <= (record.maxOnesRatio as number) &&
    (record.maxOnesRatio as number) <= 1 &&
    Array.isArray(record.sources) &&
    record.sources.every((source) => typeof source === "string")
  );
}

/** Run every requested member; failed members must not erase successful measurements. */
export async function runMatrix(
  selected: readonly Runtime[],
  targets: Readonly<Record<"run" | "entropy", string>>,
  smoke = false,
): Promise<number> {
  const speed = new Map<string, Map<number, number>>();
  const entropy: { version: string; records: Record<string, unknown>[] }[] = [];
  const versions: string[] = [];
  let failed = false;

  for (const runtime of selected) {
    const target = (entry: "run" | "entropy") =>
      runtime.bundled ? targets[entry] : join(here, `${entry}.ts`);
    const speedRun = await run(runtime, "run", target("run"), smoke);
    failed ||= speedRun.failed;
    // Index by the requested member, since distinct executables can report the same version.
    const column = versions.length;
    versions.push(`${runtime.label} (${speedRun.version})`);
    for (const record of speedRun.records) {
      const name = String(record.name);
      const row = speed.get(name) ?? new Map<number, number>();
      row.set(column, record.opsPerSecond as number);
      speed.set(name, row);
    }
    const entropyRun = await run(runtime, "entropy", target("entropy"), smoke);
    failed ||= entropyRun.failed;
    if (
      speedRun.records.length &&
      entropyRun.records.length &&
      speedRun.version !== entropyRun.version
    ) {
      console.error(`${runtime.label}: runtime changes between speed and entropy reports`);
      failed = true;
    }
    if (entropyRun.records.length > 0)
      entropy.push({
        version: `${runtime.label} (${entropyRun.version})`,
        records: entropyRun.records,
      });
  }

  const operationWidth = Math.max(28, ...Array.from(speed.keys(), (name) => name.length + 2));
  const columnWidth = Math.max(16, ...versions.map((version) => version.length + 2));
  console.log(`\n## Throughput, ops/s\n`);
  console.log(
    `${"operation".padEnd(operationWidth)}${versions.map((v) => v.padStart(columnWidth)).join("")}`,
  );
  for (const [name, row] of speed)
    console.log(
      name.padEnd(operationWidth) +
        versions.map((_, index) => millions(row.get(index)).padStart(columnWidth)).join(""),
    );

  for (const { version, records } of entropy) {
    console.log(`\n## Randomness — ${version}\n`);
    console.log(
      `${"candidate".padEnd(16)}${"entropy source".padEnd(25)}${"distinct".padStart(9)}${"in-tick".padStart(9)}${"peak/ms".padStart(9)}${"counter".padStart(16)}${"P(1) range".padStart(15)}`,
    );
    for (const r of records) {
      const sources = r.sources as string[];
      const sameTickPairs = r.sameTickPairs as number;
      console.log(
        String(r.candidate).padEnd(16) +
          (sources.length > 0 ? sources.join(",") : "unobserved").slice(0, 24).padEnd(25) +
          String(r.distinctFields).padStart(9) +
          // Ordering belongs beside the counter because the counter is what produces it: a
          // generator with no counter re-randomises inside the millisecond and cannot be sorted
          // within one, however good its bits are. Denominator is the same-millisecond pairs only —
          // see `bench/entropy.ts`, where counting all pairs measured the clock instead.
          (sameTickPairs === 0
            ? "n/a"
            : `${(((r.orderedWithinTick as number) / sameTickPairs) * 100).toFixed(2)}%`
          ).padStart(9) +
          String(r.peakDrawsPerTick).padStart(9) +
          `${String(r.counterBits)}b @ ${((r.counterHolds as number) * 100).toFixed(2)}%`.padStart(
            16,
          ) +
          `${String(r.minOnesRatio)}-${String(r.maxOnesRatio)}`.padStart(15),
      );
    }
  }
  return failed ? 1 : 0;
}

const millions = (value: number | undefined) =>
  value === undefined ? "—" : `${(value / 1_000_000).toFixed(2)}M`;

if (import.meta.main) {
  const reports = await mkdtemp(join(tmpdir(), "uuid-slug-bench-"));
  try {
    const [speedTarget, entropyTarget] = await Promise.all([
      bundle("run", reports),
      bundle("entropy", reports),
    ]);
    process.exitCode = await runMatrix(
      runtimes,
      { run: speedTarget, entropy: entropyTarget },
      process.argv.includes("--smoke"),
    );
  } finally {
    await rm(reports, { recursive: true, force: true });
  }
}
