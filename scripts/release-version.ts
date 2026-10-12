// Keep npm, the Rust workspace and its locked path consumers on one version.
import { isDeepStrictEqual } from "node:util";
import { rm } from "node:fs/promises";

interface Workspace {
  workspace: { package: { version: string } };
}

export const developmentVersionGuidance =
  "Classify the full consumer effect per CONTRIBUTING.md, then run bun run version:set <X.Y.Z-dev>; it updates package.json, rust/Cargo.toml, and rust/Cargo.lock together.";
export const taggedVersionGuidance = `Return to development. ${developmentVersionGuidance} Then recreate the release with bun run release <X.Y.Z>.`;

export async function checkReleaseVersion(cwd: string, version: string): Promise<void> {
  const manifest = Bun.TOML.parse(await Bun.file(`${cwd}/rust/Cargo.toml`).text()) as Workspace;
  if (manifest.workspace.package.version !== version)
    throw new Error(
      `Rust version ${manifest.workspace.package.version} does not match package.json ${version}. ${developmentVersionGuidance}`,
    );
  const lock = Bun.TOML.parse(await Bun.file(`${cwd}/rust/Cargo.lock`).text()) as {
    package: { name: string; version: string; source?: string }[];
  };
  for (const name of ["uuid-slug", "uuid-slug-bridge"]) {
    const entries = lock.package.filter((entry) => entry.name === name && !entry.source);
    if (entries.length !== 1 || entries[0]?.version !== version)
      throw new Error(
        `Cargo.lock ${name} does not match package.json ${version}. ${developmentVersionGuidance}`,
      );
  }
}

/** Preserve comments and layout; parsing checks that only the intended version changed. */
export async function syncReleaseVersion(cwd: string, version: string): Promise<void> {
  const file = Bun.file(`${cwd}/rust/Cargo.toml`);
  const source = await file.text();
  const manifest = Bun.TOML.parse(source) as Workspace;
  const oldVersion = manifest.workspace.package.version;
  if (oldVersion !== version) {
    const literal = JSON.stringify(oldVersion);
    if (source.split(literal).length !== 2)
      throw new Error(
        "Rust workspace version must have one double-quoted occurrence for a focused update.",
      );
    const updated = source.replace(literal, JSON.stringify(version));
    manifest.workspace.package.version = version;
    if (!isDeepStrictEqual(Bun.TOML.parse(updated), manifest))
      throw new Error("Rust version update changed another manifest field; no file was written.");
    await Bun.write(file, updated);
  }
  // Cargo updates only workspace package entries without resolving newer dependencies.
  const manifests = ["rust/Cargo.toml"];
  // The benchmark is a path consumer; its lock records the workspace package's version too.
  if (await Bun.file(`${cwd}/bench/rust-competitors/Cargo.toml`).exists())
    manifests.push("bench/rust-competitors/Cargo.toml");
  for (const manifestPath of manifests) {
    const child = Bun.spawn(
      ["cargo", "update", "--workspace", "--manifest-path", manifestPath, "--offline"],
      { cwd, stdout: "ignore", stderr: "inherit" },
    );
    if ((await child.exited) !== 0)
      throw new Error("Cargo could not synchronize the release lockfile; do not tag.");
  }
  await checkReleaseVersion(cwd, version);
}

export async function setDevelopmentVersion(cwd: string, version: string): Promise<void> {
  if (!/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)-dev$/.test(version))
    throw new Error(
      "version:set accepts only X.Y.Z-dev. Set a development version with bun run version:set <X.Y.Z-dev>, or create a stable version with bun run release <X.Y.Z>.",
    );

  const paths = ["package.json", "rust/Cargo.toml", "rust/Cargo.lock"] as const;
  const [packageSource, cargoSource, lockSource] = await Promise.all(
    paths.map((path) => Bun.file(`${cwd}/${path}`).text()),
  );
  if (packageSource === undefined || cargoSource === undefined || lockSource === undefined)
    throw new Error("Could not read every version file.");
  const originals = {
    "package.json": packageSource,
    "rust/Cargo.toml": cargoSource,
    "rust/Cargo.lock": lockSource,
  };
  const benchmarkLock = Bun.file(`${cwd}/bench/rust-competitors/Cargo.lock`);
  const benchmarkSource = (await benchmarkLock.exists()) ? await benchmarkLock.text() : undefined;
  const manifest = JSON.parse(packageSource) as Record<string, unknown> & { version?: unknown };
  if (typeof manifest.version !== "string") throw new Error("package.json has no string version.");
  const oldLiteral = `"version": ${JSON.stringify(manifest.version)}`;
  if (packageSource.split(oldLiteral).length !== 2)
    throw new Error("package.json must contain its top-level version once.");
  const updatedPackage = packageSource.replace(oldLiteral, `"version": ${JSON.stringify(version)}`);
  const expectedManifest = { ...manifest, version };
  if (!isDeepStrictEqual(JSON.parse(updatedPackage), expectedManifest))
    throw new Error("The version update changed another package.json field.");

  try {
    await Bun.write(`${cwd}/package.json`, updatedPackage);
    await syncReleaseVersion(cwd, version);
  } catch (error) {
    await Promise.all(paths.map((path) => Bun.write(`${cwd}/${path}`, originals[path])));
    if (benchmarkSource !== undefined) await Bun.write(benchmarkLock, benchmarkSource);
    else await rm(`${cwd}/bench/rust-competitors/Cargo.lock`, { force: true });
    throw error;
  }
}

if (import.meta.main) {
  const version = process.argv[2];
  if (!version || process.argv.length !== 3)
    throw new Error("Usage: bun run version:set <X.Y.Z-dev>");
  await setDevelopmentVersion(process.cwd(), version);
}
