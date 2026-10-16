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
