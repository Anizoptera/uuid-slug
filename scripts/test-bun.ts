import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function runBunInScratch(args: readonly string[]): Promise<number> {
  // A terminated child cannot run its finally blocks. The surviving parent removes files in
  // the runner's temporary directory after it exits; reusable caches stay outside.
  const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-runner-"));
  try {
    const child = Bun.spawn([process.execPath, "--no-orphans", ...args], {
      env: { ...process.env, TMPDIR: scratch },
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const interrupt = () => child.kill("SIGINT");
    const terminate = () => child.kill("SIGTERM");
    process.on("SIGINT", interrupt);
    process.on("SIGTERM", terminate);
    try {
      return await child.exited;
    } finally {
      process.off("SIGINT", interrupt);
      process.off("SIGTERM", terminate);
      child.kill();
      await child.exited;
    }
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

if (import.meta.main) process.exitCode = await runBunInScratch(["test", ...process.argv.slice(2)]);
