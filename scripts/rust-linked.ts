// Measure linked consumer programs, not an rlib or the development bridge's broad exports.
import { copyFile, mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { command } from "./command";
import { rustToolchain } from "./rust-toolchain";
import { optimizeWasm } from "./wasm-opt";

export interface LinkedRustConsumer {
  readonly source: string;
  readonly defaultFeatures?: boolean;
  readonly features?: readonly string[];
}

export const maskingConsumer: LinkedRustConsumer = {
  source: `use std::hint::black_box;\nuse uuid_slug::{uuid_v7_test_mask, Uuid, UuidV7MaskingCodec};\nfn main() {\n let uuid = Uuid::from_uuid_string("01890f3e-93b8-7cc6-a76b-b2a67b746c2a").unwrap();\n black_box(UuidV7MaskingCodec::new(uuid_v7_test_mask()).uuid_to_masked_slug(uuid).unwrap());\n}\n`,
};

export async function buildLinkedConsumer(
  cwd: string,
  crate: string,
  work: string,
  label: string,
  consumer: LinkedRustConsumer,
  thinLto = false,
): Promise<{ native: string; wasm: string }> {
  const driver = join(work, `driver-${label}`);
  const target = join(work, `target-${label}`);
  await mkdir(join(driver, "src"), { recursive: true });
  // Resolve shared dependencies from the measured checkout, including the bindgen CLI schema.
  await copyFile(join(cwd, "rust/Cargo.lock"), join(driver, "Cargo.lock"));
  await Promise.all([
    Bun.write(
      join(driver, "Cargo.toml"),
      `[package]\nname = "uuid-slug-linked-probe"\nversion = "0.0.0"\nedition = "2021"\n\n[dependencies]\nuuid-slug = { path = ${JSON.stringify(crate)}, default-features = ${consumer.defaultFeatures ?? false}, features = ${JSON.stringify(consumer.features ?? [])} }\n`,
    ),
    Bun.write(join(driver, "src/main.rs"), consumer.source),
  ]);
  const manifest = join(driver, "Cargo.toml");
  const base = ["build", "--release", "--manifest-path", manifest];
  // The caller checkout owns toolchain selection, even for an extracted historical crate.
  const toolchain = await rustToolchain(cwd);
  const env = {
    ...toolchain.env,
    CARGO_TARGET_DIR: target,
    CARGO_PROFILE_RELEASE_LTO: thinLto ? "thin" : "false",
  };
  await command(toolchain.cargo, [...toolchain.cargoArgs, ...base], cwd, env);
  await command(
    toolchain.cargo,
    [...toolchain.cargoArgs, ...base, "--target", "wasm32-unknown-unknown"],
    cwd,
    env,
  );
  return {
    native: join(
      target,
      `release/uuid-slug-linked-probe${process.platform === "win32" ? ".exe" : ""}`,
    ),
    wasm: join(target, "wasm32-unknown-unknown/release/uuid-slug-linked-probe.wasm"),
  };
}

export async function measureLinkedSizes(
  cwd: string,
  crate: string,
  work: string,
  label: string,
): Promise<{ native: number; wasm: number }> {
  const paths = await buildLinkedConsumer(cwd, crate, work, label, maskingConsumer);
  const optimized = join(work, `${label}.optimized.wasm`);
  await optimizeWasm(paths.wasm, optimized);
  await command(paths.native, [], cwd);
  const { instance } = await WebAssembly.instantiate(await Bun.file(optimized).arrayBuffer());
  const main = instance.exports.main;
  if (typeof main !== "function") throw new Error("Linked masking consumer has no main export");
  main(0, 0);
  return {
    native: (await stat(paths.native)).size,
    wasm: (await stat(optimized)).size,
  };
}
