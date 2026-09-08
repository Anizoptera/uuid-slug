// Run development conformance through Node-API or Bun FFI with owned output cleanup.
import { copyFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

// The lane runs from the checkout root; bundled scripts must not resolve relative to their bundle.
const root = process.cwd();
const target = resolve(root, "rust/target");
const library = resolve(
  target,
  "release",
  `${process.platform === "win32" ? "" : "lib"}uuid_slug_bridge.${process.platform === "darwin" ? "dylib" : process.platform === "win32" ? "dll" : "so"}`,
);
const addon = resolve(target, "release/uuid_slug_bridge.node");

/** Build explicitly once per lane; loading never launches an implicit Cargo process. */
export async function buildRustBridge(): Promise<void> {
  await new Promise<void>((done, reject) => {
    const child = spawn(
      "cargo",
      [
        "build",
        "--manifest-path",
        "rust/Cargo.toml",
        "-p",
        "uuid-slug-bridge",
        "--release",
        "--locked",
      ],
      {
        cwd: root,
        env: { ...process.env, CARGO_TARGET_DIR: target },
        stdio: "inherit",
      },
    );
    child.once("error", reject);
    child.once("exit", (code, signal) =>
      code === 0 ? done() : reject(new Error(`Rust bridge build failed: ${signal ?? code}`)),
    );
  });
  await copyFile(library, addon);
}

export interface RustBridge {
  evaluate(input: string): string;
  close(): void;
}

/** These synchronous calls belong in conformance/benchmark workers, not product event loops. */
export async function loadRustBridge(): Promise<RustBridge> {
  if (typeof Bun === "undefined") {
    const native: { evaluate(input: string): string } = createRequire(import.meta.url)(addon);
    let closed = false;
    return {
      evaluate(input) {
        if (closed) throw new Error("Rust bridge is closed");
        return native.evaluate(input);
      },
      close() {
        closed = true;
      },
    };
  }
  const { dlopen } = await import("bun:ffi");
  const native = dlopen(library, {
    uuid_slug_evaluate: { args: ["buffer", "usize"], returns: "u32" },
    uuid_slug_length: { args: ["u32"], returns: "usize" },
    uuid_slug_copy: { args: ["u32", "buffer", "usize"], returns: "bool" },
    uuid_slug_release: { args: ["u32"], returns: "bool" },
  });
  const encoder = new TextEncoder();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let closed = false;
  return {
    evaluate(input) {
      if (closed) throw new Error("Rust bridge is closed");
      const bytes = encoder.encode(input);
      // A one-byte backing buffer gives empty input a valid non-null address.
      const handle = native.symbols.uuid_slug_evaluate(
        bytes.length ? bytes : new Uint8Array(1),
        bytes.length,
      );
      if (!handle) throw new Error("Rust bridge rejected input or panicked");
      try {
        const length = Number(native.symbols.uuid_slug_length(handle));
        if (!Number.isSafeInteger(length) || length < 0)
          throw new Error("Invalid Rust bridge output handle");
        const output = new Uint8Array(Math.max(length, 1));
        if (!native.symbols.uuid_slug_copy(handle, output, length))
          throw new Error("Rust bridge output copy failed");
        return decoder.decode(output.subarray(0, length));
      } finally {
        native.symbols.uuid_slug_release(handle);
      }
    },
    close() {
      if (!closed) {
        closed = true;
        native.close();
      }
    },
  };
}
