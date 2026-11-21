// Rehearse release preparation on every CI check of main and pull requests. Release-only code
// (registry history, Rust API evolution against published archives, archive verification, notes)
// otherwise runs first on release day, where each defect costs a fix, a tag move and a rerun; here
// it fails on the commit that breaks it. Runs only in a disposable CI checkout: it commits the
// stable version and an annotated tag locally, never pushes, and prepares without credentials.

// Output stays in the CI log, and preparation runs for minutes, so no capture and no short
// subprocess deadline (scripts/command.ts applies both); the CI job bounds a hang.
async function run(program: string, args: string[], env?: Record<string, string>): Promise<void> {
  const child = Bun.spawn([program, ...args], {
    env: { ...process.env, ...env },
    stdout: "inherit",
    stderr: "inherit",
  });
  if ((await child.exited) !== 0)
    throw new Error(`Release rehearsal failed at: ${program} ${args.join(" ")}`);
}

export async function rehearseRelease(): Promise<void> {
  const manifest = (await Bun.file("package.json").json()) as { version: string };
  if (!manifest.version.endsWith("-dev"))
    throw new Error(
      `Release rehearsal needs a -dev version, found ${manifest.version}: a tagged release is prepared by release.yml itself.`,
    );
  const version = manifest.version.slice(0, -"-dev".length);
  // The release command needs a ## [version] section with notes. Keep the real Unreleased entries
  // (a missing ### Breaking changes heading must still fail) and add one line so an empty
  // section, normal right after a release, still has notes.
  const changelog = await Bun.file("CHANGELOG.md").text();
  await Bun.write(
    "CHANGELOG.md",
    changelog.replace(
      "\n## [Unreleased]\n",
      `\n## [Unreleased]\n\n## [${version}]\n\nRelease rehearsal.\n`,
    ),
  );
  await run("bun", ["run", "version:set", version]);
  const identity = ["-c", "user.name=release-rehearsal", "-c", "user.email=rehearsal@invalid"];
  await run("git", [...identity, "commit", "--all", "--quiet", "--message", version], {
    UUID_SLUG_RELEASE_VERSION: version,
  });
  await run("git", [...identity, "tag", "--annotate", "--message", version, `v${version}`]);
  await run("bun", ["scripts/release-prepare.ts", `v${version}`]);
}

if (import.meta.main) await rehearseRelease();
