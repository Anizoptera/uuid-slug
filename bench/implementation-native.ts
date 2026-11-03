// Load once before timing; a forced lane must report its actual native transport.
import { loadRustBridge } from "../scripts/rust-bridge";
import { measureUuidStringToPlainSlug } from "./implementation-transport";
import type { Settings } from "./implementation-timing";

const input = process.argv[2];
if (!input) throw new Error("Use bun run bench:implementations; this is its native timing worker.");
const settings: Settings = JSON.parse(input);
const directory = process.env.UUID_SLUG_BENCH_NATIVE_DIRECTORY;
const expected = process.env.UUID_SLUG_BENCH_NATIVE_TRANSPORT;
if (!directory || !expected)
  throw new Error("Use bun run bench:implementations to select the native library and transport.");
const bridge = await loadRustBridge({ directory });
try {
  if (bridge.transport !== expected)
    throw new Error(`Expected ${expected}; the loader selected ${bridge.transport}`);
  // Registry versions are numeric; Node's display-only `v` must not look like another executable.
  const runtimeVersion = process.versions.bun ?? process.versions.deno ?? process.versions.node;
  console.log(
    JSON.stringify({
      runtimeVersion,
      transport: bridge.transport,
      rows: measureUuidStringToPlainSlug(settings, (uuid) => bridge.plain(uuid)),
    }),
  );
} finally {
  bridge.close();
}
