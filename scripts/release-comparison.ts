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
    const name =
      (ts.isClassDeclaration(node) ||
        ts.isEnumDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isModuleDeclaration(node)) &&
      node.name
        ? node.name.getText(file)
        : undefined;
    if (name && isDeclarationContainer(node)) {
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
  return (line.startsWith('"') ? (JSON.parse(line) as string) : line).replaceAll("`", "\\`");
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
      report: `Declaration order or ownership changed.\n\nBefore:\n\n\`\`\`text\n${before}\n\`\`\`\n\nAfter:\n\n\`\`\`text\n${after}\n\`\`\``,
      level: "major",
    };
  return {
    report: [
      ...removed.map((line) => `- \`${displayDeclaration(line)}\``),
      ...added.map((line) => `- \`${displayDeclaration(line)}\` (added)`),
    ].join("\n"),
    level: removed.length || retained !== previous.length ? "major" : "minor",
  };
}

export const apiDiff = (before: string, after: string): string =>
  apiDifference(
    normalizeDeclarations(before),
    normalizeDeclarations(after),
    "TypeScript declaration",
  ).report;

export function minimumRelease(
  version: string,
  notes: string,
  languages: readonly ReleaseLevel[],
): ReleaseLevel {
  if (version.split("+", 1)[0]?.includes("-")) return "prerelease";
  const declared = notes.includes("### Breaking changes")
    ? "major"
    : notes.includes("### Added")
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
