// Build production JavaScript routes and fingerprint the exact files used by acquisition.
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import packageJson from "../package.json" with { type: "json" };

export async function sha256(file: string): Promise<string> {
  return createHash("sha256")
    .update(await readFile(file))
    .digest("hex");
}

export async function buildJs(
  directory: string,
  target: "bun" | "node" | "browser" | "deno" | "edge",
  entrypoint?: string,
) {
  const runtime = target === "edge" ? "browser" : target;
  const entry =
    runtime === "bun"
      ? packageJson.exports["."].bun
      : runtime === "deno"
        ? packageJson.exports["."].deno
        : packageJson.exports["."].default;
  const adapter =
    runtime === "browser"
      ? packageJson.imports["#runtime"].default
      : packageJson.imports["#runtime"][runtime];
  const result = await Bun.build({
    check: true,
    minify: { whitespace: true, syntax: true, identifiers: true, keepNames: true },
    entrypoints: [
      entrypoint ??
        (runtime === "browser" ? "bench/implementation-worker.ts" : "bench/implementation-cli.ts"),
    ],
    target: runtime === "deno" ? "node" : runtime,
    format: target === "edge" ? "iife" : "esm",
    outdir: directory,
    naming: `${target}.mjs`,
    conditions: [runtime],
    metafile: true,
    plugins: [
      {
        name: "public-package-route",
        setup(builder) {
          // Bun snapshots implicit conditions at startup; select the manifest's production adapter explicitly.
          builder.onResolve({ filter: /^#runtime$/ }, () => ({ path: resolve(adapter) }));
          builder.onResolve({ filter: /^\.\.\/src\/index(?:\.ts)?$/ }, () => ({
            path: resolve(entry),
          }));
        },
      },
    ],
  });
  if (!result.success) throw new AggregateError(result.logs, `Benchmark build failed: ${target}`);
  const inputs = Object.keys(result.metafile?.inputs ?? {});
  for (const expected of [entry, adapter])
    if (!inputs.some((input) => resolve(input) === resolve(expected)))
      throw new Error(
        `${target} benchmark did not select ${expected}; inspect its package export conditions`,
      );
  await writeFile(join(directory, `${target}.inputs.json`), JSON.stringify(result.metafile));
  return join(directory, `${target}.mjs`);
}
