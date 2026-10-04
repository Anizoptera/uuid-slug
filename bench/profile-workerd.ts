// SPDX-License-Identifier: Apache-2.0

import { mkdir, mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { build } from "esbuild";

// workerd has a request boundary and a coarse local clock, unlike the existing host runners.
// Keep its process lifecycle here; share identifier witnesses in profile-cases instead of
// substituting browser execution or timing HTTP dispatch as the package's per-call cost.
await mkdir(join(import.meta.dir, "reports"), { recursive: true });
const reports = await mkdtemp(join(import.meta.dir, "reports/workerd-"));
const executable = process.env.UUID_SLUG_WORKERD_EXECUTABLE;
const command = executable ? [executable] : ["bunx", "workerd"];
const native = process.argv.includes("--native");
if (process.argv.slice(2).some((argument) => argument !== "--native"))
  throw new Error("Usage: bun bench/profile-workerd.ts [--native]");

// The remote inspector returns untyped protocol data. Keep it unknown until its profile
// structure is checked; another browser front end would still read this same engine source.
async function connectInspector(port: number, lane: string) {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`, {
    signal: AbortSignal.timeout(5000),
  });
  const targets: unknown = await response.json();
  await Bun.write(join(reports, `${lane}.inspector-targets.json`), JSON.stringify(targets));
  if (!Array.isArray(targets) || targets.length !== 1)
    throw new Error("Expected one workerd inspector target");
  const target: unknown = targets[0];
  if (
    !target ||
    typeof target !== "object" ||
    !("webSocketDebuggerUrl" in target) ||
    typeof target.webSocketDebuggerUrl !== "string"
  )
    throw new Error("Inspector target has no WebSocket URL");
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map<number, { resolve(value: unknown): void; reject(error: Error): void }>();
  let id = 0;
  socket.addEventListener("message", (event) => {
    if (typeof event.data !== "string") return;
    const message: unknown = JSON.parse(event.data);
    if (
      !message ||
      typeof message !== "object" ||
      !("id" in message) ||
      typeof message.id !== "number"
    )
      return;
    const task = pending.get(message.id);
    if (!task) return;
    pending.delete(message.id);
    if ("error" in message) task.reject(new Error(JSON.stringify(message.error)));
    else task.resolve("result" in message ? message.result : undefined);
  });
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error("workerd inspector connection timed out"));
    }, 5000);
    socket.addEventListener(
      "open",
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
    socket.addEventListener(
      "error",
      () => {
        clearTimeout(timeout);
        reject(new Error("workerd inspector connection failed"));
      },
      { once: true },
    );
  });
  socket.addEventListener("close", () => {
    for (const task of pending.values())
      task.reject(new Error("workerd inspector closed before its reply"));
    pending.clear();
  });
  return {
    send(method: string, params = {}): Promise<unknown> {
      id += 1;
      const requestId = id;
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          pending.delete(requestId);
          reject(new Error(`workerd inspector timed out: ${method}`));
        }, 5000);
        pending.set(requestId, {
          resolve(value) {
            clearTimeout(timeout);
            resolve(value);
          },
          reject(error) {
            clearTimeout(timeout);
            reject(error);
          },
        });
        socket.send(JSON.stringify({ id: requestId, method, params }));
      });
    },
    close: () => socket.close(),
  };
}
const calls = Number(process.env.UUID_SLUG_PROFILE_CALLS ?? "262144");
const samples = Number(process.env.UUID_SLUG_PROFILE_SAMPLES ?? "7");
const filter = process.env.UUID_SLUG_PROFILE_FILTER ?? "=v4.string,=v7.string,=v7.slug";
if (
  !Number.isSafeInteger(calls) ||
  calls < 1 ||
  calls > 16_777_216 ||
  !Number.isSafeInteger(samples) ||
  samples < 1 ||
  samples > 100
)
  throw new Error("Use positive bounded UUID_SLUG_PROFILE_CALLS and UUID_SLUG_PROFILE_SAMPLES");
const built = await build({
  entryPoints: [join(import.meta.dir, "profile-workerd-worker.ts")],
  absWorkingDir: join(import.meta.dir, ".."),
  bundle: true,
  platform: "browser",
  format: "esm",
  write: false,
  metafile: true,
  plugins: [
    {
      name: "public-package",
      setup(builder) {
        // Source brands let the shared corpus type-check; the executed graph must resolve the
        // public package entry instead. A direct dist alias would bypass its export conditions.
        builder.onResolve({ filter: /^\.\.\/src\/index$/ }, () =>
          builder.resolve("@anizoptera/uuid-slug", {
            resolveDir: import.meta.dir,
            kind: "import-statement",
          }),
        );
      },
    },
  ],
});
if (built.outputFiles.length !== 1) throw new Error("Expected one workerd JavaScript bundle");
const inputs = Object.keys(built.metafile.inputs);
if (
  !inputs.includes("dist/index.js") ||
  !inputs.includes("dist/runtime/portable.js") ||
  inputs.some((name) => name.startsWith("src/") || name.startsWith("dist/node/"))
)
  throw new Error(
    "workerd must load the compiled public entry and portable runtime without source or Node adapters",
  );
await Bun.write(join(reports, "worker.mjs"), built.outputFiles[0]!.contents);
await Bun.write(join(reports, "bundle.json"), JSON.stringify(built.metafile));
const version = Bun.spawn([...command, "--version"], { stdout: "pipe", stderr: "pipe" });
const [versionText, versionError, versionCode] = await Promise.all([
  new Response(version.stdout).text(),
  new Response(version.stderr).text(),
  version.exited,
]);
if (versionCode !== 0) throw new Error(`workerd version failed: ${versionError}`);
for (const nodeCompatibility of [false, true]) {
  const lane = nodeCompatibility ? "node-compatible" : "web";
  // A current date fixes API semantics; raw local workerd still differs from deployed timers.
  const date = new Date().toISOString().slice(0, 10);
  const configuration = join(reports, `${lane}.capnp`);
  await Bun.write(
    configuration,
    `using Workerd = import "/workerd/workerd.capnp";
const config :Workerd.Config = (
  services = [(name = "main", worker = (
    modules = [(name = "worker.mjs", esModule = embed "worker.mjs")],
    compatibilityDate = "${date}",
    compatibilityFlags = [${nodeCompatibility ? '"nodejs_compat"' : ""}]
  ))],
  sockets = [(name = "http", address = "127.0.0.1:0", http = (), service = "main")]
);
`,
  );
  const stderr = Bun.file(join(reports, `${lane}.stderr`));
  const child = Bun.spawn(
    [
      ...command,
      "serve",
      configuration,
      "--control-fd=1",
      ...(native ? ["--inspector-addr=127.0.0.1:0"] : []),
    ],
    {
      stdout: "pipe",
      stderr,
      env: { ...process.env, TZ: "UTC" },
    },
  );
  const reader = child.stdout.pipeThrough(new TextDecoderStream()).getReader();
  const deadline = setTimeout(() => child.kill(), 30_000);
  let inspector: Awaited<ReturnType<typeof connectInspector>> | undefined;
  try {
    let control = "";
    let remaining = "";
    let httpPort: number | undefined;
    let inspectorPort: number | undefined = native ? undefined : 0;
    // Read each named event: the inspector can publish first, and its HTTP server is not
    // the worker's request socket. Both ports come from the runtime, without reservation races.
    while (httpPort === undefined || inspectorPort === undefined) {
      const chunk = await reader.read();
      if (chunk.done)
        throw new Error(`workerd ${lane} exited before publishing its socket; read ${stderr.name}`);
      control += chunk.value;
      remaining += chunk.value;
      while (remaining.includes("\n")) {
        const end = remaining.indexOf("\n");
        const message: unknown = JSON.parse(remaining.slice(0, end));
        remaining = remaining.slice(end + 1);
        if (
          !message ||
          typeof message !== "object" ||
          !("port" in message) ||
          typeof message.port !== "number" ||
          !("event" in message)
        )
          continue;
        if (message.event === "listen-inspector") inspectorPort = message.port;
        else if (message.event === "listen" && "socket" in message && message.socket === "http")
          httpPort = message.port;
      }
    }
    await Bun.write(join(reports, `${lane}.control`), control);
    const url = new URL(`http://127.0.0.1:${httpPort}/profile`);
    url.searchParams.set("calls", String(calls));
    url.searchParams.set("samples", String(samples));
    url.searchParams.set("filter", filter);
    const preparationUrl = new URL(url);
    preparationUrl.pathname = "/prepare";
    const preparation = await fetch(preparationUrl, { signal: AbortSignal.timeout(25_000) });
    const preparationBody = await preparation.text();
    await Bun.write(join(reports, `${lane}.preparation.json`), preparationBody);
    if (!preparation.ok)
      throw new Error(`workerd preparation returned ${preparation.status}: ${preparationBody}`);
    if (native) {
      // Preparation creates and warms the isolate; socket readiness alone creates no target.
      inspector = await connectInspector(inspectorPort, lane);
      await inspector.send("Profiler.enable");
      await inspector.send("HeapProfiler.enable");
      await inspector.send("HeapProfiler.startSampling", {
        samplingInterval: 4096,
        includeObjectsCollectedByMajorGC: true,
        includeObjectsCollectedByMinorGC: true,
      });
      await inspector.send("Profiler.start");
    }
    const started = performance.now();
    const response = await fetch(url, { signal: AbortSignal.timeout(25_000) });
    const body = await response.text();
    const hostRequestMilliseconds = performance.now() - started;
    await Bun.write(join(reports, `${lane}.json`), body);
    if (!response.ok) throw new Error(`workerd ${lane} returned ${response.status}: ${body}`);
    const result: unknown = JSON.parse(body);
    if (
      !result ||
      typeof result !== "object" ||
      !("verified" in result) ||
      result.verified !== true ||
      !("rows" in result) ||
      !Array.isArray(result.rows) ||
      result.rows.length === 0
    )
      throw new Error(`workerd ${lane} emitted no verified cases`);
    for (const row of result.rows) {
      if (
        !row ||
        typeof row !== "object" ||
        !("milliseconds" in row) ||
        !Array.isArray(row.milliseconds) ||
        row.milliseconds.length !== samples ||
        row.milliseconds.some(
          (value: unknown) => typeof value !== "number" || !Number.isFinite(value) || value <= 0,
        )
      )
        throw new Error(
          `workerd ${lane} clock did not resolve every batch; increase calls, never accept zero cost`,
        );
    }
    if (inspector) {
      // Sampling excludes preparation, but includes dispatch and response serialization.
      // Those costs and the loop's consumption remain distinct from package allocation.
      for (const [method, suffix, key] of [
        ["Profiler.stop", "cpuprofile", "nodes"],
        ["HeapProfiler.stopSampling", "heapprofile", "head"],
      ] as const) {
        const captured = await inspector.send(method);
        if (
          !captured ||
          typeof captured !== "object" ||
          !("profile" in captured) ||
          !captured.profile ||
          typeof captured.profile !== "object" ||
          !(key in captured.profile)
        )
          throw new Error(`workerd ${lane} emitted no ${suffix}`);
        if (
          !("samples" in captured.profile) ||
          !Array.isArray(captured.profile.samples) ||
          captured.profile.samples.length === 0 ||
          (key === "nodes" &&
            (!("nodes" in captured.profile) ||
              !Array.isArray(captured.profile.nodes) ||
              captured.profile.nodes.length === 0))
        )
          throw new Error(`workerd ${lane} emitted an empty ${suffix}`);
        await Bun.write(join(reports, `${lane}.${suffix}`), JSON.stringify(captured.profile));
      }
    }
    console.log(
      JSON.stringify({
        runtime: versionText.trim(),
        lane,
        compatibilityDate: date,
        hostRequestMilliseconds,
        reports,
        result,
      }),
    );
  } finally {
    clearTimeout(deadline);
    inspector?.close();
    child.kill();
    await child.exited;
    await reader.cancel();
  }
}
