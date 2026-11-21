// SPDX-License-Identifier: Apache-2.0

import { mkdir, rm, symlink } from "node:fs/promises";
import { join } from "node:path";
import { command } from "../scripts/command";

/**
 * Extract a committed revision into `root` and bind it to the working tree's dependencies and
 * toolchain, so measurements compare code, never toolchains.
 *
 * A Git archive preserves the committed graph without a branch or worktree. The extracted tree must
 * not use its own `.tool-versions`: asdf resolves pins from the working directory, so an older ref
 * would run older runtimes (confounding every timing) or fail outright on a tool pinned since then
 * ("No version is set for command deno"). Every driver that runs another revision goes through here.
 */
export async function extractRevisionTree(
  project: string,
  revision: string,
  root: string,
  archive: string,
  paths: readonly string[] = [],
): Promise<void> {
  await command(
    "git",
    [
      "archive",
      "--format=tar",
      "--output",
      archive,
      revision,
      ...(paths.length ? ["--", ...paths] : []),
    ],
    project,
  );
  // Non-recursive: an existing root means another run's tree, never something to merge into.
  await mkdir(root);
  await command("tar", ["-xf", archive, "-C", root], project);
  await symlink(join(project, "node_modules"), join(root, "node_modules"), "dir");
  await rm(join(root, ".tool-versions"), { force: true });
  await symlink(join(project, ".tool-versions"), join(root, ".tool-versions"));
}
