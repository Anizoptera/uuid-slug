// Keep Cargo, its subcommands and target libraries on the repository's selected compiler.
import { delimiter, dirname, join } from "node:path";
import { command } from "./command";

export async function rustToolchain(root = process.cwd()) {
  const [cargo, rustc] = await Promise.all(
    ["cargo", "rustc"].map(async (tool) => (await command("rustup", ["which", tool], root)).trim()),
  );
  if (!cargo || !rustc)
    throw new Error("rustup did not resolve Cargo and rustc for this checkout.");
  const bin = dirname(rustc);
  // Cargo subcommands resolve through PATH independently of RUSTC. The macOS linker also
  // needs LLVM in child processes; Cargo config survives that boundary unlike parent DYLD vars.
  return {
    cargo,
    rustc,
    env: { ...process.env, RUSTC: rustc, PATH: `${bin}${delimiter}${process.env.PATH ?? ""}` },
    cargoArgs:
      process.platform === "darwin"
        ? [
            "--config",
            `env.DYLD_LIBRARY_PATH.value=${JSON.stringify(join(bin, "..", "lib"))}`,
            "--config",
            "env.DYLD_LIBRARY_PATH.force=true",
          ]
        : [],
  };
}

// `bun scripts/rust-toolchain.ts cargo <args>` runs Cargo on the pinned toolchain for package
// scripts: a bare `cargo` can resolve another installed rustc and fail on mixed build artifacts.
if (import.meta.main) {
  const [tool, ...args] = process.argv.slice(2);
  if (tool !== "cargo") throw new Error("Usage: rust-toolchain.ts cargo <args>");
  const toolchain = await rustToolchain();
  const child = Bun.spawn([toolchain.cargo, ...toolchain.cargoArgs, ...args], {
    env: toolchain.env,
    stdio: ["inherit", "inherit", "inherit"],
  });
  process.exitCode = await child.exited;
}
