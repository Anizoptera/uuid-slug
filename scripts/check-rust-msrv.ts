// Check the promised compiler floor without changing the toolchain used for normal builds.
import { command, PACK_TIMEOUT_MS } from "./command";
import { rustToolchain } from "./rust-toolchain";

const root = process.cwd();
const manifest = Bun.TOML.parse(await Bun.file("rust/Cargo.toml").text()) as {
  workspace: { package: { "rust-version": string } };
};
const version = manifest.workspace.package["rust-version"];
if (!/^\d+\.\d+(?:\.\d+)?$/.test(version))
  throw new Error("rust/Cargo.toml must declare a numeric minimum Rust version.");
// A two-component rust-version promises the first patch, not the newest patched compiler.
const floor = version.split(".").length === 2 ? `${version}.0` : version;
await command(
  "rustup",
  ["toolchain", "install", floor, "--profile", "minimal", "--no-self-update"],
  root,
  undefined,
  { timeoutMs: PACK_TIMEOUT_MS },
);
const toolchain = await rustToolchain(root, floor);
for (const features of [
  ["--all-targets", "--all-features"],
  ["--lib", "--no-default-features"],
]) {
  await command(
    toolchain.cargo,
    [
      ...toolchain.cargoArgs,
      "check",
      "--manifest-path",
      "rust/Cargo.toml",
      "--package",
      "uuid-slug",
      "--locked",
      ...features,
    ],
    root,
    toolchain.env,
    { timeoutMs: PACK_TIMEOUT_MS },
  );
}
console.log(`Rust ${floor}: all-feature host targets and the no-default-feature library checked.`);
