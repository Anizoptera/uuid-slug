import { readFile } from "node:fs/promises";

const document = "bench/decisions.md";
const source = await readFile(document, "utf8");
const rustSection = source.match(/### Rust competitor inventory\n(?<body>[\s\S]*?)(?=\n#{2,3} |$)/)
  ?.groups?.body;
if (!rustSection) throw new Error(`${document} has no Rust competitor inventory section.`);

const rustRows = [
  ...rustSection.matchAll(
    /^\| \[`(?<name>[^`]+)` (?<version>[^\]]+)]\([^)]*\) \| [^|]+ \| (?<release>[^|]+) \| (?<commit>[^|]+) \|/gm,
  ),
];
if (rustRows.length === 0) throw new Error(`${document} has no Rust competitor rows.`);

type CrateResponse = {
  crate: { max_stable_version: string; repository: string | null };
  versions: { num: string; yanked: boolean; created_at: string }[];
};

type NpmResponse = {
  "dist-tags": { latest: string };
  repository?: { url?: string } | string;
  time: Record<string, string>;
};

async function latestGithubCommit(repository: string | null | undefined) {
  const path = repository
    ?.replace(/^git\+/, "")
    .replace(/\.git(?:#.*)?$/, "")
    .match(/github\.com[/:](?<path>[^/]+\/[^/#]+)$/)?.groups?.path;
  if (!path) return "unavailable";
  const response = await fetch(`https://github.com/${path}/commits.atom`, {
    headers: { "user-agent": "uuid-slug-competitor-audit/1.0" },
  });
  if (response.status === 404) return "repository unavailable";
  if (!response.ok) throw new Error(`${path}: GitHub returned ${response.status}.`);
  const feed = await response.text();
  const date = feed.match(/<updated>(?<date>\d{4}-\d{2}-\d{2})T/)?.groups?.date;
  if (!date) throw new Error(`${path}: GitHub commit feed has no updated date.`);
  return date;
}

async function currentPackage(name: string): Promise<readonly [string, string, string]> {
  const response = await fetch(`https://registry.npmjs.org/${name.replace("/", "%2f")}`, {
    headers: { "user-agent": "uuid-slug-competitor-audit/1.0" },
  });
  if (!response.ok) throw new Error(`${name}: npm returned ${response.status}.`);
  const pkg = (await response.json()) as NpmResponse;
  const version = pkg["dist-tags"].latest;
  const released = pkg.time[version];
  if (!released) throw new Error(`${name}: npm returned no release date for ${version}.`);
  const repository = typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url;
  return [version, released.slice(0, 10), await latestGithubCommit(repository)];
}

async function currentCrate(name: string): Promise<readonly [string, string, string]> {
  const crateResponse = await fetch(`https://crates.io/api/v1/crates/${name}`, {
    headers: { "user-agent": "uuid-slug-competitor-audit/1.0" },
  });
  if (!crateResponse.ok) throw new Error(`${name}: crates.io returned ${crateResponse.status}.`);
  const crate = (await crateResponse.json()) as CrateResponse;
  // crates.io orders versions by publication time, so a newly published lower
  // SemVer can precede the registry's selected stable release.
  const latest = crate.versions.find(
    ({ num, yanked }) => !yanked && num === crate.crate.max_stable_version,
  );
  if (!latest) throw new Error(`${name}: crates.io returned no non-yanked release.`);

  return [
    latest.num,
    latest.created_at.slice(0, 10),
    await latestGithubCommit(crate.crate.repository),
  ];
}

const typescriptSection = source.match(
  /### TypeScript competitor inventory\n(?<body>[\s\S]*?)(?=\n#{2,3} |$)/,
)?.groups?.body;
if (!typescriptSection)
  throw new Error(`${document} has no TypeScript competitor inventory section.`);
const typescriptRows = [
  ...typescriptSection.matchAll(
    /^\| \[`(?<name>[^`]+)` (?<version>[^\]]+)]\([^)]*\) \| (?<release>[^|]+) \| (?<commit>[^|]+) \|/gm,
  ),
];
if (typescriptRows.length === 0) throw new Error(`${document} has no TypeScript competitor rows.`);

async function audit(
  rows: RegExpMatchArray[],
  current: (name: string) => Promise<readonly [string, string, string]>,
) {
  return Promise.all(
    rows.map(async ({ groups }) => {
      if (!groups) throw new Error(`${document} contains an unreadable competitor row.`);
      const { name, version, release, commit } = groups;
      if (!name || !version || !release || !commit)
        throw new Error(`${document} contains an incomplete competitor row.`);
      const observed = await current(name);
      const recorded = [version.trim(), release.trim(), commit.trim()] as const;
      return { name, observed, recorded };
    }),
  );
}

const [rustFindings, typescriptFindings] = await Promise.all([
  audit(rustRows, currentCrate),
  audit(typescriptRows, currentPackage),
]);
const findings = [...rustFindings, ...typescriptFindings];
const stale = findings.filter(({ observed, recorded }) =>
  observed.some((value, i) => value !== recorded[i]),
);
if (stale.length === 0) {
  console.log(
    `${rustRows.length} Rust and ${typescriptRows.length} TypeScript competitor rows match their registry releases and GitHub activity.`,
  );
} else {
  for (const { name, observed, recorded } of stale)
    console.error(`${name}: recorded ${recorded.join(" / ")}; current ${observed.join(" / ")}`);
  throw new Error(
    `${stale.length} competitor row(s) are stale. Inspect changed releases before updating evidence or benchmarks.`,
  );
}
