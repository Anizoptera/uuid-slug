// Prove production UUID contracts; missing evidence must fail, even at exit zero.
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { command } from "./command";
import { rustToolchain } from "./rust-toolchain";

const decodingAssertions = [
  "canonical text must decode",
  "every payload bit must survive decoding",
  "a non-alphabet byte must fail",
];
const paddingAssertion = "nonzero decoder padding must fail";
const tailAssertion = "decoded tail must fit four bits";
const availableHarnesses = [
  ...["empty_words_match_bytes", "one_word_matches_bytes", "two_words_match_bytes"].map((name) => ({
    name: `hash_contract::${name}`,
    assertions: ["word hashing equals little-endian byte hashing for every key and payload"],
  })),
  {
    name: "hash_contract::tail_preserves_bytes",
    assertions: ["hash tail preserves every byte in little-endian order"],
  },
  ...["compact_uuid", "canonical_uuid", "wrapped_uuid", "urn_uuid"].map((name) => ({
    name: `text_contract::${name}`,
    assertions: [
      "UUID parser accepts exactly its text grammar",
      "UUID parser preserves every hexadecimal payload bit",
      "UUID parser rejects malformed text",
    ],
  })),
  {
    name: "generation::v7_continuation_and_exhaustion",
    assertions: [
      "v7 continuation rejects exactly policy or final timestamp exhaustion",
      "v7 continuation draws only the required entropy",
      "v7 continuation strictly increases in wire order",
      "v7 sequence carry advances exactly one millisecond",
    ],
  },
  {
    name: "generation::v7_failed_entropy_preserves_state",
    assertions: [
      "v7 failed entropy never returns an identifier",
      "v7 failed entropy preserves every generator field",
    ],
  },
  {
    name: "uuid_contract::payload_layout_admission",
    assertions: ["layout accepts exactly the documented widths"],
  },
  {
    name: "uuid_contract::payload_layout_and_fields",
    assertions: ["payload partition preserves every payload bit"],
  },
  {
    name: "uuid_contract::caller_buffer_reads_and_writes",
    assertions: [
      "UUID read accepts exactly fitting ranges",
      "UUID read preserves every source byte",
      "UUID write accepts exactly fitting ranges",
      "UUID write changes only its complete admitted range",
    ],
  },
  {
    name: "generation_contract::v4_preserves_random_payload",
    assertions: [
      "v4 requests exactly sixteen entropy bytes",
      "v4 draws entropy once",
      "v4 preserves all 122 random payload bits",
    ],
  },
  {
    name: "generation_contract::v4_buffer_failure_atomicity",
    assertions: [
      "v4 writes succeed exactly when capacity and entropy permit",
      "v4 invalid buffers draw no entropy",
      "v4 failures retain their classification",
      "v4 failure is atomic and successful writes preserve surrounding bytes",
    ],
  },
  {
    name: "generation_contract::inclusive_v7_bounds",
    assertions: [
      "v7 bounds accept exactly ordered 48-bit intervals",
      "lower bound is the smallest RFC UUIDv7 at the requested time",
      "upper bound is the largest RFC UUIDv7 at the requested time",
    ],
  },
  {
    name: "generation_contract::v7_initial_payload",
    assertions: [
      "v7 reseeding requests exactly ten entropy bytes",
      "v7 initial generation draws entropy once",
      "v7 generation preserves all 48 timestamp bits",
      "integer time initializes the configured fraction to zero",
      "v7 reseeding preserves every configured random counter bit",
      "v7 generation preserves the independent 32-bit random tail",
    ],
  },
  {
    name: "uuid_contract::inspection_and_timestamp",
    assertions: [
      "version inspection preserves the wire nibble",
      "variant inspection matches every wire prefix",
      "RFC inspection matches the wire prefix",
      "v4 inspection requires version and variant",
      "v7 inspection requires version and variant",
      "timestamp preserves every leading wire bit",
      "timestamp rejects other UUID domains",
    ],
  },
  {
    name: "feistel_contract::inverts_every_block_and_key",
    assertions: ["unmask must invert every block and key"],
  },
  ...["identifier_bits::base64_uuid_bits", "identifier_bits::base32_uuid_bits"].map((name) => ({
    name,
    assertions: [...decodingAssertions, paddingAssertion],
  })),
  {
    name: "identifier_bits::base64_masked_bits",
    // Every bit in 22 base64url digits is payload; the decoder must preserve the whole tail.
    assertions: [...decodingAssertions, tailAssertion],
  },
  {
    name: "identifier_bits::base32_masked_bits",
    assertions: [...decodingAssertions, paddingAssertion, tailAssertion],
  },
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
// Focused iterations use the same named assertions and deadline as the complete proof command.
const requested = process.argv.slice(2);
const harnesses = requested.length
  ? requested.map((name) => {
      const harness = availableHarnesses.find((candidate) => candidate.name === name);
      if (!harness) throw new Error(`Unknown Rust proof harness: ${name}`);
      return harness;
    })
  : availableHarnesses;
if (new Set(harnesses.map(({ name }) => name)).size !== harnesses.length)
  throw new Error("Select each Rust proof harness only once.");
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
const deadline = performance.now() + 300_000;
const toolchain = await rustToolchain();
const graphText = await command(
  toolchain.cargo,
  ["metadata", "--manifest-path", "rust/proofs/Cargo.toml", "--locked", "--format-version", "1"],
  process.cwd(),
  toolchain.env,
);
// A direct parser proof must execute the same dependency as the shipped wrapper.
const graph = JSON.parse(graphText) as {
  packages: { id: string; name: string }[];
  resolve: { nodes: { id: string; deps: { name: string; pkg: string }[] }[] } | null;
};
const parserFor = (name: string) => {
  const owner = graph.packages.find((pkg) => pkg.name === name);
  return graph.resolve?.nodes
    .find((node) => node.id === owner?.id)
    ?.deps.find((dep) => dep.name === "uuid")?.pkg;
};
if (!parserFor("uuid-slug") || parserFor("uuid-slug") !== parserFor("uuid-slug-proofs"))
  throw new Error(
    "Rust parser proofs must resolve the product's uuid dependency. Align rust/proofs/Cargo.toml and its lockfile before proving a different implementation.",
  );
const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-proofs-"));
const reportPath = join(scratch, "report.json");
let passed = false;
try {
  const output = await command(
    toolchain.cargo,
    [
      "kani",
      "-Z",
      "stubbing",
      "--manifest-path",
      "rust/proofs/Cargo.toml",
      "--lib",
      "-j",
      ...harnesses.flatMap(({ name }) => ["--harness", name]),
      "--exact",
      "--output-format",
      "terse",
      "--harness-timeout",
      `${Math.max(1, Math.ceil((deadline - performance.now()) / 1_000))}s`,
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
