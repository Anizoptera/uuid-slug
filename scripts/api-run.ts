import { runBunInScratch } from "./test-bun";

// API extraction uses the same surviving-parent cleanup as tests and generation comparisons.
process.exitCode = await runBunInScratch(["scripts/api.ts", ...process.argv.slice(2)]);
