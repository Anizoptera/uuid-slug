// SPDX-License-Identifier: Apache-2.0

// Run resource and timing gates without competing benchmark processes, then remove their bundles.
import { mkdir, mkdtemp, rm, rmdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { command } from "../scripts/command";

const root = resolve(import.meta.dir, "..");
const reports = join(import.meta.dir, "reports");
await mkdir(reports, { recursive: true });
const directory = await mkdtemp(join(reports, "check-"));
try {
  const result = await Bun.build({
    entrypoints: [join(import.meta.dir, "resources.ts"), join(import.meta.dir, "latency.ts")],
    target: "node",
    packages: "external",
    outdir: directory,
    naming: "[name].mjs",
  });
  if (!result.success) throw new AggregateError(result.logs, "Performance gate build failed");
  let checkCount = 0;
  for (const runtime of ["node", process.execPath]) {
    for (const name of ["resources", "latency"]) {
      const output = await command(runtime, [join(directory, `${name}.mjs`)], root);
      if (output.trim() === "") throw new Error(`${runtime} ${name} produced no check evidence`);
      checkCount += 1;
    }
  }
  console.log(`Performance checks passed in ${checkCount} runtime and probe combinations`);
} finally {
  await rm(directory, { recursive: true, force: true });
  await rmdir(reports).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT" && error.code !== "ENOTEMPTY") throw error;
  });
}
