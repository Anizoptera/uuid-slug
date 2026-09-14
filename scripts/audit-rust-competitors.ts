import { readFile } from "node:fs/promises";

const document = "bench/PERFORMANCE.md";
const source = await readFile(document, "utf8");
const section = source.match(/### Rust competitor inventory\n(?<body>[\s\S]*?)(?=\n#{2,3} |$)/)
  ?.groups?.body;
if (!section) throw new Error(`${document} has no Rust competitor inventory section.`);

const rows = [
  ...section.matchAll(
    /^\| \[`(?<name>[^`]+)` (?<version>[^\]]+)]\([^)]*\) \| [^|]+ \| (?<release>[^|]+) \| (?<commit>[^|]+) \|/gm,
  ),
];
if (rows.length === 0) throw new Error(`${document} has no Rust competitor rows.`);

type CrateResponse = {
  crate: { repository: string | null };
  versions: { num: string; yanked: boolean; created_at: string }[];
};

async function current(name: string): Promise<readonly [string, string, string]> {
  const crateResponse = await fetch(`https://crates.io/api/v1/crates/${name}`, {
    headers: { "user-agent": "uuid-slug-competitor-audit/1.0" },
  });
  if (!crateResponse.ok) throw new Error(`${name}: crates.io returned ${crateResponse.status}.`);
  const crate = (await crateResponse.json()) as CrateResponse;
  const latest = crate.versions.find(({ yanked }) => !yanked);
  if (!latest) throw new Error(`${name}: crates.io returned no non-yanked release.`);

  const repository = crate.crate.repository?.match(
    /^https:\/\/github\.com\/(?<path>[^/]+\/[^/#]+?)(?:\.git)?\/?$/,
  )?.groups?.path;
  if (!repository) return [latest.num, latest.created_at.slice(0, 10), "unavailable"];

  const commitResponse = await fetch(`https://github.com/${repository}/commits.atom`, {
    headers: { "user-agent": "uuid-slug-competitor-audit/1.0" },
  });
  if (commitResponse.status === 404)
    return [latest.num, latest.created_at.slice(0, 10), "repository unavailable"];
  if (!commitResponse.ok) throw new Error(`${name}: GitHub returned ${commitResponse.status}.`);
  const feed = await commitResponse.text();
  const date = feed.match(/<updated>(?<date>\d{4}-\d{2}-\d{2})T/)?.groups?.date;
  if (!date) throw new Error(`${name}: GitHub commit feed has no updated date.`);
  return [latest.num, latest.created_at.slice(0, 10), date];
}

const findings = await Promise.all(
  rows.map(async ({ groups }) => {
    if (!groups) throw new Error(`${document} contains an unreadable Rust competitor row.`);
    const { name, version, release, commit } = groups;
    if (!name || !version || !release || !commit)
      throw new Error(`${document} contains an incomplete Rust competitor row.`);
    const observed = await current(name);
    const recorded = [version.trim(), release.trim(), commit.trim()] as const;
    return { name, observed, recorded };
  }),
);
const stale = findings.filter(({ observed, recorded }) =>
  observed.some((value, i) => value !== recorded[i]),
);
if (stale.length === 0) {
  console.log(
    `${findings.length} Rust competitor rows match crates.io releases and GitHub activity.`,
  );
} else {
  for (const { name, observed, recorded } of stale)
    console.error(`${name}: recorded ${recorded.join(" / ")}; current ${observed.join(" / ")}`);
  throw new Error(
    `${stale.length} Rust competitor row(s) are stale. Inspect changed releases before updating evidence or benchmarks.`,
  );
}
