// Run development conformance through the same Node-API addon in Node and Bun.
import { copyFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

// The lane runs from the checkout root; bundled scripts must not resolve relative to their bundle.
const root = process.cwd();
const target = resolve(root, "rust/target");
function bridgeFiles(profile: "debug" | "release") {
  return {
    source: resolve(
      target,
      profile,
      `${process.platform === "win32" ? "" : "lib"}uuid_slug_bridge.${process.platform === "darwin" ? "dylib" : process.platform === "win32" ? "dll" : "so"}`,
    ),
    addon: resolve(target, profile, "uuid_slug_bridge.node"),
  };
}

/** Build explicitly once per lane; loading never launches an implicit Cargo process. */
export async function buildRustBridge(profile: "debug" | "release" = "release"): Promise<void> {
  await new Promise<void>((done, reject) => {
    const child = spawn(
      "cargo",
      [
        "build",
        "--manifest-path",
        "rust/Cargo.toml",
        "-p",
        "uuid-slug-bridge",
        ...(profile === "release" ? ["--release"] : []),
        "--locked",
      ],
      {
        cwd: root,
        env: { ...process.env, CARGO_TARGET_DIR: target },
        stdio: "inherit",
      },
    );
    child.once("error", reject);
    child.once("exit", (code, signal) =>
      code === 0 ? done() : reject(new Error(`Rust bridge build failed: ${signal ?? code}`)),
    );
  });
  const { source, addon } = bridgeFiles(profile);
  await copyFile(source, addon);
}

interface RustBridge {
  evaluate(input: string): string;
}

/** These synchronous calls belong in conformance/benchmark workers, not product event loops. */
export function loadRustBridge(): RustBridge {
  const profile = process.env.UUID_SLUG_RUST_PROFILE ?? "release";
  if (profile !== "debug" && profile !== "release")
    throw new Error(`UUID_SLUG_RUST_PROFILE must be debug or release; received ${profile}`);
  return createRequire(import.meta.url)(bridgeFiles(profile).addon) as RustBridge;
}
