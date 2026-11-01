import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "bun:test";
import { rejects } from "node:assert/strict";
import { inspectCrate } from "../check-crate";

const version = "1.2.3";
const root = `uuid-slug-${version}/`;
const manifest = `[package]
name = "uuid-slug"
version = "${version}"
build = false
autobins = false
[lib]
name = "uuid_slug"
path = "src/lib.rs"
`;
const base = Object.fromEntries(
  [
    ".cargo_vcs_info.json",
    "Cargo.lock",
    "Cargo.toml.orig",
    "LICENSE",
    "README.md",
    "src/lib.rs",
  ].map((name) => [`${root}${name}`, ""]),
);

async function inspectFixture(extra: Record<string, string>, rejection?: string): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "uuid-slug-crate-"));
  try {
    const archive = join(directory, "package.crate");
    await Bun.write(
      archive,
      new Bun.Archive({ ...base, [`${root}Cargo.toml`]: manifest, ...extra }),
    );
    const inspection = inspectCrate(archive, version);
    if (rejection === undefined) await inspection;
    else await rejects(inspection, (error: Error) => error.message.includes(rejection));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("crate validation accepts library sources and rejects forbidden contents", async () => {
  // Rejections alone pass even if a later guard refuses every legitimate archive.
  await inspectFixture({});
  await inspectFixture({ "other/Cargo.toml": "" }, "Forbidden crate path");
  await inspectFixture({ [`${root}benches/codec.rs`]: "fn main() {}" }, "Forbidden crate path");
  await inspectFixture({ [`${root}src/libuuid_slug.so`]: "" }, "Compiled payload");
  await inspectFixture({ [`${root}src/leak.rs`]: "/Users/builder/project" }, "Build-machine path");
  await inspectFixture(
    { [`${root}Cargo.toml`]: manifest.replace("build = false", 'build = "build.rs"') },
    "without build",
  );
});
