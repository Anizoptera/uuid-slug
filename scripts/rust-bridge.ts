// Compare development-only native transports without publishing them in the npm package.
import { copyFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

// The lane runs from the checkout root; bundled scripts must not resolve relative to their bundle.
const root = process.cwd();
const target = resolve(root, "rust/target");
function bridgeFiles(profile: "debug" | "release") {
  return {
    source: resolve(
      target,
      profile,
      `${process.platform === "win32" ? "" : "lib"}uuid_slug_bridge.${process.platform === "darwin" ? "dylib" : process.platform === "win32" ? "dll" : "so"}`,
    ),
    addon: resolve(target, profile, "uuid_slug_bridge.node"),
  };
}

/** Build explicitly once per lane; loading never launches an implicit Cargo process. */
export async function buildRustBridge(profile: "debug" | "release" = "release"): Promise<void> {
  await new Promise<void>((done, reject) => {
    const child = spawn(
      "cargo",
      [
        "build",
        "--manifest-path",
        "rust/Cargo.toml",
        "-p",
        "uuid-slug-bridge",
        ...(profile === "release" ? ["--release"] : []),
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
  const { source, addon } = bridgeFiles(profile);
  await copyFile(source, addon);
}

interface RustBridge {
  evaluate(input: string): string;
  plain(input: string): string;
  close(): void;
  readonly transport:
    | "Bun FFI"
    | "Bun Node-API"
    | "Deno FFI"
    | "Deno Node-API"
    | "Node FFI"
    | "Node Node-API";
}

function runtime(): "Bun" | "Deno" | "Node" {
  if (typeof Bun !== "undefined") return "Bun";
  if (process.versions.deno) return "Deno";
  return "Node";
}

type DenoRuntime = {
  dlopen(
    path: string,
    symbols: {
      readonly uuid_slug_evaluate_into: {
        readonly parameters: readonly ["buffer", "usize", "buffer", "usize"];
        readonly result: "usize";
      };
      readonly uuid_slug_plain_into: {
        readonly parameters: readonly ["buffer", "usize", "buffer", "usize"];
        readonly result: "usize";
      };
    },
  ): {
    readonly symbols: {
      uuid_slug_evaluate_into(
        input: Uint8Array,
        inputLength: number,
        output: Uint8Array,
        outputLength: number,
      ): number | bigint;
      uuid_slug_plain_into(
        input: Uint8Array,
        inputLength: number,
        output: Uint8Array,
        outputLength: number,
      ): number | bigint;
    };
    close(): void;
  };
};

function directBridge(
  transport: RustBridge["transport"],
  calls: Readonly<
    Record<
      "evaluate" | "plain",
      (input: Uint8Array, inputLength: number, output: Uint8Array) => number
    >
  >,
  closeNative: () => void,
): RustBridge {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let inputBuffer = new Uint8Array(256);
  let outputBuffer = new Uint8Array(256);
  let closed = false;

  function invoke(operation: keyof typeof calls, input: string): string {
    if (closed) throw new Error("Rust bridge is closed");
    const inputCapacity = Math.max(1, input.length * 3);
    if (inputCapacity > inputBuffer.length) inputBuffer = new Uint8Array(inputCapacity);
    const encoded = encoder.encodeInto(input, inputBuffer);
    if (encoded.read !== input.length) throw new Error("Rust bridge input encoding was partial");

    let written = calls[operation](inputBuffer, encoded.written, outputBuffer);
    if (!Number.isSafeInteger(written) || written <= 0)
      throw new Error("Rust bridge rejected input or panicked");
    if (written > outputBuffer.length) {
      outputBuffer = new Uint8Array(written);
      written = calls[operation](inputBuffer, encoded.written, outputBuffer);
    }
    if (!Number.isSafeInteger(written) || written <= 0 || written > outputBuffer.length)
      throw new Error("Rust bridge returned an invalid output length");
    return decoder.decode(outputBuffer.subarray(0, written));
  }

  return {
    evaluate: (input) => invoke("evaluate", input),
    plain: (input) => invoke("plain", input),
    close() {
      if (closed) return;
      closed = true;
      inputBuffer = new Uint8Array(0);
      outputBuffer = new Uint8Array(0);
      closeNative();
    },
    transport,
  };
}

/** These synchronous calls belong in conformance/benchmark workers, not product event loops. */
export async function loadRustBridge(): Promise<RustBridge> {
  const profile = process.env.UUID_SLUG_RUST_PROFILE ?? "release";
  if (profile !== "debug" && profile !== "release")
    throw new Error(`UUID_SLUG_RUST_PROFILE must be debug or release; received ${profile}`);
  const host = runtime();
  const transport = process.env.UUID_SLUG_RUST_TRANSPORT ?? "napi";
  if (transport !== "ffi" && transport !== "napi")
    throw new Error(`UUID_SLUG_RUST_TRANSPORT must be ffi or napi; received ${transport}`);
  const files = bridgeFiles(profile);

  if (transport === "napi") {
    const native = createRequire(import.meta.url)(files.addon) as Pick<
      RustBridge,
      "evaluate" | "plain"
    >;
    let closed = false;
    return {
      evaluate(input) {
        if (closed) throw new Error("Rust bridge is closed");
        return native.evaluate(input);
      },
      plain(input) {
        if (closed) throw new Error("Rust bridge is closed");
        return native.plain(input);
      },
      close() {
        closed = true;
      },
      transport: `${host} Node-API` as RustBridge["transport"],
    };
  }

  if (host === "Bun") {
    const { dlopen } = await import("bun:ffi");
    const native = dlopen(files.source, {
      uuid_slug_evaluate_into: {
        args: ["buffer", "usize", "buffer", "usize"],
        returns: "usize",
      },
      uuid_slug_plain_into: {
        args: ["buffer", "usize", "buffer", "usize"],
        returns: "usize",
      },
    });
    return directBridge(
      "Bun FFI",
      {
        evaluate: (input, length, output) =>
          Number(native.symbols.uuid_slug_evaluate_into(input, length, output, output.length)),
        plain: (input, length, output) =>
          Number(native.symbols.uuid_slug_plain_into(input, length, output, output.length)),
      },
      () => native.close(),
    );
  }

  if (host === "Deno") {
    const deno = (globalThis as typeof globalThis & { Deno: DenoRuntime }).Deno;
    const native = deno.dlopen(files.source, {
      uuid_slug_evaluate_into: {
        parameters: ["buffer", "usize", "buffer", "usize"],
        result: "usize",
      },
      uuid_slug_plain_into: {
        parameters: ["buffer", "usize", "buffer", "usize"],
        result: "usize",
      },
    });
    return directBridge(
      "Deno FFI",
      {
        evaluate: (input, length, output) =>
          Number(native.symbols.uuid_slug_evaluate_into(input, length, output, output.length)),
        plain: (input, length, output) =>
          Number(native.symbols.uuid_slug_plain_into(input, length, output, output.length)),
      },
      () => native.close(),
    );
  }

  const major = Number(process.versions.node.split(".")[0]);
  if (major < 26) throw new Error("Node FFI requires Node 26 or newer with --experimental-ffi");
  const { dlopen } = await import("node:ffi");
  const native = dlopen(files.source, {
    uuid_slug_evaluate_into: {
      arguments: ["buffer", "uint64", "buffer", "uint64"],
      return: "uint64",
    },
    uuid_slug_plain_into: {
      arguments: ["buffer", "uint64", "buffer", "uint64"],
      return: "uint64",
    },
  });
  return directBridge(
    "Node FFI",
    {
      evaluate: (input, length, output) =>
        Number(
          native.functions.uuid_slug_evaluate_into(
            input,
            BigInt(length),
            output,
            BigInt(output.length),
          ),
        ),
      plain: (input, length, output) =>
        Number(
          native.functions.uuid_slug_plain_into(
            input,
            BigInt(length),
            output,
            BigInt(output.length),
          ),
        ),
    },
    () => native.lib.close(),
  );
}
