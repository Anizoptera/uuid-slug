import { brotliCompressSync, gzipSync, zstdCompressSync } from "node:zlib";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

import { command } from "./command";
import { compileConsumer } from "./consumer-bundlers";
import type { Optimizer } from "./consumer-bundlers";
import vectors from "../rust/uuid-slug/tests/fixtures/fixtures-wire-format.json";

const maskedVector = vectors.find(
  ({ mask, uuid }) => mask === "default" && uuid === "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051",
);
if (!maskedVector) throw new Error("The retained default-mask consumer vector is missing.");

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
const UUID_VALUE_MODULE_FILES = new Set(["uuid-value.js", "uuid-value.ts"]);

const jobs = [
  {
    name: "uuid",
    imports: "uuidStringToBytes",
    probe:
      'const value = uuidStringToBytes("b1ba599d-4844-4bb0-a1ee-ac0aeb8875f5"); if (value instanceof Error || value.length !== 16) throw new Error("uuidStringToBytes failed");',
    masked: false,
    uuidValue: false,
    versions: [],
  },
  {
    name: "slug",
    imports: "uuidStringToPlainSlug",
    probe:
      'if (uuidStringToPlainSlug("b1ba599d-4844-4bb0-a1ee-ac0aeb8875f5") !== "sbpZnUhES7Ch7qwK64h19Q") throw new Error("uuidStringToPlainSlug failed");',
    masked: false,
    uuidValue: false,
    versions: [],
  },
  {
    name: "slug-decode",
    imports: "plainSlugToUuidBytes",
    probe:
      'const value = plainSlugToUuidBytes("sbpZnUhES7Ch7qwK64h19Q"); if (value instanceof Error || value.constructor !== Uint8Array || value.join(",") !== "177,186,89,157,72,68,75,176,161,238,172,10,235,136,117,245") throw new Error("plainSlugToUuidBytes failed");',
    masked: false,
    uuidValue: false,
    versions: [],
  },
  {
    name: "slug-v4",
    // Read wire bits without a package decoder import, which would change the graph being measured.
    imports: "generatePlainUuidV4Slug",
    probe:
      'const value = generatePlainUuidV4Slug(); const bytes = atob(value.replaceAll("-", "+").replaceAll("_", "/")); if (!/^[A-Za-z0-9_-]{21}[AQgw]$/.test(value) || bytes.length !== 16 || bytes.charCodeAt(6) >>> 4 !== 4 || (bytes.charCodeAt(8) & 0xc0) !== 0x80) throw new Error("generatePlainUuidV4Slug failed");',
    masked: false,
    uuidValue: false,
    versions: [4],
  },
  {
    name: "slug-v7",
    imports: "generatePlainUuidV7Slug",
    probe:
      'const value = generatePlainUuidV7Slug(); const bytes = atob(value.replaceAll("-", "+").replaceAll("_", "/")); if (!/^[A-Za-z0-9_-]{21}[AQgw]$/.test(value) || bytes.length !== 16 || bytes.charCodeAt(6) >>> 4 !== 7 || (bytes.charCodeAt(8) & 0xc0) !== 0x80) throw new Error("generatePlainUuidV7Slug failed");',
    masked: false,
    uuidValue: false,
    versions: [7],
  },
  {
    name: "masked",
    imports: "createUuidV7MaskingCodec, UUID_V7_TEST_MASK",
    probe: `const codec = createUuidV7MaskingCodec({ mask: UUID_V7_TEST_MASK }); if (codec instanceof Error || codec.uuidToMaskedSlug(${JSON.stringify(maskedVector.uuid)}) !== ${JSON.stringify(maskedVector.masked)}) throw new Error("masked codec failed");`,
    masked: true,
    uuidValue: true,
    versions: [7],
  },
  {
    name: "uuid-value",
    imports: "parseUuid",
    probe:
      'const value = parseUuid("b1ba599d-4844-4bb0-a1ee-ac0aeb8875f5"); if (value instanceof Error || value.toString() !== "b1ba599d-4844-4bb0-a1ee-ac0aeb8875f5") throw new Error("parseUuid failed");',
    masked: false,
    uuidValue: true,
    versions: [],
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
  // Size differences cannot identify surviving work. Retain exact decoder bundles only when
  // requested, so inspection reuses the verified compilation rather than reconstructing it.
  const decoderBundleDir = process.env.UUID_SLUG_DECODER_BUNDLE_DIR;
  const optimizers = [
    "bun",
    "esbuild",
    "parcel",
    "rollup",
    "rolldown",
    "rspack",
    "webpack",
  ] as const;
  let completed = false;
  try {
    await mkdir(root, { recursive: true });
    if (decoderBundleDir) await mkdir(decoderBundleDir, { recursive: true });
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
        const retainsUuidValue = [...modules].some((module) => UUID_VALUE_MODULE_FILES.has(module));
        if (retainsUuidValue !== job.uuidValue)
          throw new Error(
            `${caseName} ${job.uuidValue ? "lost" : "retained"} immutable UUID value code.`,
          );
        for (const version of [4, 7] as const) {
          const retainsVersion = includesVersion(job.versions, version);
          const hasVersion = [...VERSION_MODULES[version]].some((module) => modules.has(module));
          if (hasVersion !== retainsVersion)
            throw new Error(
              `${caseName} ${retainsVersion ? "lost" : "retained"} UUIDv${version} generation code.`,
            );
        }
        await command("node", [path.join(root, caseName, "bundle.js")], consumerRoot);
        if (job.name === "slug-decode" && decoderBundleDir)
          await Bun.write(path.join(decoderBundleDir, `${optimizer}.js`), code);
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
    const results = await settleAll(cases);
    completed = true;
    return results;
  } finally {
    // The artifact owner archives failures with their extracted package; deleting this subtree
    // first would leave a diagnostic command whose inputs no longer exist.
    if (completed) await rm(root, { recursive: true, force: true });
  }
}
