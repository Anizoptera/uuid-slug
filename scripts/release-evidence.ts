import { appendFile } from "node:fs/promises";

interface Artifact {
  readonly expired: boolean;
  readonly name: string;
  readonly workflow_run: {
    readonly head_sha: string;
    readonly id: number;
  };
}

interface ArtifactPage {
  readonly artifacts: readonly Artifact[];
  readonly total_count: number;
}

function artifactPage(value: unknown): ArtifactPage {
  if (!value || typeof value !== "object") throw new Error("Release evidence lookup is malformed.");
  const { artifacts, total_count: totalCount } = value as Record<string, unknown>;
  if (!Array.isArray(artifacts) || typeof totalCount !== "number")
    throw new Error("Release evidence lookup is malformed.");
  for (const artifact of artifacts) {
    if (!artifact || typeof artifact !== "object")
      throw new Error("Release evidence lookup is malformed.");
    const { expired, name, workflow_run: workflowRun } = artifact as Record<string, unknown>;
    if (
      typeof expired !== "boolean" ||
      typeof name !== "string" ||
      !workflowRun ||
      typeof workflowRun !== "object"
    )
      throw new Error("Release evidence lookup is malformed.");
    const { head_sha: headSha, id } = workflowRun as Record<string, unknown>;
    if (typeof headSha !== "string" || typeof id !== "number")
      throw new Error("Release evidence lookup is malformed.");
  }
  return { artifacts: artifacts as Artifact[], total_count: totalCount };
}

/** Find retained evidence by immutable release commit so a fresh dispatch can repair the release. */
export async function releaseEvidenceRun(
  repository: string,
  commit: string,
  token: string,
  api = "https://api.github.com",
): Promise<number | undefined> {
  const perPage = 100;
  for (let page = 1; ; page++) {
    const url = new URL(`${api}/repos/${repository}/actions/artifacts`);
    url.searchParams.set("name", "release-evidence");
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("page", String(page));
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`Release evidence lookup failed: HTTP ${response.status}.`);
    const result = artifactPage(await response.json());
    const retained = result.artifacts.find(
      ({ expired, name, workflow_run: run }) =>
        name === "release-evidence" && !expired && run.head_sha === commit,
    );
    if (retained) return retained.workflow_run.id;
    if (page * perPage >= result.total_count) return undefined;
  }
}

if (import.meta.main) {
  const repository = process.env.GITHUB_REPOSITORY;
  const commit = process.env.GITHUB_SHA;
  const output = process.env.GITHUB_OUTPUT;
  const token = process.env.GITHUB_TOKEN;
  if (!repository || !commit || !output || !token)
    throw new Error("GITHUB_REPOSITORY, GITHUB_SHA, GITHUB_OUTPUT, and GITHUB_TOKEN are required.");
  const run = await releaseEvidenceRun(repository, commit, token, process.env.GITHUB_API_URL);
  await appendFile(
    output,
    `found=${run !== undefined}\n${run === undefined ? "" : `run-id=${run}\n`}`,
  );
}
