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

/** Refuse changed retained bytes before a report or publisher consumes them. */
export async function readRetainedArchive(
  cwd: string,
  archive: RetainedArchive,
): Promise<Uint8Array> {
  const bytes = await Bun.file(resolve(cwd, archive.file)).bytes();
  const algorithm = archive.integrity.split("-", 1)[0];
  if (algorithm !== "sha256" && algorithm !== "sha512")
    throw new Error(`${archive.file} uses unsupported integrity ${algorithm}.`);
  const actual = createHash(algorithm)
    .update(bytes)
    .digest(algorithm === "sha512" ? "base64" : "hex");
  if (archive.integrity !== `${algorithm}-${actual}`)
    throw new Error(`${archive.file} differs from release inputs.`);
  return bytes;
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
  const bytes = await Bun.file(resolve(cwd, file)).bytes();
  const digest = createHash(algorithm)
    .update(bytes)
    .digest(algorithm === "sha512" ? "base64" : "hex");
  return { file: relative(cwd, resolve(cwd, file)), integrity: `${algorithm}-${digest}` };
}

/** Bind Git-selected history to verified registry bytes and retain one deterministic comparison record. */
export async function collectReleaseInputs(
  cwd: string,
  tag: string,
  output: string,
  candidateFiles?: { readonly npm: string; readonly crate: string },
): Promise<ReleaseInputs> {
  if (!candidateFiles) throw new Error("Candidate npm and crate archives are required.");
  const { name, version, commit } = await preflightRelease(cwd, tag);
  if (!commit) throw new Error("Release preflight did not resolve a candidate commit.");
  const retained = Bun.file(join(output, "release-inputs.json"));
  if (await retained.exists()) {
    const inputs = (await retained.json()) as ReleaseInputs;
    if (
      inputs.name !== name ||
      inputs.version !== version ||
      inputs.tag !== tag ||
      inputs.commit !== commit
    )
      throw new Error(
        "Retained release inputs identify a different package, version, tag, or commit.",
      );
    await Promise.all([
      ...(resolve(cwd, candidateFiles.npm) === resolve(cwd, inputs.candidate.npm.file)
        ? []
        : [readRetainedArchive(cwd, { ...inputs.candidate.npm, file: candidateFiles.npm })]),
      ...(resolve(cwd, candidateFiles.crate) === resolve(cwd, inputs.candidate.crate.file)
        ? []
        : [readRetainedArchive(cwd, { ...inputs.candidate.crate, file: candidateFiles.crate })]),
      ...[inputs.candidate, ...inputs.comparisons].flatMap((entry) =>
        [entry.npm, entry.crate].flatMap((archive) =>
          archive ? [readRetainedArchive(cwd, archive)] : [],
        ),
      ),
    ]);
    return inputs;
  }
  const [choices, npm, crate] = await Promise.all([
    releaseComparisons(cwd, tag),
    npmHistory("https://registry.npmjs.org", name),
    crateHistory("https://crates.io", "uuid-slug"),
  ]);
  if (npm.versions.has(version) || crate.versions.has(version))
    throw new Error(
      "A published candidate has no retained release inputs; restore its original release evidence before retrying.",
    );
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
  collectReleaseInputs(process.cwd(), tag, resolve(output), {
    npm: resolve(npm),
    crate: resolve(crate),
  }).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
