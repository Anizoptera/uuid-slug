import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "bun:test";
import { rejects } from "node:assert/strict";
import { inspectCrate } from "./check-crate";

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

async function rejected(extra: Record<string, string>, message: string): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "uuid-slug-crate-"));
  try {
    const archive = join(directory, "package.crate");
    await Bun.write(
      archive,
      new Bun.Archive({ ...base, [`${root}Cargo.toml`]: manifest, ...extra }),
    );
    await rejects(inspectCrate(archive, version), (error: Error) =>
      error.message.includes(message),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("crate validation rejects foreign roots, compiled payloads, machine paths, and build scripts", async () => {
  await rejected({ "other/Cargo.toml": "" }, "Forbidden crate path");
  await rejected({ [`${root}src/libuuid_slug.so`]: "" }, "Compiled payload");
  await rejected({ [`${root}src/leak.rs`]: "/Users/builder/project" }, "Build-machine path");
  await rejected(
    { [`${root}Cargo.toml`]: manifest.replace("build = false", 'build = "build.rs"') },
    "without build",
  );
});
