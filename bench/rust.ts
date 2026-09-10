// Profile optimized Rust and each native bridge in separate processes after compilation finishes.
import { cpus } from "node:os";
import { buildRustBridge } from "../scripts/rust-bridge";

// Bun can return bigint CPU counters despite declaring number in its types.
function cpuMicros(value: number | bigint): number {
  return Number(value);
}

async function run(command: string[]) {
  const child = Bun.spawn(command, { stdout: "pipe", stderr: "inherit" });
  const [status, output] = await Promise.all([child.exited, new Response(child.stdout).text()]);
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
  return { output, resources };
}

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
]);
const artifacts = build.output
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line))
  .filter(
    (entry) =>
      entry.reason === "compiler-artifact" && entry.target.name === "codec" && entry.executable,
  );
if (artifacts.length !== 1)
  throw new Error("Cargo must identify exactly one codec benchmark executable");
await buildRustBridge();
await run([
  "bun",
  "build",
  "bench/rust-bridge.ts",
  "--target=node",
  "--outfile=rust/target/bench-bridge.mjs",
]);
console.log(
  JSON.stringify({
    host: `${process.platform}/${process.arch}`,
    cpu: cpus()[0]?.model,
    rust: (await run(["rustc", "-Vv"])).output.trim(),
    node: (await run(["node", "--version"])).output.trim(),
    bun: Bun.version,
  }),
);
const lanes = [
  { name: "Rust", command: [artifacts[0].executable] },
  { name: "Node N-API", command: ["node", "rust/target/bench-bridge.mjs"] },
  { name: "Bun N-API", command: ["bun", "bench/rust-bridge.ts"] },
];
// Separate fresh processes expose startup/RSS cost; rotated order reduces fixed-order drift.
for (let repetition = 0; repetition < 3; repetition++) {
  for (let index = 0; index < lanes.length; index++) {
    const lane = lanes[(index + repetition) % lanes.length];
    if (!lane) throw new Error("Missing benchmark lane");
    const { output, resources } = await run(lane.command);
    const records = output
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    if (
      records.pop()?.complete !== true ||
      !records.length ||
      !resources ||
      !Object.values(resources).every(Number.isFinite) ||
      resources.maxRssBytes <= 0
    )
      throw new Error(`${lane.name} did not complete its measurements`);
    for (const row of records)
      if (!(row.calls > 0) || !Number.isFinite(row.nsPerCall) || row.nsPerCall < 0)
        throw new Error(`${lane.name} produced invalid timings`);
    console.log(JSON.stringify({ lane: lane.name, repetition, resources, records }));
  }
}
