import { afterEach, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rejects } from "node:assert/strict";
import type { ReleaseInputs } from "./release-inputs";
import { finalizeRelease } from "./release-finalize";
import { tagReleaseFixture } from "../test/release-fixture";

const directories: string[] = [];
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const sha512 = (bytes: Uint8Array) => createHash("sha512").update(bytes).digest("base64");

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

test("finalization repairs only missing release state and refuses different retained bytes", async () => {
  const root = await mkdtemp(join(tmpdir(), "uuid-slug-finalize-"));
  directories.push(root);
  const npmBytes = new TextEncoder().encode("npm archive");
  const crateBytes = new TextEncoder().encode("crate archive");
  const npmFile = "release-artifacts/reviewed-npm/package.tgz";
  const crateFile = "rust/target/reviewed-crate/package.crate";
  const notes = "\n\nRelease notes\n\n## Previous release: v0.3.0\n";
  await Promise.all([
    Bun.write(
      join(root, "package.json"),
      JSON.stringify({ name: "@anizoptera/uuid-slug", version: "0.4.0" }),
    ),
    Bun.write(join(root, "CHANGELOG.md"), "## [0.4.0]\n\nRelease notes\n"),
    Bun.write(join(root, "rust/Cargo.toml"), '[workspace.package]\nversion = "0.4.0"\n'),
    Bun.write(
      join(root, "rust/Cargo.lock"),
      'version = 4\n[[package]]\nname = "uuid-slug"\nversion = "0.4.0"\n[[package]]\nname = "uuid-slug-bridge"\nversion = "0.4.0"\n',
    ),
  ]);
  const commit = await tagReleaseFixture(root, "0.4.0");
  const inputs: ReleaseInputs = {
    name: "@anizoptera/uuid-slug",
    version: "0.4.0",
    tag: "v0.4.0",
    commit,
    candidate: {
      npm: { file: npmFile, integrity: `sha512-${sha512(npmBytes)}` },
      crate: { file: crateFile, integrity: `sha256-${sha256(crateBytes)}` },
    },
    comparisons: [],
  };
  await Promise.all([
    Bun.write(join(root, npmFile), npmBytes),
    Bun.write(join(root, crateFile), crateBytes),
    Bun.write(join(root, "release-artifacts/history/release-inputs.json"), JSON.stringify(inputs)),
    Bun.write(join(root, "release-artifacts/notes.md"), notes),
  ]);

  let releaseExists = false;
  let draft = true;
  let body: string | null = null;
  let npmPublished = false;
  let cratePublished = false;
  let retainNotes = true;
  let corruptFinal: "draft" | "notes" | "asset" | undefined;
  let pendingFinal = false;
  const assets = new Map<string, string>();
  const mutations: string[] = [];
  const server: Bun.Server<undefined> = Bun.serve({
    port: 0,
    async fetch(request): Promise<Response> {
      const url = new URL(request.url);
      if (url.pathname === "/npm/%40anizoptera%2Fuuid-slug/0.4.0")
        return npmPublished
          ? Response.json({ dist: { integrity: `sha512-${sha512(npmBytes)}` } })
          : new Response(null, { status: 404 });
      if (url.pathname === "/api/v1/crates/uuid-slug/0.4.0")
        return cratePublished
          ? Response.json({ version: { checksum: sha256(crateBytes) } })
          : new Response(null, { status: 404 });
      if (url.pathname === "/repos/owner/repo/releases/tags/v0.4.0") {
        if (!releaseExists) return new Response(null, { status: 404 });
        if (pendingFinal) {
          if (corruptFinal === "draft") draft = true;
          if (corruptFinal === "notes") body = "lost notes";
          if (corruptFinal === "asset") assets.delete("package.tgz");
          pendingFinal = false;
        }
        return Response.json({
          id: 1,
          draft,
          body,
          upload_url: `${server.url}uploads/1{?name}`,
          assets: [...assets].map(([name, digest]) => ({ name, digest })),
        });
      }
      if (url.pathname === "/repos/owner/repo/releases" && request.method === "POST") {
        releaseExists = true;
        body = ((await request.json()) as { body: string }).body;
        mutations.push("create");
      } else if (url.pathname === "/repos/owner/repo/releases/1" && request.method === "PATCH") {
        const patch = (await request.json()) as { body?: string; draft?: boolean };
        if (patch.body !== undefined && retainNotes) body = patch.body;
        if (patch.draft !== undefined) draft = patch.draft;
        pendingFinal = patch.draft === false;
        mutations.push(patch.draft === false ? "finalize" : "repair-notes");
      } else if (url.pathname === "/uploads/1" && request.method === "POST") {
        const name = url.searchParams.get("name");
        if (!name) return new Response(null, { status: 400 });
        assets.set(name, `sha256:${sha256(new Uint8Array(await request.arrayBuffer()))}`);
        mutations.push(`upload:${name}`);
      } else return new Response(null, { status: 404 });
      return Response.json({
        id: 1,
        draft,
        body,
        upload_url: `${server.url}uploads/1{?name}`,
        assets: [...assets].map(([name, digest]) => ({ name, digest })),
      });
    },
  });

  const options = {
    repository: "owner/repo",
    token: "test",
    githubApi: server.url.href.slice(0, -1),
    npmRegistry: `${server.url}npm`,
    cratesRegistry: server.url.href.slice(0, -1),
  };
  try {
    await Bun.write(
      join(root, "release-artifacts/history/release-inputs.json"),
      JSON.stringify({ ...inputs, commit: "different commit" }),
    );
    await rejects(finalizeRelease(root, options), /checked package and commit/);
    await Bun.write(
      join(root, "release-artifacts/history/release-inputs.json"),
      JSON.stringify(inputs),
    );
    await Bun.write(join(root, "release-artifacts/notes.md"), notes.replace("Release", "Changed"));
    await rejects(finalizeRelease(root, options), /notes differ from the changelog/);
    await Bun.write(join(root, "release-artifacts/notes.md"), notes);
    await rejects(finalizeRelease(root, options), /Both registries/);
    npmPublished = true;
    await rejects(finalizeRelease(root, options), /Both registries/);
    expect(mutations).toEqual([]);

    cratePublished = true;
    await finalizeRelease(root, options);
    expect(mutations).toEqual(["create", "upload:package.tgz", "upload:package.crate", "finalize"]);
    expect(draft).toBe(false);

    mutations.length = 0;
    await finalizeRelease(root, options);
    expect(mutations).toEqual([]);

    for (const corruption of ["draft", "notes", "asset"] as const) {
      draft = true;
      body = notes;
      assets.set("package.tgz", `sha256:${sha256(npmBytes)}`);
      corruptFinal = corruption;
      await rejects(finalizeRelease(root, options), /Final release/);
    }
    corruptFinal = undefined;
    assets.set("package.tgz", `sha256:${sha256(npmBytes)}`);
    mutations.length = 0;
    draft = true;
    body = "stale notes";
    retainNotes = false;
    await rejects(finalizeRelease(root, options), /did not retain the generated notes/);
    expect(mutations).toEqual(["repair-notes"]);

    mutations.length = 0;
    retainNotes = true;
    draft = true;
    body = notes;
    assets.set("package.tgz", `sha256:${"0".repeat(64)}`);
    await rejects(finalizeRelease(root, options), /differs from retained bytes/);
    expect(mutations).toEqual([]);
  } finally {
    await server.stop(true);
  }
});
