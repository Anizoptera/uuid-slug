// Reuse optimized feature artifacts while measuring one real generated boundary per identifier.
import { copyFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Lane } from "./implementation-build";
import { TRANSPORT_REFERENCE_ID } from "./implementation-transport";

export async function prepareTransportModule(directory: string): Promise<string> {
  // All feature variants share this exact host loop; compile it once outside acquisition.
  const built = await Bun.build({
    check: true,
    entrypoints: ["bench/implementation-transport.ts"],
    target: "browser",
    format: "esm",
    outdir: directory,
    naming: "transport.mjs",
    minify: { whitespace: true, syntax: true, identifiers: true, keepNames: true },
  });
  if (!built.success)
    throw new AggregateError(built.logs, "Transport measurement helper build failed");
  return join(directory, "transport.mjs");
}

export async function prepareWasmTransports(
  artifact: {
    directory: string;
    script: string;
    wasm: string;
    hash: string;
    name: string;
    compiler: string;
  },
  hosts: readonly Lane[],
  modules: { transport: string; host: string },
): Promise<Lane[]> {
  const { directory, script, wasm, hash, name } = artifact;
  // Per-call rows execute generated marshalling too; optimize that JS once for every host.
  const glueBuild = await Bun.build({
    check: true,
    entrypoints: [script],
    target: "browser",
    format: "esm",
    outdir: join(directory, "minified"),
    naming: "module.js",
    minify: { whitespace: true, syntax: true, identifiers: true, keepNames: true },
  });
  if (!glueBuild.success) throw new AggregateError(glueBuild.logs, "WASM marshalling build failed");
  await copyFile(join(directory, "minified", "module.js"), script);
  const measure = `import {measureUuidStringToPlainSlug} from ${JSON.stringify(pathToFileURL(modules.transport).href)};`;
  const glue = JSON.stringify(pathToFileURL(script).href);
  const edgeEntry = join(directory, "transport-edge-entry.js");
  await writeFile(
    edgeEntry,
    `import {initSync,plain} from ${glue}; ${measure} globalThis.uuidSlugBenchmark=s=>{initSync({module:globalThis.uuidSlugBenchmarkWasm});return {rows:measureUuidStringToPlainSlug(s,plain)};};`,
  );
  const edge = await Bun.build({
    check: true,
    entrypoints: [edgeEntry],
    target: "browser",
    format: "iife",
    minify: { whitespace: true, syntax: true, identifiers: true, keepNames: true },
    outdir: directory,
    naming: "transport-edge.js",
  });
  if (!edge.success) throw new AggregateError(edge.logs, "WASM transport wrapper build failed");
  const lanes: Lane[] = [];
  for (const host of hosts) {
    const identity = {
      id: `transport/${name}/${host.id.slice(3)}`,
      family: "Per-call transports",
      reference: TRANSPORT_REFERENCE_ID,
      version: `${artifact.compiler}\nHost: ${host.version}`,
      hash,
      requiresRuntimeVersion: host.requiresRuntimeVersion,
    };
    if (host.edge !== undefined)
      lanes.push({
        ...identity,
        edge: host.edge,
        ...(host.command ? { command: host.command } : {}),
        script: join(directory, "transport-edge.js"),
        wasm,
      });
    else if (host.browser)
      lanes.push({
        ...identity,
        browser: host.browser,
        script,
        wasm,
        transportModule: modules.transport,
      });
    else {
      const worker = join(directory, `transport-${host.id.slice(3)}.mjs`);
      await writeFile(
        worker,
        `import init,{plain} from ${glue}; ${measure} import {processRuntimeVersion} from ${JSON.stringify(modules.host)}; import {readFile} from "node:fs/promises"; await init({module_or_path:await readFile(${JSON.stringify(wasm)})});console.log(JSON.stringify({runtimeVersion:processRuntimeVersion(),rows:measureUuidStringToPlainSlug(JSON.parse(process.argv[2]),plain)}));`,
      );
      const prefix = host.command?.slice(0, -1);
      if (!prefix) throw new Error(`Missing JS host for ${identity.id}`);
      lanes.push({ ...identity, command: [...prefix, worker], argumentStyle: "json" });
    }
  }
  return lanes;
}
