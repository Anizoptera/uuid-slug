// SPDX-License-Identifier: Apache-2.0

/**
 * Runs the speed benchmark and the entropy audit under every available runtime and prints them
 * side by side, because a per-runtime figure is not a detail of these measurements — it is often
 * the finding.
 *
 * Two reasons a row moves between engines, and only the second is obvious. Same code, different
 * JIT: `@kripod/uuidv7` measured 1.76M ops/s on Bun and 657k on Node, a 2.7x swing with nothing
 * changed. And DIFFERENT code: a package with conditional exports, or one that feature-detects
 * `node:crypto` against Web Crypto, runs a different implementation on each engine — so its
 * entropy SOURCE can differ too, which is why the audit is in this matrix and not just the
 * benchmark. Native availability differs as well: `Bun.randomUUIDv7` exists only on Bun, and
 * `crypto.randomUUIDv7` landed in Node v26.6.0, so it is absent on every earlier line.
 *
 * Node cannot execute these files directly — the repository's TypeScript uses extensionless
 * relative imports, which Node's ESM resolver rejects — so each is bundled for it first with the
 * toolchain already in the repo rather than by adding a loader dependency. The bundle is a real
 * measurement caveat and not a free one: inlining across module boundaries can flatter a row that
 * a consumer would import unbundled.
 *
 * Point it at extra runtimes with `UUID_SLUG_BENCH_RUNTIMES`, a colon-separated list of
 * executables — for example a freshly downloaded Node that has native v7 while the installed one
 * does not.
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const reports = join(here, "reports");
mkdirSync(reports, { recursive: true });

const smoke = process.argv.includes("--smoke");
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

async function bundle(entry: string): Promise<string> {
  const outfile = join(reports, `${entry}.node.mjs`);
  const built = Bun.spawnSync([
    "bun",
    "build",
    join(here, `${entry}.ts`),
    "--target=node",
    `--outfile=${outfile}`,
  ]);
  if (built.exitCode !== 0)
    throw new Error(`bundling ${entry}.ts for Node failed: ${built.stderr.toString()}`);
  return outfile;
}

/**
 * Returns the runtime's own name as it reported it, so a row is attributed to the engine that
 * produced it rather than to the label this file guessed from an executable path.
 */
async function run(
  runtime: Runtime,
  entry: string,
  bundled: string,
): Promise<{ records: Record<string, unknown>[]; version: string } | null> {
  const target = runtime.bundled ? bundled : join(here, `${entry}.ts`);
  const argv = [...runtime.command, target, ...(smoke ? ["--smoke"] : [])];
  // A quarter of the standalone audit's sample size, because this runs it once per runtime and a
  // multi-minute matrix is a broken feedback loop. Nothing it measures needs the larger set: the
  // counter scan reads consecutive same-millisecond pairs, of which 50,000 values yield tens of
  // thousands, and a generator that repeats itself does so long before then. Run `bench:entropy`
  // for the full pass.
  const result = Bun.spawnSync(argv, {
    stderr: "pipe",
    env: { ...process.env, UUID_SLUG_ENTROPY_SAMPLES: "50000" },
  });
  if (result.exitCode !== 0) {
    console.error(`${runtime.label}: ${entry} exited ${result.exitCode}\n${result.stderr}`);
    return null;
  }
  const records = result.stdout
    .toString()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
  const version = String(records[0]?.runtime ?? runtime.label);
  return { records, version };
}

const speedBundle = await bundle("run");
const entropyBundle = await bundle("entropy");

const speed = new Map<string, Map<string, number>>();
const entropy: { version: string; records: Record<string, unknown>[] }[] = [];
const versions: string[] = [];

for (const runtime of runtimes) {
  const speedRun = await run(runtime, "run", speedBundle);
  if (!speedRun) continue;
  versions.push(speedRun.version);
  for (const record of speedRun.records) {
    const name = String(record.name);
    const row = speed.get(name) ?? new Map<string, number>();
    row.set(speedRun.version, Number(record.opsPerSecond));
    speed.set(name, row);
  }
  const entropyRun = await run(runtime, "entropy", entropyBundle);
  if (entropyRun) entropy.push({ version: entropyRun.version, records: entropyRun.records });
}

const thousands = (value: number | undefined) =>
  value === undefined ? "—" : `${(value / 1_000_000).toFixed(2)}M`;

console.log(`\n## Throughput, ops/s\n`);
console.log(`${"operation".padEnd(28)}${versions.map((v) => v.padStart(16)).join("")}`);
for (const [name, row] of speed)
  console.log(name.padEnd(28) + versions.map((v) => thousands(row.get(v)).padStart(16)).join(""));

for (const { version, records } of entropy) {
  console.log(`\n## Randomness — ${version}\n`);
  console.log(
    `${"candidate".padEnd(16)}${"entropy source".padEnd(25)}${"distinct".padStart(9)}${"ordered".padStart(9)}${"counter".padStart(16)}${"P(1) range".padStart(15)}`,
  );
  for (const r of records) {
    const sources = r.sources as string[];
    const samples = r.samples as number;
    console.log(
      String(r.candidate).padEnd(16) +
        (sources.length > 0 ? sources.join(",") : "unobserved").slice(0, 24).padEnd(25) +
        String(r.distinctFields).padStart(9) +
        // Ordering belongs beside the counter because the counter is what produces it: a
        // generator with no counter re-randomises inside the millisecond and cannot be sorted
        // within one, however good its bits are.
        `${(((r.nonDecreasingPairs as number) / (samples - 1)) * 100).toFixed(2)}%`.padStart(9) +
        `${r.counterBits}b @ ${((r.counterHolds as number) * 100).toFixed(2)}%`.padStart(16) +
        `${r.minOnesRatio}-${r.maxOnesRatio}`.padStart(15),
    );
  }
}
