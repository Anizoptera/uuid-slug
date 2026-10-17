// Build the development Wasm bridge and run its contracts, entropy and cancellation in a browser.
import { deepStrictEqual, strictEqual } from "node:assert";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { browserEngines } from "./browser-engines";
import { rustToolchain } from "./rust-toolchain";
import {
  compare,
  contractRequests,
  evaluate,
  fineSystemTimeRequests,
  systemTimePrecisionProbe,
} from "./rust-conform";

const profile = process.env.UUID_SLUG_RUST_PROFILE ?? "release";
if (profile !== "debug" && profile !== "release")
  throw new Error(`UUID_SLUG_RUST_PROFILE must be debug or release; received ${profile}`);
const profileArgs = profile === "release" ? ["--release"] : [];
const toolchain = await rustToolchain();

async function run(argv: string[]): Promise<void> {
  const selected =
    argv[0] === "cargo" ? [toolchain.cargo, ...toolchain.cargoArgs, ...argv.slice(1)] : argv;
  const child = Bun.spawn(selected, {
    env: toolchain.env,
    stdout: "inherit",
    stderr: "inherit",
    timeout: 300_000,
  });
  if ((await child.exited) !== 0) throw new Error(`Command failed: ${selected.join(" ")}`);
}

async function bounded<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Browser contract execution hung")), 30_000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

const lock = Bun.TOML.parse(await readFile("rust/Cargo.lock", "utf8")) as {
  package: { name: string; version: string }[];
};
const version = lock.package.find((entry) => entry.name === "wasm-bindgen")?.version;
if (!version) throw new Error("Cargo.lock does not resolve wasm-bindgen");
const cli = Bun.which("wasm-bindgen");
if (!cli)
  throw new Error(
    `Install the matching development tool: cargo install wasm-bindgen-cli --version ${version} --locked`,
  );
const tool = Bun.spawn([cli, "--version"], { stdout: "pipe", stderr: "inherit" });
const reported = (await new Response(tool.stdout).text()).trim();
if ((await tool.exited) !== 0 || reported !== `wasm-bindgen ${version}`)
  throw new Error(`Cargo.lock requires wasm-bindgen ${version}; found ${reported}`);

// Browser entropy requires wasm-js; the empty selection must remain independent of JS services.
for (const features of ["--no-default-features", "--all-features"]) {
  await run([
    "cargo",
    "check",
    "--manifest-path",
    "rust/Cargo.toml",
    "-p",
    "uuid-slug",
    "--all-targets",
    features,
    "--target",
    "wasm32-unknown-unknown",
    "--locked",
    ...profileArgs,
  ]);
}
// Bun's node:wasi cannot start Rust's test harness; Node's can. The exit code is the test result.
const wasiPreview1Host = `
import { readFile } from "node:fs/promises";
import { WASI } from "node:wasi";
const wasi = new WASI({ version: "preview1", args: ["test"], returnOnExit: true });
const module = await WebAssembly.compile(await readFile(process.argv[1]));
process.exitCode = wasi.start(await WebAssembly.instantiate(module, wasi.getImportObject()));
`;
// WASI hosts supply entropy and clocks through their own imports, so run the unit tests there
// instead of only compiling: Node's built-in WASI hosts p1, jco hosts p2 components.
for (const target of ["wasm32-wasip1", "wasm32-wasip2"]) {
  for (const features of ["--no-default-features", "--all-features"]) {
    const built = Bun.spawn(
      [
        toolchain.cargo,
        ...toolchain.cargoArgs,
        "test",
        "--manifest-path",
        "rust/Cargo.toml",
        "-p",
        "uuid-slug",
        "--lib",
        "--no-run",
        "--message-format=json",
        features,
        "--target",
        target,
        "--locked",
        ...profileArgs,
      ],
      { env: toolchain.env, stdout: "pipe", stderr: "inherit" },
    );
    const messages = await new Response(built.stdout).text();
    if ((await built.exited) !== 0) throw new Error(`${target} ${features} tests did not build`);
    const tests = messages
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as { executable?: string | null })
      .flatMap((message) => (message.executable ? [message.executable] : []));
    strictEqual(tests.length, 1, `${target} ${features} must build one test module`);
    await run(
      target === "wasm32-wasip1"
        ? ["node", "--input-type=module", "-e", wasiPreview1Host, tests[0]!]
        : ["bun", "x", "jco", "run", tests[0]!],
    );
  }
}
await run([
  "cargo",
  "build",
  "--manifest-path",
  "rust/Cargo.toml",
  "-p",
  "uuid-slug-bridge",
  "--target",
  "wasm32-unknown-unknown",
  ...profileArgs,
  "--locked",
]);
const directory = await mkdtemp(join(process.cwd(), "rust/target/browser-"));
try {
  await run([
    cli,
    `rust/target/wasm32-unknown-unknown/${profile}/uuid_slug_bridge.wasm`,
    "--target",
    "web",
    "--out-dir",
    directory,
  ]);
  const files = new Map([
    ["/bridge.js", Bun.file(join(directory, "uuid_slug_bridge.js"))],
    ["/uuid_slug_bridge_bg.wasm", Bun.file(join(directory, "uuid_slug_bridge_bg.wasm"))],
  ]);
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request) {
      const pathname = new URL(request.url).pathname;
      if (pathname === "/")
        return new Response("<!doctype html><title>Rust contract driver</title>", {
          headers: { "content-type": "text/html" },
        });
      const file = files.get(pathname);
      return file ? new Response(file) : new Response("Not found", { status: 404 });
    },
  });
  try {
    const requests = await contractRequests();
    const fineRequests = fineSystemTimeRequests();
    for (const [browserName, browserEngine] of Object.entries(browserEngines)) {
      const browser = await browserEngine.launch({ headless: true });
      try {
        for (const failEntropy of [false, true]) {
          const context = await browser.newContext();
          try {
            const page = await context.newPage();
            page.setDefaultTimeout(30_000);
            await page.goto(server.url.toString());
            const observation = await bounded(
              page.evaluate(
                async ({
                  requests: inputs,
                  fineRequests: fineInputs,
                  precisionProbe,
                  failEntropy: rejectEntropy,
                }) => {
                  const demand = (condition: boolean, message: string) => {
                    if (!condition)
                      throw new Error(
                        `${rejectEntropy ? "Failed" : "Secure"} entropy context: ${message}`,
                      );
                  };
                  let draws = 0;
                  let entropyBlocked = rejectEntropy;
                  const native = crypto.getRandomValues.bind(crypto);
                  Object.defineProperty(crypto, "getRandomValues", {
                    value: (output: Uint8Array) => {
                      draws++;
                      if (entropyBlocked) {
                        output.fill(0xaa, 0, Math.floor(output.length / 2));
                        throw new Error("Deliberate partial host entropy failure");
                      }
                      return native(output);
                    },
                  });
                  const moduleUrl = "/bridge.js";
                  const wasm = await import(moduleUrl);
                  await wasm.default();
                  const precision = JSON.parse(wasm.evaluate(JSON.stringify([precisionProbe])));
                  demand(
                    Array.isArray(precision) &&
                      precision.length === 1 &&
                      typeof precision[0]?.value === "boolean",
                    "Native SystemTime precision observation is missing",
                  );
                  const fineSystemTime = precision[0].value === true;
                  const selectedInputs = fineSystemTime ? [...inputs, ...fineInputs] : inputs;
                  const contracts = JSON.parse(wasm.evaluate(JSON.stringify(selectedInputs)));
                  demand(draws === 0, "Deterministic contracts unexpectedly requested entropy");
                  const generated = [4, 7].map((uuidVersion) => {
                    const before = draws;
                    const outcomes = JSON.parse(
                      wasm.evaluate(JSON.stringify([{ op: "hostGenerate", version: uuidVersion }])),
                    );
                    if (rejectEntropy)
                      demand(draws > before, `UUIDv${uuidVersion} skipped its failed seed retry`);
                    demand(
                      outcomes.length === 1,
                      `UUIDv${uuidVersion} returned an incomplete result`,
                    );
                    return outcomes[0];
                  });
                  if (rejectEntropy)
                    return {
                      contracts,
                      fineSystemTime,
                      generated,
                      draws,
                      polls: 0,
                      hostTasks: 0,
                      longestPollMs: 0,
                      derived: null,
                    };
                  demand(draws > 0, "Generation never seeded from browser crypto.getRandomValues");
                  // A cached stream may survive an OS failure only until its required reseed.
                  // Exercise real Web Crypto interception, not a simulated Rust seed callback.
                  entropyBlocked = true;
                  let reseedFailed = false;
                  for (let offset = 0; offset < 4096 && !reseedFailed; offset += 256) {
                    const outcomes = JSON.parse(
                      wasm.evaluate(
                        JSON.stringify(
                          Array.from({ length: 256 }, () => ({ op: "hostGenerate", version: 4 })),
                        ),
                      ),
                    );
                    reseedFailed = outcomes.some(
                      (result: { error?: string }) => result.error === "rng_unavailable",
                    );
                    if (!reseedFailed) await new Promise((resolve) => setTimeout(resolve, 0));
                  }
                  demand(
                    reseedFailed,
                    "Generation exceeded 64 KB without requiring a fresh OS seed",
                  );
                  entropyBlocked = false;
                  const beforeRetry = draws;
                  const retry = JSON.parse(
                    wasm.evaluate(JSON.stringify([{ op: "hostGenerate", version: 4 }])),
                  );
                  demand(
                    draws > beforeRetry && typeof retry[0]?.value === "string",
                    "Failed reseed did not recover through Web Crypto",
                  );
                  const uuid = "018f1234-5678-7abc-9def-0123456789ab";
                  const seed = new TextEncoder().encode("browser-conformance-seed");
                  const aborted = new wasm.Derivation(seed, 4096, uuid);
                  try {
                    aborted.cancel();
                    let code: string | undefined;
                    try {
                      aborted.poll();
                    } catch (error) {
                      code = String(error);
                    }
                    demand(code === "aborted", "Abort before first poll did not report aborted");
                  } finally {
                    aborted.free();
                  }
                  const midway = new wasm.Derivation(seed, 4096, uuid);
                  try {
                    demand(
                      midway.poll() === undefined,
                      "Cancellation case completed before its first checkpoint",
                    );
                    midway.cancel();
                    let code: string | undefined;
                    try {
                      midway.poll();
                    } catch (error) {
                      code = String(error);
                    }
                    demand(code === "aborted", "Mid-work cancellation did not report aborted");
                  } finally {
                    midway.free();
                  }
                  const dropped = new wasm.Derivation(seed, 4096, uuid);
                  demand(dropped.poll() === undefined, "Drop case did not reach pending state");
                  dropped.free();
                  const pending = new wasm.Derivation(seed, 4096, uuid);
                  seed.fill(0); // The Rust constructor must already own the original seed.
                  const channel = new MessageChannel();
                  let hostTasks = 0;
                  let polls = 0;
                  let longestPollMs = 0;
                  const hostTask = () =>
                    new Promise<void>((resolve) => {
                      channel.port1.addEventListener(
                        "message",
                        () => {
                          hostTasks++;
                          resolve();
                        },
                        { once: true },
                      );
                      channel.port1.start();
                      channel.port2.postMessage(null);
                    });
                  try {
                    let derived: string | undefined;
                    do {
                      await hostTask();
                      const start = performance.now();
                      derived = pending.poll();
                      longestPollMs = Math.max(longestPollMs, performance.now() - start);
                      polls++;
                    } while (derived === undefined);
                    demand(
                      polls > 1 && hostTasks === polls,
                      "Derivation did not yield to real host tasks",
                    );
                    demand(
                      longestPollMs <= 32,
                      "A derivation poll blocked the browser beyond 32 ms",
                    );
                    return {
                      contracts,
                      fineSystemTime,
                      generated,
                      draws,
                      polls,
                      hostTasks,
                      longestPollMs,
                      derived,
                    };
                  } finally {
                    pending.free();
                    channel.port1.close();
                    channel.port2.close();
                  }
                },
                { requests, fineRequests, precisionProbe: systemTimePrecisionProbe, failEntropy },
              ),
            );
            const selectedRequests = observation.fineSystemTime
              ? [...requests, ...fineRequests]
              : requests;
            compare(selectedRequests, observation.contracts);
            if (failEntropy)
              deepStrictEqual(observation.generated, [
                { error: "rng_unavailable" },
                { error: "rng_unavailable" },
              ]);
            else {
              strictEqual(observation.generated.length, 2);
              const v4 = observation.generated[0].value as string;
              const v7 = observation.generated[1].value as string;
              if (!v4 || !v7) throw new Error("Host generation omitted a UUID");
              deepStrictEqual(evaluate({ op: "guards", input: v4 }), {
                value: [true, true, false, false, false, false],
              });
              deepStrictEqual(evaluate({ op: "guards", input: v7 }), {
                value: [true, false, true, false, false, false],
              });
              deepStrictEqual(
                { value: observation.derived },
                evaluate({
                  op: "mask",
                  input: "018f1234-5678-7abc-9def-0123456789ab",
                  mask: { seed: "browser-conformance-seed", iterations: 4096 },
                }),
              );
            }
            console.log(
              JSON.stringify({
                adapter: `${browserName} Wasm`,
                profile,
                entropyFailure: failEntropy,
                contracts: selectedRequests.length,
                exactSystemTimeNanoseconds: observation.fineSystemTime,
                draws: observation.draws,
                polls: observation.polls,
                hostTasks: observation.hostTasks,
                longestPollMs: observation.longestPollMs,
              }),
            );
            if (observation.longestPollMs > 8)
              console.warn("Wasm derivation poll exceeded the 8 ms warning budget");
          } finally {
            await context.close();
          }
        }
      } finally {
        await browser.close();
      }
    }
  } finally {
    await server.stop(true);
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}
