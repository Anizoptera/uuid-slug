import { brotliCompressSync, gzipSync, zstdCompressSync } from "node:zlib";
import { mkdir, rm } from "node:fs/promises";
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
  "payload.ts",
  "migration.ts",
  "mask-handle.ts",
  "mask.ts",
  "siphash.ts",
  "codec.js",
  "feistel.js",
  "payload.js",
  "migration.js",
  "mask-handle.js",
  "mask.js",
  "siphash.js",
]);

const jobs = [
  {
    name: "uuid",
    imports: "uuidStringToBytes",
    probe:
      'const value = uuidStringToBytes("b1ba599d-4844-4bb0-a1ee-ac0aeb8875f5"); if (value instanceof Error || value.length !== 16) throw new Error("uuidStringToBytes failed");',
    masked: false,
    versions: [],
  },
  {
    name: "slug",
    imports: "uuidStringToSlug",
    probe:
      'if (uuidStringToSlug("b1ba599d-4844-4bb0-a1ee-ac0aeb8875f5") !== "sbpZnUhES7Ch7qwK64h19Q") throw new Error("uuidStringToSlug failed");',
    masked: false,
    versions: [],
  },
  {
    name: "slug-v4",
    imports: "generateUuidV4Slug",
    probe:
      'const value = generateUuidV4Slug(); if (value instanceof Error || value.length !== 22) throw new Error("generateUuidV4Slug failed");',
    masked: false,
    versions: [4],
  },
  {
    name: "slug-v7",
    imports: "generateUuidV7Slug",
    probe:
      'const value = generateUuidV7Slug(); if (value instanceof Error || value.length !== 22) throw new Error("generateUuidV7Slug failed");',
    masked: false,
    versions: [7],
  },
  {
    name: "masked",
    imports: "createUuidV7SlugCodec, UUID_V7_TEST_MASK",
    probe:
      'const codec = createUuidV7SlugCodec({ mask: UUID_V7_TEST_MASK }); if (codec instanceof Error || codec.uuidStringToSlug("0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051") instanceof Error) throw new Error("masked codec failed");',
    masked: true,
    versions: [7],
  },
] as const;

const consumerSource = (job: (typeof jobs)[number], packageName: string): string =>
  `import { ${job.imports} } from ${JSON.stringify(packageName)};\n${job.probe}\n`;

interface ConsumerGraphResult {
  readonly job: (typeof jobs)[number]["name"];
  readonly optimizer: Optimizer;
  readonly rawBytes: number;
  readonly gzipBytes: number;
  readonly brotliBytes: number;
  readonly zstdBytes: number;
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

export function formatConsumerGraph(results: readonly ConsumerGraphResult[]): string {
  return [
    "job optimizer raw gzip brotli zstd",
    ...results.map(
      (result) =>
        `${result.job} ${result.optimizer} ` +
        `${result.rawBytes} ${result.gzipBytes} ${result.brotliBytes} ${result.zstdBytes}`,
    ),
  ].join("\n");
}

/** Prove named root imports retain only their requested generation and masking domains. */
export async function inspectConsumerGraph(
  consumerRoot: string,
  packageName: string,
): Promise<readonly ConsumerGraphResult[]> {
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
    const cases = jobs.flatMap((job) =>
      optimizers.map(async (optimizer): Promise<ConsumerGraphResult> => {
        const caseName = `${job.name}-${optimizer}`;
        const entryFile = path.join(root, `${caseName}.js`);
        await Bun.write(entryFile, consumerSource(job, packageName));
        const { code, modules, sources } = await compileConsumer(
          optimizer,
          entryFile,
          path.join(root, caseName),
        );
        if (job.versions.length > 0) {
          if (![...sources].some((source) => /(?:^|\/)runtime\/portable\.[jt]s$/.test(source)))
            throw new Error(`${caseName} did not bundle the portable runtime adapter.`);
          if (
            [...sources].some((source) =>
              /(?:^|\/)(?:node\/runtime|runtime\/node)\.[jt]s$/.test(source),
            )
          )
            throw new Error(`${caseName} bundled the Node runtime adapter for a browser.`);
        }
        const retainsMasking = [...modules].some((module) => MASKING_MODULE_FILES.has(module));
        if (retainsMasking !== job.masked)
          throw new Error(`${caseName} ${job.masked ? "lost" : "retained"} masking code.`);
        for (const version of [4, 7] as const) {
          const retainsVersion = includesVersion(job.versions, version);
          const hasVersion = [...VERSION_MODULES[version]].some((module) => modules.has(module));
          if (hasVersion !== retainsVersion)
            throw new Error(
              `${caseName} ${retainsVersion ? "lost" : "retained"} UUIDv${version} generation code.`,
            );
        }
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
    return await settleAll(cases);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
