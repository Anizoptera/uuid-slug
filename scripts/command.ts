import { execFile } from "node:child_process";
import { delimiter, join } from "node:path";
import { promisify } from "node:util";

const execute = promisify(execFile);

// An explicit cwd owns repository discovery; inherited Git-local paths can bind a child command
// to the caller's index or object database while writing objects into the child's repository.
const GIT_LOCAL_ENVIRONMENT = new Set([
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_COMMON_DIR",
  "GIT_CONFIG",
  "GIT_CONFIG_COUNT",
  "GIT_CONFIG_PARAMETERS",
  "GIT_DIR",
  "GIT_GRAFT_FILE",
  "GIT_IMPLICIT_WORK_TREE",
  "GIT_INDEX_FILE",
  "GIT_NO_REPLACE_OBJECTS",
  "GIT_OBJECT_DIRECTORY",
  "GIT_PREFIX",
  "GIT_REPLACE_REF_BASE",
  "GIT_SHALLOW_FILE",
  "GIT_WORK_TREE",
]);

/** Run an argv vector without a shell, draining both pipes and bounding a hung tool. */
export async function command(
  executable: string,
  args: string[],
  cwd: string,
  env?: Readonly<Record<string, string>>,
  options?: { readonly timeoutMs: number },
): Promise<string> {
  const childEnvironment = Object.fromEntries(
    Object.entries({ ...process.env, ...env }).filter(([name]) => !GIT_LOCAL_ENVIRONMENT.has(name)),
  );
  try {
    const result = await execute(executable, args, {
      cwd,
      env: {
        ...childEnvironment,
        PATH: `${join(cwd, "node_modules/.bin")}${delimiter}${process.env.PATH ?? ""}`,
      },
      encoding: "utf8",
      timeout: options?.timeoutMs ?? 30_000,
      maxBuffer: 4 * 1024 * 1024,
    });
    return result.stdout;
  } catch (cause) {
    throw new Error(`Command failed: ${JSON.stringify([executable, ...args])}`, { cause });
  }
}
