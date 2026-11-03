// Use the same text input and owned string output as native transport callers.
import { uuidStringToPlainSlug } from "../src/index";
import { measureUuidStringToPlainSlug } from "./implementation-transport";
import type { Settings } from "./implementation-timing";
import { processRuntimeVersion } from "./implementation-host";

const input = process.argv[2];
if (!input) throw new Error("Use bun run bench:implementations; this is its transport reference.");
const settings: Settings = JSON.parse(input);
console.log(
  JSON.stringify({
    runtimeVersion: processRuntimeVersion(),
    rows: measureUuidStringToPlainSlug(settings, uuidStringToPlainSlug),
  }),
);
