// Prepare immutable inputs once; timing starts only after every build and optimizer exits.
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { command } from "../scripts/command";
import { rustToolchain } from "../scripts/rust-toolchain";
import { optimizeWasm } from "../scripts/wasm-opt";
import { browserEngines } from "../scripts/browser-engines";
import { workerdExecutable } from "../scripts/check-workerd-consumer";
import type { Settings } from "./implementation-worker";
import { prepareNativeTransports } from "./implementation-native-build";
import { buildJs, sha256 } from "./implementation-artifacts";

export interface Lane {
  id: string;
  family: string;
  version: string;
  hash: string;
  command?: string[];
  argumentStyle?: "json" | "positional";
  browser?: keyof typeof browserEngines;
  script?: string;
  wasm?: string;
  environment?: Record<string, string | undefined>;
  edge?: boolean;
  reference?: string;
  requiresEntropy?: boolean;
  entropyModule?: string;
}

export async function prepareImplementations(
  directory: string,
  settings: Settings,
): Promise<Lane[]> {
  await mkdir(directory, { recursive: true });
  const root = process.cwd();
  const lanes: Lane[] = [];
  const entropyBuild = await Bun.build({
    check: true,
    entrypoints: ["bench/implementation-entropy.ts"],
    target: "browser",
    format: "esm",
    minify: true,
    outdir: directory,
    naming: "entropy.mjs",
  });
  if (!entropyBuild.success)
    throw new AggregateError(entropyBuild.logs, "Entropy qualifier build failed");
  const entropyModule = join(directory, "entropy.mjs");
  await command("bun", ["run", "build"], root);
  const [node, bun, browser, deno, edge] = await Promise.all([
    buildJs(directory, "node"),
    buildJs(directory, "bun"),
    buildJs(directory, "browser"),
    buildJs(directory, "deno"),
    buildJs(directory, "edge"),
  ]);
  // Select installed Node majors, not every historical patch retained in a version-manager cache.
  const nodes = new Map<string, string>([["node", "node"]]);
  const asdf = Bun.which("asdf");
  if (asdf) {
    const installed = (await command(asdf, ["list", "nodejs"], root))
      .split(/\s+/)
      .filter((v) => /^\d+\.\d+\.\d+$/.test(v));
    const majors = new Map<string, string>();
    for (const version of installed) {
      const major = version.split(".")[0] as string;
      const previous = majors.get(major);
      if (!previous || version.localeCompare(previous, undefined, { numeric: true }) > 0)
        majors.set(major, version);
    }
    for (const [major, version] of majors) {
      const home = (await command(asdf, ["where", "nodejs", version], root)).trim();
      nodes.set(`node-${major}`, join(home, "bin", "node"));
    }
  }
  const current = (await command("node", ["--version"], root)).trim();
  for (const [id, executable] of nodes) {
    const version = (await command(executable, ["--version"], root)).trim();
    if (id !== "node" && version === current) continue;
    lanes.push({
      id: `ts/${id}`,
      family: "TypeScript",
      version,
      hash: await sha256(node),
      command: [executable, node],
      argumentStyle: "json",
    });
  }
  lanes.push({
    id: "ts/bun",
    family: "TypeScript",
    version: (await command("bun", ["--version"], root)).trim(),
    hash: await sha256(bun),
    command: ["bun", bun],
    argumentStyle: "json",
  });
  lanes.push({
    id: "ts/deno",
    family: "TypeScript",
    version: (await command("deno", ["--version"], root)).trim(),
    hash: await sha256(deno),
    command: ["deno", "run", "--node-modules-dir=manual", "--cached-only", "--allow-all", deno],
    argumentStyle: "json",
  });
  for (const name of Object.keys(browserEngines) as (keyof typeof browserEngines)[]) {
    const instance = await browserEngines[name].launch({ headless: true });
    const version = instance.version();
    await instance.close();
    lanes.push({
      id: `ts/${name}`,
      family: "TypeScript",
      version,
      hash: await sha256(browser),
      browser: name,
      script: browser,
    });
  }
  const workerd = await workerdExecutable();
  const edgeVersion = (await command(workerd, ["--version"], root)).trim();
  for (const compatible of [false, true])
    lanes.push({
      id: `ts/workerd-${compatible ? "node-compatible" : "web"}`,
      family: "TypeScript workerd",
      version: edgeVersion,
      hash: await sha256(edge),
      script: edge,
      edge: compatible,
      command: [workerd],
    });
  const rust = await rustToolchain();
  const compiler = (await command(rust.rustc, ["-Vv"], root, rust.env)).trim();
  for (const profile of ["release"]) {
    for (const [feature, enabled] of Object.entries({
      "fast-rng": ["fast-rng"],
      "os-rng": ["std", "os-rng"],
      "os-rng-no-std": ["os-rng"],
      std: ["std"],
      reduced: [],
    })) {
      const requiresEntropy = enabled.some((name) => name === "os-rng" || name === "fast-rng");
      const features = [
        "--no-default-features",
        ...(enabled.length ? ["--features", enabled.join(",")] : []),
      ];
      for (const target of ["native", "wasm32-wasip1", "wasm32-wasip2", "wasm32-unknown-unknown"]) {
        const wasmJs = target === "wasm32-unknown-unknown";
        console.log(`Build: ${target}/${profile}/${feature}`);
        const build = await command(
          rust.cargo,
          [
            ...rust.cargoArgs,
            "build",
            "--manifest-path",
            "rust/Cargo.toml",
            "-p",
            "uuid-slug-benchmark",
            "--locked",
            "--message-format=json",
            "--config",
            "profile.release.opt-level=3",
            "--config",
            'profile.release.lto="thin"',
            "--config",
            "profile.release.codegen-units=1",
            ...(target === "native"
              ? ["--config", 'build.rustflags=["-C","target-cpu=native"]']
              : []),
            ...(wasmJs ? ["--lib"] : ["--bin", "uuid-slug-benchmark"]),
            "--release",
            ...features,
            ...(wasmJs && requiresEntropy
              ? ["--features", feature === "os-rng-no-std" ? "browser-entropy" : "wasm-js"]
              : []),
            ...(target === "native" ? [] : ["--target", target]),
          ],
          root,
          rust.env,
          { timeoutMs: 300_000 },
        );
        const artifacts = build
          .split("\n")
          .filter(Boolean)
          .map(
            (line) =>
              JSON.parse(line) as {
                reason: string;
                target?: { name: string };
                executable?: string;
                filenames?: string[];
                profile?: { opt_level: string; debug_assertions: boolean };
              },
          );
        const artifact = artifacts.find(
          (entry) =>
            entry.reason === "compiler-artifact" &&
            entry.target?.name === (wasmJs ? "uuid_slug_benchmark" : "uuid-slug-benchmark"),
        );
        const input = wasmJs
          ? artifact?.filenames?.find((file) => file.endsWith(".wasm"))
          : artifact?.executable;
        if (!input) throw new Error(`Cargo omitted ${profile}/${feature}/${target}`);
        // A release label is insufficient when ambient Cargo settings can change its profile.
        for (const built of [
          artifact,
          artifacts.find((entry) => entry.target?.name === "uuid_slug"),
        ]) {
          if (built?.profile?.opt_level !== "3" || built.profile.debug_assertions)
            throw new Error(
              `Unoptimized benchmark artifact: ${target}/${feature}; require opt-level=3 and disabled debug assertions.`,
            );
        }
        const name = `rust/${target}/${profile}/${feature}`;
        const destination = join(directory, name.replaceAll("/", "-"));
        if (target === "native") {
          await copyFile(input, destination);
          lanes.push({
            id: name,
            family: "Rust native",
            version: compiler,
            hash: await sha256(destination),
            command: [destination],
            argumentStyle: "positional",
            environment: rust.env,
          });
        } else if (!wasmJs) {
          await optimizeWasm(
            input,
            `${destination}.wasm`,
            target === "wasm32-wasip2" ? "component" : "module",
          );
          const start =
            'import {readFile} from "node:fs/promises"; import {WASI} from "node:wasi"; const w=new WASI({version:"preview1",args:["bench",...process.argv.slice(2)],returnOnExit:true}); const m=await WebAssembly.compile(await readFile(process.argv[1])); process.exitCode=w.start(await WebAssembly.instantiate(m,w.getImportObject()));';
          lanes.push({
            id: name,
            family: `Rust ${target}`,
            version: `${compiler}\nHost: ${target === "wasm32-wasip1" ? current : "jco"}`,
            hash: await sha256(`${destination}.wasm`),
            command:
              target === "wasm32-wasip1"
                ? ["node", "--input-type=module", "-e", start, `${destination}.wasm`]
                : ["bun", "x", "jco", "run", `${destination}.wasm`, "--"],
            argumentStyle: "positional",
          });
        } else {
          await mkdir(destination, { recursive: true });
          await command(
            "wasm-bindgen",
            [input, "--target", "web", "--out-dir", destination, "--out-name", "module"],
            root,
          );
          await optimizeWasm(
            join(destination, "module_bg.wasm"),
            join(destination, "optimized.wasm"),
          );
          await copyFile(join(destination, "optimized.wasm"), join(destination, "module_bg.wasm"));
          const wasm = join(destination, "module_bg.wasm");
          const script = join(destination, "module.js");
          const hash = await sha256(wasm);
          const edgeEntry = join(destination, "edge-entry.js");
          await writeFile(
            edgeEntry,
            `import {initSync,benchmark,entropy_probe} from "./module.js"; import {qualifyEntropy} from ${JSON.stringify(entropyModule)}; globalThis.uuidSlugBenchmark=s=>{initSync({module:globalThis.uuidSlugBenchmarkWasm});const q=qualifyEntropy(()=>JSON.parse(entropy_probe()),()=>undefined,${requiresEntropy});return {rows:JSON.parse(benchmark(s.samples,s.duration,s.warmup,s.filter,s.batchTicks)),entropy:q.entropy};};`,
          );
          const edgeBuild = await Bun.build({
            check: true,
            entrypoints: [edgeEntry],
            target: "browser",
            format: "iife",
            minify: { whitespace: true, syntax: true, identifiers: true, keepNames: true },
            outdir: destination,
            naming: "edge-benchmark.js",
          });
          if (!edgeBuild.success)
            throw new AggregateError(edgeBuild.logs, "WASM edge wrapper build failed");
          for (const compatible of [false, true])
            lanes.push({
              id: `${name}/workerd-${compatible ? "node-compatible" : "web"}`,
              family: `Rust browser WASM ${profile}/${feature}`,
              version: `${compiler}\nHost: ${edgeVersion}`,
              hash,
              edge: compatible,
              script: join(destination, "edge-benchmark.js"),
              wasm,
              command: [workerd],
              requiresEntropy,
            });
          for (const ts of lanes.filter(
            (lane) => lane.family === "TypeScript" && !lane.id.endsWith("node-jitless"),
          )) {
            const id = `${name}/${ts.id.slice(3)}`;
            if (ts.browser)
              lanes.push({
                id,
                family: `Rust browser WASM ${profile}/${feature}`,
                version: `${compiler}\nHost: ${ts.version}`,
                hash,
                browser: ts.browser,
                script,
                wasm,
                requiresEntropy,
                entropyModule,
              });
            else {
              const source = `import init,{benchmark,entropy_probe} from ${JSON.stringify(pathToFileURL(script).href)}; import {qualifyEntropy} from ${JSON.stringify(pathToFileURL(entropyModule).href)}; import {readFile} from "node:fs/promises"; await init({module_or_path:await readFile(${JSON.stringify(wasm)})});const q=qualifyEntropy(()=>JSON.parse(entropy_probe()),()=>undefined,${requiresEntropy}); console.log(JSON.stringify({rows:JSON.parse(benchmark(${settings.samples},${settings.duration},${settings.warmup},${JSON.stringify(settings.filter)},${settings.batchTicks})),entropy:q.entropy}));`;
              const worker = join(destination, `${ts.id.slice(3)}.mjs`);
              await writeFile(worker, source);
              const prefix = ts.command?.slice(0, -1);
              if (!prefix) throw new Error(`Missing JS host for ${id}`);
              lanes.push({
                id,
                family: `Rust browser WASM ${profile}/${feature}`,
                version: `${compiler}\nHost: ${ts.version}`,
                hash,
                command: [...prefix, worker],
                requiresEntropy,
              });
            }
          }
        }
      }
    }
  }
  for (const lane of lanes) if (lane.id.startsWith("ts/")) lane.requiresEntropy = true;
  const native = lanes.find((lane) => lane.id === "rust/native/release/fast-rng");
  if (!native) throw new Error("Missing native Rust comparison anchor");
  lanes.push({
    ...native,
    id: "cross-language/rust-native",
    family: "Cross-language anchor",
    reference: "ts/node",
  });
  const transportReference = await buildJs(
    join(directory, "transport-reference"),
    "node",
    "bench/implementation-transport-reference.ts",
  );
  lanes.push(
    ...(await prepareNativeTransports(directory, transportReference, {
      node: current,
      rust: compiler,
    })),
  );
  return lanes;
}
