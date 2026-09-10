import { mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { command } from "./command";
import { preflightRelease } from "./release-notes";
import { registryIntegrity, verifyIntegrity } from "./registry-integrity";

const reviewedDirectory = "release-artifacts/reviewed-npm";

async function archive(directory: string): Promise<string> {
  const files = (await readdir(directory)).filter((file) => file.endsWith(".tgz"));
  if (files.length !== 1 || !files[0])
    throw new Error(`Expected one retained npm archive, found ${files.length}.`);
  return join(directory, files[0]);
}

async function pack(
  cwd: string,
  directory: string,
  version: string,
  guardOnly: boolean,
  expected?: string,
): Promise<string> {
  await mkdir(directory, { recursive: true });
  if ((await readdir(directory)).length)
    throw new Error(`${directory} must be empty before packing.`);
  const distTag = version.split("+", 1)[0]?.includes("-") ? "next" : "latest";
  await command(
    "bun",
    [
      join(cwd, "node_modules/.bin/publish-clean"),
      ...(guardOnly ? ["--guard-only"] : []),
      "--tarball-out",
      directory,
      "--",
      "--access",
      "public",
      "--tag",
      distTag,
      "--provenance",
    ],
    cwd,
    expected ? { UUID_SLUG_EXPECTED_ARCHIVE: expected } : undefined,
  );
  return archive(directory);
}

/** Prepare without credentials, or publish only bytes identical to that reviewed archive. */
export async function releasePackage(
  cwd: string,
  tag: string,
  mode: "prepare" | "publish",
  registry = "https://registry.npmjs.org",
): Promise<void> {
  const { name, version } = await preflightRelease(cwd, tag);
  const url = `${registry}/${encodeURIComponent(name)}/${encodeURIComponent(version)}`;
  if (mode === "prepare") {
    await pack(cwd, join(cwd, reviewedDirectory), version, true);
    return;
  }
  const reviewed = await archive(join(cwd, reviewedDirectory));
  const reviewedBytes = await Bun.file(reviewed).bytes();
  const existing = await registryIntegrity(url);
  if (existing) verifyIntegrity(reviewedBytes, existing);
  else await pack(cwd, join(cwd, "release-artifacts/published-npm"), version, false, reviewed);
  const published = existing ?? (await registryIntegrity(url));
  if (!published)
    throw new Error("npm upload is not observable yet; retry when the registry exposes it.");
  verifyIntegrity(reviewedBytes, published);
}

if (import.meta.main) {
  const mode = process.argv[2];
  const tag = process.env.GITHUB_REF_NAME;
  if (!tag || (mode !== "prepare" && mode !== "publish"))
    throw new Error("Usage: release-package.ts prepare|publish (with GITHUB_REF_NAME)");
  releasePackage(process.cwd(), tag, mode).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
