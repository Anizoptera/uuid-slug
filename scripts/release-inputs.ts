import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { command } from "./command";
import { releaseComparisons } from "./release-history";
import { preflightRelease } from "./release-notes";
import { verifyIntegrity } from "./registry-integrity";

interface NpmVersion {
  readonly integrity: string;
  readonly tarball: string;
}

interface RegistryHistory<T> {
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

interface ComparisonInput {
  readonly role: "immediate" | "releaseLine";
  readonly tag: string;
  readonly commit: string;
  readonly npm?: RetainedArchive;
}

export interface ReleaseInputs {
  readonly name: string;
  readonly version: string;
  readonly tag: string;
  readonly commit: string;
  readonly candidate: { readonly npm: RetainedArchive };
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
async function npmHistory(registry: string, name: string): Promise<RegistryHistory<NpmVersion>> {
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
  candidateFile?: string,
): Promise<ReleaseInputs> {
  if (!candidateFile) throw new Error("A candidate npm archive is required.");
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
      ...(resolve(cwd, candidateFile) === resolve(cwd, inputs.candidate.npm.file)
        ? []
        : [readRetainedArchive(cwd, { ...inputs.candidate.npm, file: candidateFile })]),
      ...[inputs.candidate, ...inputs.comparisons].flatMap((entry) =>
        entry.npm ? [readRetainedArchive(cwd, entry.npm)] : [],
      ),
    ]);
    return inputs;
  }
  const [choices, npm] = await Promise.all([
    releaseComparisons(cwd, tag),
    npmHistory("https://registry.npmjs.org", name),
  ]);
  if (npm.versions.has(version))
    throw new Error(
      "A published candidate has no retained release inputs; restore its original release evidence before retrying.",
    );
  const candidate = await candidateArchive(cwd, candidateFile, "sha512");
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
        const [selectedCommit, npmArchive] = await Promise.all([
          command("git", ["rev-list", "-n", "1", selectedTag], cwd).then((value) => value.trim()),
          npmRelease
            ? retainNpm(
                npmRelease,
                join(output, `npm-${selectedVersion}.tgz`),
                relative(cwd, join(output, `npm-${selectedVersion}.tgz`)),
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
        );
      }),
  );
  const inputs = {
    name,
    version,
    tag,
    commit,
    candidate: { npm: candidate },
    comparisons,
  } satisfies ReleaseInputs;
  await Bun.write(join(output, "release-inputs.json"), `${JSON.stringify(inputs, null, 2)}\n`);
  return inputs;
}

if (import.meta.main) {
  const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME;
  const output = process.argv[3] ?? "release-inputs";
  const npm = process.argv[4];
  if (!tag || !npm)
    throw new Error("Usage: release-inputs.ts vVERSION output-directory npm-archive");
  collectReleaseInputs(process.cwd(), tag, resolve(output), resolve(npm)).catch(
    (error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}
