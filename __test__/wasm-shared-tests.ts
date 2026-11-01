// Reuse Vitest's real assertions and host supervision with the processed Rust test bridge.
import { rename } from "node:fs/promises";
import { join } from "node:path";
import { optimizeWasm } from "../scripts/wasm-opt";

export async function runWasmSharedTests(
  options: { artifact: string; cli: string; directory: string; profile: "debug" | "release" },
  run: (argv: string[], env?: Readonly<Record<string, string>>) => Promise<void>,
) {
  const { artifact, cli, directory, profile } = options;
  const nodeBindings = join(directory, "node");
  await run([cli, artifact, "--target", "nodejs", "--out-dir", nodeBindings]);
  await Bun.write(join(nodeBindings, "package.json"), JSON.stringify({ type: "commonjs" }));
  const processedNodeModule = join(nodeBindings, "optimized.wasm");
  const optimization = await optimizeWasm(
    join(nodeBindings, "uuid_slug_bridge_bg.wasm"),
    processedNodeModule,
  );
  // Bindings load this filename synchronously; replace only their generated copy, never Cargo's input.
  await rename(processedNodeModule, join(nodeBindings, "uuid_slug_bridge_bg.wasm"));
  console.log(JSON.stringify({ profile, sharedTests: true, optimization }));
  // Keep generated files alive until both supervised hosts have exited, including a failed sibling.
  const results = await Promise.allSettled(
    ["node", "bun"].map((runtime) =>
      run(["bun", "scripts/test-vitest.ts", "--reporter=verbose"], {
        UUID_SLUG_TEST_RUNTIME: runtime,
        UUID_SLUG_TEST_BACKEND: "rust",
        UUID_SLUG_WASM_BRIDGE: join(nodeBindings, "uuid_slug_bridge.js"),
      }),
    ),
  );
  for (const result of results) if (result.status === "rejected") throw result.reason;
}
