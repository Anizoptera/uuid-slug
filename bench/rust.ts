// Profile optimized Rust and each native bridge in separate processes after compilation finishes.
import { cpus } from "node:os";
import { buildRustBridge } from "../scripts/rust-bridge";
import { nativeMatrix } from "../scripts/rust-native-matrix";
import { rustToolchain } from "../scripts/rust-toolchain";

const toolchain = await rustToolchain();

// Bun can return bigint CPU counters despite declaring number in its types.
function cpuMicros(value: number | bigint): number {
  return Number(value);
}

async function run(command: readonly string[], env: Readonly<Record<string, string>> = {}) {
  const started = performance.now();
  const selected =
    command[0] === "cargo"
      ? [toolchain.cargo, ...toolchain.cargoArgs, ...command.slice(1)]
      : command[0] === "rustc"
        ? [toolchain.rustc, ...command.slice(1)]
        : [...command];
  const child = Bun.spawn(selected, {
    env: { ...toolchain.env, ...env },
    stdout: "pipe",
    stderr: "inherit",
  });
  const [status, output] = await Promise.all([child.exited, new Response(child.stdout).text()]);
  const elapsedMs = performance.now() - started;
  if (status !== 0) throw new Error(`${command.join(" ")} exited ${status}`);
  const usage = child.resourceUsage();
  // Bun exposes these as getters, so JSON.stringify(usage) silently produces an empty object.
  const resources = usage && {
    userCpuUs: cpuMicros(usage.cpuTime.user),
    systemCpuUs: cpuMicros(usage.cpuTime.system),
    maxRssBytes: usage.maxRSS,
    voluntarySwitches: usage.contextSwitches.voluntary,
    involuntarySwitches: usage.contextSwitches.involuntary,
    filesystemReads: usage.ops.in,
    filesystemWrites: usage.ops.out,
  };
  return { elapsedMs, output, resources };
}

async function buildCodec(features: readonly string[] = []) {
  const build = await run([
    "cargo",
    "bench",
    "--manifest-path",
    "rust/Cargo.toml",
    "-p",
    "uuid-slug",
    "--bench",
    "codec",
    "--no-run",
    "--locked",
    "--message-format=json",
    ...features,
  ]);
  const artifacts = build.output
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line))
    .filter(
      (entry) =>
        entry.reason === "compiler-artifact" && entry.target.name === "codec" && entry.executable,
    );
  if (artifacts.length !== 1) throw new Error("Cargo must identify exactly one codec executable");
  return { executable: String(artifacts[0].executable), build };
}

if (process.argv[2] === "--generation") {
  // Build both feature selections before timing; reverse process order to expose drift.
  const variants = [];
  for (const [name, features] of [
    ["fast-rng", []],
    ["os-rng", ["--no-default-features", "--features", "os-rng"]],
  ] as const) {
    variants.push({ name, ...(await buildCodec(features)) });
  }
  console.log(
    JSON.stringify({
      host: `${process.platform}/${process.arch}`,
      cpu: cpus()[0]?.model,
      rust: (await run(["rustc", "-Vv"])).output.trim(),
      builds: variants.map(({ name, build }) => ({
        name,
        elapsedMs: build.elapsedMs,
        resources: build.resources,
      })),
    }),
  );
  for (let repetition = 0; repetition < 3; repetition++) {
    for (let index = 0; index < variants.length; index++) {
      const variant = variants[repetition % 2 ? variants.length - 1 - index : index];
      if (!variant) throw new Error("Missing generation feature selection");
      const result = await run([variant.executable], { UUID_SLUG_PROFILE_FILTER: "generation/" });
      const records = result.output
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));
      const expectedOperations = [4, 7].flatMap((version) =>
        ["bytes", "text", "base64url", "base32hex"].map(
          (output) => `generation/v${version}/${output}`,
        ),
      );
      if (
        records.pop()?.complete !== true ||
        records.length !== expectedOperations.length * 5 ||
        expectedOperations.some((operation) => {
          const rows = records.filter((row) => row.operation === operation);
          return rows.length !== 5 || new Set(rows.map((row) => row.round)).size !== 5;
        }) ||
        records.some(
          (row) => row.calls !== 100_000 || !Number.isFinite(row.nsPerCall) || !(row.nsPerCall > 0),
        ) ||
        !result.resources ||
        !Object.values(result.resources).every(Number.isFinite)
      )
        throw new Error(`${variant.name}: incomplete generation measurements`);
      console.log(
        JSON.stringify({ name: variant.name, repetition, ...result, output: undefined, records }),
      );
    }
  }
  process.exit(0);
}

const { executable } = await buildCodec();
await buildRustBridge();
await run([
  "bun",
  "build",
  "--check",
  "bench/rust-bridge.ts",
  "--target=node",
  "--outfile=rust/target/bench-bridge.mjs",
  "--external=bun:ffi",
  "--external=node:ffi",
]);
const nativeLanes = await nativeMatrix("bench/rust-bridge.ts", "rust/target/bench-bridge.mjs");
const emitRawSamples = process.env.UUID_SLUG_RUST_BENCH_RAW === "1";
console.log(
  JSON.stringify({
    host: `${process.platform}/${process.arch}`,
    cpu: cpus()[0]?.model,
    rust: (await run(["rustc", "-Vv"])).output.trim(),
    lanes: nativeLanes.map((lane) => lane.label),
  }),
);
const lanes = [
  { name: "Rust", command: [executable], env: {}, expectedTransport: undefined },
  ...nativeLanes.map((lane) => ({
    name: lane.label,
    command: lane.command,
    env: lane.env,
    expectedTransport: lane.expectedTransport,
  })),
];
const samples = new Map<
  string,
  Array<{
    elapsedMs: number;
    resources: NonNullable<Awaited<ReturnType<typeof run>>["resources"]>;
    records: Array<Record<string, number | string>>;
  }>
>();
const startupSamples = new Map<
  string,
  Array<{
    elapsedMs: number;
    resources: NonNullable<Awaited<ReturnType<typeof run>>["resources"]>;
  }>
>();

for (let repetition = 0; repetition < 5; repetition++) {
  for (let index = 0; index < nativeLanes.length; index++) {
    const lane = nativeLanes[(index + repetition) % nativeLanes.length];
    if (!lane) throw new Error("Missing startup lane");
    const { elapsedMs, output, resources } = await run([...lane.command, "--startup"], lane.env);
    const records = output
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    if (
      records[0]?.transport !== lane.expectedTransport ||
      records[1]?.complete !== true ||
      records.length !== 2 ||
      !resources ||
      !Object.values(resources).every(Number.isFinite) ||
      resources.maxRssBytes <= 0
    )
      throw new Error(`${lane.host} ${lane.transport} did not complete its startup measurement`);
    startupSamples.set(lane.label, [
      ...(startupSamples.get(lane.label) ?? []),
      { elapsedMs, resources },
    ]);
  }
}

// Separate fresh processes expose startup/RSS cost; rotated order reduces fixed-order drift.
for (let repetition = 0; repetition < 3; repetition++) {
  for (let index = 0; index < lanes.length; index++) {
    const lane = lanes[(index + repetition) % lanes.length];
    if (!lane) throw new Error("Missing benchmark lane");
    const { elapsedMs, output, resources } = await run(lane.command, lane.env);
    const records = output
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    const complete = records.pop();
    const metadata = lane.expectedTransport ? records.shift() : undefined;
    if (
      complete?.complete !== true ||
      (lane.expectedTransport && metadata?.transport !== lane.expectedTransport) ||
      !records.length ||
      !resources ||
      !Object.values(resources).every(Number.isFinite) ||
      resources.maxRssBytes <= 0
    )
      throw new Error(`${lane.name} did not complete its measurements`);
    for (const row of records)
      if (!(row.calls > 0) || !Number.isFinite(row.nsPerCall) || row.nsPerCall < 0)
        throw new Error(`${lane.name} produced invalid timings`);
    const sample = { elapsedMs, resources, records };
    samples.set(lane.name, [...(samples.get(lane.name) ?? []), sample]);
    if (emitRawSamples) console.log(JSON.stringify({ lane: lane.name, repetition, ...sample }));
  }
}

function median(values: number[]): number {
  if (!values.length) throw new Error("Cannot summarize an empty measurement");
  const remaining = [...values];
  for (let rank = 0; ; rank++) {
    let least = 0;
    for (let index = 1; index < remaining.length; index++)
      if ((remaining[index] ?? Infinity) < (remaining[least] ?? Infinity)) least = index;
    const [value] = remaining.splice(least, 1);
    if (rank === Math.floor(values.length / 2) && value !== undefined) return value;
  }
}

for (const [lane, laneSamples] of samples) {
  if (lane === "Rust") continue;
  const rows = laneSamples.flatMap((sample) => sample.records);
  const fixed = rows.filter(
    (row) => row.operation === "bridge/dispatch" && row.batch === 0 && row.round !== 0,
  );
  const steadySingles = rows.filter(
    (row) => row.operation === "bridge/dispatch" && row.batch === 1 && row.round !== 0,
  );
  const batches = rows.filter((row) => row.operation === "bridge/dispatch" && row.batch === 64);
  const plain = rows.filter((row) => row.operation === "bridge/plain" && row.round !== 0);
  const startups = startupSamples.get(lane);
  if (!startups) throw new Error(`${lane} has no startup measurements`);
  console.log(
    JSON.stringify({
      summary: lane,
      startupMs: median(startups.map((sample) => sample.elapsedMs)),
      startupCpuMs: median(
        startups.map(
          (sample) => (sample.resources.userCpuUs + sample.resources.systemCpuUs) / 1_000,
        ),
      ),
      startupRssMiB: median(startups.map((sample) => sample.resources.maxRssBytes / 2 ** 20)),
      workloadProcessMs: median(laneSamples.map((sample) => sample.elapsedMs)),
      workloadCpuMs: median(
        laneSamples.map(
          (sample) => (sample.resources.userCpuUs + sample.resources.systemCpuUs) / 1_000,
        ),
      ),
      workloadRssMiB: median(laneSamples.map((sample) => sample.resources.maxRssBytes / 2 ** 20)),
      fixedNs: median(fixed.map((row) => Number(row.nsPerCall))),
      steadySingleNs: median(steadySingles.map((row) => Number(row.nsPerIdentifier))),
      batch64Ns: median(batches.map((row) => Number(row.nsPerIdentifier))),
      plainNs: median(plain.map((row) => Number(row.nsPerCall))),
    }),
  );
}
