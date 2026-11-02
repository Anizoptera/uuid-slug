// The surviving supervisor owns descendant shutdown and scratch cleanup after interruption.
import { join } from "node:path";
import { runBunInScratch } from "../scripts/test-bun";

process.exitCode = await runBunInScratch([
  join(import.meta.dir, "implementation-acquire.ts"),
  ...process.argv.slice(2),
]);
