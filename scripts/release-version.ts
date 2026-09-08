// Keep the Rust release version equal to the version chosen in package.json.
import { isDeepStrictEqual } from "node:util";

interface Workspace {
  workspace: { package: { version: string } };
}

export async function checkReleaseVersion(cwd: string, version: string): Promise<void> {
  const manifest = Bun.TOML.parse(await Bun.file(`${cwd}/rust/Cargo.toml`).text()) as Workspace;
  if (manifest.workspace.package.version !== version)
    throw new Error(
      `Rust version ${manifest.workspace.package.version} does not match package.json ${version}. Run the version hook before tagging.`,
    );
  const lock = Bun.TOML.parse(await Bun.file(`${cwd}/rust/Cargo.lock`).text()) as {
    package: { name: string; version: string; source?: string }[];
  };
  for (const name of ["uuid-slug", "uuid-slug-bridge"]) {
    const entries = lock.package.filter((entry) => entry.name === name && !entry.source);
    if (entries.length !== 1 || entries[0]?.version !== version)
      throw new Error(
        `Cargo.lock ${name} does not match package.json ${version}. Run the version hook before tagging.`,
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
  const child = Bun.spawn(
    ["cargo", "update", "--workspace", "--manifest-path", "rust/Cargo.toml", "--offline"],
    { cwd, stdout: "ignore", stderr: "inherit" },
  );
  if ((await child.exited) !== 0)
    throw new Error("Cargo could not synchronize the release lockfile; do not tag.");
  await checkReleaseVersion(cwd, version);
}
