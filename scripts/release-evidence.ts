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
  if (!value || typeof value !== "object")
    throw new Error("GitHub artifact response must be an object.");
  const { artifacts, total_count: totalCount } = value as Record<string, unknown>;
  if (!Array.isArray(artifacts))
    throw new Error("GitHub artifact response has no artifacts array.");
  if (typeof totalCount !== "number")
    throw new Error("GitHub artifact response has no numeric total_count.");
  for (const [index, artifact] of artifacts.entries()) {
    if (!artifact || typeof artifact !== "object")
      throw new Error(`GitHub artifact at index ${index} must be an object.`);
    const { expired, name, workflow_run: workflowRun } = artifact as Record<string, unknown>;
    if (typeof expired !== "boolean")
      throw new Error(`GitHub artifact at index ${index} has no boolean expired value.`);
    if (typeof name !== "string")
      throw new Error(`GitHub artifact at index ${index} has no string name.`);
    if (!workflowRun || typeof workflowRun !== "object")
      throw new Error(`GitHub artifact at index ${index} has no workflow_run object.`);
    const { head_sha: headSha, id } = workflowRun as Record<string, unknown>;
    if (typeof headSha !== "string")
      throw new Error(`GitHub artifact at index ${index} has no workflow_run.head_sha string.`);
    if (typeof id !== "number")
      throw new Error(`GitHub artifact at index ${index} has no numeric workflow_run.id.`);
  }
  return { artifacts: artifacts as Artifact[], total_count: totalCount };
}

/** Find retained evidence by immutable release commit so a fresh dispatch can repair the release. */
async function releaseEvidenceRun(
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
