import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { rustSemverDifference } from "./release-report";

const root = resolve(import.meta.dir, "..");
const fixture = join(import.meta.dir, "fixtures/semver");
const work = await mkdtemp(join(tmpdir(), "uuid-slug-semver-check-"));

try {
  const changed = await rustSemverDifference(
    root,
    join(fixture, "current-mask"),
    join(fixture, "baseline"),
    join(work, "changed"),
  );
  if (changed.level !== "major")
    throw new Error(
      "Required Rust fields, trait methods, and enum variants must require a major release.",
    );

  const unchanged = await rustSemverDifference(
    root,
    join(fixture, "baseline"),
    join(fixture, "baseline"),
    join(work, "unchanged"),
  );
  if (unchanged.level !== "patch")
    throw new Error("An unchanged Rust API must not require a breaking release.");
} finally {
  await rm(work, { recursive: true, force: true });
}
