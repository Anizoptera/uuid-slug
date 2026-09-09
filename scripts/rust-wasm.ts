// Build the development Wasm bridge and run its contracts, entropy and cancellation in a browser.
import { deepStrictEqual, strictEqual } from "node:assert";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { compare, contractRequests, evaluate } from "./rust-conform";

const profile = process.env.UUID_SLUG_RUST_PROFILE ?? "release";
if (profile !== "debug" && profile !== "release")
  throw new Error(`UUID_SLUG_RUST_PROFILE must be debug or release; received ${profile}`);
const profileArgs = profile === "release" ? ["--release"] : [];

async function run(command: string[]): Promise<void> {
  const child = Bun.spawn(command, { stdout: "inherit", stderr: "inherit", timeout: 300_000 });
  if ((await child.exited) !== 0) throw new Error(`Command failed: ${command.join(" ")}`);
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
    const browser = await chromium.launch({ headless: true });
    try {
      const requests = await contractRequests();
      for (const failEntropy of [false, true]) {
        const context = await browser.newContext();
        try {
          const page = await context.newPage();
          page.setDefaultTimeout(30_000);
          await page.goto(server.url.toString());
          const observation = await bounded(
            page.evaluate(
              async ({ requests: inputs, failEntropy: rejectEntropy }) => {
                const demand = (condition: boolean, message: string) => {
                  if (!condition)
                    throw new Error(
                      `${rejectEntropy ? "Failed" : "Secure"} entropy context: ${message}`,
                    );
                };
                let draws = 0;
                const native = crypto.getRandomValues.bind(crypto);
                Object.defineProperty(crypto, "getRandomValues", {
                  value: (output: Uint8Array) => {
                    draws++;
                    if (rejectEntropy) {
                      output.fill(0xaa, 0, Math.floor(output.length / 2));
                      throw new Error("Deliberate partial host entropy failure");
                    }
                    return native(output);
                  },
                });
                const moduleUrl = "/bridge.js";
                const wasm = await import(moduleUrl);
                await wasm.default();
                const contracts = JSON.parse(wasm.evaluate(JSON.stringify(inputs)));
                demand(draws === 0, "Deterministic contracts unexpectedly requested entropy");
                const generated = [4, 7].map((uuidVersion) => {
                  const before = draws;
                  const outcomes = JSON.parse(
                    wasm.evaluate(JSON.stringify([{ op: "hostGenerate", version: uuidVersion }])),
                  );
                  demand(
                    draws > before,
                    `UUIDv${uuidVersion} did not reach browser crypto.getRandomValues`,
                  );
                  demand(
                    outcomes.length === 1,
                    `UUIDv${uuidVersion} returned an incomplete result`,
                  );
                  return outcomes[0];
                });
                if (rejectEntropy)
                  return {
                    contracts,
                    generated,
                    draws,
                    polls: 0,
                    hostTasks: 0,
                    longestPollMs: 0,
                    derived: null,
                  };
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
                  demand(longestPollMs <= 32, "A derivation poll blocked the browser beyond 32 ms");
                  return { contracts, generated, draws, polls, hostTasks, longestPollMs, derived };
                } finally {
                  pending.free();
                  channel.port1.close();
                  channel.port2.close();
                }
              },
              { requests, failEntropy },
            ),
          );
          compare(requests, observation.contracts);
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
              adapter: "browser Wasm",
              profile,
              entropyFailure: failEntropy,
              contracts: requests.length,
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
  } finally {
    await server.stop(true);
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}
