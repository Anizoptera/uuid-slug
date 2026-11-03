import { runBunInScratch, verificationTimeoutMs } from "./test-bun";
import { join } from "node:path";

// Supervision owns scratch, while the selected external host owns Vitest's runtime semantics.
const runtime = process.env.UUID_SLUG_TEST_RUNTIME ?? "node";
const defaultCommand =
  runtime === "deno"
    ? ["deno", "run", "--allow-all", "--node-modules-dir=manual", "--cached-only"]
    : [runtime === "bun" ? "bun" : "node"];
// A matrix must preserve its discovered executable; PATH can select another installed version.
const selected: unknown = process.env.UUID_SLUG_TEST_COMMAND
  ? JSON.parse(process.env.UUID_SLUG_TEST_COMMAND)
  : defaultCommand;
if (
  !Array.isArray(selected) ||
  !selected.length ||
  !selected.every((part: unknown) => typeof part === "string" && part.length > 0)
)
  throw new Error("UUID_SLUG_TEST_COMMAND must be a nonempty JSON array of executable arguments.");
process.exitCode = await runBunInScratch(
  (scratch) => [
    // Bun must execute itself directly; `bun run /absolute/bun` parses the binary as source.
    ...(runtime === "bun" ? selected.slice(1) : ["run", ...selected]),
    "node_modules/vitest/vitest.mjs",
    "run",
    // Keep deadlines with the supervisor, sharing Bun's CI allowance and local hang bounds.
    "--testTimeout=" + verificationTimeoutMs(5000),
    "--hookTimeout=" + verificationTimeoutMs(10000),
    ...process.argv.slice(2),
    // Shared caches are cleared during startup; concurrent hosts must own separate directories.
    "--fsModuleCachePath=" + join(scratch, "vitest-cache"),
  ],
  runtime === "bun" ? selected[0] : undefined,
);
