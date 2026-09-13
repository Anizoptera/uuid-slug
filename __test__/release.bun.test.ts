import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "bun:test";
import { rejects } from "node:assert/strict";
import { inspectArtifact } from "../scripts/check-artifact";
import { tagReleaseFixture } from "./release-fixture";
import { releaseNotes } from "../scripts/release-notes";
import { verifyIntegrity } from "../scripts/registry-integrity";

async function rustReleaseFixture(root: string, version: string): Promise<void> {
  await Bun.write(
    join(root, "rust/Cargo.toml"),
    `[workspace]\nmembers = ["uuid-slug", "bridge"]\n[workspace.package]\nversion = "${version}"\n`,
  );
  await Bun.write(
    join(root, "rust/Cargo.lock"),
    `version = 4\n[[package]]\nname = "uuid-slug"\nversion = "${version}"\n[[package]]\nname = "uuid-slug-bridge"\nversion = "${version}"\n`,
  );
}

const body = "\r\n\r\n- Keep bytes.\r\n\r\n```md\r\n## [9.0.0]\r\n```\r\n\r\n";
test("preserves body bytes and ignores headings inside fences", () => {
  expect(
    releaseNotes(`## [1.2.3](https://example.test) - date${body}## [1.2.2]\nold`, "1.2.3"),
  ).toBe(body);
});
for (const source of [
  "```md\n## [1.2.3]\n- fake\n```",
  "## [1.2.30]\n- wrong",
  "## [1.2.3]\n\n",
  "## [1.2.3]\n<!-- draft -->\n### Fixed\n",
  "## [1.2.3]\n- a\n## [1.2.3]\n- b\n",
]) {
  test(`refuses unusable notes: ${JSON.stringify(source)}`, () =>
    expect(() => releaseNotes(source, "1.2.3")).toThrow());
}
test("local and CI preflight process reject a missing section or mismatched tag", async () => {
  const root = await mkdtemp(join(tmpdir(), "uuid-slug-release-"));
  try {
    await Bun.write(join(root, "package.json"), JSON.stringify({ name: "test", version: "1.2.3" }));
    await Bun.write(join(root, "CHANGELOG.md"), "## [1.2.3]\n- Change.\n");
    await rustReleaseFixture(root, "1.2.3");
    await tagReleaseFixture(root, "1.2.3");
    const run = async (tag: string) => {
      const child = Bun.spawn(["bun", join(import.meta.dir, "../scripts/release-notes.ts"), tag], {
        cwd: root,
        stdout: "pipe",
        stderr: "pipe",
      });
      const [status, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ]);
      return { status, stdout, stderr };
    };
    expect(await run("v1.2.3")).toEqual({ status: 0, stdout: "\n- Change.\n", stderr: "" });
    const mismatch = await run("v1.2.4");
    expect(mismatch.status).toBe(1);
    expect(mismatch.stderr).toContain("does not match");
    await rustReleaseFixture(root, "1.2.2");
    expect((await run("v1.2.3")).stderr).toContain("Rust version");
    await rustReleaseFixture(root, "1.2.3");
    await Bun.write(join(root, "rust/Cargo.lock"), "version = 4\npackage = []\n");
    expect((await run("v1.2.3")).stderr).toContain("Cargo.lock");
    await Bun.write(join(root, "CHANGELOG.md"), "## [1.2.2]\n- Old.\n");
    expect((await run("v1.2.3")).status).toBe(1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("registry retries accept identical bytes and reject changed or unknown digests", () => {
  const bytes = new TextEncoder().encode("published archive");
  const integrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
  verifyIntegrity(bytes, integrity);
  expect(() => verifyIntegrity(new TextEncoder().encode("repacked"), integrity)).toThrow("differs");
  expect(() => verifyIntegrity(bytes, "sha1-unknown")).toThrow("differs");
});
test("artifact validation rejects a credential-bearing repack before publication", async () => {
  const root = await mkdtemp(join(tmpdir(), "uuid-slug-identity-"));
  const expected = join(root, "reviewed.tgz");
  const actual = join(root, "repacked.tgz");
  try {
    await Promise.all([Bun.write(expected, "reviewed"), Bun.write(actual, "different")]);
    process.env.UUID_SLUG_EXPECTED_ARCHIVE = expected;
    await rejects(inspectArtifact(actual), /credentials-free reviewed archive/);
    await Bun.write(actual, "reviewed");
    await inspectArtifact(actual);
  } finally {
    delete process.env.UUID_SLUG_EXPECTED_ARCHIVE;
    await rm(root, { recursive: true, force: true });
  }
});
