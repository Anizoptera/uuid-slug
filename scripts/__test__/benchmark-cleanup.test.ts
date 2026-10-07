import { expect, test } from "bun:test";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { command } from "../command";

const project = resolve(import.meta.dir, "../..");

test("failed comparisons preserve diagnostics without leaving temporary checkouts", async () => {
  const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-cleanup-"));
  let archive: string | undefined;
  try {
    // A valid baseline followed by an invalid candidate fails before measurement but leaves
    // real source to preserve. Isolated TMPDIR makes this proof independent of other jobs.
    const child = Bun.spawn(
      [process.execPath, "bench/compare.ts", "HEAD", "refs/invalid/cleanup"],
      {
        cwd: project,
        env: { ...process.env, TMPDIR: scratch, UUID_SLUG_COMPARE_RUNTIMES: "bun" },
        stdout: "ignore",
        stderr: "pipe",
      },
    );
    const [stderr, exitCode] = await Promise.all([new Response(child.stderr).text(), child.exited]);
    archive = /artifacts are in (.+\.tar\.gz)\./.exec(stderr)?.[1];
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("refs/invalid/cleanup");
    expect(await readdir(scratch)).toEqual([]);
    if (!archive) throw new Error("Missing failure archive diagnostic");
    const [retained, original] = await Promise.all([
      command("tar", ["-xOzf", archive, "./baseline/src/index.ts"], project),
      command("git", ["show", "HEAD:src/index.ts"], project),
    ]);
    expect(retained).toBe(original);
  } finally {
    if (archive) await rm(dirname(archive), { recursive: true, force: true });
    await rm(scratch, { recursive: true, force: true });
  }
});

test("archive failure keeps original evidence and removes incomplete archives", async () => {
  const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-cleanup-"));
  const reports = join(scratch, "reports");
  const evidence = join(scratch, "evidence");
  try {
    await writeFile(evidence, "retain this diagnostic");
    // Remove only the real archiver's lookup path; the same filesystem operation must fail
    // without erasing its input or leaving an incomplete archive that could look valid.
    const child = Bun.spawn(
      [
        process.execPath,
        "-e",
        'import { archiveAndRemoveScratch } from "./scripts/archive-scratch"; await archiveAndRemoveScratch(process.argv[1], process.argv[2]);',
        scratch,
        reports,
      ],
      { cwd: project, env: { ...process.env, PATH: "" }, stdout: "ignore", stderr: "pipe" },
    );
    const [stderr, exitCode] = await Promise.all([new Response(child.stderr).text(), child.exited]);
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("ENOENT");
    expect(await Bun.file(evidence).text()).toBe("retain this diagnostic");
    expect(await readdir(reports)).toEqual([]);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});
