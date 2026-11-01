// Run one contract corpus through every native transport exposed by installed hosts.
import { buildRustBridge } from "./rust-bridge";
import { nativeMatrix } from "./rust-native-matrix";
import { runRustSharedSuites } from "../__test__/shared-suite-runner";

async function run(command: readonly string[], env: Readonly<Record<string, string>>) {
  const environment = { ...process.env, ...env };
  // Automatic lanes must observe absence even when the parent forced another research route.
  if (!Object.hasOwn(env, "UUID_SLUG_RUST_TRANSPORT")) delete environment.UUID_SLUG_RUST_TRANSPORT;
  const child = Bun.spawn([...command], {
    env: environment,
    stderr: "inherit",
    stdout: "pipe",
  });
  const [exitCode, output] = await Promise.all([child.exited, new Response(child.stdout).text()]);
  if (exitCode !== 0) throw new Error(`${command.join(" ")} exited ${exitCode}`);
  return output.trim();
}

export async function prepareNativeConformance() {
  // Rust profiles select different libraries at execution, not different JavaScript or hosts.
  await run(
    [
      "bun",
      "build",
      "--check",
      "scripts/rust-conform.ts",
      "--target=node",
      "--outfile=rust/target/conform.mjs",
      "--external=bun:ffi",
      "--external=node:ffi",
    ],
    {},
  );
  const lanes = await nativeMatrix("scripts/rust-conform.ts", "rust/target/conform.mjs");
  // Forced rows cannot exercise omission; derive automatic rows from the same host commands.
  const checks = lanes.flatMap((lane) => {
    const supportsAutomaticControl =
      lane.expectedTransport === "Bun FFI" ||
      (lane.expectedTransport === "Node Node-API" && lane.command.includes("--experimental-ffi"));
    return (supportsAutomaticControl ? [false, true] : [false]).map((automatic) => ({
      lane,
      automatic,
    }));
  });
  return async (profile: "debug" | "release"): Promise<void> => {
    // Report each verified host immediately, but drain every child before surfacing a failure.
    const results = await Promise.allSettled(
      checks.map(async ({ lane, automatic }) => {
        const env = { ...lane.env };
        if (automatic) delete env.UUID_SLUG_RUST_TRANSPORT;
        const label = automatic ? `${lane.host} automatic` : lane.label;
        const output = await run(lane.command, {
          ...env,
          UUID_SLUG_RUST_PROFILE: profile,
        });
        if (!output.startsWith(`${lane.expectedTransport}: `) || !output.endsWith(" passed"))
          throw new Error(`${label} expected ${lane.expectedTransport} but returned: ${output}`);
        const requiredFallback = lane.expectedTransport === "Bun FFI" ? "Bun Node-API" : "Node FFI";
        if (automatic && !output.includes(`; fallback=${requiredFallback}; `))
          throw new Error(
            `${label} did not report fallback=${requiredFallback}. Repair verifyNativeLoading in __test__/native-bridge-probe.ts with UUID_SLUG_RUST_TRANSPORT absent; forced-route conformance cannot cover automatic loading. Output: ${output}`,
          );
        console.log(`${label}: ${output}`);
        const runtime = lane.expectedTransport.startsWith("Bun")
          ? "bun"
          : lane.expectedTransport.startsWith("Deno")
            ? "deno"
            : "node";
        const witnesses = await runRustSharedSuites(
          {
            ...env,
            UUID_SLUG_RUST_PROFILE: profile,
            UUID_SLUG_TEST_RUNTIME: runtime,
            UUID_SLUG_TEST_VERSION: lane.host.slice(lane.host.indexOf(" ") + 1),
            UUID_SLUG_TEST_COMMAND: JSON.stringify([
              ...lane.command
                .slice(0, -1)
                .filter((argument) => runtime !== "deno" || !argument.startsWith("--allow-")),
              // Vitest uses the same local permissions and locked package mode as its Deno launcher.
              ...(runtime === "deno"
                ? ["--allow-all", "--node-modules-dir=manual", "--cached-only"]
                : []),
            ]),
          },
          lane.expectedTransport,
        );
        for (const witness of witnesses) console.log(`${label}: ${witness}`);
      }),
    );
    for (const result of results) if (result.status === "rejected") throw result.reason;
  };
}

if (import.meta.main) {
  await buildRustBridge("release");
  const verify = await prepareNativeConformance();
  await verify("release");
}
