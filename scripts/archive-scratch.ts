import { link, lstat, mkdir, mkdtemp, readdir, rename, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, join } from "node:path";
import { command } from "./command";

export async function compactReports(reports: string): Promise<number> {
  // Filesystem compression keeps profiler paths readable; gzip would require every reader to adapt.
  if (process.platform !== "darwin") return 0;
  let reclaimed = 0;
  const files: string[] = [];
  async function collect(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".compact-")) await collect(path);
      else if (entry.isFile()) files.push(path);
    }
  }
  await collect(reports);
  async function worker(): Promise<void> {
    for (let file = files.pop(); file !== undefined; file = files.pop()) {
      const before = await lstat(file);
      // Avoid tiny files, existing compression, archives and shared inodes; copying them adds work or duplication.
      if (
        !before.isFile() ||
        before.size < 65536 ||
        before.blocks * 512 < before.size ||
        before.nlink !== 1 ||
        file.endsWith(".gz") ||
        file.endsWith(".tgz")
      )
        continue;
      const scratch = await mkdtemp(join(reports, ".compact-"));
      try {
        const copy = join(scratch, "compressed");
        await command("/usr/bin/ditto", ["--hfsCompression", file, copy], reports);
        await command("cmp", [file, copy], reports);
        const after = await lstat(file);
        const compressed = await lstat(copy);
        if (
          after.ino !== before.ino ||
          after.size !== before.size ||
          after.mtimeMs !== before.mtimeMs
        )
          throw new Error(`Report changed during compression: ${file}. Stop its writer and retry.`);
        if (compressed.blocks < before.blocks) {
          await rename(copy, file);
          reclaimed += (before.blocks - compressed.blocks) * 512;
        }
      } finally {
        await rm(scratch, { recursive: true, force: true });
      }
    }
  }
  // Bound simultaneous copies; failure must drain sibling workers before the caller exits.
  const results = await Promise.allSettled(Array.from({ length: 4 }, worker));
  for (const result of results) if (result.status === "rejected") throw result.reason;
  return reclaimed;
}

async function retainArchive(
  snapshot: string,
  reports: string,
  prefix = "build-inputs",
): Promise<string> {
  // Content names keep captures immutable; hard links reuse stored bytes instead of duplicating them.
  const digest = createHash("sha256")
    .update(await Bun.file(snapshot).bytes())
    .digest("hex");
  const retained = join(reports, `${prefix}-${digest}.tar.gz`);
  try {
    await link(snapshot, retained);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
    const existing = createHash("sha256")
      .update(await Bun.file(retained).bytes())
      .digest("hex");
    if (existing !== digest)
      throw new Error(
        `Cannot reuse captured inputs: recover the damaged archive ${retained} first.`,
        { cause: error },
      );
  }
  return retained;
}

export async function deduplicateCapturedPackage(snapshot: string, reports: string): Promise<void> {
  // Completed captures on the report filesystem are immutable; share bytes without changing paths.
  // Publish a verified link before replacing the duplicate; failure must retain the caller's copy.
  const retained = await retainArchive(snapshot, reports, "captured-package");
  const scratch = await mkdtemp(join(reports, "package-link-"));
  try {
    const alias = join(scratch, "archive");
    await link(retained, alias);
    await rename(alias, snapshot);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

export async function archiveAndRemoveGeneratedFiles(
  project: string,
  reports: string,
  sourceInputs: readonly string[],
  generatedFiles: readonly string[],
): Promise<void> {
  // A raw profile needs its exact executed graph. Archive first, and preserve both originals
  // and any previous archive if source capture fails; loose executable files are disposable.
  const scratch = await mkdtemp(join(reports, "build-inputs-"));
  try {
    const archive = join(scratch, "build-inputs.tar.gz");
    await command(
      "tar",
      ["-czf", archive, "-C", project, ...sourceInputs, "-C", reports, ...generatedFiles],
      project,
    );
    const latest = join(reports, "build-inputs.tar.gz");
    // Snapshot legacy captures before replacement; another capture cannot redirect this inode.
    const previous = join(scratch, "previous-build-inputs.tar.gz");
    let hadPrevious = false;
    try {
      await link(latest, previous);
      hadPrevious = true;
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
    if (hadPrevious) await retainArchive(previous, reports);
    const retained = await retainArchive(archive, reports);
    const alias = join(scratch, "latest-build-inputs.tar.gz");
    await link(retained, alias);
    await rename(alias, latest);
    await Promise.all(generatedFiles.map((name) => rm(join(reports, name))));
    await compactReports(reports);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

export async function archiveAndRemoveScratch(directory: string, reports: string): Promise<void> {
  // Failed graphs must remain reproducible without leaving executable checkouts in system
  // scratch. Delete only after archival succeeds; an archive failure must not erase evidence.
  await mkdir(reports, { recursive: true });
  const destination = await mkdtemp(join(reports, `${basename(directory)}-`));
  const archive = join(destination, "artifacts.tar.gz");
  try {
    await command("tar", ["-czf", archive, "-C", directory, "."], reports);
  } catch (error) {
    await rm(destination, { recursive: true, force: true });
    throw error;
  }
  await rm(directory, { recursive: true, force: true });
  console.error(
    `Failure artifacts are in ${archive}. Extract into a disposable directory with tar -xzf; remove that directory and the archive after diagnosis.`,
  );
}
