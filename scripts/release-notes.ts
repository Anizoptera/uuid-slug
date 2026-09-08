import { fromMarkdown } from "mdast-util-from-markdown";
import { checkReleaseVersion, syncReleaseVersion } from "./release-version";

interface TextNode {
  type: string;
  value?: string;
  children?: readonly TextNode[];
}
const text = (node: TextNode): string => node.value ?? node.children?.map(text).join("") ?? "";

/** Select a real top-level release section and preserve its body bytes, including fences. */
export function releaseNotes(markdown: string, version: string): string {
  const nodes = fromMarkdown(markdown).children;
  const matches = nodes.flatMap((node, index) => {
    if (node.type !== "heading" || node.depth !== 2) return [];
    const label = text(node).split(/\s/, 1)[0];
    return label === version || label === `[${version}]` ? [index] : [];
  });
  const index = matches[0];
  if (matches.length !== 1 || index === undefined)
    throw new Error(
      `CHANGELOG.md must have exactly one ## [${version}] section. Draft, edit and commit it before releasing.`,
    );
  const heading = nodes[index];
  const start = heading?.position?.end.offset;
  if (start === undefined) throw new Error("Release heading has no source position.");
  const following = nodes.slice(index + 1);
  const boundary = following.findIndex((node) => node.type === "heading" && node.depth <= 2);
  const body = boundary < 0 ? following : following.slice(0, boundary);
  if (
    !body.some(
      (node) =>
        node.type !== "definition" &&
        node.type !== "html" &&
        node.type !== "heading" &&
        node.type !== "thematicBreak",
    )
  )
    throw new Error(`CHANGELOG.md section ${version} has no release notes.`);
  const end = boundary < 0 ? markdown.length : following[boundary]?.position?.start.offset;
  if (end === undefined) throw new Error("Release boundary has no source position.");
  return markdown.slice(start, end);
}

/** Tag agreement and notes are checked before any registry or GitHub write. */
export async function preflightRelease(
  cwd: string,
  tag?: string,
  synchronize = false,
): Promise<{ name: string; version: string; notes: string }> {
  const manifest = await Bun.file(`${cwd}/package.json`).json();
  if (typeof manifest.version !== "string" || typeof manifest.name !== "string")
    throw new Error("Manifest must name a package and version.");
  if (tag !== undefined && tag !== `v${manifest.version}`)
    throw new Error(`Tag ${tag} does not match package.json ${manifest.version}.`);
  const notes = releaseNotes(await Bun.file(`${cwd}/CHANGELOG.md`).text(), manifest.version);
  if (synchronize) await syncReleaseVersion(cwd, manifest.version);
  else await checkReleaseVersion(cwd, manifest.version);
  return {
    name: manifest.name,
    version: manifest.version,
    notes,
  };
}

if (import.meta.main)
  preflightRelease(
    process.cwd(),
    process.argv[2] === "--sync" ? undefined : process.argv[2],
    process.argv[2] === "--sync",
  )
    .then(({ notes }) => process.stdout.write(notes))
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
