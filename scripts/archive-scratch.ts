import { mkdir, mkdtemp, rename, rm } from "node:fs/promises";
import { basename, join } from "node:path";
import { command } from "./command";

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
    await rename(archive, join(reports, "build-inputs.tar.gz"));
    await Promise.all(generatedFiles.map((name) => rm(join(reports, name))));
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
