// Derive the CI floor from the package's support promise; reject unsupported range syntax.
const { engines } = await Bun.file(new URL("../package.json", import.meta.url)).json();
export const floor = /^>=(\d+)$/.exec(engines.node)?.[1];
if (!floor) throw new Error("engines.node must declare a supported >=major floor.");
const selected = process.env.SELECTED_NODE;
if (!selected) throw new Error("SELECTED_NODE must identify a runtime matrix member.");
if (selected === "matrix") {
  // Published majors, not LTS labels, define the coverage of an open-ended support range.
  const response = await fetch("https://nodejs.org/download/release/index.json", {
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Node release index returned HTTP ${response.status}.`);
  const releases = (await response.json()) as { version: string }[];
  const latest = new Map<number, string>();
  for (const { version } of releases) {
    const major = Number(/^v(\d+)\.\d+\.\d+$/.exec(version)?.[1]);
    if (!Number.isInteger(major) || major < Number(floor)) continue;
    const previous = latest.get(major);
    if (!previous || Bun.semver.order(version, previous) > 0) latest.set(major, version);
  }
  if (!latest.has(Number(floor)))
    throw new Error(`Node release index does not cover the floor ${floor}.`);
  const ordered = [...latest];
  // eslint-disable-next-line unicorn/no-array-sort -- Sort owned storage within the ES2022 type baseline.
  ordered.sort(([left], [right]) => left - right);
  const versions = ordered.map(([, version]) => version.slice(1));
  // Keep newest Node unpinned without executing that same major twice.
  versions[versions.length - 1] = "current-mask";
  console.log(`matrix=${JSON.stringify([...new Set([`${floor}.0.0`, ...versions])])}`);
} else {
  const node = selected === "floor" ? `${floor}.0.0` : selected;
  const runner = await Bun.file(
    new URL("../node_modules/vitest/package.json", import.meta.url),
  ).json();
  const compiler = await Bun.file(
    new URL("../node_modules/vite/package.json", import.meta.url),
  ).json();
  const tooling =
    node === "current-mask" ||
    [runner, compiler].every((tool) => Bun.semver.satisfies(node, tool.engines.node));
  console.log(`node=${node}\nvitest=${tooling}`);
}
