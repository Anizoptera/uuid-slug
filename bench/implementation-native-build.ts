// Reuse the conformance host registry and real loader while timing direct calls without JSON dispatch.
import { copyFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { buildRustBridge, rustBridgeFiles } from "../scripts/rust-bridge";
import { nativeMatrix } from "../scripts/rust-native-matrix";
import type { Lane } from "./implementation-build";
import { sha256 } from "./implementation-artifacts";

export async function prepareNativeTransports(
  directory: string,
  reference: string,
  versions: { node: string; rust: string },
): Promise<Lane[]> {
  const config = [
    "profile.release.opt-level=3",
    'profile.release.lto="thin"',
    "profile.release.codegen-units=1",
    'build.rustflags=["-C","target-cpu=native"]',
  ];
  await buildRustBridge("release", config);
  const buildEvidence = `\n${versions.rust}\nNative build: ${config.join("; ")}`;
  const library = join(directory, "native-library");
  await mkdir(join(library, "release"), { recursive: true });
  const source = rustBridgeFiles("release");
  const retained = rustBridgeFiles("release", library);
  await copyFile(source.source, retained.source);
  // Both loader spellings must refer to this same captured library, even if the shared cache changes.
  await copyFile(retained.source, retained.addon);
  const built = await Bun.build({
    check: true,
    entrypoints: ["bench/implementation-native.ts"],
    target: "node",
    format: "esm",
    outdir: directory,
    naming: "native-transport.mjs",
    minify: { whitespace: true, syntax: true, identifiers: true, keepNames: true },
    external: ["bun:ffi", "node:ffi"],
  });
  if (!built.success) throw new AggregateError(built.logs, "Native transport worker build failed");
  const worker = join(directory, "native-transport.mjs");
  const [jsHash, libraryHash, referenceHash] = await Promise.all([
    sha256(worker),
    sha256(retained.source),
    sha256(reference),
  ]);
  const combined = createHash("sha256")
    .update(JSON.stringify({ worker: jsHash, native: libraryHash }))
    .digest("hex");
  const referenceId = "transport/typescript/node";
  const lanes: Lane[] = [
    {
      id: referenceId,
      reference: referenceId,
      family: "Per-call transports",
      requiresRuntimeVersion: true,
      version: versions.node,
      hash: referenceHash,
      command: ["node", reference],
      argumentStyle: "json",
    },
  ];
  for (const lane of await nativeMatrix(worker, worker)) {
    const host = `${lane.runtime.toLowerCase()}${lane.runtime === "Node" ? `-${lane.version.split(".")[0]}` : ""}`;
    lanes.push({
      id: `transport/native/${host}/${lane.transport}`,
      reference: referenceId,
      family: "Per-call transports",
      version: `${lane.host}${buildEvidence}`,
      requiresRuntimeVersion: true,
      hash: combined,
      command: [...lane.command],
      argumentStyle: "json",
      nativeTransport: lane.expectedTransport,
      environment: {
        ...lane.env,
        UUID_SLUG_RUST_PROFILE: "release",
        UUID_SLUG_BENCH_NATIVE_DIRECTORY: library,
        UUID_SLUG_BENCH_NATIVE_TRANSPORT: lane.expectedTransport,
      },
    });
  }
  return lanes;
}
