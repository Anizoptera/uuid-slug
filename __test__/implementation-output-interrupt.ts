// The parent kills this real writer only after its capture has reached the filesystem.
import { openImplementationOutput } from "../bench/implementation-output";
import type { ImplementationReport, Measurement } from "../bench/implementation-report";

const input: {
  destination: string;
  header: Omit<ImplementationReport, "measurements">;
  record: Measurement;
} = JSON.parse(process.argv[2] ?? "null");
const output = await openImplementationOutput(input.destination, input.header);
await output.append(input.record);
console.log(output.raw);
// An open stdin keeps the child alive without a polling timer or unrelated work.
await Bun.stdin.text();
await output.close();
