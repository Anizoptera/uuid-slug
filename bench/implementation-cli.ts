// CLI framing stays out of browser and workerd modules, which do not own process arguments.
import { run } from "./implementation-worker";
import type { Settings } from "./implementation-worker";
import { processRuntimeVersion } from "./implementation-host";

const input = process.argv[2];
if (!input) throw new Error("Use bun run bench:implementations; this is its timing worker.");
const settings: Settings = JSON.parse(input);
console.log(JSON.stringify({ runtimeVersion: processRuntimeVersion(), ...(await run(settings)) }));
