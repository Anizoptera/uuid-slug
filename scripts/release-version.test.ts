// Verify that versioning updates Cargo files before a release can be tagged.
import { rejects } from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "bun:test";
import { preflightRelease } from "./release-notes";
import { checkReleaseVersion } from "./release-version";

test("the version hook synchronizes Cargo and rejects missing notes before mutation", async () => {
  const root = await mkdtemp(join(tmpdir(), "uuid-slug-version-"));
  const names = ["uuid-slug", "uuid-slug-bridge"];
  try {
    await Promise.all([
      Bun.write(join(root, ".tool-versions"), Bun.file(join(import.meta.dir, "../.tool-versions"))),
      Bun.write(join(root, "package.json"), JSON.stringify({ name: "test", version: "1.2.3" })),
      Bun.write(join(root, "CHANGELOG.md"), "## [1.2.3]\n- Change.\n"),
      Bun.write(
        join(root, "rust/Cargo.toml"),
        `[workspace]\nmembers = ${JSON.stringify(names)}\n[workspace.package]\nversion = "1.2.2"\n`,
      ),
      ...names.flatMap((name) => [
        Bun.write(
          join(root, `rust/${name}/Cargo.toml`),
          `[package]\nname = "${name}"\nversion.workspace = true\n`,
        ),
        Bun.write(join(root, `rust/${name}/src/lib.rs`), ""),
      ]),
    ]);
    const result = await preflightRelease(root, undefined, true);
    expect(result.version).toBe("1.2.3");
    await checkReleaseVersion(root, "1.2.3");
    await Bun.write(join(root, "rust/Cargo.lock"), "version = 4\npackage = []\n");
    await preflightRelease(root, undefined, true);
    await checkReleaseVersion(root, "1.2.3");
    await Bun.write(join(root, "package.json"), JSON.stringify({ name: "test", version: "1.2.4" }));
    await rejects(preflightRelease(root, undefined, true), /exactly one/);
    await checkReleaseVersion(root, "1.2.3");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
