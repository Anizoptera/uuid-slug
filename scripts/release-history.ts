import { command } from "./command";

interface Version {
  readonly tag: string;
  readonly value: string;
  readonly major: number;
  readonly minor: number;
}

export interface ReleaseComparisons {
  readonly immediate?: string;
  readonly releaseLine?: string;
}

function parseTag(tag: string): Version {
  const identifier = String.raw`(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)`;
  const match = new RegExp(
    String.raw`^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(${identifier}(?:\.${identifier})*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$`,
  ).exec(tag);
  if (!match?.[1] || !match[2])
    throw new Error(`Release tag ${tag} is not strict SemVer vMAJOR.MINOR.PATCH.`);
  return { tag, value: tag.slice(1), major: Number(match[1]), minor: Number(match[2]) };
}

function descending(left: Version, right: Version): number {
  return -Bun.semver.order(left.value, right.value);
}

/** Select distinct historical releases; registries verify these choices but never replace them. */
export function selectReleaseComparisons(
  candidateTag: string,
  tags: readonly string[],
): ReleaseComparisons {
  const candidate = parseTag(candidateTag);
  const versions = tags.map(parseTag);
  if (
    versions.some((version, index) =>
      versions.slice(index + 1).some((other) => Bun.semver.order(version.value, other.value) === 0),
    )
  )
    throw new Error("Release tags contain versions with duplicate SemVer precedence.");
  const previous = versions.filter(({ value }) => Bun.semver.order(value, candidate.value) < 0);
  // The filtered array is fresh; mutating sort keeps the release tool on the package's ES2022 floor.
  // oxlint-disable-next-line unicorn/no-array-sort
  previous.sort(descending);
  const immediate = previous[0];
  if (!immediate) return {};
  const line = previous.find((version) =>
    candidate.major === 0
      ? version.major === 0 && version.minor < candidate.minor
      : version.major < candidate.major,
  );
  const releaseLine = line?.value === immediate.value ? previous[1] : line;
  return { immediate: immediate.tag, ...(releaseLine ? { releaseLine: releaseLine.tag } : {}) };
}

/** Read release history from Git; publication separately requires new tags to be annotated. */
export async function releaseComparisons(
  cwd: string,
  candidateTag: string,
): Promise<ReleaseComparisons> {
  const output = await command("git", ["tag", "--list"], cwd);
  const tags: string[] = [];
  for (const line of output.trim().split("\n")) {
    if (!line) continue;
    if (!line.startsWith("v") || !/^v\d/.test(line)) continue;
    parseTag(line);
    tags.push(line);
  }
  return selectReleaseComparisons(candidateTag, tags);
}
