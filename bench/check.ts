// SPDX-License-Identifier: Apache-2.0

// Run gates without competing benchmarks; failed bundles must remain usable for reproduction.
import { mkdir, mkdtemp, rm, rmdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { command } from "../scripts/command";

const root = resolve(import.meta.dir, "..");
const reports = join(import.meta.dir, "reports");
await mkdir(reports, { recursive: true });
const directory = await mkdtemp(join(reports, "check-"));
let passed = false;
try {
  const result = await Bun.build({
    entrypoints: [join(import.meta.dir, "resources.ts"), join(import.meta.dir, "latency.ts")],
    target: "node",
    packages: "external",
    outdir: directory,
    naming: "[name].mjs",
  });
  if (!result.success) throw new AggregateError(result.logs, "Performance gate build failed");
  for (const runtime of ["node", process.execPath]) {
    for (const name of ["resources", "latency"]) {
      const output = await command(runtime, [join(directory, `${name}.mjs`)], root);
      console.log(`${runtime}: ${name}\n${output.trim()}`);
    }
  }
  passed = true;
} finally {
  // Failure output names the exact executable and bundle; deleting it would prevent that replay.
  if (passed) await rm(directory, { recursive: true, force: true });
  else
    console.error(
      `Performance check failed. Files remain in ${directory}; rerun the failing command with the same environment.`,
    );
  await rmdir(reports).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT" && error.code !== "ENOTEMPTY") throw error;
  });
}
