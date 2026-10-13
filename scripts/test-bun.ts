import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const INTERRUPT_SIGNAL = "SIGINT";
const TERMINATE_SIGNAL = "SIGTERM";
const USE_PROCESS_GROUP = process.platform !== "win32";

/** Keep local hang bounds while allowing the slower shared CI execution required by policy. */
export function verificationTimeoutMs(localTimeoutMs: number): number {
  return localTimeoutMs * (process.env.CI ? 15 : 1);
}

export async function runBunInScratch(args: readonly string[]): Promise<number> {
  // A terminated child cannot run its finally blocks. The surviving parent removes files in
  // the runner's temporary directory after it exits; reusable caches stay outside.
  const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-runner-"));
  try {
    const child = Bun.spawn([process.execPath, "--no-orphans", ...args], {
      // Isolate this runner's group so interruption reaches native extraction children too.
      // Windows retains Bun's no-orphans supervision; POSIX signals only this new group.
      detached: USE_PROCESS_GROUP,
      // Node uses TEMP/TMP on Windows and TMPDIR on POSIX; keep both hosts in this scope.
      env: { ...process.env, TMPDIR: scratch, TMP: scratch, TEMP: scratch },
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const stop = (signal: typeof INTERRUPT_SIGNAL | typeof TERMINATE_SIGNAL) => {
      if (!USE_PROCESS_GROUP) child.kill(signal);
      else {
        try {
          process.kill(-child.pid, signal);
        } catch (cause) {
          if ((cause as NodeJS.ErrnoException).code !== "ESRCH") throw cause;
        }
      }
    };
    const interrupt = () => stop(INTERRUPT_SIGNAL);
    const terminate = () => stop(TERMINATE_SIGNAL);
    process.on(INTERRUPT_SIGNAL, interrupt);
    process.on(TERMINATE_SIGNAL, terminate);
    try {
      return await child.exited;
    } finally {
      process.off(INTERRUPT_SIGNAL, interrupt);
      process.off(TERMINATE_SIGNAL, terminate);
      // Interruption already signals the group; after exit retain handle-based cleanup instead
      // of signaling a numeric group again while the host tears it down.
      child.kill();
      await child.exited;
    }
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  // Shared CI runners need 15× the local case deadline; explicit caller flags still follow it.
  const timeout = "--timeout=" + verificationTimeoutMs(5000);
  process.exitCode = await runBunInScratch(["test", timeout, ...process.argv.slice(2)]);
}
