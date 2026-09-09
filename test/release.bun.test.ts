import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "bun:test";
import { rejects } from "node:assert/strict";
import { inspectArtifact } from "../scripts/check-artifact";
import { command } from "../scripts/command";
import { releaseNotes } from "../scripts/release-notes";
import { registryIntegrity, verifyIntegrity } from "../scripts/registry-integrity";

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

async function tagReleaseFixture(root: string, version: string): Promise<void> {
  const git = (args: string[]) => command("git", args, root);
  await git(["init"]);
  await git(["config", "user.name", "Release test"]);
  await git(["config", "user.email", "test@example.invalid"]);
  await git(["add", "."]);
  await git(["-c", "commit.gpgsign=false", "commit", "-m", "Release fixture"]);
  await git(["-c", "tag.gpgsign=false", "tag", "-a", `v${version}`, "-m", "Release fixture"]);
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
  } finally {
    delete process.env.UUID_SLUG_EXPECTED_ARCHIVE;
    await rm(root, { recursive: true, force: true });
  }
});
test("registry transport distinguishes absence, outage and malformed metadata", async () => {
  const server = Bun.serve({
    port: 0,
    fetch(request) {
      switch (new URL(request.url).pathname) {
        case "/missing":
          return new Response(null, { status: 404 });
        case "/outage":
          return new Response(null, { status: 503 });
        case "/invalid":
          return Response.json({ dist: {} });
        default:
          return Response.json({ dist: { integrity: "sha512-published" } });
      }
    },
  });
  try {
    expect(await registryIntegrity(new URL("/missing", server.url).href)).toBeUndefined();
    expect(await registryIntegrity(server.url.href)).toBe("sha512-published");
    await rejects(registryIntegrity(new URL("/outage", server.url).href), /503/);
    await rejects(registryIntegrity(new URL("/invalid", server.url).href), /integrity/);
  } finally {
    await server.stop(true);
  }
});

// A real child process stands in for the uploader, so failure and argv propagation cross
// the same boundary as CI without contacting or publishing to a real registry.
test("release process prepares without credentials and repairs only a missing npm version", async () => {
  const { releasePackage } = await import("../scripts/release-package");
  const root = await mkdtemp(join(tmpdir(), "uuid-slug-publish-"));
  const bytes = new TextEncoder().encode("published archive");
  const digest = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
  let integrity = digest;
  let unpublished = false;
  const server = Bun.serve({
    port: 0,
    fetch: () => {
      if (unpublished) {
        unpublished = false;
        return new Response(null, { status: 404 });
      }
      return Response.json({ dist: { integrity } });
    },
  });
  try {
    await Bun.write(
      join(root, "package.json"),
      JSON.stringify({ name: "test", version: "1.2.3-rc.1" }),
    );
    await Bun.write(join(root, "CHANGELOG.md"), "## [1.2.3-rc.1]\n- Change.\n");
    await rustReleaseFixture(root, "1.2.3-rc.1");
    await tagReleaseFixture(root, "1.2.3-rc.1");
    await Bun.write(
      join(root, "node_modules/.bin/publish-clean"),
      `
      await Bun.write("invoked.json", JSON.stringify(process.argv.slice(2)));
      const out = process.argv[process.argv.indexOf("--tarball-out") + 1];
      await Bun.write(out + "/archive.tgz", "published archive");
    `,
    );
    await rejects(releasePackage(root, "v9.0.0", "prepare", server.url.origin), /does not match/);
    expect(await Bun.file(join(root, "invoked.json")).exists()).toBe(false);
    await releasePackage(root, "v1.2.3-rc.1", "prepare", server.url.origin);
    const args = await Bun.file(join(root, "invoked.json")).json();
    expect(args).toContain("--dry-run");
    expect(args.slice(-5)).toEqual(["--access", "public", "--tag", "next", "--provenance"]);
    await releasePackage(root, "v1.2.3-rc.1", "publish", server.url.origin);
    await rm(join(root, "release-artifacts"), { recursive: true });
    await releasePackage(root, "v1.2.3-rc.1", "prepare", server.url.origin);
    unpublished = true;
    await releasePackage(root, "v1.2.3-rc.1", "publish", server.url.origin);
    expect(await Bun.file(join(root, "invoked.json")).json()).not.toContain("--dry-run");
    await rm(join(root, "release-artifacts"), { recursive: true });
    await releasePackage(root, "v1.2.3-rc.1", "prepare", server.url.origin);
    integrity = "sha512-different";
    await rejects(releasePackage(root, "v1.2.3-rc.1", "publish", server.url.origin), /differs/);
    expect(await Bun.file(join(root, "release-artifacts/published-npm")).exists()).toBe(false);
    await rm(join(root, "release-artifacts"), { recursive: true });
    await releasePackage(root, "v1.2.3-rc.1", "prepare", server.url.origin);
    integrity = digest;
    await Bun.write(join(root, "node_modules/.bin/publish-clean"), "process.exit(9);");
    unpublished = true;
    await rejects(
      releasePackage(root, "v1.2.3-rc.1", "publish", server.url.origin),
      /Command failed/,
    );
  } finally {
    await server.stop(true);
    await rm(root, { recursive: true, force: true });
  }
});
