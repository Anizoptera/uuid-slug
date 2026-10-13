import { createHash } from "node:crypto";
import { basename, join, resolve } from "node:path";
import type { ReleaseInputs, RetainedArchive } from "./release-inputs";
import { readRetainedArchive } from "./release-inputs";
import { crateChecksum, verifyCrateChecksum } from "./release-crate";
import { preflightRelease } from "./release-notes";
import { releaseSelection } from "./release-selection";
import { consumerReleaseNotes } from "./release-report";
import type { ReleaseReport } from "./release-report";
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

interface FinalArchive {
  readonly archive: RetainedArchive;
  readonly bytes: Uint8Array;
  readonly sha256: string;
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
    signal: init?.signal ?? AbortSignal.timeout(20_000),
  });
}

async function jsonResponse(response: Response, context: string): Promise<unknown> {
  if (!response.ok) throw new Error(`${context} failed: HTTP ${response.status}.`);
  return response.json();
}

async function draftByTag(
  repository: string,
  tag: string,
  token: string,
): Promise<Release | undefined> {
  // The tag endpoint excludes drafts; list them for recovery instead of creating a duplicate.
  const signal = AbortSignal.timeout(20_000);
  for (let page = 1; ; page++) {
    signal.throwIfAborted();
    const value = await jsonResponse(
      await github(
        `https://api.github.com/repos/${repository}/releases?per_page=100&page=${page}`,
        token,
        { signal },
      ),
      "Read draft releases",
    );
    if (!Array.isArray(value)) throw new Error("GitHub releases are not an array.");
    const found = value.find((entry) => object(entry, "GitHub release").tag_name === tag);
    if (found) return release(found);
    if (value.length < 100) return undefined;
  }
}

/** Publish a draft only after selected registries and GitHub expose the retained bytes and notes. */
async function finalizeRelease(cwd: string, options: FinalizeOptions): Promise<void> {
  const root = resolve(cwd);
  const artifacts = resolve(root, "release-artifacts");
  const inputs = (await Bun.file(
    join(artifacts, "history/release-inputs.json"),
  ).json()) as ReleaseInputs;
  const checked = await preflightRelease(root, inputs.tag);
  if (
    inputs.name !== checked.name ||
    inputs.version !== checked.version ||
    inputs.commit !== checked.commit
  )
    throw new Error("Retained release inputs do not identify the checked package and commit.");
  const npmArchive = { ...inputs.candidate.npm, file: resolve(root, inputs.candidate.npm.file) };
  const crateArchive = {
    ...inputs.candidate.crate,
    file: resolve(root, inputs.candidate.crate.file),
  };
  const selected = releaseSelection(process.env.UUID_SLUG_RELEASE_PACKAGES);
  const report = (await Bun.file(join(artifacts, "release-report.json")).json()) as ReleaseReport;
  const notes = consumerReleaseNotes(checked.notes, report, selected);
  const archives: FinalArchive[] = [];
  if (selected !== "crate") {
    const [npmBytes, npmPublished] = await Promise.all([
      digest(npmArchive),
      registryIntegrity(
        `https://registry.npmjs.org/${encodeURIComponent(inputs.name)}/${inputs.version}`,
      ),
    ]);
    if (!npmPublished) throw new Error("npm must expose the selected version.");
    verifyIntegrity(npmBytes.bytes, npmPublished);
    archives.push({ archive: npmArchive, ...npmBytes });
  }
  if (selected !== "npm") {
    const [crateBytes, cratePublished] = await Promise.all([
      digest(crateArchive),
      crateChecksum(inputs.version),
    ]);
    if (!cratePublished) throw new Error("crates.io must expose the selected version.");
    verifyCrateChecksum(crateBytes.bytes, cratePublished);
    archives.push({ archive: crateArchive, ...crateBytes });
  }

  const api = "https://api.github.com";
  const byTag = `${api}/repos/${options.repository}/releases/tags/${encodeURIComponent(inputs.tag)}`;
  let response = await github(byTag, options.token);
  let current: Release;
  if (response.status === 404) {
    const draft = await draftByTag(options.repository, inputs.tag, options.token);
    if (draft) current = draft;
    else {
      response = await github(`${api}/repos/${options.repository}/releases`, options.token, {
        method: "POST",
        body: JSON.stringify({ tag_name: inputs.tag, name: inputs.tag, body: notes, draft: true }),
      });
      current = release(await jsonResponse(response, "Create draft release"));
    }
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

  for (const item of archives) {
    const name = basename(item.archive.file);
    const existing = current.assets.find((asset) => asset.name === name);
    if (existing) {
      if (existing.digest !== `sha256:${item.sha256}`)
        throw new Error(`GitHub asset ${name} differs from retained bytes.`);
      continue;
    }
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
  const refreshed = release(
    await jsonResponse(
      await github(`${api}/repos/${options.repository}/releases/${current.id}`, options.token),
      "Verify release",
    ),
  );
  for (const item of archives) {
    const asset = refreshed.assets.find(({ name }) => name === basename(item.archive.file));
    if (asset?.digest !== `sha256:${item.sha256}`)
      throw new Error(`GitHub did not retain ${basename(item.archive.file)} exactly.`);
  }
  if (refreshed.body !== notes) throw new Error("GitHub did not retain the generated notes.");
  if (!refreshed.draft) return;
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
