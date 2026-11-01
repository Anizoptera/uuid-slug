// Exercise route selection with real libraries; absent files force genuine loader failures.
import { deepStrictEqual, rejects, strictEqual, throws } from "node:assert";
import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { loadRustBridge, rustBridgeFiles } from "../scripts/rust-bridge";

const uuid = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f0000";
const slug = "AZChssPUfl-KmwwdLj8AAA";

export async function verifyNativeLoading(profile: "debug" | "release"): Promise<void> {
  const bun = process.versions.bun !== undefined;
  // Deno has separate forced coverage. Older Node has no experimental FFI fallback.
  if (process.versions.deno || (!bun && Number(process.versions.node.split(".")[0]) < 26)) return;
  const primary = bun ? "ffi" : "napi";
  const forced = process.env.UUID_SLUG_RUST_TRANSPORT;
  if (forced !== undefined && forced !== primary) return;
  const preferred = await loadRustBridge({ transport: "auto" });
  try {
    strictEqual(preferred.transport, bun ? "Bun FFI" : "Node Node-API");
    strictEqual(preferred.plain(uuid), slug);
  } finally {
    preferred.close();
  }

  const directory = await mkdtemp(join(tmpdir(), "uuid-slug-native-route-"));
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
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
