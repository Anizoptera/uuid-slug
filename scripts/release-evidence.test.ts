import { expect, test } from "bun:test";
import { releaseEvidenceRun } from "./release-evidence";

test("release evidence follows the release commit across workflow runs and pages", async () => {
  const requests: URL[] = [];
  const server = Bun.serve({
    port: 0,
    fetch(request) {
      const url = new URL(request.url);
      requests.push(url);
      const page = Number(url.searchParams.get("page"));
      return Response.json({
        total_count: 101,
        artifacts:
          page === 1
            ? [
                {
                  name: "release-evidence",
                  expired: false,
                  workflow_run: { id: 1, head_sha: "another-commit" },
                },
                {
                  name: "release-evidence",
                  expired: true,
                  workflow_run: { id: 2, head_sha: "release-commit" },
                },
              ]
            : [
                {
                  name: "release-evidence",
                  expired: false,
                  workflow_run: { id: 3, head_sha: "release-commit" },
                },
              ],
      });
    },
  });
  try {
    expect(
      await releaseEvidenceRun("owner/repository", "release-commit", "token", server.url.origin),
    ).toBe(3);
    expect(requests).toHaveLength(2);
    expect(requests[0]?.pathname).toBe("/repos/owner/repository/actions/artifacts");
    expect(requests[0]?.searchParams.get("name")).toBe("release-evidence");
  } finally {
    await server.stop(true);
  }
});

test("release evidence returns absence only after the complete matching population", async () => {
  const server = Bun.serve({
    port: 0,
    fetch: () => Response.json({ total_count: 0, artifacts: [] }),
  });
  try {
    expect(
      await releaseEvidenceRun("owner/repository", "missing", "token", server.url.origin),
    ).toBe(undefined);
  } finally {
    await server.stop(true);
  }
});
