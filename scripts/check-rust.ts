// Check Rust feature boundaries and every native transport exposed by installed hosts.
import { buildRustBridge } from "./rust-bridge";
import { runNativeConformance } from "./rust-conform-matrix";
import { checkReleaseVersion } from "./release-version";

const manifest = "rust/Cargo.toml";
const { version } = await Bun.file("package.json").json();
await checkReleaseVersion(process.cwd(), version);
const fast = process.argv[2] === "--fast";
if (process.argv.length > (fast ? 3 : 2)) throw new Error("Usage: check-rust.ts [--fast]");

async function run(command: string[], capture = false, env = process.env): Promise<string> {
  console.log(`> ${command.join(" ")}`);
  const child = Bun.spawn(command, {
    env,
    stdout: capture ? "pipe" : "inherit",
    stderr: "inherit",
  });
  const [status, output] = await Promise.all([
    child.exited,
    capture ? new Response(child.stdout).text() : Promise.resolve(""),
  ]);
  if (status !== 0) throw new Error(`${command.join(" ")} failed (${status})`);
  return output;
}

const expectedArch = process.env.EXPECTED_ARCH;
if (expectedArch && process.arch !== expectedArch)
  throw new Error(`Bun runs as ${process.arch}; this native lane requires ${expectedArch}`);
const compiler = await run(["rustc", "-vV"], true);
const host = /^host: (\S+)$/m.exec(compiler)?.[1];
const nativeCpu =
  process.arch === "arm64" ? "aarch64" : process.arch === "x64" ? "x86_64" : process.arch;
if (!host?.startsWith(`${nativeCpu}-`))
  throw new Error(`Rust host ${host ?? "missing"} does not match Bun architecture ${process.arch}`);

// A translated JavaScript host cannot load a native addon for the runner's actual architecture.
await run([
  "node",
  "-e",
  `if (process.arch !== ${JSON.stringify(process.arch)}) throw Error('Node and Bun architectures differ')`,
]);
await run(["cargo", "fmt", "--all", "--manifest-path", manifest, "--check"]);
const metadata = JSON.parse(
  await run(
    [
      "cargo",
      "metadata",
      "--manifest-path",
      manifest,
      "--no-deps",
      "--format-version",
      "1",
      "--locked",
    ],
    true,
  ),
) as { packages: { name: string; version: string; features: Record<string, string[]> }[] };
const product = metadata.packages.find((entry) => entry.name === "uuid-slug");
if (!product) throw new Error("Cargo metadata has no uuid-slug product");
if (product.version !== version)
  throw new Error(`Rust product version ${product.version} does not match package.json ${version}`);
const features = product.features;

// Feature unification in workspace tests can hide a product's missing optional dependency.
// Deduplicate equivalent selections, such as the default containing only os-rng.
function enabledFeatures(names: string[], enabled = new Set<string>()): Set<string> {
  for (const name of names) {
    if (enabled.has(name)) continue;
    enabled.add(name);
    enabledFeatures(
      (features[name] ?? []).filter((entry) => entry in features),
      enabled,
    );
  }
  return enabled;
}
const selections = [
  { names: ["default"], args: [] },
  { names: [], args: ["--no-default-features"] },
  ...Object.keys(product.features)
    .filter((name) => name !== "default")
    .map((name) => ({
      names: [name],
      args: ["--no-default-features", "--features", name],
    })),
];
const checked = new Set<string>();
for (const selection of fast ? selections.slice(0, 1) : selections) {
  const enabled = enabledFeatures(selection.names);
  const key = Object.keys(features)
    .filter((name) => name !== "default" && enabled.has(name))
    .join(",");
  if (checked.has(key)) continue;
  checked.add(key);
  for (const profile of fast ? [[]] : [[], ["--release"]]) {
    // Benchmark targets are compiled, not timed, in the routine correctness lane.
    await run([
      "cargo",
      "check",
      "--manifest-path",
      manifest,
      "-p",
      "uuid-slug",
      "--benches",
      "--locked",
      ...selection.args,
      ...profile,
    ]);
    await run([
      "cargo",
      "test",
      "--manifest-path",
      manifest,
      "-p",
      "uuid-slug",
      "--lib",
      "--locked",
      ...selection.args,
      ...profile,
    ]);
  }
}
await run(["cargo", "test", "--manifest-path", manifest, "-p", "uuid-slug", "--doc", "--locked"]);
await run([
  "cargo",
  "clippy",
  "--manifest-path",
  manifest,
  "--workspace",
  "--all-targets",
  "--all-features",
  "--locked",
  "--",
  "-D",
  "warnings",
]);
for (const profile of fast ? [] : (["debug", "release"] as const)) {
  const profileArgs = profile === "release" ? ["--release"] : [];
  await run([
    "cargo",
    "test",
    "--manifest-path",
    manifest,
    "-p",
    "uuid-slug-bridge",
    "--all-features",
    "--locked",
    ...profileArgs,
  ]);
  await buildRustBridge(profile);
  await run([
    "cargo",
    "run",
    "--manifest-path",
    manifest,
    "-p",
    "uuid-slug",
    "--example",
    "filesystem",
    "--locked",
    ...profileArgs,
  ]);
  // Fresh processes load the exact profile and isolate host-specific native state.
  await runNativeConformance(profile, false);
}
