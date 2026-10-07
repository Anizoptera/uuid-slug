import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { basename, join } from "node:path";
import { command } from "./command";

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
