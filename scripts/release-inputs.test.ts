import { describe, expect, test } from "bun:test";
import { rejects } from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { tagReleaseFixture } from "../test/release-fixture";
import { collectReleaseInputs } from "./release-inputs";
import { crateHistory, npmHistory, readRetainedArchive, registryVersion } from "./release-inputs";

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
  let reads = 0;
  let published = false;
  const server = Bun.serve({
    port: 0,
    fetch(request) {
      reads++;
      if (published && new URL(request.url).pathname.startsWith("/npm/"))
        return Response.json({
          versions: {
            "1.2.3": {
              dist: { integrity: "sha512-value", tarball: "https://example.invalid/archive" },
            },
          },
        });
      return Response.json({
        versions: new URL(request.url).pathname.startsWith("/npm/") ? {} : [],
      });
    },
  });
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
    const collect = () =>
      collectReleaseInputs(
        root,
        "v1.2.3",
        join(root, "history"),
        `${server.url}npm`,
        server.url.origin,
        candidate,
      );
    const initial = await collect();
    const initialReads = reads;
    published = true;
    expect(initialReads).toBeGreaterThan(0);
    expect(await collect()).toEqual(initial);
    expect(reads).toBe(initialReads);
    const record = join(root, "history/release-inputs.json");
    await Bun.write(record, JSON.stringify({ ...initial, commit: "different commit" }));
    await rejects(collect(), /different package, version, tag, or commit/);
    await Bun.write(record, JSON.stringify(initial));
    await Bun.write(join(root, candidate.npm), "different npm bytes");
    await rejects(collect(), /differs from release inputs/);
    expect(reads).toBe(initialReads);
    await rm(record);
    await rejects(collect(), /published candidate has no retained release inputs/);
  } finally {
    await server.stop(true);
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

  test("reads each registry version index and rejects incomplete entries", async () => {
    let origin = "";
    const server: Bun.Server<undefined> = Bun.serve({
      port: 0,
      fetch(request): Response {
        const path = new URL(request.url).pathname;
        if (path === "/npm/missing" || path === "/crates/api/v1/crates/missing")
          return new Response(null, { status: 404 });
        if (path === "/npm/broken") return Response.json({ versions: { "1.0.0": { dist: {} } } });
        if (path === "/crates/api/v1/crates/broken")
          return Response.json({ versions: [{ num: "1.0.0", checksum: "bad" }] });
        if (path === "/npm/pkg")
          return Response.json({
            versions: {
              "1.0.0": {
                dist: { integrity: "sha512-value", tarball: `${origin}npm/archive` },
              },
            },
          });
        return Response.json({
          versions: [{ num: "1.0.0", checksum: "a".repeat(64), dl_path: "/crate/archive" }],
        });
      },
    });
    origin = server.url.href;
    try {
      expect((await npmHistory(`${server.url}npm`, "missing")).versions.size).toBe(0);
      expect((await crateHistory(`${server.url}crates`, "missing")).versions.size).toBe(0);
      expect((await npmHistory(`${server.url}npm`, "pkg")).versions.get("1.0.0")).toEqual({
        integrity: "sha512-value",
        tarball: `${server.url}npm/archive`,
      });
      expect((await crateHistory(`${server.url}crates`, "pkg")).versions.get("1.0.0")).toEqual({
        checksum: "a".repeat(64),
        download: `${server.url}crate/archive`,
      });
      await rejects(npmHistory(`${server.url}npm`, "broken"), /integrity/);
      await rejects(crateHistory(`${server.url}crates`, "broken"), /checksum/);
    } finally {
      await server.stop(true);
    }
  });
});
