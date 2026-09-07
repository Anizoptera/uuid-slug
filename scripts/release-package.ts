import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { command } from "./command";
import { preflightRelease } from "./release-notes";
import { registryIntegrity, verifyIntegrity } from "./registry-integrity";

/** Retain only bytes matching the published version before CI can attest or attach them. */
export async function publishRelease(
  cwd: string,
  tag: string,
  registry = "https://registry.npmjs.org",
): Promise<void> {
  const { name, version, notes } = await preflightRelease(cwd, tag);
  const url = `${registry}/${encodeURIComponent(name)}/${encodeURIComponent(version)}`;
  const existing = await registryIntegrity(url);
  const output = path.join(cwd, "release-artifacts");
  await mkdir(output, { recursive: true });
  if ((await readdir(output)).length)
    throw new Error("release-artifacts must be empty before packing.");
  const distTag = version.split("+", 1)[0]?.includes("-") ? "next" : "latest";
  await command(
    "bun",
    [
      path.join(cwd, "node_modules/.bin/publish-clean"),
      ...(existing ? ["--dry-run"] : []),
      "--tarball-out",
      output,
      "--",
      "--access",
      "public",
      "--tag",
      distTag,
      "--provenance",
    ],
    cwd,
  );
  const files = (await readdir(output)).filter((file) => file.endsWith(".tgz"));
  if (files.length !== 1 || !files[0])
    throw new Error(`Expected one retained archive, found ${files.length}.`);
  const published = existing ?? (await registryIntegrity(url));
  if (!published)
    throw new Error(
      "Registry does not yet expose the uploaded version; retry after it becomes observable.",
    );
  verifyIntegrity(await Bun.file(path.join(output, files[0])).bytes(), published);
  await Bun.write(path.join(output, "notes.md"), notes);
}

if (import.meta.main) {
  const tag = process.env.GITHUB_REF_NAME;
  if (!tag) throw new Error("GITHUB_REF_NAME must identify the release tag.");
  publishRelease(process.cwd(), tag).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
