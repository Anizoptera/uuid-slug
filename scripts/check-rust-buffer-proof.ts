// Require a proved production body, not merely a successful verifier invocation.
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

interface VerusReport {
  verus: { version: string; toolchain: string };
  "verification-results"?: {
    success: unknown;
    errors: number;
    "is-verifying-entire-crate": unknown;
  };
  "times-ms"?: {
    smt?: {
      "smt-run-module-times"?: {
        "function-breakdown"?: { function: string; success: unknown }[];
      }[];
    };
  };
}
const verifier = Bun.which("verus");
if (!verifier) throw new Error("Install Verus, then rerun bun scripts/check-rust-buffer-proof.ts.");
const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-buffer-proof-"));
const file = join(scratch, "report.json");
let passed = false;
try {
  const child = Bun.spawn(
    [
      verifier,
      "rust/proofs/buffer_contract.rs",
      "--edition=2024",
      "--crate-type",
      "lib",
      "--cfg",
      "verus_only",
      "--no-cheating",
      "--output-json",
      "--time-expanded",
    ],
    { stdout: "pipe", stderr: "pipe", timeout: 300_000 },
  );
  const [exit, output, errors] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  await writeFile(file, output);
  await writeFile(join(scratch, "diagnostics.txt"), errors);
  if (exit !== 0) throw new Error(`Verus exited ${exit}.\n${errors}`);
  if (errors.trim()) console.error(errors.trim());
  const report = JSON.parse(output) as VerusReport;
  const summary = report["verification-results"];
  const required = "buffer_contract::buffer_range::uuid_end";
  const bodies = report["times-ms"]?.smt?.["smt-run-module-times"]
    ?.flatMap((module) => module["function-breakdown"] ?? [])
    .filter((body) => body.function === required && body.success === true);
  if (
    summary?.success !== true ||
    summary.errors !== 0 ||
    summary["is-verifying-entire-crate"] !== true ||
    bodies?.length !== 1
  )
    throw new Error(
      `Verus did not prove ${required}; restore its production import and exact success/failure contract. A missing body is not verification.`,
    );
  console.log(JSON.stringify({ tool: report.verus, body: required, summary }));
  passed = true;
} catch (cause) {
  throw new Error(`Buffer admission is unverified. Inspect ${file}.`, { cause });
} finally {
  if (passed) await rm(scratch, { recursive: true, force: true });
}
