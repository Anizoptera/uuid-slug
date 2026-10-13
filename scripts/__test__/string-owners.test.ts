import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test.each([
  ['type Code = "invalid_buffer"; if (typeof value === "string") console.log(value);', false],
  ['const code = "invalid_buffer";', true],
  ["const code = `invalid_buffer`;", true],
  ['const first = "local diagnosis"; const second = `local diagnosis`;', true],
] as const)("runtime string ownership: %s", async (source, rejected) => {
  const root = await mkdtemp(join(tmpdir(), "uuid-slug-string-owners-"));
  try {
    await Bun.write(join(root, "src/consumer.ts"), source);
    const child = Bun.spawn(
      [process.execPath, join(import.meta.dir, "../check-string-owners.ts")],
      {
        cwd: root,
        stdout: "ignore",
        stderr: "pipe",
      },
    );
    const [status, diagnostic] = await Promise.all([
      child.exited,
      new Response(child.stderr).text(),
    ]);
    expect(status).toBe(rejected ? 1 : 0);
    if (rejected) expect(diagnostic).toContain("semantic owners");
    else expect(diagnostic).toBe("");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
