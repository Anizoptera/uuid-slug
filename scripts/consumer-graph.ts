import { brotliCompressSync, gzipSync, zstdCompressSync } from "node:zlib";
import { mkdir, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";

import { rspack } from "@rspack/core";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import type { Configuration as RspackConfiguration } from "@rspack/core";
import { build as esbuild } from "esbuild";
import { rollup } from "rollup";
import { rolldown } from "rolldown";
import { command } from "./command";

/**
 * The seed `UUID_V7_TEST_MASK` derives its key from. Frozen by the wire format — changing it
 * orphans every masked slug ever issued — which is what makes it a stable witness rather than a
 * string that drifts. Its presence in a keyless bundle means the cipher, the schema and the
 * sentinel table came with it.
 */
const MASKING_WITNESS = "anizoptera.uuid-slug.default-mask.v1";

const MASKING_MODULE_FILES = new Set([
  "codec.js",
  "feistel.js",
  "legacy-mask.js",
  "mask.js",
  "migration.js",
  "schema-handle.js",
  "schema.js",
  "siphash.js",
]);

const jobs = [
  {
    name: "uuid",
    subpath: "/uuid",
    imports: "uuidToBytes",
    probe:
      'const value = uuidToBytes("b1ba599d-4844-4bb0-a1ee-ac0aeb8875f5"); if (value instanceof Error || value.length !== 16) throw new Error("uuidToBytes failed");',
    masked: false,
  },
  {
    name: "slug",
    subpath: "/slug",
    imports: "uuidToSlug",
    probe:
      'if (uuidToSlug("b1ba599d-4844-4bb0-a1ee-ac0aeb8875f5") !== "sbpZnUhES7Ch7qwK64h19Q") throw new Error("uuidToSlug failed");',
    masked: false,
  },
  {
    name: "slug-v4",
    subpath: "/slug/v4",
    imports: "generateUuidV4Slug",
    probe:
      'const value = generateUuidV4Slug(); if (value instanceof Error || value.length !== 22) throw new Error("generateUuidV4Slug failed");',
    masked: false,
  },
  {
    name: "slug-v7",
    subpath: "/slug/v7",
    imports: "generateUuidV7Slug",
    probe:
      'const value = generateUuidV7Slug(); if (value instanceof Error || value.length !== 22) throw new Error("generateUuidV7Slug failed");',
    masked: false,
  },
  {
    name: "v4",
    subpath: "/v4",
    imports: "generateUuidV4",
    probe:
      'const value = generateUuidV4(); if (value instanceof Error || !/^[0-9a-f-]{36}$/.test(value)) throw new Error("generateUuidV4 failed");',
    masked: false,
  },
  {
    name: "v7",
    subpath: "/v7",
    imports: "generateUuidV7",
    probe:
      'const value = generateUuidV7(); if (value instanceof Error || value[14] !== "7") throw new Error("generateUuidV7 failed");',
    masked: false,
  },
  {
    name: "v4-v7",
    subpath: "",
    imports: "generateUuidV4, generateUuidV7",
    probe:
      'const a = generateUuidV4(); const b = generateUuidV7(); if (a instanceof Error || b instanceof Error) throw new Error("combined UUID generation failed");',
    masked: false,
  },
  {
    name: "slug-v4-compose",
    subpath: "",
    imports: "generateUuidV4Bytes, bytesToSlug",
    probe:
      'const bytes = generateUuidV4Bytes(); if (bytes instanceof Error || bytesToSlug(bytes) instanceof Error) throw new Error("composed UUIDv4 slug generation failed");',
    masked: false,
  },
  {
    name: "slug-v7-compose",
    subpath: "",
    imports: "generateUuidV7Bytes, bytesToSlug",
    probe:
      'const bytes = generateUuidV7Bytes(); if (bytes instanceof Error || bytesToSlug(bytes) instanceof Error) throw new Error("composed UUIDv7 slug generation failed");',
    masked: false,
  },
  {
    name: "masked",
    subpath: null,
    imports: "createUuidV7SlugCodec, UUID_V7_TEST_MASK",
    probe:
      'const codec = createUuidV7SlugCodec({ mask: UUID_V7_TEST_MASK }); if (codec instanceof Error || codec.encodeUuid("0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051") instanceof Error) throw new Error("masked codec failed");',
    masked: true,
  },
] as const;

type Optimizer = "bun" | "esbuild" | "parcel" | "rollup" | "rolldown" | "rspack" | "webpack";

function consumerSource(
  job: (typeof jobs)[number],
  packageName: string,
  entryKind: "root" | "subpath",
): string {
  if (entryKind === "subpath" && job.name === "v4-v7")
    return `import { generateUuidV4 } from ${JSON.stringify(`${packageName}/v4`)};\nimport { generateUuidV7 } from ${JSON.stringify(`${packageName}/v7`)};\n${job.probe}\n`;
  if (entryKind === "subpath" && job.name === "slug-v4-compose")
    return `import { generateUuidV4Bytes } from ${JSON.stringify(`${packageName}/v4`)};\nimport { bytesToSlug } from ${JSON.stringify(`${packageName}/slug`)};\n${job.probe}\n`;
  if (entryKind === "subpath" && job.name === "slug-v7-compose")
    return `import { generateUuidV7Bytes } from ${JSON.stringify(`${packageName}/v7`)};\nimport { bytesToSlug } from ${JSON.stringify(`${packageName}/slug`)};\n${job.probe}\n`;
  const specifier = `${packageName}${entryKind === "subpath" ? job.subpath : ""}`;
  return `import { ${job.imports} } from ${JSON.stringify(specifier)};\n${job.probe}\n`;
}

interface ConsumerGraphResult {
  readonly job: (typeof jobs)[number]["name"];
  readonly optimizer: Optimizer;
  readonly rawBytes: number;
  readonly gzipBytes: number;
  readonly brotliBytes: number;
  readonly zstdBytes: number;
}

interface DirectConsumerResult {
  readonly entry: "root" | "subpath";
  readonly job: Exclude<(typeof jobs)[number]["name"], "masked">;
  readonly modules: number;
}

interface ConsumerGraphReport {
  readonly bundled: readonly ConsumerGraphResult[];
  readonly direct: readonly DirectConsumerResult[];
}

export function formatConsumerGraph(report: ConsumerGraphReport): string {
  return [
    "job optimizer raw gzip brotli zstd",
    ...report.bundled.map(
      (result) =>
        `${result.job} ${result.optimizer} ` +
        `${result.rawBytes} ${result.gzipBytes} ${result.brotliBytes} ${result.zstdBytes}`,
    ),
    "",
    "job entry modules",
    ...report.direct.map((result) => `${result.job} ${result.entry} ${result.modules}`),
  ].join("\n");
}

async function countDirectModules(
  root: string,
  consumerRoot: string,
  source: string,
  caseName: string,
): Promise<readonly string[]> {
  const loader = path.join(root, "module-loader.mjs");
  const runner = path.join(root, `direct-${caseName}.mjs`);
  const log = path.join(root, `direct-${caseName}.log`);
  await Bun.write(runner, source);
  await command("node", ["--no-warnings", "--experimental-loader", loader, runner], consumerRoot, {
    UUID_SLUG_MODULE_LOG: log,
  });
  return (await readFile(log, "utf8")).trim().split("\n");
}

const bundlerConfig = (entry: string, outdir: string) => ({
  context: path.dirname(entry),
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

async function compile(optimizer: Optimizer, entry: string, outdir: string): Promise<Uint8Array> {
  const outfile = path.join(outdir, "bundle.js");
  await mkdir(outdir, { recursive: true });
  if (optimizer === "bun") {
    const result = await Bun.build({
      entrypoints: [entry],
      minify: true,
      naming: "bundle.js",
      outdir,
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
      target: "es2022",
    });
  } else if (optimizer === "parcel") {
    await command(
      path.join(import.meta.dir, "../node_modules/.bin/parcel"),
      [
        "build",
        path.basename(entry),
        "--dist-dir",
        outdir,
        "--no-content-hash",
        "--no-source-maps",
        "--no-cache",
        "--log-level",
        "error",
      ],
      path.dirname(entry),
    );
    await rename(path.join(outdir, path.basename(entry)), outfile);
    return readFile(outfile);
  } else if (optimizer === "rollup") {
    const build = await rollup({ input: entry, plugins: [nodeResolve({ browser: true })] });
    try {
      await build.write({ file: outfile, format: "esm" });
    } finally {
      await build.close();
    }
  } else if (optimizer === "rolldown") {
    const build = await rolldown({ input: entry, platform: "browser" });
    try {
      await build.write({ file: outfile, format: "esm", minify: true });
    } finally {
      await build.close();
    }
  } else {
    await (optimizer === "webpack" ? compileWebpack(entry, outdir) : compileRspack(entry, outdir));
  }
  return readFile(outfile);
}

/** Prove root imports retain masking only when requested and focused entries bypass it directly. */
export async function inspectConsumerGraph(
  consumerRoot: string,
  packageName: string,
): Promise<ConsumerGraphReport> {
  const root = path.join(consumerRoot, "consumer-graph");
  const optimizers = [
    "bun",
    "esbuild",
    "parcel",
    "rollup",
    "rolldown",
    "rspack",
    "webpack",
  ] as const;
  try {
    await mkdir(root, { recursive: true });
    await Bun.write(
      path.join(root, "package.json"),
      JSON.stringify({ private: true, "@parcel/resolver-default": { packageExports: true } }),
    );
    await Bun.write(
      path.join(root, "module-loader.mjs"),
      'import { appendFileSync } from "node:fs";\nconst log = process.env.UUID_SLUG_MODULE_LOG;\nexport async function load(url, context, nextLoad) {\n  if (log && url.includes("/package/dist/")) appendFileSync(log, url + "\\n");\n  return nextLoad(url, context);\n}\n',
    );
    const direct = await Promise.all(
      jobs.flatMap((job) =>
        job.subpath === null
          ? []
          : (["root", "subpath"] as const).map(async (entry) => {
              const modules = await countDirectModules(
                root,
                consumerRoot,
                consumerSource(job, packageName, entry),
                `${job.name}-${entry}`,
              );
              if (entry === "subpath") {
                const maskingModules = modules.filter((url) =>
                  MASKING_MODULE_FILES.has(path.basename(new URL(url).pathname)),
                );
                if (maskingModules.length > 0)
                  throw new Error(
                    `${job.name} subpath loaded masking modules:\n${maskingModules.join("\n")}`,
                  );
              }
              return { entry, job: job.name, modules: modules.length };
            }),
      ),
    );
    const cases = jobs.flatMap((job) =>
      optimizers.map(async (optimizer): Promise<ConsumerGraphResult> => {
        const caseName = `${job.name}-${optimizer}`;
        const entry = path.join(root, `${caseName}.js`);
        await Bun.write(entry, consumerSource(job, packageName, "root"));
        const code = await compile(optimizer, entry, path.join(root, caseName));
        const text = new TextDecoder().decode(code);
        // The masked case proves the witness remains observable; otherwise its removal or rename
        // could make every keyless exclusion pass without testing masking at all.
        if (text.includes(MASKING_WITNESS) !== job.masked)
          throw new Error(`${caseName} ${job.masked ? "lost" : "retained"} masking code.`);
        await command("node", [path.join(root, caseName, "bundle.js")], consumerRoot);
        return {
          job: job.name,
          optimizer,
          rawBytes: code.byteLength,
          gzipBytes: gzipSync(code).byteLength,
          brotliBytes: brotliCompressSync(code).byteLength,
          zstdBytes: zstdCompressSync(code).byteLength,
        };
      }),
    );
    const bundled = await Promise.all(cases);
    for (const subpath of direct.filter((result) => result.entry === "subpath")) {
      const rootResult = direct.find(
        (result) => result.entry === "root" && result.job === subpath.job,
      );
      if (rootResult === undefined || subpath.modules >= rootResult.modules)
        throw new Error(
          `${subpath.job} subpath does not reduce direct ESM modules: ` +
            `root=${rootResult?.modules}, subpath=${subpath.modules}.`,
        );
    }
    return { bundled, direct };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
