// Measure linked consumer programs, not an rlib or the development bridge's broad exports.
import { mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { command } from "./command";
import { rustToolchain } from "./rust-toolchain";

export async function measureLinkedSizes(
  cwd: string,
  crate: string,
  work: string,
  label: string,
): Promise<{ native: number; wasm: number }> {
  const driver = join(work, `driver-${label}`);
  const target = join(work, `target-${label}`);
  await mkdir(join(driver, "src"), { recursive: true });
  await Promise.all([
    Bun.write(
      join(driver, "Cargo.toml"),
      `[package]\nname = "uuid-slug-linked-probe"\nversion = "0.0.0"\nedition = "2021"\n\n[dependencies]\nuuid-slug = { path = ${JSON.stringify(crate)}, default-features = false }\n`,
    ),
    Bun.write(
      join(driver, "src/main.rs"),
      `use std::hint::black_box;\nuse uuid_slug::{uuid_v7_test_mask, Uuid, UuidV7MaskingCodec};\nfn main() {\n let uuid = Uuid::from_uuid_string("01890f3e-93b8-7cc6-a76b-b2a67b746c2a").unwrap();\n black_box(UuidV7MaskingCodec::new(uuid_v7_test_mask()).uuid_to_masked_slug(uuid).unwrap());\n}\n`,
    ),
  ]);
  const manifest = join(driver, "Cargo.toml");
  const base = ["build", "--release", "--manifest-path", manifest];
  // The caller checkout owns toolchain selection, even for an extracted historical crate.
  const toolchain = await rustToolchain(cwd);
  const env = { ...toolchain.env, CARGO_TARGET_DIR: target };
  await command(toolchain.cargo, [...toolchain.cargoArgs, ...base], cwd, env);
  await command(
    toolchain.cargo,
    [...toolchain.cargoArgs, ...base, "--target", "wasm32-unknown-unknown"],
    cwd,
    env,
  );
  return {
    native: (await stat(join(target, "release/uuid-slug-linked-probe"))).size,
    wasm: (await stat(join(target, "wasm32-unknown-unknown/release/uuid-slug-linked-probe.wasm")))
      .size,
  };
}
