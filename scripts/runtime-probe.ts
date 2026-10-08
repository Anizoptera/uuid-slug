// Compare shared TypeScript contracts across engines without loading a test runner in the target.
import { readFile } from "node:fs/promises";
import { deepStrictEqual } from "node:assert";
import * as api from "@anizoptera/uuid-slug";
import { probeConsumer } from "../__test__/consumer-probe";
import { contractRequests, evaluate } from "./rust-conform";

const requests = await contractRequests();
if (!requests.length) throw new Error("Runtime contract corpus is empty.");
const outcomes = requests.map((request) => evaluate(request));
await probeConsumer(api);
const reference = process.argv[2];
if (reference) {
  // Replay producer inputs: native capabilities and fresh entropy change the local corpus.
  // Local generation remains exercised above; positional equality needs identical UUIDs.
  const expected = JSON.parse(await readFile(reference, "utf8")) as {
    requests: typeof requests;
    outcomes: typeof outcomes;
  };
  if (!expected.requests.length) throw new Error("Reference contract corpus is empty.");
  deepStrictEqual(
    expected.requests.length,
    expected.outcomes.length,
    "Reference corpus length changed",
  );
  expected.requests.forEach((request, index) =>
    deepStrictEqual(
      evaluate(request),
      expected.outcomes[index],
      `Runtime mismatch: ${JSON.stringify(request)}`,
    ),
  );
  const runtime = process.versions.bun
    ? `Bun ${process.versions.bun}`
    : process.versions.deno
      ? `Deno ${process.versions.deno}`
      : `Node ${process.versions.node}`;
  console.log(`${runtime}: ${expected.requests.length} shared outcomes and consumer calls passed`);
} else process.stdout.write(JSON.stringify({ requests, outcomes }));
