// CLI framing stays out of browser and workerd modules, which do not own process arguments.
import { run } from "./implementation-worker";
import type { Settings } from "./implementation-worker";

const input = process.argv[2];
if (!input) throw new Error("Use bun run bench:implementations; this is its timing worker.");
const settings: Settings = JSON.parse(input);
const host = globalThis as typeof globalThis & { Deno?: { version: { deno: string } } };
const runtimeVersion =
  typeof Bun !== "undefined" ? Bun.version : (host.Deno?.version.deno ?? process.version);
console.log(JSON.stringify({ runtimeVersion, rows: await run(settings) }));
