// Exercise the real index: untracked output is allowed; staged archives or ignored files fail.
import { expect, test } from "bun:test";
import { copyFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { command } from "../command";

const artifactPaths = ["evidence.GZ", "evidence.crate", ".omc/session.json"];
test.each(artifactPaths)("artifact policy checks the index for %s", async (name) => {
  const root = await mkdtemp(join(tmpdir(), "uuid-slug-archive-policy-"));
  try {
    await command("git", ["init", "--quiet"], root);
    await copyFile(resolve(import.meta.dir, "../../.gitignore"), join(root, ".gitignore"));
    await Bun.write(join(root, "README.md"), "Source documentation\n");
    await Bun.write(
      join(root, name),
      name.endsWith(".GZ")
        ? gzipSync("raw evidence")
        : name.endsWith(".crate")
          ? new Bun.Archive({ "data.txt": "raw evidence" })
          : '{"session":"temporary"}',
    );
    await command("git", ["add", "README.md"], root);
    const check = async () => {
      const child = Bun.spawn(
        [process.execPath, resolve(import.meta.dir, "../check-archives.ts")],
        {
          cwd: root,
          // A parent hook's temporary index must not bind this isolated repository.
          env: Object.fromEntries(
            Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")),
          ),
          stdout: "pipe",
          stderr: "pipe",
        },
      );
      const [output, diagnostic, status] = await Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited,
      ]);
      return { output, diagnostic, status };
    };
    expect((await check()).status).toBe(0);
    await command("git", ["add", "--force", name], root);
    const rejected = await check();
    expect(rejected.status).toBe(1);
    expect(rejected.diagnostic).toContain(name);
    expect(rejected.diagnostic).toContain("git rm --cached");
    await command("git", ["rm", "--cached", name], root);
    expect((await check()).status).toBe(0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
