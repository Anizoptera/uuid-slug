import { createHash } from "node:crypto";
import { basename, join, resolve } from "node:path";
import type { ReleaseInputs, RetainedArchive } from "./release-inputs";
import { readRetainedArchive } from "./release-inputs";
import { crateChecksum, verifyCrateChecksum } from "./release-crate";
import { preflightRelease } from "./release-notes";
import { registryIntegrity, verifyIntegrity } from "./registry-integrity";

interface Asset {
  readonly name: string;
  readonly digest?: string;
}

interface Release {
  readonly id: number;
  readonly draft: boolean;
  readonly body: string;
  readonly upload_url: string;
  readonly assets: readonly Asset[];
}

interface FinalizeOptions {
  readonly repository: string;
  readonly token: string;
}

function object(value: unknown, context: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${context} is not an object.`);
  return value as Record<string, unknown>;
}

function release(value: unknown): Release {
  const source = object(value, "GitHub release");
  if (
    typeof source.id !== "number" ||
    typeof source.draft !== "boolean" ||
    (source.body !== null && typeof source.body !== "string") ||
    typeof source.upload_url !== "string" ||
    !Array.isArray(source.assets)
  )
    throw new Error("GitHub returned an incomplete release.");
  const assets = source.assets.map((entry) => {
    const asset = object(entry, "GitHub release asset");
    if (typeof asset.name !== "string") throw new Error("GitHub asset has no name.");
    return {
      name: asset.name,
      ...(typeof asset.digest === "string" ? { digest: asset.digest } : {}),
    };
  });
  return {
    id: source.id,
    draft: source.draft,
    body: source.body ?? "",
    upload_url: source.upload_url,
    assets,
  };
}

async function digest(archive: RetainedArchive): Promise<{ bytes: Uint8Array; sha256: string }> {
  const bytes = await readRetainedArchive(process.cwd(), archive);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return { bytes, sha256 };
}

async function github(url: string, token: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/vnd.github+json");
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("X-GitHub-Api-Version", "2022-11-28");
  return fetch(url, {
    ...init,
    headers,
    signal: AbortSignal.timeout(20_000),
  });
}

async function jsonResponse(response: Response, context: string): Promise<unknown> {
  if (!response.ok) throw new Error(`${context} failed: HTTP ${response.status}.`);
  return response.json();
}

/** Publish a draft only after both registries and GitHub expose the retained bytes and notes. */
async function finalizeRelease(cwd: string, options: FinalizeOptions): Promise<void> {
  const root = resolve(cwd);
  const artifacts = resolve(root, "release-artifacts");
  const inputs = (await Bun.file(
    join(artifacts, "history/release-inputs.json"),
  ).json()) as ReleaseInputs;
  const notes = await Bun.file(join(artifacts, "notes.md")).text();
  const checked = await preflightRelease(root, inputs.tag);
  if (
    inputs.name !== checked.name ||
    inputs.version !== checked.version ||
    inputs.commit !== checked.commit
  )
    throw new Error("Retained release inputs do not identify the checked package and commit.");
  if (!notes.startsWith(checked.notes))
    throw new Error("Retained release notes differ from the changelog.");
  const npmArchive = { ...inputs.candidate.npm, file: resolve(root, inputs.candidate.npm.file) };
  const crateArchive = {
    ...inputs.candidate.crate,
    file: resolve(root, inputs.candidate.crate.file),
  };
  const [npmBytes, crateBytes, npmPublished, cratePublished] = await Promise.all([
    digest(npmArchive),
    digest(crateArchive),
    registryIntegrity(
      `https://registry.npmjs.org/${encodeURIComponent(inputs.name)}/${inputs.version}`,
    ),
    crateChecksum(inputs.version),
  ]);
  if (!npmPublished || !cratePublished) throw new Error("Both registries must expose the version.");
  verifyIntegrity(npmBytes.bytes, npmPublished);
  verifyCrateChecksum(crateBytes.bytes, cratePublished);

  const api = "https://api.github.com";
  const byTag = `${api}/repos/${options.repository}/releases/tags/${encodeURIComponent(inputs.tag)}`;
  let response = await github(byTag, options.token);
  let current: Release;
  if (response.status === 404) {
    response = await github(`${api}/repos/${options.repository}/releases`, options.token, {
      method: "POST",
      body: JSON.stringify({ tag_name: inputs.tag, name: inputs.tag, body: notes, draft: true }),
    });
    current = release(await jsonResponse(response, "Create draft release"));
  } else current = release(await jsonResponse(response, "Read release"));
  if (!current.draft) {
    if (current.body !== notes) throw new Error("Final release notes differ from retained notes.");
  } else if (current.body !== notes) {
    const edited = await github(
      `${api}/repos/${options.repository}/releases/${current.id}`,
      options.token,
      {
        method: "PATCH",
        body: JSON.stringify({ body: notes }),
      },
    );
    current = release(await jsonResponse(edited, "Repair draft notes"));
  }

  const archives = [
    { archive: npmArchive, ...npmBytes },
    { archive: crateArchive, ...crateBytes },
  ];
  for (const item of archives) {
    const name = basename(item.archive.file);
    const existing = current.assets.find((asset) => asset.name === name);
    if (existing) {
      if (existing.digest !== `sha256:${item.sha256}`)
        throw new Error(`GitHub asset ${name} differs from retained bytes.`);
      continue;
    }
    if (!current.draft) throw new Error(`Final release is missing ${name}.`);
    const uploadUrl = new URL(current.upload_url.replace(/\{.*$/, ""));
    uploadUrl.searchParams.set("name", name);
    await jsonResponse(
      await github(uploadUrl.href, options.token, {
        method: "POST",
        body: Uint8Array.from(item.bytes).buffer,
        headers: { "Content-Type": "application/octet-stream" },
      }),
      `Upload ${name}`,
    );
  }
  if (!current.draft) return;
  const refreshed = release(await jsonResponse(await github(byTag, options.token), "Verify draft"));
  for (const item of archives) {
    const asset = refreshed.assets.find(({ name }) => name === basename(item.archive.file));
    if (asset?.digest !== `sha256:${item.sha256}`)
      throw new Error(`GitHub did not retain ${basename(item.archive.file)} exactly.`);
  }
  if (refreshed.body !== notes) throw new Error("GitHub did not retain the generated notes.");
  await jsonResponse(
    await github(`${api}/repos/${options.repository}/releases/${refreshed.id}`, options.token, {
      method: "PATCH",
      body: JSON.stringify({ draft: false }),
    }),
    "Finalize release",
  );
  // A successful mutation response does not prove the destination retained the final state.
  const final = release(
    await jsonResponse(await github(byTag, options.token), "Read final release"),
  );
  if (final.draft || final.body !== notes)
    throw new Error("Final release did not retain its public state and generated notes.");
  for (const item of archives) {
    const asset = final.assets.find(({ name }) => name === basename(item.archive.file));
    if (asset?.digest !== `sha256:${item.sha256}`)
      throw new Error(`Final release did not retain ${basename(item.archive.file)} exactly.`);
  }
}

if (import.meta.main) {
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GH_TOKEN;
  if (!repository || !token) throw new Error("GITHUB_REPOSITORY and GH_TOKEN are required.");
  finalizeRelease(process.cwd(), { repository, token }).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
