// Reject release candidates whose versions, notes, or Git tags do not identify the checked commit.
import { rejects } from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, test } from "bun:test";
import { command } from "../command";
import { preflightRelease } from "../release-notes";
import { releaseSelection } from "../release-selection";
import { checkReleaseVersion, setDevelopmentVersion } from "../release-version";

test("release publication defaults to both packages and rejects invalid selections", () => {
  expect(releaseSelection(undefined)).toBe("both");
  expect(releaseSelection("both")).toBe("both");
  expect(releaseSelection("npm")).toBe("npm");
  expect(releaseSelection("crate")).toBe("crate");
  expect(() => releaseSelection("other")).toThrow("both, npm, crate");
});

test("one command updates every development version owner", async () => {
  const root = await mkdtemp(join(tmpdir(), "uuid-slug-version-set-"));
  const names = ["uuid-slug", "uuid-slug-bridge"];
  try {
    await Promise.all([
      Bun.write(
        join(root, ".tool-versions"),
        Bun.file(join(import.meta.dir, "../../.tool-versions")),
      ),
      Bun.write(join(root, "package.json"), '{\n  "name": "test",\n  "version": "0.4.1-dev"\n}\n'),
      Bun.write(
        join(root, "rust/Cargo.toml"),
        `[workspace]\nmembers = ${JSON.stringify(names)}\n[workspace.package]\nversion = "0.4.1-dev"\n`,
      ),
      Bun.write(
        join(root, "rust/Cargo.lock"),
        'version = 4\n\n[[package]]\nname = "uuid-slug"\nversion = "0.4.1-dev"\n\n[[package]]\nname = "uuid-slug-bridge"\nversion = "0.4.1-dev"\n',
      ),
      Bun.write(
        join(root, "bench/rust-competitors/Cargo.toml"),
        '[package]\nname = "version-consumer"\nversion = "0.0.0"\n[dependencies]\nuuid-slug = { path = "../../rust/uuid-slug" }\n[workspace]\n',
      ),
      Bun.write(join(root, "bench/rust-competitors/src/main.rs"), "fn main() {}"),
      ...names.flatMap((name) => [
        Bun.write(
          join(root, `rust/${name}/Cargo.toml`),
          `[package]\nname = "${name}"\nversion.workspace = true\n`,
        ),
        Bun.write(join(root, `rust/${name}/src/lib.rs`), ""),
      ]),
    ]);

    await command(
      "cargo",
      ["generate-lockfile", "--manifest-path", "bench/rust-competitors/Cargo.toml", "--offline"],
      root,
    );

    await setDevelopmentVersion(root, "0.4.0-dev");
    expect((await Bun.file(join(root, "package.json")).json()).version).toBe("0.4.0-dev");
    await checkReleaseVersion(root, "0.4.0-dev");
    await command(
      "cargo",
      [
        "metadata",
        "--manifest-path",
        "bench/rust-competitors/Cargo.toml",
        "--locked",
        "--offline",
        "--format-version",
        "1",
      ],
      root,
    );

    for (const [path, error] of [
      ["rust/Cargo.toml", /Rust version 0\.4\.1-dev does not match.*version:set/s],
      ["rust/Cargo.lock", /Cargo\.lock uuid-slug does not match.*version:set/s],
    ] as const) {
      const source = await Bun.file(join(root, path)).text();
      await Bun.write(
        join(root, path),
        source.replace('version = "0.4.0-dev"', 'version = "0.4.1-dev"'),
      );
      await rejects(checkReleaseVersion(root, "0.4.0-dev"), error);
      await Bun.write(join(root, path), source);
    }

    const versionPaths = [
      "package.json",
      "rust/Cargo.toml",
      "rust/Cargo.lock",
      "bench/rust-competitors/Cargo.lock",
    ];
    const before = await Promise.all(versionPaths.map((path) => Bun.file(join(root, path)).text()));
    await rejects(
      setDevelopmentVersion(root, "0.5.0"),
      /version:set accepts only.*version:set <X\.Y\.Z-dev>.*bun run release <X\.Y\.Z>/s,
    );
    const after = await Promise.all(versionPaths.map((path) => Bun.file(join(root, path)).text()));
    expect(after).toEqual(before);

    const benchmarkManifest = Bun.file(join(root, "bench/rust-competitors/Cargo.toml"));
    const benchmarkText = await benchmarkManifest.text();
    await Bun.write(benchmarkManifest, "invalid");
    await rejects(setDevelopmentVersion(root, "0.4.2-dev"), /synchronize the release lockfile/);
    expect(
      await Promise.all(versionPaths.map((path) => Bun.file(join(root, path)).text())),
    ).toEqual(before);
    await Bun.write(benchmarkManifest, benchmarkText);

    await Bun.write(join(root, "rust/uuid-slug/Cargo.toml"), "invalid");
    await rejects(setDevelopmentVersion(root, "0.4.2-dev"), /synchronize the release lockfile/);
    const restored = await Promise.all(
      versionPaths.map((path) => Bun.file(join(root, path)).text()),
    );
    expect(restored).toEqual(before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the version hook synchronizes Cargo and rejects missing notes before mutation", async () => {
  const root = await mkdtemp(join(tmpdir(), "uuid-slug-version-"));
  const names = ["uuid-slug", "uuid-slug-bridge"];
  try {
    await Promise.all([
      Bun.write(
        join(root, ".tool-versions"),
        Bun.file(join(import.meta.dir, "../../.tool-versions")),
      ),
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
    const git = (args: string[]) =>
      command(
        "git",
        [
          "-c",
          "user.name=Release test",
          "-c",
          "user.email=test@example.invalid",
          "-c",
          "tag.gpgsign=false",
          ...args,
        ],
        root,
      );
    await git(["init"]);
    expect(resolve(root, (await git(["rev-parse", "--git-path", "index"])).trim())).toBe(
      join(root, ".git/index"),
    );
    await git(["add", "."]);
    await git(["-c", "commit.gpgsign=false", "commit", "-m", "Release fixture"]);
    await git(["tag", "v1.2.3"]);
    await rejects(preflightRelease(root, "v1.2.3"), /annotated/);
    await git(["tag", "-d", "v1.2.3"]);
    await git(["tag", "-a", "v1.2.3", "-m", "Release fixture"]);
    expect((await preflightRelease(root, "v1.2.3")).version).toBe("1.2.3");
    await git(["-c", "commit.gpgsign=false", "commit", "--allow-empty", "-m", "Different commit"]);
    await rejects(preflightRelease(root, "v1.2.3"), /HEAD/);
    await Bun.write(join(root, "package.json"), JSON.stringify({ name: "test", version: "1.2.4" }));
    await rejects(preflightRelease(root, undefined, true), /exactly one/);
    await checkReleaseVersion(root, "1.2.3");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
