// Run one contract corpus through every native transport exposed by installed hosts.
import { buildRustBridge } from "./rust-bridge";
import { nativeMatrix } from "./rust-native-matrix";

async function run(command: readonly string[], env: Readonly<Record<string, string>>) {
  const child = Bun.spawn([...command], {
    env: { ...process.env, ...env },
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
  return async (profile: "debug" | "release"): Promise<void> => {
    // Report each verified host immediately, but drain every child before surfacing a failure.
    const results = await Promise.allSettled(
      lanes.map(async (lane) => {
        const output = await run(lane.command, {
          ...lane.env,
          UUID_SLUG_RUST_PROFILE: profile,
        });
        if (!output.startsWith(`${lane.expectedTransport}: `) || !output.endsWith(" passed"))
          throw new Error(
            `${lane.host} ${lane.transport} returned an unexpected result: ${output}`,
          );
        console.log(`${lane.label}: ${output}`);
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
