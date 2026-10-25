import { runBunInScratch, verificationTimeoutMs } from "./test-bun";

// Supervision owns scratch, while the selected external host owns Vitest's runtime semantics.
const runtime = process.env.UUID_SLUG_TEST_RUNTIME ?? "node";
const command =
  runtime === "deno"
    ? ["deno", "run", "--allow-all", "--node-modules-dir=manual", "--cached-only"]
    : ["node"];
process.exitCode = await runBunInScratch([
  "run",
  ...command,
  "node_modules/vitest/vitest.mjs",
  "run",
  // Keep deadlines with the supervisor, sharing Bun's CI allowance and local hang bounds.
  "--testTimeout=" + verificationTimeoutMs(5000),
  "--hookTimeout=" + verificationTimeoutMs(10000),
  ...process.argv.slice(2),
]);
