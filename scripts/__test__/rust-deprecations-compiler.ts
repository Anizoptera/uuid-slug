import assert from "node:assert/strict";
import { copyFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { command } from "../command";
import { annotateRustApi, rustDeprecations } from "../rust-deprecations";
import type { Rustdoc } from "../rust-deprecations";

const project = resolve(import.meta.dir, "../..");

export async function resolveRustApiEnvironment(): Promise<{ RUSTC: string; RUSTDOC: string }> {
  // Rustdoc JSON uses nightly; reuse these paths for the control and product reports.
  const [RUSTC, RUSTDOC] = await Promise.all([
    command("rustup", ["which", "--toolchain", "nightly", "rustc"], project).then((value) =>
      value.trim(),
    ),
    command("rustup", ["which", "--toolchain", "nightly", "rustdoc"], project).then((value) =>
      value.trim(),
    ),
  ]);
  return { RUSTC, RUSTDOC };
}

// The API lane already owns the Rust compiler and extractor; JavaScript-only lanes must not need them.
export async function checkRustDeprecationCompiler(
  environment: Awaited<ReturnType<typeof resolveRustApiEnvironment>>,
): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "uuid-slug-rust-deprecations-"));
  try {
    await Promise.all(
      ["Cargo.toml", "lib.rs"].map((file) =>
        copyFile(join(import.meta.dir, "fixtures/rust-deprecations", file), join(root, file)),
      ),
    );
    const source = await command(
      "cargo",
      [
        "public-api",
        "--manifest-path",
        join(root, "Cargo.toml"),
        "--color=never",
        "--simplified",
        "--include",
        "function-parameter-names",
      ],
      project,
      { ...environment, CARGO_TARGET_DIR: join(root, "target") },
    );
    const generated = (await Bun.file(join(root, "target/doc/uuid_slug.json")).json()) as Rustdoc;
    const deprecated = new Set(rustDeprecations(generated));
    assert.deepEqual(
      deprecated,
      new Set([
        "value uuid_slug::Codec::seed",
        "function uuid_slug::Codec::decode",
        "value uuid_slug::Error::Legacy",
        "function uuid_slug::Decode::decode",
        "function uuid_slug::old",
        "function uuid_slug::Holder::deprecated_callback_owner",
        "function uuid_slug::Marker::deprecated_marker",
        "value uuid_slug::Error::Current::code",
        "const uuid_slug::Decode::LEGACY",
        "type uuid_slug::Decode::Legacy",
        "value uuid_slug::Union::old",
      ]),
    );
    const lines = source.split("\n");
    const member = lines.find((line) => line.includes("::deprecated_callback_owner("));
    const current = lines.find((line) => line.includes("::current("));
    const annotated = annotateRustApi(source, deprecated);
    assert.equal(
      annotated.split("\n").filter((line) => line.startsWith("#[deprecated] ")).length,
      deprecated.size,
    );
    assert.ok(member);
    assert.ok(current);
    assert.ok(annotated.includes(`#[deprecated] ${member}`), `Deprecation missing: ${member}`);
    const marker = lines.find((line) => line.includes("::deprecated_marker("));
    assert.ok(marker);
    assert.ok(annotated.includes(`#[deprecated] ${marker}`), `Deprecation missing: ${marker}`);
    assert.ok(
      !annotated.includes(`#[deprecated] ${current}`),
      `Unexpected deprecation: ${current}`,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

if (import.meta.main) await checkRustDeprecationCompiler(await resolveRustApiEnvironment());
