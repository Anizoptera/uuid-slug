// Turn `## [Unreleased]` into the release section: `bun run changelog <X.Y.Z>`.
// Entries are written as changes land, so their consumer-facing reason is recorded while it is
// known; drafting from commit subjects at release time loses it and mixes in internal changes.
import { releaseNotes } from "./release-notes";

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+$/.test(version))
  throw new Error("Usage: bun run changelog <X.Y.Z> (the version being released, no v prefix)");

const path = `${import.meta.dir}/../CHANGELOG.md`;
const markdown = await Bun.file(path).text();
// Same reader as the release lane: exactly one Unreleased section with real content.
releaseNotes(markdown, "Unreleased");
if (markdown.includes(`\n## [${version}]`))
  throw new Error(`CHANGELOG.md already has a ## [${version}] section.`);
await Bun.write(
  path,
  markdown.replace("\n## [Unreleased]\n", `\n## [Unreleased]\n\n## [${version}]\n`),
);
console.log(
  `CHANGELOG.md: Unreleased entries are now ## [${version}]; read them as a consumer, then commit.`,
);
