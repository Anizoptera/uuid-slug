import { fromMarkdown } from "mdast-util-from-markdown";
import { command } from "./command";
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

/**
 * Renames the notes declare as `` `old` → `new` ``, or as lists of the same length
 * (`` `A`, `B` and `C` → `X`, `Y` and `Z` ``), by leading identifier: `` `uuidV7At(timestamp)` ``
 * names `uuidV7At`. The release diff pairs exactly these declarations; it never guesses renames.
 * A code span that does not start with an identifier, such as `` `codec.migration` ``, pairs nothing.
 */
export function declaredRenames(markdown: string): Map<string, string> {
  const renames = new Map<string, string>();
  const walk = (node: TextNode): void => {
    // `run` collects adjacent code spans; after an arrow, `left` waits for a run as long as itself.
    let run: (string | undefined)[] = [];
    let left: (string | undefined)[] | undefined;
    for (const child of node.children ?? []) {
      if (child.type === "inlineCode") {
        run.push(/^([A-Za-z_$][\w$]*)(?:$|[(<])/.exec(child.value ?? "")?.[1]);
        if (left?.length !== run.length) continue;
        left.forEach((from, index) => {
          const to = run[index];
          if (from && to) renames.set(from, to);
        });
        left = undefined;
        run = [];
      } else if (child.type === "text" && child.value?.trim() === "→" && run.length) {
        left = run;
        run = [];
      } else if (child.type !== "text" || !/^\s*(,|,? and)?\s*$/.test(child.value ?? "")) {
        run = [];
        left = undefined;
        walk(child);
      }
    }
  };
  walk(fromMarkdown(markdown));
  return renames;
}

/** Tag agreement and notes are checked before any registry or GitHub write. */
export async function preflightRelease(
  cwd: string,
  tag?: string,
  synchronize = false,
): Promise<{ name: string; version: string; notes: string; commit: string | undefined }> {
  const manifest = await Bun.file(`${cwd}/package.json`).json();
  if (typeof manifest.version !== "string" || typeof manifest.name !== "string")
    throw new Error("Manifest must name a package and version.");
  if (tag !== undefined && tag !== `v${manifest.version}`)
    throw new Error(`Tag ${tag} does not match package.json ${manifest.version}.`);
  let commit: string | undefined;
  if (tag !== undefined) {
    // Version text alone cannot bind publication to the commit that passed verification.
    const ref = `refs/tags/${tag}`;
    const [kind, commits] = await Promise.all([
      command("git", ["cat-file", "-t", ref], cwd),
      command("git", ["rev-parse", "HEAD", `${ref}^{commit}`], cwd),
    ]);
    if (kind.trim() !== "tag")
      throw new Error(`Release ${tag} must be an annotated tag created by the release command.`);
    const [head, tagged] = commits.trim().split("\n");
    if (!head || head !== tagged)
      throw new Error(`Release ${tag} does not point to HEAD; check out the tagged commit.`);
    commit = tagged;
  }
  const notes = releaseNotes(await Bun.file(`${cwd}/CHANGELOG.md`).text(), manifest.version);
  if (synchronize) await syncReleaseVersion(cwd, manifest.version);
  else await checkReleaseVersion(cwd, manifest.version);
  return {
    name: manifest.name,
    version: manifest.version,
    notes,
    commit,
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
