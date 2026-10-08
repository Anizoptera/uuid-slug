import { expect, test } from "bun:test";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");

test("removes API work files when extraction fails", async () => {
  const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-api-cleanup-"));
  try {
    const child = Bun.spawn([process.execPath, "scripts/api.ts", "check", "--built"], {
      cwd: root,
      env: { ...process.env, PATH: "", TMPDIR: scratch },
      stdout: "ignore",
      stderr: "ignore",
    });

    expect(await child.exited).not.toBe(0);
    expect(await readdir(scratch)).toEqual([]);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});
