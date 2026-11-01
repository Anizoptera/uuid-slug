// Prove the production codec kernels; missing evidence must fail, even at exit zero.
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { command } from "./command";
import { rustToolchain } from "./rust-toolchain";

const decodingAssertions = [
  "canonical text must decode",
  "every payload bit must survive decoding",
  "nonzero decoder padding must fail",
  "a non-alphabet byte must fail",
];
const harnesses = [
  {
    name: "feistel_contract::inverts_every_block_and_key",
    assertions: ["unmask must invert every block and key"],
  },
  ...[
    "identifier_bits::base64_uuid_bits",
    "identifier_bits::base32_uuid_bits",
    "identifier_bits::base64_masked_bits",
    "identifier_bits::base32_masked_bits",
  ].map((name) => ({ name, assertions: decodingAssertions })),
  ...[
    "identifier_bits::encoding_base64_uuid_bits",
    "identifier_bits::encoding_base32_uuid_bits",
    "identifier_bits::encoding_base64_masked_bits",
    "identifier_bits::encoding_base32_masked_bits",
  ].map((name) => ({
    name,
    assertions: ["encoding must preserve every payload bit and canonical padding"],
  })),
];
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
const deadline = performance.now() + 300_000;
const toolchain = await rustToolchain();
await command(
  toolchain.cargo,
  ["metadata", "--manifest-path", "rust/proofs/Cargo.toml", "--locked", "--format-version", "1"],
  process.cwd(),
  toolchain.env,
);
const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-proofs-"));
const reportPath = join(scratch, "report.json");
let passed = false;
try {
  const output = await command(
    toolchain.cargo,
    [
      "kani",
      "--manifest-path",
      "rust/proofs/Cargo.toml",
      "--lib",
      "-j",
      ...harnesses.flatMap(({ name }) => ["--harness", name]),
      "--exact",
      "--output-format",
      "terse",
      "-Z",
      "unstable-options",
      "--export-json",
      reportPath,
    ],
    process.cwd(),
    undefined,
    { timeoutMs: Math.max(1, Math.ceil(deadline - performance.now())) },
  );
  const report: unknown = JSON.parse(await readFile(reportPath, "utf8"));
  if (!isRecord(report) || !isRecord(report.verification_results))
    throw new Error("Kani returned no structured verification results.");
  const { summary, results } = report.verification_results;
  if (
    !isRecord(summary) ||
    summary.status !== "completed" ||
    summary.successful !== harnesses.length ||
    summary.failed !== 0 ||
    summary.executed !== harnesses.length ||
    !Array.isArray(results) ||
    results.length !== harnesses.length
  )
    throw new Error("Kani did not complete every required harness successfully.");
  for (const { name, assertions } of harnesses) {
    const matching = results.filter(isRecord).filter((result) => result.harness_id === name);
    const result = matching[0];
    if (matching.length !== 1 || !result || result.status !== "Success")
      throw new Error(`Missing or unsuccessful Kani harness: ${name}`);
    const checks = result.checks;
    // Kani serializes literal assertion messages with their surrounding quotes.
    for (const assertion of assertions)
      if (
        !Array.isArray(checks) ||
        !checks.some(
          (check: unknown) =>
            isRecord(check) &&
            check.description === JSON.stringify(assertion) &&
            check.status === "Success",
        )
      )
        throw new Error(`${name}: assertion was absent, unreachable or unsuccessful: ${assertion}`);
  }
  console.log(output.trim());
  console.log(JSON.stringify({ tools: report.tools, metadata: report.metadata, summary }));
  passed = true;
} catch (cause) {
  await writeFile(join(scratch, "failure.log"), Bun.inspect(cause, { colors: false }));
  throw new Error(`Rust proofs are unverified. Inspect retained evidence at ${reportPath}.`, {
    cause,
  });
} finally {
  // Failed structured reports are diagnostic evidence, not a passing native-test substitute.
  if (passed) await rm(scratch, { recursive: true, force: true });
}
