import { describe, expect, test } from "bun:test";
import { rejects } from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { tagReleaseFixture } from "../../__test__/release-fixture";
import { command } from "../command";
import { collectReleaseInputs } from "../release-inputs";
import { readRetainedArchive, registryVersion } from "../release-inputs";
import { releaseComparisons } from "../release-history";

test("retained archive consumers reject changed bytes and unsupported digests", async () => {
  const root = await mkdtemp(join(tmpdir(), "uuid-slug-retained-"));
  try {
    for (const algorithm of ["sha256", "sha512"] as const) {
      await Bun.write(join(root, "archive"), "reviewed bytes");
      const archive = {
        file: "archive",
        integrity: `${algorithm}-${createHash(algorithm)
          .update("reviewed bytes")
          .digest(algorithm === "sha512" ? "base64" : "hex")}`,
      };
      expect(new TextDecoder().decode(await readRetainedArchive(root, archive))).toBe(
        "reviewed bytes",
      );
      await rejects(
        readRetainedArchive(root, { ...archive, integrity: `${archive.integrity}-extra` }),
        /differs from release inputs/,
      );
      await Bun.write(join(root, "archive"), "changed bytes");
      await rejects(readRetainedArchive(root, archive), /differs from release inputs/);
    }
    await rejects(
      readRetainedArchive(root, { file: "archive", integrity: "sha1-value" }),
      /unsupported/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("input retries preserve their comparison basis and reject changed candidate bytes", async () => {
  const root = await mkdtemp(join(tmpdir(), "uuid-slug-input-retry-"));
  try {
    await Promise.all([
      Bun.write(join(root, "package.json"), JSON.stringify({ name: "test", version: "1.2.3" })),
      Bun.write(join(root, "CHANGELOG.md"), "## [1.2.3]\n- Change.\n"),
      Bun.write(join(root, "rust/Cargo.toml"), '[workspace.package]\nversion = "1.2.3"\n'),
      Bun.write(
        join(root, "rust/Cargo.lock"),
        'version = 4\n[[package]]\nname = "uuid-slug"\nversion = "1.2.3"\n[[package]]\nname = "uuid-slug-bridge"\nversion = "1.2.3"\n',
      ),
    ]);
    await tagReleaseFixture(root, "1.2.3");
    const candidate = { npm: "candidate.tgz", crate: "candidate.crate" };
    await Promise.all([
      Bun.write(join(root, candidate.npm), "npm bytes"),
      Bun.write(join(root, candidate.crate), "crate bytes"),
    ]);
    const commit = (await command("git", ["rev-list", "-n", "1", "v1.2.3"], root)).trim();
    const initial = {
      name: "test",
      version: "1.2.3",
      tag: "v1.2.3",
      commit,
      candidate: {
        npm: {
          file: candidate.npm,
          integrity: `sha512-${createHash("sha512").update("npm bytes").digest("base64")}`,
        },
        crate: {
          file: candidate.crate,
          integrity: `sha256-${createHash("sha256").update("crate bytes").digest("hex")}`,
        },
      },
      comparisons: [],
    } as const;
    const record = join(root, "history/release-inputs.json");
    await Bun.write(record, JSON.stringify(initial));
    const collect = () => collectReleaseInputs(root, "v1.2.3", join(root, "history"), candidate);
    expect(await collect()).toEqual(initial);
    await command(
      "git",
      ["-c", "tag.gpgsign=false", "tag", "-a", "v1.2.2", "-m", "Historical release"],
      root,
    );
    expect(await releaseComparisons(root, "v1.2.3")).toEqual({ immediate: "v1.2.2" });
    expect(await collect()).toEqual(initial);
    await Bun.write(record, JSON.stringify({ ...initial, commit: "different commit" }));
    await rejects(collect(), /different package, version, tag, or commit/);
    await Bun.write(record, JSON.stringify(initial));
    await Bun.write(join(root, candidate.npm), "different npm bytes");
    await rejects(collect(), /differs from release inputs/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

describe("release registry history", () => {
  test("distinguishes first publication from missing selected history", () => {
    expect(registryVersion({ versions: new Map() }, "0.3.0", "npm")).toBeUndefined();
    expect(() =>
      registryVersion({ versions: new Map([["0.2.0", "bytes"]]) }, "0.3.0", "npm"),
    ).toThrow("Git and registry history disagree");
  });
});
