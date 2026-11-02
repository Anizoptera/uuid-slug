import { copyFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { command } from "./command";

export async function workerdExecutable(): Promise<string> {
  const selected = process.env.UUID_SLUG_WORKERD_EXECUTABLE ?? Bun.which("workerd");
  if (selected) return selected;
  try {
    return (
      await command(
        "bunx",
        ["--no-install", "--package", "workerd", "which", "workerd"],
        resolve(import.meta.dir, ".."),
      )
    ).trim();
  } catch (cause) {
    throw new Error(
      "Install or cache workerd with `bunx workerd --version`, or set UUID_SLUG_WORKERD_EXECUTABLE to its binary.",
      { cause },
    );
  }
}

export async function runWorkerdConsumer(
  bundle: string,
  options: {
    compatible: boolean;
    responseCode?: string;
    timeoutMs?: number;
    executable?: string;
    wasm?: string;
  },
): Promise<string> {
  // Spawn the binary directly so cleanup owns the engine, not a package-runner parent.
  const executable = options.executable ?? (await workerdExecutable());
  const root = await mkdtemp(join(tmpdir(), "uuid-slug-workerd-"));
  try {
    const code = await Bun.file(bundle).text();
    if (options.wasm) await copyFile(options.wasm, join(root, "module.wasm"));
    // Entropy and clock calls belong inside a request. Module initialization would test a
    // prohibited context instead of the caller's normal Worker execution.
    await Bun.write(
      join(root, "worker.mjs"),
      `${options.wasm ? 'import compiled from "./module.wasm";\n' : ""}export default { async fetch() { try { ${options.wasm ? "globalThis.uuidSlugBenchmarkWasm=compiled;\n" : ""}${code}\n${options.responseCode ?? 'return new Response("passed");'} } catch (error) { return new Response(String(error), {status: 500}); } } };`,
    );
    {
      const compatible = options.compatible;
      const lane = compatible ? "nodejs_compat" : "web-only";
      const config = join(root, "worker.capnp");
      await Bun.write(
        config,
        `using Workerd = import "/workerd/workerd.capnp";
const config :Workerd.Config = (
  services = [(name = "main", worker = (
    modules = [(name = "worker.mjs", esModule = embed "worker.mjs")${options.wasm ? ', (name = "module.wasm", wasm = embed "module.wasm")' : ""}],
    compatibilityDate = "${new Date().toISOString().slice(0, 10)}",
    compatibilityFlags = [${compatible ? '"nodejs_compat"' : '"no_nodejs_compat"'}]
  ))],
  sockets = [(name = "http", address = "127.0.0.1:0", http = (), service = "main")]
);
`,
      );
      const child = Bun.spawn([executable, "serve", config, "--control-fd=1"], {
        stdout: "pipe",
        stderr: "pipe",
      });
      const diagnostics = new Response(child.stderr).text();
      const reader = child.stdout.pipeThrough(new TextDecoderStream()).getReader();
      // This bounds a hung engine; the listen event, never elapsed time, establishes readiness.
      const deadline = setTimeout(() => child.kill(), options.timeoutMs ?? 10_000);
      try {
        let remaining = "";
        let port: number | undefined;
        while (port === undefined) {
          const chunk = await reader.read();
          if (chunk.done) throw new Error("workerd exited before its HTTP listen event");
          remaining += chunk.value;
          if (remaining.length > 65_536)
            throw new Error("workerd control output exceeded its bound");
          while (remaining.includes("\n")) {
            const end = remaining.indexOf("\n");
            const event: unknown = JSON.parse(remaining.slice(0, end));
            remaining = remaining.slice(end + 1);
            if (
              event &&
              typeof event === "object" &&
              "event" in event &&
              event.event === "listen" &&
              "socket" in event &&
              event.socket === "http" &&
              "port" in event &&
              typeof event.port === "number" &&
              Number.isInteger(event.port) &&
              event.port > 0 &&
              event.port < 65_536
            )
              port = event.port;
          }
        }
        const response = await fetch(`http://127.0.0.1:${port}/`, {
          signal: AbortSignal.timeout(options.timeoutMs ?? 5_000),
        });
        const result = await response.text();
        if (response.status !== 200)
          throw new Error(`Packed consumer returned ${response.status}: ${result}`);
        return result;
      } catch (cause) {
        child.kill();
        await child.exited;
        throw new Error(`workerd ${lane}: ${String(cause)}\n${await diagnostics}`, { cause });
      } finally {
        clearTimeout(deadline);
        child.kill();
        await child.exited;
        await reader.cancel();
        await diagnostics;
      }
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

export async function checkWorkerdConsumer(bundle: string): Promise<void> {
  for (const compatible of [false, true]) {
    const result = await runWorkerdConsumer(bundle, { compatible });
    if (result !== "passed")
      throw new Error(`Packed consumer returned unexpected output: ${result}`);
    console.log(`workerd ${compatible ? "nodejs_compat" : "web-only"}: packed consumer passed`);
  }
}

if (import.meta.main) {
  const bundle = process.argv[2];
  if (!bundle || process.argv.length !== 3)
    throw new Error(
      "Usage: check-workerd-consumer.ts <self-contained-consumer.mjs>; install workerd or set UUID_SLUG_WORKERD_EXECUTABLE to its binary.",
    );
  await checkWorkerdConsumer(resolve(bundle));
}
