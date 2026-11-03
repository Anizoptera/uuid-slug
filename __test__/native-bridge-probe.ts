// Exercise route selection with real libraries; absent files force genuine loader failures.
import { deepStrictEqual, rejects, strictEqual, throws } from "node:assert";
import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { loadRustBridge, rustBridgeFiles } from "../scripts/rust-bridge";
import { command } from "../scripts/command";

const uuid = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f0000";
const slug = "AZChssPUfl-KmwwdLj8AAA";

export function verifySingleExecution(
  bridge: Pick<Awaited<ReturnType<typeof loadRustBridge>>, "evaluate">,
) {
  const reset = '[{"op":"api","method":"reset","args":[]}]';
  const create = { op: "api", method: "createGenerator", args: [{}] };
  bridge.evaluate(reset);
  try {
    // The serialized response exceeds the initial transport buffer, forcing its copy retry.
    const batch = Array.from({ length: 32 }, () => create);
    deepStrictEqual(
      JSON.parse(bridge.evaluate(JSON.stringify(batch))),
      batch.map((_, result) => ({ value: { result } })),
    );
    deepStrictEqual(JSON.parse(bridge.evaluate(JSON.stringify([create]))), [
      { value: { result: batch.length } },
    ]);
  } finally {
    bridge.evaluate(reset);
  }
}

export async function verifyNativeLoading(
  profile: "debug" | "release",
  parentOwnedDirectory?: string,
) {
  const bun = process.versions.bun !== undefined;
  // Deno has separate forced coverage. Older Node has no experimental FFI fallback.
  if (process.versions.deno || (!bun && Number(process.versions.node.split(".")[0]) < 26))
    return undefined;
  const primary = bun ? "ffi" : "napi";
  const forced = process.env.UUID_SLUG_RUST_TRANSPORT;
  if (forced !== undefined && forced !== primary) return undefined;
  if (process.platform === "win32" && parentOwnedDirectory === undefined) {
    // Node-API caches loaded DLLs until process exit; the parent owns scratch cleanup.
    const directory = await mkdtemp(join(tmpdir(), "uuid-slug-native-route-"));
    try {
      return await command(
        process.execPath,
        [
          ...process.execArgv,
          join(process.cwd(), "rust/target/native-bridge-probe.mjs"),
          profile,
          directory,
        ],
        process.cwd(),
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
  const preferred = await loadRustBridge({ transport: "auto" });
  try {
    strictEqual(preferred.transport, bun ? "Bun FFI" : "Node Node-API");
    strictEqual(preferred.plain(uuid), slug);
  } finally {
    preferred.close();
  }

  const directory =
    parentOwnedDirectory ?? (await mkdtemp(join(tmpdir(), "uuid-slug-native-route-")));
  try {
    const files = rustBridgeFiles(profile, directory);
    const available = rustBridgeFiles(profile);
    const fallback = bun ? "addon" : "source";
    await mkdir(dirname(files[fallback]), { recursive: true });
    await copyFile(available[fallback], files[fallback]);
    await rejects(loadRustBridge({ directory, transport: primary }));
    const selected = await loadRustBridge({ directory, transport: "auto" });
    try {
      strictEqual(selected.transport, bun ? "Bun Node-API" : "Node FFI");
      strictEqual(selected.plain(uuid), slug);
      deepStrictEqual(JSON.parse(selected.evaluate('[{"op":"parse","input":"invalid"}]')), [
        { error: "invalid_uuid" },
      ]);
    } finally {
      selected.close();
    }
    throws(() => selected.plain(uuid), /closed/);
    // Node-API caches loaded paths, so absence needs a path no successful load has cached.
    await rejects(
      loadRustBridge({ directory: join(directory, "missing"), transport: "auto" }),
      (failure: Error) => failure instanceof AggregateError && failure.errors.length === 2,
    );
    return selected.transport;
  } finally {
    if (parentOwnedDirectory === undefined) await rm(directory, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  const [profile, directory] = process.argv.slice(2);
  if ((profile !== "debug" && profile !== "release") || !directory)
    throw new Error("Usage: native-bridge-probe.mjs debug|release PARENT_OWNED_DIRECTORY");
  process.stdout.write((await verifyNativeLoading(profile, directory)) ?? "");
}
