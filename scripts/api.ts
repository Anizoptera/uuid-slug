// SPDX-License-Identifier: Apache-2.0

import { mkdir, readFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import ts from "typescript-floor";
import { command } from "./command";

const root = resolve(import.meta.dir, "..");
const work = join(root, ".api-work");
const apiDirectory = join(root, "api");
const mode = process.argv[2];
const useExistingBuild = process.argv[3] === "--built" && process.argv.length === 4;

if ((mode !== "check" && mode !== "update") || (process.argv.length > 3 && !useExistingBuild)) {
  throw new Error("Usage: bun scripts/api.ts <check|update> [--built]");
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    // Sorting this new array makes manifest output independent of producer key order.
    // oxlint-disable-next-line unicorn/no-array-sort
    entries.sort(([left], [right]) => left.localeCompare(right));
    return Object.fromEntries(entries.map(([key, entry]) => [key, stable(entry)]));
  }
  return value;
}

async function checkCargoPublicApiVersion(): Promise<void> {
  const expected = "0.52.0";
  let actual: string;
  try {
    actual = (await command("cargo", ["public-api", "--version"], root)).trim();
  } catch {
    throw new Error(
      `cargo-public-api ${expected} is required; install it with cargo install cargo-public-api --version ${expected} --locked.`,
    );
  }
  if (!actual.endsWith(expected))
    throw new Error(`cargo-public-api ${expected} is required; found ${actual || "no version"}.`);
}

async function checkApiExtractorVersion(): Promise<void> {
  const manifest = (await Bun.file(
    join(root, "node_modules/@microsoft/api-extractor/package.json"),
  ).json()) as { version?: string };
  if (manifest.version !== "7.59.1")
    throw new Error(`api-extractor 7.59.1 is required; found ${manifest.version ?? "no version"}.`);
}

function reportSections(source: string): Map<string, string> {
  const result = new Map<string, string>();
  const headings = [...source.matchAll(/^## (.+)$/gm)];
  for (const [index, match] of headings.entries()) {
    const heading = match[1];
    const start = (match.index ?? 0) + match[0].length;
    const end = headings[index + 1]?.index ?? source.length;
    if (heading !== undefined) result.set(heading, source.slice(start, end).trim());
  }
  return result;
}

async function diff(label: string, baseline: string, current: string): Promise<boolean> {
  if (baseline === current) {
    console.log(`${label}: unchanged`);
    return false;
  }
  const baselinePath = join(
    apiDirectory,
    label === "TypeScript API" ? "typescript.api.md" : "rust.api.md",
  );
  const currentPath = join(work, label === "TypeScript API" ? "typescript.api.md" : "rust.api.md");
  await Bun.write(currentPath, current);
  const child = Bun.spawn(
    ["git", "diff", "--no-index", "--no-ext-diff", "--", baselinePath, currentPath],
    { cwd: root, stdout: "pipe", stderr: "pipe" },
  );
  const [stdout, stderr, status] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (status !== 1) throw new Error(`git diff failed (${status}): ${stderr.trim()}`);
  const before = reportSections(baseline);
  const after = reportSections(current);
  const changedSections = [...new Set([...before.keys(), ...after.keys()])].filter(
    (section) => before.get(section) !== after.get(section),
  );
  console.log(`${label}: changed (${changedSections.join(", ")})\n${stdout.trimEnd()}`);
  return true;
}

function typescriptManifest(manifest: Record<string, unknown>): Record<string, unknown> {
  return stable({
    engines: manifest.engines,
    exports: manifest.exports,
    files: manifest.files,
    imports: manifest.imports,
    main: manifest.main,
    module: manifest.module,
    name: manifest.name,
    sideEffects: manifest.sideEffects,
    type: manifest.type,
    types: manifest.types,
  }) as Record<string, unknown>;
}

async function rustManifest(): Promise<Record<string, unknown>> {
  const metadata = JSON.parse(
    await command(
      "cargo",
      ["metadata", "--manifest-path", "rust/Cargo.toml", "--format-version", "1", "--locked"],
      root,
    ),
  ) as {
    packages: Array<{
      name: string;
      edition: string;
      rust_version: string | null;
      features: Record<string, string[]>;
      dependencies: Array<{
        name: string;
        req: string;
        kind: string | null;
        optional: boolean;
        uses_default_features: boolean;
        features: string[];
        target: string | null;
      }>;
      targets: Array<{ kind: string[]; crate_types: string[] }>;
    }>;
  };
  const product = metadata.packages.find((entry) => entry.name === "uuid-slug");
  if (!product) throw new Error("Cargo metadata has no uuid-slug product.");
  return stable({
    name: product.name,
    edition: product.edition,
    rustVersion: product.rust_version,
    features: product.features,
    dependencies: product.dependencies.map((dependency) => ({
      name: dependency.name,
      requirement: dependency.req,
      kind: dependency.kind,
      optional: dependency.optional,
      defaultFeatures: dependency.uses_default_features,
      features: dependency.features,
      target: dependency.target,
    })),
    targets: product.targets.map(({ kind, crate_types: crateTypes }) => ({ kind, crateTypes })),
  }) as Record<string, unknown>;
}

function report(
  language: string,
  manifest: Record<string, unknown>,
  contentSections: string[],
): string {
  return `# ${language} packaged API\n\nThis generated baseline records the consumer-visible declarations and manifest conditions.\n\n## Manifest\n\n\`\`\`json\n${JSON.stringify(manifest, null, 2)}\n\`\`\`\n\n${contentSections.join("\n\n")}\n`;
}

function normalizeDeclarations(source: string): { declarations: string; deprecations: string } {
  const file = ts.createSourceFile("typescript.d.ts", source, ts.ScriptTarget.Latest, true);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: true });
  const deprecated: string[] = [];
  function visit(node: ts.Node): void {
    const tag = ts.getJSDocTags(node).find(({ tagName }) => tagName.text === "deprecated");
    if (tag) {
      const declaration = printer.printNode(ts.EmitHint.Unspecified, node, file).trim();
      const reason = typeof tag.comment === "string" ? ` — ${tag.comment.trim()}` : "";
      deprecated.push(`${declaration}${reason}`);
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return {
    declarations: printer.printFile(file).trim(),
    deprecations: deprecated.length === 0 ? "(none)" : deprecated.join("\n\n"),
  };
}

await rm(work, { recursive: true, force: true });
await mkdir(work, { recursive: true });
await checkApiExtractorVersion();
await checkCargoPublicApiVersion();
if (!useExistingBuild) await command("bun", ["run", "build"], root);
await command("api-extractor", ["run", "--local", "--config", "api-extractor.json"], root);

const packageManifest = (await Bun.file(join(root, "package.json")).json()) as Record<
  string,
  unknown
>;
const declarationRollup = normalizeDeclarations(
  await readFile(join(work, "typescript.d.ts"), "utf8"),
);
const typescript = report("TypeScript", typescriptManifest(packageManifest), [
  `## Reachable declarations\n\n\`\`\`ts\n${declarationRollup.declarations}\n\`\`\``,
  `## Deprecations\n\n${declarationRollup.deprecations}`,
]);

const rustArgs = [
  "public-api",
  "--manifest-path",
  "rust/uuid-slug/Cargo.toml",
  "--color=never",
  "--simplified",
  "--include",
  "function-parameter-names",
];
// cargo-public-api owns one rustdoc JSON path, so feature selections must not write it concurrently.
const rustDefault = await command("cargo", [...rustArgs, "--all-features"], root);
const rustMinimal = await command("cargo", [...rustArgs, "--no-default-features"], root);
const rustMetadata = await rustManifest();
const rust = report("Rust", rustMetadata, [
  `## All features\n\n\`\`\`text\n${rustDefault.trim()}\n\`\`\``,
  `## No default features\n\n\`\`\`text\n${rustMinimal.trim()}\n\`\`\``,
]);

await mkdir(apiDirectory, { recursive: true });
const outputs = [
  { label: "TypeScript API", path: join(apiDirectory, "typescript.api.md"), content: typescript },
  { label: "Rust API", path: join(apiDirectory, "rust.api.md"), content: rust },
] as const;
let changed = false;
for (const output of outputs) {
  const baseline = (await Bun.file(output.path).exists()) ? await Bun.file(output.path).text() : "";
  const differs = await diff(output.label, baseline, output.content);
  changed ||= differs;
  if (mode === "update" && differs) await Bun.write(output.path, output.content);
}
await rm(work, { recursive: true, force: true });

if (mode === "check" && changed)
  throw new Error("Packaged API changed. Obtain approval, then run bun run api:update.");
