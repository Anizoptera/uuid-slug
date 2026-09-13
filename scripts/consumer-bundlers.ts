import { mkdir, readFile, rename } from "node:fs/promises";
import path from "node:path";

import { rspack } from "@rspack/core";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import type { Configuration as RspackConfiguration } from "@rspack/core";
import { build as esbuild } from "esbuild";
import { rollup } from "rollup";
import { rolldown } from "rolldown";
import { command } from "./command";

export type Optimizer = "bun" | "esbuild" | "parcel" | "rollup" | "rolldown" | "rspack" | "webpack";

export interface CompiledBundle {
  readonly code: Uint8Array;
  readonly modules: ReadonlySet<string>;
  readonly sources: ReadonlySet<string>;
}

async function readCompiledBundle(outfile: string): Promise<CompiledBundle> {
  const map = (await Bun.file(`${outfile}.map`).json()) as { sources?: unknown };
  if (!Array.isArray(map.sources) || !map.sources.every((source) => typeof source === "string"))
    throw new Error(`Invalid consumer source map: ${outfile}.map`);
  const sources = new Set(map.sources);
  return {
    code: await readFile(outfile),
    modules: new Set([...sources].map((source) => path.basename(source))),
    sources,
  };
}

const bundlerConfig = (entry: string, outdir: string) => ({
  context: path.dirname(entry),
  devtool: "source-map" as const,
  entry,
  mode: "production" as const,
  output: { filename: "bundle.js", path: outdir },
  optimization: { minimize: true, usedExports: true },
});

const compileWebpack = (entry: string, outdir: string): Promise<void> =>
  command(
    "node",
    [path.join(import.meta.dir, "webpack-consumer.mjs"), entry, outdir],
    path.resolve(import.meta.dir, ".."),
  ).then(() => undefined);

const compileRspack = (entry: string, outdir: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const config = { ...bundlerConfig(entry, outdir), target: "web" } satisfies RspackConfiguration;
    rspack(config, (error, stats) => {
      if (error) return reject(error);
      if (!stats || stats.hasErrors())
        return reject(new Error(stats?.toString({ all: false, errors: true }) ?? "No stats."));
      resolve();
    });
  });

export async function compileConsumer(
  optimizer: Optimizer,
  entry: string,
  outdir: string,
): Promise<CompiledBundle> {
  const outfile = path.join(outdir, "bundle.js");
  await mkdir(outdir, { recursive: true });
  if (optimizer === "bun") {
    const result = await Bun.build({
      entrypoints: [entry],
      minify: true,
      naming: "bundle.js",
      outdir,
      sourcemap: "external",
      target: "browser",
    });
    if (!result.success) throw new AggregateError(result.logs, "Bun consumer build failed.");
  } else if (optimizer === "esbuild") {
    await esbuild({
      bundle: true,
      entryPoints: [entry],
      format: "esm",
      minify: true,
      outfile,
      platform: "browser",
      sourcemap: "external",
      target: "es2022",
    });
  } else if (optimizer === "parcel") {
    const parcelOutput = path.join(outdir, path.basename(entry));
    await command(
      path.join(import.meta.dir, "../node_modules/.bin/parcel"),
      [
        "build",
        path.basename(entry),
        "--dist-dir",
        outdir,
        "--no-content-hash",
        "--no-cache",
        "--log-level",
        "error",
      ],
      path.dirname(entry),
    );
    await rename(parcelOutput, outfile);
    await rename(`${parcelOutput}.map`, `${outfile}.map`);
    return readCompiledBundle(outfile);
  } else if (optimizer === "rollup") {
    const build = await rollup({ input: entry, plugins: [nodeResolve({ browser: true })] });
    try {
      await build.write({ file: outfile, format: "esm", sourcemap: true });
    } finally {
      await build.close();
    }
  } else if (optimizer === "rolldown") {
    const build = await rolldown({ input: entry, platform: "browser" });
    try {
      await build.write({ file: outfile, format: "esm", minify: true, sourcemap: true });
    } finally {
      await build.close();
    }
  } else {
    await (optimizer === "webpack" ? compileWebpack(entry, outdir) : compileRspack(entry, outdir));
  }
  return readCompiledBundle(outfile);
}
