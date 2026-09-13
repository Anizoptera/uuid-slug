import { expect, test } from "bun:test";
import { rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const work = join(root, ".api-work");

test("removes API work files when extraction fails", async () => {
  await rm(work, { recursive: true, force: true });
  const child = Bun.spawn([process.execPath, "scripts/api.ts", "check", "--built"], {
    cwd: root,
    env: { ...process.env, PATH: "" },
    stdout: "ignore",
    stderr: "ignore",
  });

  expect(await child.exited).not.toBe(0);
  const error = await stat(work).then(
    () => undefined,
    (reason: NodeJS.ErrnoException) => reason,
  );
  expect(error?.code).toBe("ENOENT");
});
