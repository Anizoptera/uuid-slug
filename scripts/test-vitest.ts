import { runBunInScratch } from "./test-bun";

// Bun supervises cleanup; its external node command preserves Vitest's actual Node workers.
process.exitCode = await runBunInScratch([
  "run",
  "node",
  "node_modules/vitest/vitest.mjs",
  "run",
  ...process.argv.slice(2),
]);
