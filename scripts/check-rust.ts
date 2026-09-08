// Check the Rust feature boundaries and run shared contracts through both native hosts.
import { buildRustBridge } from "./rust-bridge";

const manifest = "rust/Cargo.toml";

async function run(command: string[], capture = false): Promise<string> {
  console.log(`> ${command.join(" ")}`);
  const child = Bun.spawn(command, {
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
) as { packages: { name: string; features: Record<string, string[]> }[] };
const product = metadata.packages.find((entry) => entry.name === "uuid-slug");
if (!product) throw new Error("Cargo metadata has no uuid-slug product");
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
for (const selection of selections) {
  const enabled = enabledFeatures(selection.names);
  const key = Object.keys(features)
    .filter((name) => name !== "default" && enabled.has(name))
    .join(",");
  if (checked.has(key)) continue;
  checked.add(key);
  await run([
    "cargo",
    "check",
    "--manifest-path",
    manifest,
    "-p",
    "uuid-slug",
    "--locked",
    ...selection.args,
  ]);
}
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
await run([
  "cargo",
  "test",
  "--manifest-path",
  manifest,
  "--workspace",
  "--all-features",
  "--locked",
]);
await buildRustBridge();
await run([
  "bun",
  "build",
  "scripts/rust-conform.ts",
  "--target=node",
  "--outfile=rust/target/conform.mjs",
  "--external=bun:ffi",
]);
// Each adapter checks nonzero execution and exact result counts before it can exit successfully.
const contracts = await Promise.allSettled([
  run(["bun", "scripts/rust-conform.ts"]),
  run(["node", "rust/target/conform.mjs"]),
]);
const failures = contracts.filter((result) => result.status === "rejected");
if (failures.length)
  throw new AggregateError(
    failures.map((result) => result.reason),
    "Native contract verification failed",
  );
