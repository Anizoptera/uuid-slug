import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { command } from "./command";
import {
  apiDifference,
  combineDifferences,
  minimumRelease,
  normalizeDeclarations,
  satisfiesMinimum,
  sizeDelta,
} from "./release-comparison";
import type { ReleaseLevel } from "./release-comparison";
import type { ReleaseInputs, RetainedArchive } from "./release-inputs";
import { readRetainedArchive } from "./release-inputs";
import { preflightRelease } from "./release-notes";
import { taggedVersionGuidance } from "./release-version";
import { npmReleaseSurface, npmSurfaceDifference } from "./release-surface";
import type { NpmReleaseSurface } from "./release-surface";

interface Sizes {
  readonly npm?: number;
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

async function declaration(
  root: string,
  archive: RetainedArchive,
  work: string,
  label: string,
  name: string,
  version: string,
): Promise<{ declarations: string; package: NpmReleaseSurface }> {
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
  return {
    declarations: normalizeDeclarations(await Bun.file(rollup).text()),
    package: npmReleaseSurface(metadata),
  };
}

function sizeTable(current: Sizes, previous: Sizes): string {
  return [
    "| Artifact | Current | Change |",
    "| --- | ---: | ---: |",
    `| npm | ${current.npm ?? "unavailable"} | ${sizeDelta(current.npm, previous.npm)} |`,
  ].join("\n");
}

async function historicalEvidence(
  root: string,
  comparison: ReleaseInputs["comparisons"][number],
): Promise<Sizes> {
  return {
    ...(comparison.npm ? { npm: (await stat(resolve(root, comparison.npm.file))).size } : {}),
  };
}

/** Generate retry-stable notes from retained npm archives. */
async function releaseReport(cwd: string, artifacts = "release-artifacts"): Promise<void> {
  const root = resolve(cwd);
  const directory = resolve(root, artifacts);
  const inputs = (await Bun.file(
    join(directory, "history/release-inputs.json"),
  ).json()) as ReleaseInputs;
  const { notes, name, version, commit } = await preflightRelease(root, inputs.tag);
  if (inputs.name !== name || inputs.version !== version || inputs.commit !== commit)
    throw new Error("Retained release inputs do not identify the checked package and commit.");
  const npm = resolve(root, inputs.candidate.npm.file);
  const work = await mkdtemp(join(tmpdir(), "uuid-slug-release-report-"));
  try {
    const currentDeclaration = await declaration(
      root,
      inputs.candidate.npm,
      work,
      "current-mask",
      inputs.name,
      inputs.version,
    );
    const current: Sizes = { npm: (await stat(npm)).size };
    const sections = await Promise.all(
      inputs.comparisons.map(async (comparison) => {
        const previous = await historicalEvidence(root, comparison);
        const npmArchive = comparison.npm;
        const typescript = npmArchive
          ? await (async () => {
              const previousTypeScript = await declaration(
                root,
                npmArchive,
                work,
                comparison.tag,
                inputs.name,
                comparison.tag.slice(1),
              );
              const declarations = apiDifference(
                previousTypeScript.declarations,
                currentDeclaration.declarations,
                "TypeScript declaration",
              );
              const metadata = npmSurfaceDifference(
                previousTypeScript.package,
                currentDeclaration.package,
              );
              return combineDifferences(declarations, metadata);
            })()
          : undefined;
        const minimum = minimumRelease(
          inputs.version,
          notes,
          [typescript?.level].filter((level): level is ReleaseLevel => !!level),
        );
        if (!satisfiesMinimum(comparison.tag.slice(1), inputs.version, minimum))
          throw new Error(
            `${inputs.version} is below the ${minimum} release required from ${comparison.tag}. Option 1: return to development and remove the incompatible consumer changes while keeping the changelog accurate. Option 2: ${taggedVersionGuidance}`,
          );
        return {
          minimum,
          text: `## ${comparison.role === "immediate" ? "Previous release" : "Previous release line"}: ${comparison.tag}\n\n### Minimum compatible release\n\n${minimum}\n\n### Packaged TypeScript API\n\n${typescript?.report ?? "Unavailable because npm has no release history."}\n\n### Size\n\n${sizeTable(current, previous)}`,
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
        `${notes}${sections.map(({ text }) => text).join("\n\n")}\n`,
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
