import { mkdir, mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import ts from "typescript-floor";
import { rustManifest, typescriptManifest } from "./api-manifest";
import { command } from "./command";
import type { ReleaseInputs, RetainedArchive } from "./release-inputs";
import { readRetainedArchive } from "./release-inputs";
import { preflightRelease } from "./release-notes";

interface Sizes {
  readonly npm?: number;
  readonly crate?: number;
  readonly native?: number;
  readonly wasm?: number;
}

type ReleaseLevel = "prerelease" | "patch" | "minor" | "major";

interface ApiDifference {
  readonly report: string;
  readonly level: ReleaseLevel;
}

interface CommandResult {
  readonly output: string;
  readonly status: number;
}

type ArchiveFiles = ReadonlyMap<string, Blob>;

function verifyArchiveRoot(files: ArchiveFiles, prefix: string): void {
  for (const name of files.keys()) {
    const relative = name.startsWith(prefix) ? name.slice(prefix.length) : "";
    if (
      !relative ||
      relative.includes("\\") ||
      relative.split("/").some((part) => !part || part === "." || part === "..")
    )
      throw new Error(`Archive contains a path outside ${prefix}.`);
  }
}

export async function verifyCrateIdentity(
  files: ArchiveFiles,
  version: string,
  commit: string,
): Promise<void> {
  const prefix = `uuid-slug-${version}/`;
  verifyArchiveRoot(files, prefix);
  const cargo = files.get(`${prefix}Cargo.toml`);
  const vcs = files.get(`${prefix}.cargo_vcs_info.json`);
  if (!cargo || !vcs) throw new Error("Crate has no identity metadata.");
  const manifest = Bun.TOML.parse(await cargo.text()) as { package?: { version?: unknown } };
  const source = (await vcs.json()) as { git?: { sha1?: unknown } };
  if (manifest.package?.version !== version || source.git?.sha1 !== commit)
    throw new Error(`Crate does not identify ${version} at ${commit}.`);
}

export async function verifyNpmIdentity(
  files: ArchiveFiles,
  name: string,
  version: string,
): Promise<Record<string, unknown>> {
  verifyArchiveRoot(files, "package/");
  const manifest = files.get("package/package.json");
  if (!manifest) throw new Error("npm archive has no package manifest.");
  const metadata = (await manifest.json()) as Record<string, unknown>;
  if (metadata.name !== name || metadata.version !== version)
    throw new Error(`npm archive does not identify ${name}@${version}.`);
  return metadata;
}

function normalizeDeclarations(source: string): string {
  const file = ts.createSourceFile("public.d.ts", source, ts.ScriptTarget.Latest, true);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: true });
  // One record per complete declaration keeps members attached to their owner and overloads ordered.
  return file.statements
    .map((node) => JSON.stringify(printer.printNode(ts.EmitHint.Unspecified, node, file).trim()))
    .join("\n");
}

export async function measureLinkedSizes(
  cwd: string,
  crate: string,
  work: string,
  label: string,
): Promise<Pick<Sizes, "native" | "wasm">> {
  const driver = join(work, `driver-${label}`);
  const target = join(work, `target-${label}`);
  await mkdir(join(driver, "src"), { recursive: true });
  await Promise.all([
    Bun.write(
      join(driver, "Cargo.toml"),
      `[package]\nname = "uuid-slug-linked-probe"\nversion = "0.0.0"\nedition = "2021"\n\n[dependencies]\nuuid-slug = { path = ${JSON.stringify(crate)}, default-features = false }\n`,
    ),
    Bun.write(
      join(driver, "src/main.rs"),
      `use std::hint::black_box;\nuse uuid_slug::{Codec, CodecOptions, Uuid};\nfn main() {\n let uuid = Uuid::parse("01890f3e-93b8-7cc6-a76b-b2a67b746c2a").unwrap();\n black_box(Codec::new(CodecOptions::default()).unwrap().uuid_to_slug(uuid));\n}\n`,
    ),
  ]);
  const manifest = join(driver, "Cargo.toml");
  const base = ["build", "--release", "--manifest-path", manifest];
  const env = { CARGO_TARGET_DIR: target };
  await command("cargo", base, cwd, env);
  await command("cargo", [...base, "--target", "wasm32-unknown-unknown"], cwd, env);
  return {
    native: (await stat(join(target, "release/uuid-slug-linked-probe"))).size,
    wasm: (await stat(join(target, "wasm32-unknown-unknown/release/uuid-slug-linked-probe.wasm")))
      .size,
  };
}

async function extractArchive(
  root: string,
  archive: RetainedArchive,
  destination: string,
  version: string,
  commit: string,
): Promise<string> {
  const contents = new Bun.Archive(await readRetainedArchive(root, archive));
  const files = await contents.files();
  await verifyCrateIdentity(files, version, commit);
  await contents.extract(destination);
  return dirname(join(destination, `uuid-slug-${version}/Cargo.toml`));
}

async function declaration(
  root: string,
  archive: RetainedArchive,
  work: string,
  label: string,
  name: string,
  version: string,
): Promise<string> {
  const extracted = join(work, `npm-${label}`);
  const rollup = join(extracted, "public.d.ts");
  const packageRoot = join(extracted, "package");
  const config = join(packageRoot, "api-extractor.json");
  const contents = new Bun.Archive(await readRetainedArchive(root, archive));
  const files = await contents.files();
  if (!files.has("package/dist/index.d.ts"))
    throw new Error(`${basename(archive.file)} has no packaged TypeScript declarations.`);
  const metadata = await verifyNpmIdentity(files, name, version);
  await contents.extract(extracted);
  await Bun.write(
    config,
    JSON.stringify({
      extends: join(root, "api-extractor.json"),
      projectFolder: packageRoot,
      mainEntryPointFilePath: join(packageRoot, "dist/index.d.ts"),
      compiler: { tsconfigFilePath: join(root, "tsconfig.json") },
      dtsRollup: { enabled: true, untrimmedFilePath: rollup },
    }),
  );
  await command("api-extractor", ["run", "--local", "--config", config], root);
  return `${JSON.stringify(typescriptManifest(metadata))}\n${normalizeDeclarations(await Bun.file(rollup).text())}`;
}

async function rustApi(cwd: string, manifest: string): Promise<string> {
  const base = ["public-api", "--manifest-path", manifest, "--color=never", "--simplified"];
  const all = await command("cargo", [...base, "--all-features"], cwd);
  const minimal = await command("cargo", [...base, "--no-default-features"], cwd);
  const metadata = await rustManifest(cwd, manifest);
  return `${JSON.stringify(metadata)}\n${all
    .trim()
    .split("\n")
    .map((line) => `all: ${line}`)
    .join("\n")}\n${minimal
    .trim()
    .split("\n")
    .map((line) => `minimal: ${line}`)
    .join("\n")}\n`;
}

async function runSemver(args: string[], cwd: string, target: string): Promise<CommandResult> {
  const child = Bun.spawn(["cargo", "semver-checks", ...args], {
    cwd,
    env: { ...process.env, CARGO_TARGET_DIR: target },
    signal: AbortSignal.timeout(30_000),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, status] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { output: `${stdout}${stderr}`.trim(), status };
}

export async function rustSemverDifference(
  cwd: string,
  current: string,
  baseline: string,
  work: string,
): Promise<ApiDifference> {
  const failures: string[] = [];
  for (const feature of ["--all-features", "--only-explicit-features"] as const) {
    const result = await runSemver(
      [
        "--manifest-path",
        join(current, "Cargo.toml"),
        "--baseline-root",
        baseline,
        "--release-type",
        "minor",
        feature,
        "--color",
        "never",
      ],
      cwd,
      join(work, feature.slice(2)),
    );
    if (result.status === 100) failures.push(result.output);
    else if (result.status !== 0)
      throw new Error(`cargo-semver-checks failed (${result.status}): ${result.output}`);
  }
  return failures.length
    ? { report: failures.join("\n\n"), level: "major" }
    : { report: "No Rust semantic compatibility violations.", level: "patch" };
}

function displayDeclaration(line: string): string {
  return (line.startsWith('"') ? (JSON.parse(line) as string) : line).replaceAll("`", "\\`");
}

function apiDifference(before: string, after: string, language: string): ApiDifference {
  if (before === after) return { report: `No packaged ${language} changes.`, level: "patch" };
  const oldLines = new Set(
    before
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  );
  const newLines = new Set(
    after
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  );
  const removed = [...oldLines].filter((line) => !newLines.has(line));
  const added = [...newLines].filter((line) => !oldLines.has(line));
  const previous = before.split("\n").filter(Boolean);
  let retained = 0;
  for (const line of after.split("\n")) if (line === previous[retained]) retained++;
  // Sets cannot detect moved members, repeated declarations, or overload precedence.
  if (!removed.length && !added.length)
    return {
      report: `Declaration order or ownership changed.\n\nBefore:\n\n\`\`\`text\n${before}\n\`\`\`\n\nAfter:\n\n\`\`\`text\n${after}\n\`\`\``,
      level: "major",
    };
  return {
    report: [
      ...removed.map((line) => `- \`${displayDeclaration(line)}\``),
      ...added.map((line) => `- \`${displayDeclaration(line)}\` (added)`),
    ].join("\n"),
    level: removed.length || retained !== previous.length ? "major" : "minor",
  };
}

export const apiDiff = (before: string, after: string): string =>
  apiDifference(
    normalizeDeclarations(before),
    normalizeDeclarations(after),
    "TypeScript declaration",
  ).report;

export function minimumRelease(
  version: string,
  notes: string,
  languages: readonly ReleaseLevel[],
): ReleaseLevel {
  if (version.split("+", 1)[0]?.includes("-")) return "prerelease";
  const declared = notes.includes("### Breaking changes")
    ? "major"
    : notes.includes("### Added")
      ? "minor"
      : "patch";
  const strongest =
    declared === "major" || languages.includes("major")
      ? "major"
      : declared === "minor" || languages.includes("minor")
        ? "minor"
        : "patch";
  return version.startsWith("0.") && strongest === "major" ? "minor" : strongest;
}

export function satisfiesMinimum(
  previous: string,
  current: string,
  minimum: ReleaseLevel,
): boolean {
  if (minimum === "prerelease" || previous.split("+", 1)[0]?.includes("-")) return true;
  const [oldMajorText, oldMinorText] = previous.split(".");
  const [newMajorText, newMinorText] = current.split(".");
  if (
    !oldMajorText ||
    !oldMinorText ||
    !newMajorText ||
    !newMinorText ||
    ![oldMajorText, oldMinorText, newMajorText, newMinorText].every((part) => /^\d+$/.test(part))
  )
    return false;
  const oldMajor = BigInt(oldMajorText);
  const oldMinor = BigInt(oldMinorText);
  const newMajor = BigInt(newMajorText);
  const newMinor = BigInt(newMinorText);
  if (minimum === "major") return newMajor > oldMajor;
  if (minimum === "minor")
    return newMajor > oldMajor || (newMajor === oldMajor && newMinor > oldMinor);
  return Bun.semver.order(current, previous) > 0;
}

export function sizeDelta(current: number | undefined, previous: number | undefined): string {
  if (current === undefined || previous === undefined) return "unavailable";
  const absolute = current - previous;
  if (previous === 0) return `${current} B (${absolute >= 0 ? "+" : ""}${absolute} B)`;
  const percentage = (absolute / previous) * 100;
  return `${current} B (${absolute >= 0 ? "+" : ""}${absolute} B, ${percentage >= 0 ? "+" : ""}${percentage.toFixed(1)}%)`;
}

function sizeTable(current: Sizes, previous: Sizes): string {
  return [
    "| Artifact | Current | Change |",
    "| --- | ---: | ---: |",
    ...(["npm", "crate", "native", "wasm"] as const).map(
      (key) =>
        `| ${key} | ${current[key] ?? "unavailable"} | ${sizeDelta(current[key], previous[key])} |`,
    ),
  ].join("\n");
}

async function historicalEvidence(
  root: string,
  work: string,
  comparison: ReleaseInputs["comparisons"][number],
): Promise<{ sizes: Sizes; crateRoot?: string }> {
  const { npm, crate } = comparison;
  if (!crate)
    return { sizes: { ...(npm ? { npm: (await stat(resolve(root, npm.file))).size } : {}) } };
  const extracted = join(work, basename(crate.file, ".crate"));
  const crateRoot = await extractArchive(
    root,
    crate,
    extracted,
    comparison.tag.slice(1),
    comparison.commit,
  );
  return {
    crateRoot,
    sizes: {
      ...(npm ? { npm: (await stat(resolve(root, npm.file))).size } : {}),
      crate: (await stat(resolve(root, crate.file))).size,
      ...(await measureLinkedSizes(root, crateRoot, work, basename(crate.file, ".crate"))),
    },
  };
}

/** Generate retry-stable notes from retained bytes and final linked caller outputs. */
export async function releaseReport(cwd: string, artifacts = "release-artifacts"): Promise<void> {
  const root = resolve(cwd);
  const directory = resolve(root, artifacts);
  const semverVersion = (await command("cargo", ["semver-checks", "--version"], root)).trim();
  if (semverVersion !== "cargo-semver-checks 0.50.0")
    throw new Error(`cargo-semver-checks 0.50.0 is required; found ${semverVersion}.`);
  const inputs = (await Bun.file(
    join(directory, "history/release-inputs.json"),
  ).json()) as ReleaseInputs;
  const { notes, name, version, commit } = await preflightRelease(root, inputs.tag);
  if (inputs.name !== name || inputs.version !== version || inputs.commit !== commit)
    throw new Error("Retained release inputs do not identify the checked package and commit.");
  const npm = resolve(root, inputs.candidate.npm.file);
  const crate = resolve(root, inputs.candidate.crate.file);
  const work = await mkdtemp(join(tmpdir(), "uuid-slug-release-report-"));
  try {
    const crateRoot = await extractArchive(
      root,
      inputs.candidate.crate,
      join(work, "current-crate"),
      inputs.version,
      inputs.commit,
    );
    const currentDeclaration = await declaration(
      root,
      inputs.candidate.npm,
      work,
      "current",
      inputs.name,
      inputs.version,
    );
    const currentRust = await rustApi(root, join(crateRoot, "Cargo.toml"));
    const current: Sizes = {
      npm: (await stat(npm)).size,
      crate: (await stat(crate)).size,
      ...(await measureLinkedSizes(root, crateRoot, work, "current")),
    };
    const sections = await Promise.all(
      inputs.comparisons.map(async (comparison) => {
        const previous = await historicalEvidence(root, work, comparison);
        const typescript = comparison.npm
          ? apiDifference(
              await declaration(
                root,
                comparison.npm,
                work,
                comparison.tag,
                inputs.name,
                comparison.tag.slice(1),
              ),
              currentDeclaration,
              "TypeScript declaration",
            )
          : undefined;
        const rust = previous.crateRoot
          ? apiDifference(
              await rustApi(root, join(previous.crateRoot, "Cargo.toml")),
              currentRust,
              "Rust public signature",
            )
          : undefined;
        const rustSemver = previous.crateRoot
          ? await rustSemverDifference(
              root,
              crateRoot,
              previous.crateRoot,
              join(work, `semver-${comparison.tag}`),
            )
          : undefined;
        const minimum = minimumRelease(
          inputs.version,
          notes,
          [typescript?.level, rust?.level, rustSemver?.level].filter(
            (level): level is ReleaseLevel => !!level,
          ),
        );
        if (!satisfiesMinimum(comparison.tag.slice(1), inputs.version, minimum))
          throw new Error(
            `${inputs.version} is below the ${minimum} release required from ${comparison.tag}.`,
          );
        const api = [
          `#### TypeScript\n\n${typescript?.report ?? "Unavailable because npm has no release history."}`,
          `#### Rust\n\n${rust?.report ?? "Unavailable because crates.io has no release history."}${rustSemver ? `\n\n${rustSemver.report}` : ""}`,
        ].join("\n\n");
        return {
          minimum,
          text: `## ${comparison.role === "immediate" ? "Previous release" : "Previous release line"}: ${comparison.tag}\n\n### Minimum compatible release\n\n${minimum}\n\n### Packaged API\n\n${api}\n\n### Size\n\n${sizeTable(current, previous.sizes)}`,
        };
      }),
    );
    const report = {
      current,
      comparisons: inputs.comparisons.map(({ role, tag }, index) => ({
        role,
        tag,
        minimum: sections[index]?.minimum,
      })),
    };
    await Promise.all([
      Bun.write(join(directory, "release-report.json"), `${JSON.stringify(report, null, 2)}\n`),
      Bun.write(
        join(directory, "notes.md"),
        `${notes.trimEnd()}\n\n${sections.map(({ text }) => text).join("\n\n")}\n`,
      ),
    ]);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

if (import.meta.main)
  releaseReport(process.cwd(), process.argv[2]).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
