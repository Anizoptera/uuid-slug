import { expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");

test("removes API work files when extraction fails", async () => {
  const modules = join(root, "node_modules");
  const child = Bun.spawn([process.execPath, "scripts/api.ts", "check", "--built"], {
    cwd: root,
    env: { ...process.env, PATH: "" },
    stdout: "ignore",
    stderr: "ignore",
  });

  expect(await child.exited).not.toBe(0);
  expect(
    (await readdir(modules)).filter((name) => name.startsWith(`.uuid-slug-api-${child.pid}-`)),
  ).toEqual([]);
});
