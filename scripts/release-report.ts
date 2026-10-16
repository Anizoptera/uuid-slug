import { mkdir, mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { command } from "./command";
import { fromMarkdown } from "mdast-util-from-markdown";
import {
  lineApiSections,
  binarySize,
  combineReleaseLevels,
  minimumRelease,
  normalizeDeclarations,
  satisfiesMinimum,
  sectionsLevel,
  typeScriptApiSections,
} from "./release-comparison";
import { incompatibleExports } from "./api-compatibility";
import type { ApiDifference, ApiSections, ReleaseLevel } from "./release-comparison";
import type { ReleaseInputs, RetainedArchive } from "./release-inputs";
import { readRetainedArchive } from "./release-inputs";
import { declaredRenames, preflightRelease } from "./release-notes";
import { taggedVersionGuidance } from "./release-version";
import { releaseSelection } from "./release-selection";
import type { ReleaseSelection } from "./release-selection";
import {
  cargoSurfaceDifference,
  npmReleaseSurface,
  npmSurfaceDifference,
  rustReleaseSurface,
} from "./release-surface";
import type { CargoReleaseSurface, NpmReleaseSurface } from "./release-surface";

export interface Sizes {
  readonly npm?: number;
  readonly crate?: number;
  readonly native?: number;
  readonly wasm?: number;
}

export interface ReleaseReport {
  /** Identity for the notes' package and history links. */
  readonly release: {
    readonly name: string;
    readonly crate: string;
    readonly version: string;
    readonly repository: string;
  };
  readonly current: Sizes;
  readonly comparisons: readonly {
    readonly role: "immediate" | "releaseLine";
    readonly tag: string;
    readonly minimum: ReleaseLevel | undefined;
    readonly previous: Sizes;
    readonly npmApi: ApiSections | undefined;
    readonly crateApi: ApiSections | undefined;
  }[];
}

const CRATE_NAME = "uuid-slug";

export function consumerReleaseNotes(
  notes: string,
  report: ReleaseReport,
  selected: ReleaseSelection,
): string {
  // Publication selection can change on retry; render from retained evidence, not stale notes.
  const latest = report.comparisons.find(({ role }) => role === "immediate");
  const keys =
    selected === "npm"
      ? (["npm"] as const)
      : selected === "crate"
        ? (["crate"] as const)
        : (["npm", "crate"] as const);
  const labels = { npm: "npm package", crate: "Rust crate" } as const;
  // Each API diff goes to the end of the section a caller reads for that kind of change.
  let body = notes.trimEnd();
  for (const [section, heading] of [
    ["breaking", "Breaking changes"],
    ["added", "Added"],
    ["changed", "Changed"],
  ] as const) {
    const parts = keys.flatMap((key) => {
      const fragment = (key === "npm" ? latest?.npmApi : latest?.crateApi)?.[section];
      if (!fragment) return [];
      return [keys.length > 1 ? `**${labels[key]}**\n\n${fragment}` : fragment];
    });
    if (parts.length) body = appendToSection(body, heading, parts.join("\n\n"));
  }
  const { name, crate, version, repository } = report.release;
  const sizes = keys.flatMap((key) => {
    const now = report.current[key];
    if (now === undefined) return [];
    const before = latest?.previous[key];
    const change =
      before === undefined || !latest
        ? ""
        : now === before
          ? `, unchanged from ${latest.tag}`
          : `, ${now > before ? "up" : "down"} ${binarySize(now - before)}${before ? ` (${now > before ? "+" : ""}${(((now - before) / before) * 100).toFixed(1)}%)` : ""} from ${latest.tag}`;
    return [
      `**${keys.length > 1 ? `${labels[key]} size` : "Package size"}**: ${binarySize(now)} compressed${change}`,
    ];
  });
  // GitHub renders each line break in a release body, so these stay one entry per line.
  const links = [
    ...(selected !== "crate"
      ? [
          `**NPM Package**: [\`${name} v${version}\`](https://www.npmjs.com/package/${name}/v/${version})`,
        ]
      : []),
    ...(selected !== "npm"
      ? [`**Rust Crate**: [\`${crate} v${version}\`](https://crates.io/crates/${crate}/${version})`]
      : []),
    `**Full Commit History**: ${latest ? `${repository}/compare/${latest.tag}...v${version}` : `${repository}/commits/v${version}`}`,
  ];
  return `${body}\n\n${[...sizes, ...links].join("\n")}\n`;
}

/** Release level of API sections plus package metadata, whose prose leads the matching section. */
function withMetadata(
  sections: ApiSections,
  metadata: ApiDifference,
  changed: boolean,
): { level: ReleaseLevel; sections: ApiSections } {
  const level = combineReleaseLevels(sectionsLevel(sections), metadata.level);
  if (!changed) return { level, sections };
  const key = metadata.level === "major" ? "breaking" : "changed";
  return {
    level,
    sections: {
      ...sections,
      [key]: [metadata.report, sections[key]].filter(Boolean).join("\n\n"),
    },
  };
}

/**
 * Appends `block` at the end of the `### heading` section. A missing Added or Changed heading is
 * created; a missing Breaking changes heading fails, because only prose can tell callers how to upgrade.
 */
function appendToSection(notes: string, heading: string, block: string): string {
  const headings = fromMarkdown(notes).children.filter(
    (node) => node.type === "heading" && node.depth <= 3,
  );
  const index = headings.findIndex(
    (node) =>
      node.type === "heading" &&
      node.depth === 3 &&
      node.children.map((child) => (child.type === "text" ? child.value : "")).join("") === heading,
  );
  if (index < 0) {
    if (heading === "Breaking changes")
      throw new Error(
        'The API breaks existing callers, but the CHANGELOG section has no "### Breaking changes" heading. Explain there what callers must change.',
      );
    return `${notes}\n\n### ${heading}\n\n${block}`;
  }
  const end = headings[index + 1]?.position?.start.offset ?? notes.length;
  return `${notes.slice(0, end).trimEnd()}\n\n${block}${end < notes.length ? `\n\n${notes.slice(end)}` : ""}`;
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
  const prefix = `${CRATE_NAME}-${version}/`;
  verifyArchiveRoot(files, prefix);
  const cargo = files.get(`${prefix}Cargo.toml`);
  const vcs = files.get(`${prefix}.cargo_vcs_info.json`);
  if (!cargo || !vcs) throw new Error("Crate has no identity metadata.");
  const manifest = Bun.TOML.parse(await cargo.text()) as {
    package?: { version?: unknown };
  };
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
      `use std::hint::black_box;\nuse uuid_slug::{uuid_v7_test_mask, Uuid, UuidV7MaskingCodec, UuidV7MaskingCodecOptions};\nfn main() {\n let uuid = Uuid::from_uuid_string("01890f3e-93b8-7cc6-a76b-b2a67b746c2a").unwrap();\n black_box(UuidV7MaskingCodec::new(UuidV7MaskingCodecOptions::new(uuid_v7_test_mask())).unwrap().uuid_to_masked_slug(uuid).unwrap());\n}\n`,
    ),
  ]);
  const manifest = join(driver, "Cargo.toml");
  const base = ["build", "--release", "--manifest-path", manifest];
  // Resolve from the repository, not the external driver or a system Cargo on PATH.
  const [cargo, rustc] = await Promise.all(
    ["cargo", "rustc"].map(async (tool) => (await command("rustup", ["which", tool], cwd)).trim()),
  );
  if (!cargo || !rustc) throw new Error("Repository Rust toolchain could not be resolved.");
  // macOS linker children need Cargo to forward the selected compiler's LLVM library path.
  if (process.platform === "darwin")
    base.push(
      "--config",
      `env.DYLD_LIBRARY_PATH.value=${JSON.stringify(join(dirname(rustc), "..", "lib"))}`,
      "--config",
      "env.DYLD_LIBRARY_PATH.force=true",
    );
  const env = { CARGO_TARGET_DIR: target, RUSTC: rustc };
  await command(cargo, base, cwd, env);
  await command(cargo, [...base, "--target", "wasm32-unknown-unknown"], cwd, env);
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
  historical = false,
): Promise<{
  source: string;
  declarations: string;
  package: NpmReleaseSurface;
}> {
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
      // Published comments cannot be repaired; compare signatures without imposing newer prose rules.
      ...(historical
        ? {
            messages: {
              tsdocMessageReporting: { default: { logLevel: "warning" } },
            },
          }
        : {}),
    }),
  );
  await command("api-extractor", ["run", "--local", "--config", config], root);
  const source = await Bun.file(rollup).text();
  return {
    source,
    declarations: normalizeDeclarations(source),
    package: npmReleaseSurface(metadata),
  };
}

async function rustApi(
  cwd: string,
  manifest: string,
): Promise<{ declarations: string; package: CargoReleaseSurface }> {
  const base = ["public-api", "--manifest-path", manifest, "--color=never", "--simplified"];
  // API extraction alone uses nightly; installed system Cargo may not select it automatically.
  const env = {
    RUSTC: (await command("rustup", ["which", "--toolchain", "nightly", "rustc"], cwd)).trim(),
    RUSTDOC: (await command("rustup", ["which", "--toolchain", "nightly", "rustdoc"], cwd)).trim(),
  };
  const all = await command("cargo", [...base, "--all-features"], cwd, env);
  const minimal = await command("cargo", [...base, "--no-default-features"], cwd, env);
  const manifestSurface = await rustReleaseSurface(cwd, manifest);
  return {
    package: manifestSurface,
    declarations: `${all
      .trim()
      .split("\n")
      .map((line) => `all: ${line}`)
      .join("\n")}\n${minimal
      .trim()
      .split("\n")
      .map((line) => `minimal: ${line}`)
      .join("\n")}\n`,
  };
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

async function historicalEvidence(
  root: string,
  work: string,
  comparison: ReleaseInputs["comparisons"][number],
): Promise<{ sizes: Sizes; crateRoot?: string }> {
  const { npm, crate } = comparison;
  if (!crate)
    return {
      sizes: {
        ...(npm ? { npm: (await stat(resolve(root, npm.file))).size } : {}),
      },
    };
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
async function releaseReport(cwd: string, artifacts = "release-artifacts"): Promise<void> {
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
      "seeded-mask",
      inputs.name,
      inputs.version,
    );
    const currentRust = await rustApi(root, join(crateRoot, "Cargo.toml"));
    const current: Sizes = {
      npm: (await stat(npm)).size,
      crate: (await stat(crate)).size,
      ...(await measureLinkedSizes(root, crateRoot, work, "seeded-mask")),
    };
    const sections = await Promise.all(
      inputs.comparisons.map(async (comparison) => {
        const previous = await historicalEvidence(root, work, comparison);
        const npmArchive = comparison.npm;
        const previousCrateRoot = previous.crateRoot;
        const typescript = npmArchive
          ? await (async () => {
              const previousTypeScript = await declaration(
                root,
                npmArchive,
                work,
                comparison.tag,
                inputs.name,
                comparison.tag.slice(1),
                true,
              );
              const api = typeScriptApiSections(
                previousTypeScript.declarations,
                currentDeclaration.declarations,
                await incompatibleExports(previousTypeScript.source, currentDeclaration.source),
                declaredRenames(notes),
              );
              const metadata = npmSurfaceDifference(
                previousTypeScript.package,
                currentDeclaration.package,
              );
              return withMetadata(
                api,
                metadata,
                JSON.stringify(previousTypeScript.package) !==
                  JSON.stringify(currentDeclaration.package),
              );
            })()
          : undefined;
        const rustSemver = previous.crateRoot
          ? await rustSemverDifference(
              root,
              crateRoot,
              previous.crateRoot,
              join(work, `semver-${comparison.tag}`),
            )
          : undefined;
        const rust = previousCrateRoot
          ? await (async () => {
              const previousRust = await rustApi(root, join(previousCrateRoot, "Cargo.toml"));
              const metadata = cargoSurfaceDifference(previousRust.package, currentRust.package);
              return withMetadata(
                lineApiSections(
                  previousRust.declarations,
                  currentRust.declarations,
                  rustSemver?.level === "major",
                ),
                metadata,
                JSON.stringify(previousRust.package) !== JSON.stringify(currentRust.package),
              );
            })()
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
            `${inputs.version} is below the ${minimum} release required from ${comparison.tag}. Option 1: return to development and remove the incompatible consumer changes while keeping the changelog accurate. Option 2: ${taggedVersionGuidance}`,
          );
        return {
          role: comparison.role,
          tag: comparison.tag,
          minimum,
          previous: previous.sizes,
          npmApi: typescript?.sections,
          crateApi: rust?.sections,
        };
      }),
    );
    const manifest = (await Bun.file(join(root, "package.json")).json()) as {
      repository?: { url?: string };
    };
    const repository = manifest.repository?.url?.replace(/^git\+/, "").replace(/\.git$/, "");
    if (!repository?.startsWith("https://github.com/"))
      throw new Error("package.json repository.url must name the GitHub repository.");
    const report: ReleaseReport = {
      release: {
        name: inputs.name,
        crate: CRATE_NAME,
        version: inputs.version,
        repository,
      },
      current,
      comparisons: sections,
    };
    await Promise.all([
      Bun.write(join(directory, "release-report.json"), `${JSON.stringify(report, null, 2)}\n`),
      Bun.write(
        join(directory, "notes.md"),
        consumerReleaseNotes(
          notes,
          report,
          releaseSelection(process.env.UUID_SLUG_RELEASE_PACKAGES),
        ),
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
