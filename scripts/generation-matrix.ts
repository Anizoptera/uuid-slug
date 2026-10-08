import { runBunInScratch } from "./test-bun";

// Benchmarks receive the same interruption cleanup as tests, without another process supervisor.
process.exitCode = await runBunInScratch(["bench/generation-matrix.ts", ...process.argv.slice(2)]);
