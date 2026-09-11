// SPDX-License-Identifier: Apache-2.0

import { mkdir, readFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { checkReleasedApi, typescriptDeclarations } from "./api-evolution";
import { command } from "./command";
import { annotateRustApi, rustDeprecations } from "./rust-deprecations";
import type { Rustdoc } from "./rust-deprecations";

const root = resolve(import.meta.dir, "..");
const work = join(root, ".api-work");
const apiDirectory = join(root, "api");
const mode = process.argv[2];
const useExistingBuild = process.argv[3] === "--built" && process.argv.length === 4;

type PackageManifest = {
  devDependencies?: Record<string, unknown>;
};

if ((mode !== "check" && mode !== "update") || (process.argv.length > 3 && !useExistingBuild)) {
  throw new Error("Usage: bun scripts/api.ts <check|update> [--built]");
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
    throw new Error(
      `cargo-public-api ${expected} is required; found ${actual || "no version"}. Install it with: cargo install cargo-public-api --version ${expected} --locked`,
    );
}

async function checkApiExtractorVersion(packageManifest: PackageManifest): Promise<void> {
  const dependency = "@microsoft/api-extractor";
  const expected = packageManifest.devDependencies?.[dependency];
  if (typeof expected !== "string")
    throw new Error(
      `${dependency} must have an exact version in package.json. Restore package.json and bun.lock if it was removed accidentally, or choose the reviewed version with bun add --dev --exact ${dependency}@<version>.`,
    );
  let actual: unknown;
  try {
    const installedManifest = (await Bun.file(
      join(root, "node_modules/@microsoft/api-extractor/package.json"),
    ).json()) as { version?: unknown };
    actual = installedManifest.version;
  } catch (cause) {
    throw new Error(
      `Cannot read the installed ${dependency} manifest. Restore the locked development tools with: bun install --frozen-lockfile`,
      { cause },
    );
  }
  if (typeof actual !== "string")
    throw new Error(
      `The installed ${dependency} manifest has no string version. Restore the locked development tools with: bun install --frozen-lockfile`,
    );
  if (actual !== expected)
    throw new Error(
      `${dependency} must use the exact installed version in package.json; found ${expected} in package.json and ${actual} installed. Restore the locked development tools with bun install --frozen-lockfile, or pin the installed version with bun add --dev --exact ${dependency}@${actual} and review the regenerated API baseline.`,
    );
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

async function diff(
  label: string,
  fileName: string,
  baseline: string,
  current: string,
): Promise<boolean> {
  if (baseline === current) {
    console.log(`${label}: unchanged`);
    return false;
  }
  const baselinePath = join(apiDirectory, fileName);
  const currentPath = join(work, fileName);
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
  const sectionSummary = changedSections.length ? ` (${changedSections.join(", ")})` : "";
  console.log(`${label}: changed${sectionSummary}\n${stdout.trimEnd()}`);
  return true;
}

function report(language: string, contentSections: string[]): string {
  return `# ${language} packaged API\n\nThis generated baseline records consumer-visible declarations.\n\n${contentSections.join("\n\n")}\n`;
}

async function formatTypeScriptReport(declarations: string): Promise<string> {
  const source = `// Generated consumer-visible declarations; update with \`bun run api:update\` instead of editing.\n\n${declarations}\n`;
  const child = Bun.spawn(
    [join(root, "node_modules/.bin/oxfmt"), "--stdin-filepath=api/typescript.api.d.ts"],
    { cwd: root, stdin: new TextEncoder().encode(source), stdout: "pipe", stderr: "pipe" },
  );
  const [stdout, stderr, status] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (status !== 0) throw new Error(`oxfmt failed (${status}): ${stderr.trim()}`);
  return stdout;
}

async function readRustDeprecations(target: string): Promise<string[]> {
  const rustdoc = (await Bun.file(join(target, "doc/uuid_slug.json")).json()) as Rustdoc;
  return rustDeprecations(rustdoc);
}

await rm(work, { recursive: true, force: true });
await mkdir(work, { recursive: true });
let changed = false;
try {
  const packageManifest = (await Bun.file(join(root, "package.json")).json()) as PackageManifest;
  await checkApiExtractorVersion(packageManifest);
  await checkCargoPublicApiVersion();
  if (!useExistingBuild) await command("bun", ["run", "build"], root);
  await command("api-extractor", ["run", "--local", "--config", "api-extractor.json"], root);

  const declarationRollup = typescriptDeclarations(
    await readFile(join(work, "typescript.d.ts"), "utf8"),
  );
  const typescript = await formatTypeScriptReport(declarationRollup);

  const rustArgs = [
    "public-api",
    "--manifest-path",
    "rust/uuid-slug/Cargo.toml",
    "--color=never",
    "--simplified",
    "--include",
    "function-parameter-names",
  ];
  const rustTarget = (
    JSON.parse(
      await command(
        "cargo",
        [
          "metadata",
          "--manifest-path",
          "rust/Cargo.toml",
          "--no-deps",
          "--format-version",
          "1",
          "--locked",
        ],
        root,
      ),
    ) as { target_directory: string }
  ).target_directory;
  // cargo-public-api owns one rustdoc JSON path, so feature selections must not write it concurrently.
  const rustDefault = annotateRustApi(
    await command("cargo", [...rustArgs, "--all-features"], root),
    new Set(await readRustDeprecations(rustTarget)),
  );
  const rustMinimal = annotateRustApi(
    await command("cargo", [...rustArgs, "--no-default-features"], root),
    new Set(await readRustDeprecations(rustTarget)),
  );
  const rust = report("Rust", [
    `## All features\n\n\`\`\`rust\n${rustDefault}\n\`\`\``,
    `## No default features\n\n\`\`\`rust\n${rustMinimal}\n\`\`\``,
  ]);

  await mkdir(apiDirectory, { recursive: true });
  const outputs = [
    {
      label: "TypeScript API",
      fileName: "typescript.api.d.ts",
      path: join(apiDirectory, "typescript.api.d.ts"),
      content: typescript,
    },
    {
      label: "Rust API",
      fileName: "rust.api.md",
      path: join(apiDirectory, "rust.api.md"),
      content: rust,
    },
  ] as const;
  for (const output of outputs) {
    const baseline = (await Bun.file(output.path).exists())
      ? await Bun.file(output.path).text()
      : "";
    const differs = await diff(output.label, output.fileName, baseline, output.content);
    changed ||= differs;
    if (mode === "update" && differs) await Bun.write(output.path, output.content);
  }
  await checkReleasedApi(root, { typescript, rust });
} finally {
  await rm(work, { recursive: true, force: true });
}

if (mode === "check" && changed)
  throw new Error(
    "Public API differs from the reviewed baseline. Restore the source change if unintended. If intentional, run bun run api:update, review both generated diffs, and include them in the pull request; updating the baseline does not waive version or deprecation rules.",
  );
