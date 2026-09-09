// Compare shared TypeScript contracts across engines without loading a test runner in the target.
import { readFile } from "node:fs/promises";
import { deepStrictEqual } from "node:assert";
import * as api from "../src/index";
import { probeConsumer } from "../test/consumer-probe";
import { contractRequests, evaluate } from "./rust-conform";

const requests = await contractRequests();
if (!requests.length) throw new Error("Runtime contract corpus is empty.");
const outcomes = requests.map((request) => evaluate(request));
await probeConsumer(api);
const reference = process.argv[2];
if (reference) {
  const expected = JSON.parse(await readFile(reference, "utf8")) as typeof outcomes;
  deepStrictEqual(outcomes.length, expected.length, "Runtime corpus length changed");
  outcomes.forEach((outcome, index) =>
    deepStrictEqual(
      outcome,
      expected[index],
      `Runtime mismatch: ${JSON.stringify(requests[index])}`,
    ),
  );
  const runtime = process.versions.bun
    ? `Bun ${process.versions.bun}`
    : process.versions.deno
      ? `Deno ${process.versions.deno}`
      : `Node ${process.versions.node}`;
  console.log(`${runtime}: ${outcomes.length} shared outcomes and consumer calls passed`);
} else process.stdout.write(JSON.stringify(outcomes));
