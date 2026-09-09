import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { command } from "./command";
import { releaseComparisons } from "./release-history";
import { preflightRelease } from "./release-notes";
import { verifyIntegrity } from "./registry-integrity";

const cratesUserAgent = "uuid-slug release (https://github.com/Anizoptera/uuid-slug)";

interface NpmVersion {
  readonly integrity: string;
  readonly tarball: string;
}

interface CrateVersion {
  readonly checksum: string;
  readonly download: string;
}

export interface RegistryHistory<T> {
  readonly versions: ReadonlyMap<string, T>;
}

export interface RetainedArchive {
  readonly file: string;
  readonly integrity: string;
}

export interface ComparisonInput {
  readonly role: "immediate" | "releaseLine";
  readonly tag: string;
  readonly commit: string;
  readonly npm?: RetainedArchive;
  readonly crate?: RetainedArchive;
}

export interface ReleaseInputs {
  readonly name: string;
  readonly version: string;
  readonly tag: string;
  readonly commit: string;
  readonly candidate: {
    readonly npm: RetainedArchive;
    readonly crate: RetainedArchive;
  };
  readonly comparisons: readonly ComparisonInput[];
}

function object(value: unknown, context: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${context} is not an object.`);
  return value as Record<string, unknown>;
}

async function json(url: string, headers?: HeadersInit): Promise<unknown> {
  const response = await fetch(url, {
    ...(headers ? { headers } : {}),
    signal: AbortSignal.timeout(20_000),
  });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`${url} failed: HTTP ${response.status}.`);
  return response.json();
}

/** Read npm's complete version index once so absence cannot be confused with an omitted lookup. */
export async function npmHistory(
  registry: string,
  name: string,
): Promise<RegistryHistory<NpmVersion>> {
  const metadata = await json(`${registry}/${encodeURIComponent(name)}`);
  if (metadata === undefined) return { versions: new Map() };
  const versions = object(object(metadata, "npm metadata").versions, "npm versions");
  const result = new Map<string, NpmVersion>();
  for (const [version, value] of Object.entries(versions)) {
    const dist = object(object(value, `npm ${version}`).dist, `npm ${version} dist`);
    if (typeof dist.integrity !== "string" || !dist.integrity.startsWith("sha512-"))
      throw new Error(`npm ${version} has no SHA-512 integrity.`);
    if (typeof dist.tarball !== "string") throw new Error(`npm ${version} has no archive URL.`);
    result.set(version, { integrity: dist.integrity, tarball: dist.tarball });
  }
  return { versions: result };
}

/** Read crates.io history once; an explicit missing package is a first publication, not an outage. */
export async function crateHistory(
  registry: string,
  name: string,
): Promise<RegistryHistory<CrateVersion>> {
  const metadata = await json(`${registry}/api/v1/crates/${encodeURIComponent(name)}`, {
    "User-Agent": cratesUserAgent,
  });
  if (metadata === undefined) return { versions: new Map() };
  const versions = object(metadata, "crates.io metadata").versions;
  if (!Array.isArray(versions)) throw new Error("crates.io versions is not an array.");
  const result = new Map<string, CrateVersion>();
  for (const value of versions) {
    const version = object(value, "crates.io version");
    if (typeof version.num !== "string") throw new Error("crates.io version has no number.");
    if (typeof version.checksum !== "string" || !/^[a-f0-9]{64}$/.test(version.checksum))
      throw new Error(`crates.io ${version.num} has no SHA-256 checksum.`);
    if (typeof version.dl_path !== "string")
      throw new Error(`crates.io ${version.num} has no archive path.`);
    result.set(version.num, {
      checksum: version.checksum,
      download: new URL(version.dl_path, registry).href,
    });
  }
  return { versions: result };
}

export function registryVersion<T>(
  history: RegistryHistory<T>,
  version: string,
  registry: string,
): T | undefined {
  if (history.versions.size === 0) return undefined;
  const release = history.versions.get(version);
  if (!release)
    throw new Error(
      `${registry} has history but no ${version}; Git and registry history disagree.`,
    );
  return release;
}

async function retainNpm(
  release: NpmVersion,
  file: string,
  recordedFile: string,
): Promise<RetainedArchive> {
  const response = await fetch(release.tarball, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`npm archive failed: HTTP ${response.status}.`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  verifyIntegrity(bytes, release.integrity);
  await Bun.write(file, bytes);
  return { file: recordedFile, integrity: release.integrity };
}

async function retainCrate(
  release: CrateVersion,
  file: string,
  recordedFile: string,
): Promise<RetainedArchive> {
  const response = await fetch(release.download, {
    headers: { "User-Agent": cratesUserAgent },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`crate archive failed: HTTP ${response.status}.`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== release.checksum) throw new Error("Crate archive differs from registry checksum.");
  await Bun.write(file, bytes);
  return { file: recordedFile, integrity: `sha256-${release.checksum}` };
}

async function candidateArchive(
  cwd: string,
  file: string,
  algorithm: "sha256" | "sha512",
): Promise<RetainedArchive> {
  const bytes = await Bun.file(file).bytes();
  const digest = createHash(algorithm)
    .update(bytes)
    .digest(algorithm === "sha512" ? "base64" : "hex");
  return { file: relative(cwd, file), integrity: `${algorithm}-${digest}` };
}

/** Bind Git-selected history to verified registry bytes and retain one deterministic comparison record. */
export async function collectReleaseInputs(
  cwd: string,
  tag: string,
  output: string,
  npmRegistry = "https://registry.npmjs.org",
  cratesRegistry = "https://crates.io",
  candidateFiles?: { readonly npm: string; readonly crate: string },
): Promise<ReleaseInputs> {
  const { name, version } = await preflightRelease(cwd, tag);
  const [choices, npm, crate, commit] = await Promise.all([
    releaseComparisons(cwd, tag),
    npmHistory(npmRegistry, name),
    crateHistory(cratesRegistry, "uuid-slug"),
    command("git", ["rev-list", "-n", "1", tag], cwd).then((value) => value.trim()),
  ]);
  if (!candidateFiles) throw new Error("Candidate npm and crate archives are required.");
  const candidate = await Promise.all([
    candidateArchive(cwd, candidateFiles.npm, "sha512"),
    candidateArchive(cwd, candidateFiles.crate, "sha256"),
  ]);
  await mkdir(output, { recursive: true });
  const entries = Object.entries(choices) as Array<
    ["immediate" | "releaseLine", string | undefined]
  >;
  const comparisons = await Promise.all(
    entries
      .flatMap(([role, selectedTag]) => (selectedTag ? [[role, selectedTag] as const] : []))
      .map(async ([role, selectedTag]): Promise<ComparisonInput> => {
        const selectedVersion = selectedTag.slice(1);
        const npmRelease = registryVersion(npm, selectedVersion, "npm");
        const crateRelease = registryVersion(crate, selectedVersion, "crates.io");
        const [selectedCommit, npmArchive, crateArchive] = await Promise.all([
          command("git", ["rev-list", "-n", "1", selectedTag], cwd).then((value) => value.trim()),
          npmRelease
            ? retainNpm(
                npmRelease,
                join(output, `npm-${selectedVersion}.tgz`),
                relative(cwd, join(output, `npm-${selectedVersion}.tgz`)),
              )
            : undefined,
          crateRelease
            ? retainCrate(
                crateRelease,
                join(output, `crate-${selectedVersion}.crate`),
                relative(cwd, join(output, `crate-${selectedVersion}.crate`)),
              )
            : undefined,
        ]);
        return Object.assign(
          {
            role,
            tag: selectedTag,
            commit: selectedCommit,
          },
          npmArchive ? { npm: npmArchive } : undefined,
          crateArchive ? { crate: crateArchive } : undefined,
        );
      }),
  );
  const inputs = {
    name,
    version,
    tag,
    commit,
    candidate: { npm: candidate[0], crate: candidate[1] },
    comparisons,
  } satisfies ReleaseInputs;
  await Bun.write(join(output, "release-inputs.json"), `${JSON.stringify(inputs, null, 2)}\n`);
  return inputs;
}

if (import.meta.main) {
  const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME;
  const output = process.argv[3] ?? "release-inputs";
  const npm = process.argv[4];
  const crate = process.argv[5];
  if (!tag || !npm || !crate)
    throw new Error("Usage: release-inputs.ts vVERSION output-directory npm-archive crate-archive");
  collectReleaseInputs(process.cwd(), tag, resolve(output), undefined, undefined, {
    npm: resolve(npm),
    crate: resolve(crate),
  }).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
