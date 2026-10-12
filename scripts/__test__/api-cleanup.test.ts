import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const DESCENDANT_READY = "extraction-ready";
const DESCENDANT_LATE_WRITE = "late-write";

test("runner interruption stops Node descendants before scratch cleanup", async () => {
  const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-api-cleanup-"));
  const files = join(scratch, "files");
  try {
    await mkdir(files);
    const fixture = join(scratch, "descendant.test.ts");
    const worker = [
      'const fs = require("node:fs"); const path = require("node:path");',
      'const work = path.join(process.env.TMPDIR, "extraction");',
      'fs.mkdirSync(work, { recursive: true }); fs.writeFileSync(path.join(work, "typescript.d.ts"), "ready");',
      `console.log(${JSON.stringify(DESCENDANT_READY)});`,
      `process.stdin.on("end", () => { fs.mkdirSync(work, { recursive: true }); fs.writeFileSync(path.join(work, "typescript.d.ts"), "late"); console.log(${JSON.stringify(DESCENDANT_LATE_WRITE)}); });`,
      "process.stdin.resume();",
    ].join("\n");
    await writeFile(
      fixture,
      [
        'import { test } from "bun:test";',
        'import { spawn } from "node:child_process";',
        `test("extraction", async () => { const child = spawn("node", ["-e", ${JSON.stringify(worker)}], { stdio: ["pipe", "inherit", "inherit"] }); await new Promise(resolve => child.on("close", resolve)); });`,
      ].join("\n"),
    );
    const child = Bun.spawn([process.execPath, "scripts/test-bun.ts", fixture], {
      cwd: root,
      env: { ...process.env, TMPDIR: files },
      stdout: "pipe",
      stderr: "ignore",
      timeout: 2000,
    });
    try {
      const reader = child.stdout.getReader();
      let output = "";
      while (!output.split("\n").slice(0, -1).includes(DESCENDANT_READY)) {
        const chunk = await reader.read();
        if (chunk.done) throw new Error("Extraction descendant exited before readiness.");
        output += new TextDecoder().decode(chunk.value);
      }
      child.kill("SIGINT");
      // EOF witnesses descendant termination too: it inherited this pipe from its Bun parent.
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        output += new TextDecoder().decode(chunk.value);
      }
      expect(await child.exited).not.toBe(0);
      expect(output).not.toContain(DESCENDANT_LATE_WRITE);
      expect(await readdir(files)).toEqual([]);
    } finally {
      child.kill();
      await child.exited;
    }
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

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
