import { brotliCompressSync, gzipSync, zstdCompressSync } from "node:zlib";
import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";

import { command } from "./command";
import { compileConsumer } from "./consumer-bundlers";
import type { Optimizer } from "./consumer-bundlers";

const VERSION_MODULES = {
  4: new Set(["v4.js", "v4.ts"]),
  7: new Set(["v7-keyless.js", "v7-keyless.ts", "v7.js", "v7.ts"]),
} as const;

const MASKING_MODULE_FILES = new Set([
  "codec.ts",
  "feistel.ts",
  "legacy-mask.ts",
  "mask.ts",
  "migration.ts",
  "schema-handle.ts",
  "schema.ts",
  "siphash.ts",
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
    versions: [],
  },
  {
    name: "slug",
    subpath: "/slug",
    imports: "uuidToSlug",
    probe:
      'if (uuidToSlug("b1ba599d-4844-4bb0-a1ee-ac0aeb8875f5") !== "sbpZnUhES7Ch7qwK64h19Q") throw new Error("uuidToSlug failed");',
    masked: false,
    versions: [],
  },
  {
    name: "slug-v4",
    subpath: "/slug/v4",
    imports: "generateUuidV4Slug",
    probe:
      'const value = generateUuidV4Slug(); if (value instanceof Error || value.length !== 22) throw new Error("generateUuidV4Slug failed");',
    masked: false,
    versions: [4],
  },
  {
    name: "slug-v7",
    subpath: "/slug/v7",
    imports: "generateUuidV7Slug",
    probe:
      'const value = generateUuidV7Slug(); if (value instanceof Error || value.length !== 22) throw new Error("generateUuidV7Slug failed");',
    masked: false,
    versions: [7],
  },
  {
    name: "v4",
    subpath: "/v4",
    imports: "generateUuidV4",
    probe:
      'const value = generateUuidV4(); if (value instanceof Error || !/^[0-9a-f-]{36}$/.test(value)) throw new Error("generateUuidV4 failed");',
    masked: false,
    versions: [4],
  },
  {
    name: "v7",
    subpath: "/v7",
    imports: "generateUuidV7",
    probe:
      'const value = generateUuidV7(); if (value instanceof Error || value[14] !== "7") throw new Error("generateUuidV7 failed");',
    masked: false,
    versions: [7],
  },
  {
    name: "v4-v7",
    subpath: "",
    imports: "generateUuidV4, generateUuidV7",
    probe:
      'const a = generateUuidV4(); const b = generateUuidV7(); if (a instanceof Error || b instanceof Error) throw new Error("combined UUID generation failed");',
    masked: false,
    versions: [4, 7],
  },
  {
    name: "slug-v4-compose",
    subpath: "",
    imports: "generateUuidV4Bytes, bytesToSlug",
    probe:
      'const bytes = generateUuidV4Bytes(); if (bytes instanceof Error || bytesToSlug(bytes) instanceof Error) throw new Error("composed UUIDv4 slug generation failed");',
    masked: false,
    versions: [4],
  },
  {
    name: "slug-v7-compose",
    subpath: "",
    imports: "generateUuidV7Bytes, bytesToSlug",
    probe:
      'const bytes = generateUuidV7Bytes(); if (bytes instanceof Error || bytesToSlug(bytes) instanceof Error) throw new Error("composed UUIDv7 slug generation failed");',
    masked: false,
    versions: [7],
  },
  {
    name: "masked",
    subpath: null,
    imports: "createUuidV7SlugCodec, UUID_V7_TEST_MASK",
    probe:
      'const codec = createUuidV7SlugCodec({ mask: UUID_V7_TEST_MASK }); if (codec instanceof Error || codec.encodeUuid("0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051") instanceof Error) throw new Error("masked codec failed");',
    masked: true,
    versions: [7],
  },
] as const;

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
  readonly entry: "root" | "subpath";
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

async function settleAll<Value>(promises: readonly Promise<Value>[]): Promise<Awaited<Value>[]> {
  // The scratch tree is shared by every compiler and removed by the caller. Wait for every child
  // before surfacing failures so one rejection cannot delete files beneath siblings still running.
  const results = await Promise.allSettled(promises);
  const failures: unknown[] = [];
  const values: Awaited<Value>[] = [];
  for (const result of results)
    if (result.status === "rejected") failures.push(result.reason);
    else values.push(result.value);
  if (failures.length > 0) throw new AggregateError(failures, "Consumer graph checks failed.");
  return values;
}

const includesVersion = (versions: readonly (4 | 7)[], version: 4 | 7): boolean =>
  versions.includes(version);

export function formatConsumerGraph(report: ConsumerGraphReport): string {
  return [
    "job entry optimizer raw gzip brotli zstd",
    ...report.bundled.map(
      (result) =>
        `${result.job} ${result.entry} ${result.optimizer} ` +
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

/** Prove root and focused imports retain only their requested generation and masking domains. */
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
    const direct = await settleAll(
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
      optimizers.flatMap((optimizer) =>
        (job.subpath === null ? (["root"] as const) : (["root", "subpath"] as const)).map(
          async (entry): Promise<ConsumerGraphResult> => {
            const caseName = `${job.name}-${entry}-${optimizer}`;
            const entryFile = path.join(root, `${caseName}.js`);
            await Bun.write(entryFile, consumerSource(job, packageName, entry));
            const { code, modules } = await compileConsumer(
              optimizer,
              entryFile,
              path.join(root, caseName),
            );
            const retainsMasking = [...modules].some((module) => MASKING_MODULE_FILES.has(module));
            if (retainsMasking !== job.masked)
              throw new Error(`${caseName} ${job.masked ? "lost" : "retained"} masking code.`);
            for (const version of [4, 7] as const) {
              const retainsVersion = includesVersion(job.versions, version);
              const hasVersion = [...VERSION_MODULES[version]].some((module) =>
                modules.has(module),
              );
              if (hasVersion !== retainsVersion)
                throw new Error(
                  `${caseName} ${retainsVersion ? "lost" : "retained"} UUIDv${version} generation code.`,
                );
            }
            await command("node", [path.join(root, caseName, "bundle.js")], consumerRoot);
            return {
              entry,
              job: job.name,
              optimizer,
              rawBytes: code.byteLength,
              gzipBytes: gzipSync(code).byteLength,
              brotliBytes: brotliCompressSync(code).byteLength,
              zstdBytes: zstdCompressSync(code).byteLength,
            };
          },
        ),
      ),
    );
    const bundled = await settleAll(cases);
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
