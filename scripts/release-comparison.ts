import { fromMarkdown } from "mdast-util-from-markdown";
import ts from "typescript-floor";

export type ReleaseLevel = "prerelease" | "patch" | "minor" | "major";

export interface ApiDifference {
  readonly report: string;
  readonly level: ReleaseLevel;
}

type DeclarationContainer =
  | ts.ClassDeclaration
  | ts.EnumDeclaration
  | ts.InterfaceDeclaration
  | ts.ModuleDeclaration;

function isDeclarationContainer(node: ts.Node): node is DeclarationContainer {
  return (
    ts.isClassDeclaration(node) ||
    ts.isEnumDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isModuleDeclaration(node)
  );
}

export function combineDifferences(...differences: readonly ApiDifference[]): ApiDifference {
  const levels = new Set(differences.map(({ level }) => level));
  return {
    report: differences.map(({ report }) => report).join("\n\n"),
    level: levels.has("major") ? "major" : levels.has("minor") ? "minor" : "patch",
  };
}

export function normalizeDeclarations(source: string): string {
  const file = ts.createSourceFile("public.d.ts", source, ts.ScriptTarget.Latest, true);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: true });
  const entries: string[] = [];
  const print = (node: ts.Node): string =>
    printer.printNode(ts.EmitHint.Unspecified, node, file).trim();
  const visit = (node: ts.Node, owners: readonly string[]): void => {
    if (isDeclarationContainer(node) && node.name) {
      const name = node.name.getText(file);
      const path = [...owners, name];
      const shell = ts.isClassDeclaration(node)
        ? ts.factory.updateClassDeclaration(
            node,
            node.modifiers,
            node.name,
            node.typeParameters,
            node.heritageClauses,
            [],
          )
        : ts.isInterfaceDeclaration(node)
          ? ts.factory.updateInterfaceDeclaration(
              node,
              node.modifiers,
              node.name,
              node.typeParameters,
              node.heritageClauses,
              [],
            )
          : ts.isEnumDeclaration(node)
            ? ts.factory.updateEnumDeclaration(node, node.modifiers, node.name, [])
            : ts.factory.updateModuleDeclaration(node, node.modifiers, node.name, undefined);
      entries.push(`${path.join(".")}: ${print(shell)}`);
      if (ts.isModuleDeclaration(node)) {
        if (node.body && ts.isModuleDeclaration(node.body)) visit(node.body, path);
        else if (node.body && ts.isModuleBlock(node.body))
          for (const statement of node.body.statements) visit(statement, path);
      } else {
        for (const member of node.members) entries.push(`${path.join(".")}: ${print(member)}`);
      }
      return;
    }
    entries.push(owners.length ? `${owners.join(".")}: ${print(node)}` : print(node));
  };
  for (const statement of file.statements) visit(statement, []);
  // One record per owned declaration preserves overload order while making additive members additive.
  return entries.map((entry) => JSON.stringify(entry)).join("\n");
}

function displayDeclaration(line: string): string {
  return line.startsWith('"') ? (JSON.parse(line) as string) : line;
}

// Prefix every physical line so multiline declarations remain readable Markdown diff blocks.
function declarationLines(values: readonly string[], prefix: string): string[] {
  return values.flatMap((value) =>
    displayDeclaration(value)
      .split("\n")
      .map((line) => prefix + line),
  );
}

function declarationDiff(removed: readonly string[], added: readonly string[]): string {
  const body = [...declarationLines(removed, "- "), ...declarationLines(added, "+ ")].join("\n");
  const fence = "`".repeat(
    Math.max(3, ...[...body.matchAll(/`+/g)].map(([run]) => run.length + 1)),
  );
  return `${fence}diff\n${body}\n${fence}`;
}

export function apiDifference(before: string, after: string, language: string): ApiDifference {
  if (before === after) return { report: `No packaged ${language} changes.`, level: "patch" };
  const oldLines = new Set(
    before
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  );
  const newLines = new Set(
    after
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  );
  const removed = [...oldLines].filter((line) => !newLines.has(line));
  const added = [...newLines].filter((line) => !oldLines.has(line));
  const previous = before.split("\n").filter(Boolean);
  let retained = 0;
  for (const line of after.split("\n")) if (line === previous[retained]) retained++;
  // Sets cannot detect moved members, repeated declarations, or overload precedence.
  if (!removed.length && !added.length)
    return {
      report: `Declaration order or repetition changed.\n\n${declarationDiff(before.split("\n").filter(Boolean), after.split("\n").filter(Boolean))}`,
      level: "major",
    };
  return {
    report: declarationDiff(removed, added),
    level: removed.length || retained !== previous.length ? "major" : "minor",
  };
}

export const apiDiff = (before: string, after: string): string =>
  apiDifference(
    normalizeDeclarations(before),
    normalizeDeclarations(after),
    "TypeScript declaration",
  ).report;

// Compatibility checks retain private dependencies; upgrade notes show only caller-facing rows.
function publicRows(source: string): string {
  const rows = source.split("\n").filter(Boolean);
  const owners = new Set(
    rows.flatMap((row) => {
      const declaration = displayDeclaration(row);
      const owner = /^([\w.]+): export\b/.exec(declaration)?.[1];
      return owner ? [owner] : [];
    }),
  );
  return rows
    .filter((row) => {
      const declaration = displayDeclaration(row);
      if (declaration.startsWith("export ")) return true;
      const owner = /^([\w.]+): /.exec(declaration)?.[1];
      return owner !== undefined && owners.has(owner) && !declaration.includes("readonly [");
    })
    .join("\n");
}

export function publicApiDifference(before: string, after: string): string {
  return apiDifference(publicRows(before), publicRows(after), "public API").report;
}

export function minimumRelease(
  version: string,
  notes: string,
  languages: readonly ReleaseLevel[],
): ReleaseLevel {
  if (version.split("+", 1)[0]?.includes("-")) return "prerelease";
  const headings = new Set(
    fromMarkdown(notes).children.flatMap((node) => {
      if (node.type !== "heading" || node.depth !== 3) return [];
      return [node.children.map((child) => (child.type === "text" ? child.value : "")).join("")];
    }),
  );
  const declared = headings.has("Breaking changes")
    ? "major"
    : headings.has("Added")
      ? "minor"
      : "patch";
  const strongest =
    declared === "major" || languages.includes("major")
      ? "major"
      : declared === "minor" || languages.includes("minor")
        ? "minor"
        : "patch";
  return version.startsWith("0.") && strongest === "major" ? "minor" : strongest;
}

export function satisfiesMinimum(
  previous: string,
  current: string,
  minimum: ReleaseLevel,
): boolean {
  if (minimum === "prerelease" || previous.split("+", 1)[0]?.includes("-")) return true;
  const [oldMajorText, oldMinorText] = previous.split(".");
  const [newMajorText, newMinorText] = current.split(".");
  if (
    !oldMajorText ||
    !oldMinorText ||
    !newMajorText ||
    !newMinorText ||
    ![oldMajorText, oldMinorText, newMajorText, newMinorText].every((part) => /^\d+$/.test(part))
  )
    return false;
  const oldMajor = BigInt(oldMajorText);
  const oldMinor = BigInt(oldMinorText);
  const newMajor = BigInt(newMajorText);
  const newMinor = BigInt(newMinorText);
  if (minimum === "major") return newMajor > oldMajor;
  if (minimum === "minor")
    return newMajor > oldMajor || (newMajor === oldMajor && newMinor > oldMinor);
  return Bun.semver.order(current, previous) > 0;
}

export function sizeDelta(current: number | undefined, previous: number | undefined): string {
  if (current === undefined || previous === undefined) return "unavailable";
  const absolute = current - previous;
  if (previous === 0) return `${current} B (${absolute >= 0 ? "+" : ""}${absolute} B)`;
  const percentage = (absolute / previous) * 100;
  return `${current} B (${absolute >= 0 ? "+" : ""}${absolute} B, ${percentage >= 0 ? "+" : ""}${percentage.toFixed(1)}%)`;
}
