import { execFile } from "node:child_process";
import { delimiter, join } from "node:path";
import { promisify } from "node:util";

const execute = promisify(execFile);

/** Run an argv vector without a shell, draining both pipes and bounding a hung tool. */
export async function command(executable: string, args: string[], cwd: string): Promise<string> {
  try {
    const result = await execute(executable, args, {
      cwd,
      env: {
        ...process.env,
        PATH: `${join(cwd, "node_modules/.bin")}${delimiter}${process.env.PATH ?? ""}`,
      },
      encoding: "utf8",
      timeout: 30_000,
      maxBuffer: 4 * 1024 * 1024,
    });
    return result.stdout;
  } catch (cause) {
    throw new Error(`Command failed: ${JSON.stringify([executable, ...args])}`, { cause });
  }
}
