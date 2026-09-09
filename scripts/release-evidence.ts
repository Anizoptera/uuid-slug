import { appendFile } from "node:fs/promises";

const repository = process.env.GITHUB_REPOSITORY;
const run = process.env.GITHUB_RUN_ID;
const output = process.env.GITHUB_OUTPUT;
const token = process.env.GITHUB_TOKEN;
const api = process.env.GITHUB_API_URL ?? "https://api.github.com";

if (!repository || !run || !output || !token)
  throw new Error(
    "GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_OUTPUT, and GITHUB_TOKEN are required.",
  );

const response = await fetch(
  `${api}/repos/${repository}/actions/runs/${run}/artifacts?name=release-evidence&per_page=2`,
  {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal: AbortSignal.timeout(20_000),
  },
);
if (!response.ok) throw new Error(`Release evidence lookup failed: HTTP ${response.status}.`);
const payload = (await response.json()) as {
  artifacts?: Array<{ expired?: unknown; name?: unknown }>;
};
if (!Array.isArray(payload.artifacts)) throw new Error("Release evidence lookup is malformed.");
const retained = payload.artifacts.filter(
  ({ expired, name }) => name === "release-evidence" && expired === false,
);
if (retained.length > 1) throw new Error("This release run has multiple retained evidence sets.");
await appendFile(output, `found=${retained.length === 1}\n`);
