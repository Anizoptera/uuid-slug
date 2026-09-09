import { describe, expect, test } from "bun:test";
import { rejects } from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
