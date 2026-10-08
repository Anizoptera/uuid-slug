import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function main(): Promise<number> {
  // A terminated test cannot run its finally blocks. The surviving parent removes files in
  // the runner's temporary directory after it exits; reusable caches stay outside.
  const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-tests-"));
  try {
    const child = Bun.spawn([process.execPath, "--no-orphans", "test", ...process.argv.slice(2)], {
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

process.exitCode = await main();
