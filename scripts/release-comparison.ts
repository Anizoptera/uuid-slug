import { fromMarkdown } from "mdast-util-from-markdown";
import ts from "typescript-floor";

export type ReleaseLevel = "prerelease" | "patch" | "minor" | "major";

export interface ApiDifference {
  readonly report: string;
  readonly level: ReleaseLevel;
}

interface DeclarationRecord {
  readonly text: string;
  readonly family: string;
  readonly visible: boolean;
}

function declarationName(node: ts.Node, file: ts.SourceFile): string {
  if (ts.isVariableStatement(node))
    return node.declarationList.declarations.map(({ name }) => name.getText(file)).join(", ");
  // Emitted declarations may be unnamed signatures; NamedDeclaration's optional name covers both.
  const name = (node as ts.NamedDeclaration).name;
  return name?.getText(file) ?? ts.SyntaxKind[node.kind];
}

function exported(node: ts.Node): boolean {
  return (
    ts.isExportDeclaration(node) ||
    ts.isExportAssignment(node) ||
    (ts.canHaveModifiers(node) &&
      !!ts.getModifiers(node)?.some(({ kind }) => kind === ts.SyntaxKind.ExportKeyword))
  );
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
  // Keep compiler names and visibility with the printed text: reparsing names loses valid API changes.
  const file = ts.createSourceFile("public.d.ts", source, ts.ScriptTarget.Latest, true);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: true });
  const entries: DeclarationRecord[] = [];
  const namedExports = new Set(
    file.statements.flatMap((node) =>
      ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)
        ? node.exportClause.elements.map((entry) => (entry.propertyName ?? entry.name).text)
        : [],
    ),
  );
  const privateSymbols = new Set(
    file.statements.flatMap((node) =>
      ts.isVariableStatement(node) && !exported(node)
        ? node.declarationList.declarations
            .filter(
              ({ name, type }) =>
                !namedExports.has(name.getText(file)) &&
                type &&
                ts.isTypeOperatorNode(type) &&
                type.operator === ts.SyntaxKind.UniqueKeyword,
            )
            .map(({ name }) => name.getText(file))
        : [],
    ),
  );
  const print = (node: ts.Node): string =>
    printer.printNode(ts.EmitHint.Unspecified, node, file).trim();
  const emit = (node: ts.Node, text: string, owners: readonly string[], visible: boolean) => {
    const name = (node as ts.NamedDeclaration).name;
    const hidden =
      (ts.canHaveModifiers(node) &&
        !!ts.getModifiers(node)?.some(({ kind }) => kind === ts.SyntaxKind.PrivateKeyword)) ||
      (name && ts.isPrivateIdentifier(name)) ||
      (name &&
        ts.isComputedPropertyName(name) &&
        ts.isIdentifier(name.expression) &&
        privateSymbols.has(name.expression.text));
    entries.push({
      text,
      family: [...owners, declarationName(node, file)].join("."),
      visible: visible && !hidden,
    });
  };
  const visit = (node: ts.Node, owners: readonly string[], parentVisible = false): void => {
    if (ts.isVariableStatement(node) && node.declarationList.declarations.length > 1) {
      for (const declaration of node.declarationList.declarations)
        visit(
          ts.factory.updateVariableStatement(
            node,
            node.modifiers,
            ts.factory.updateVariableDeclarationList(node.declarationList, [declaration]),
          ),
          owners,
          parentVisible,
        );
      return;
    }
    const visible = owners.length
      ? parentVisible
      : exported(node) || namedExports.has(declarationName(node, file));
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
      emit(node, `${path.join(".")}: ${print(shell)}`, owners, visible);
      if (ts.isModuleDeclaration(node)) {
        if (node.body && ts.isModuleDeclaration(node.body)) visit(node.body, path, visible);
        else if (node.body && ts.isModuleBlock(node.body))
          for (const statement of node.body.statements) visit(statement, path, visible);
      } else {
        for (const member of node.members)
          emit(member, `${path.join(".")}: ${print(member)}`, path, visible);
      }
      return;
    }
    emit(
      node,
      owners.length ? `${owners.join(".")}: ${print(node)}` : print(node),
      owners,
      visible,
    );
  };
  for (const statement of file.statements) visit(statement, []);
  // One record per owned declaration preserves overload order while making additive members additive.
  return entries.map((entry) => JSON.stringify(entry)).join("\n");
}

function displayDeclaration(line: string): string {
  if (line.startsWith("{")) return (JSON.parse(line) as DeclarationRecord).text;
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

function declarationFamilies(source: string): Map<string, string[]> {
  // Pure reorder changes need the affected overload family, not the entire declaration inventory.
  // normalizeDeclarations carries the compiler's family; never guess names from signature text.
  const families = new Map<string, string[]>();
  for (const row of source.split("\n").filter(Boolean)) {
    const name = row.startsWith("{") ? (JSON.parse(row) as DeclarationRecord).family : row;
    const rows = families.get(name);
    if (rows) rows.push(row);
    else families.set(name, [row]);
  }
  return families;
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
  const current = after.split("\n").filter(Boolean);
  let retained = 0;
  for (const line of current) if (line === previous[retained]) retained++;
  // Sets cannot detect moved members, repeated declarations, or overload precedence.
  if (!removed.length && !added.length) {
    const oldFamilies = declarationFamilies(before);
    const newFamilies = declarationFamilies(after);
    const changed = [...oldFamilies.keys()].filter(
      (name) => JSON.stringify(oldFamilies.get(name)) !== JSON.stringify(newFamilies.get(name)),
    );
    // Ordered metadata has no overload families; show moved rows instead of claiming no API effect.
    if (!changed.length && previous.some((row) => !row.startsWith("{")))
      return {
        report: declarationDiff(
          previous.filter((row, index) => row !== current[index]),
          current.filter((row, index) => row !== previous[index]),
        ),
        level: "major",
      };
    return {
      report: changed.length
        ? declarationDiff(
            changed.flatMap((name) => oldFamilies.get(name) ?? []),
            changed.flatMap((name) => newFamilies.get(name) ?? []),
          )
        : "Declaration order changed; public signatures are unchanged.",
      level: "major",
    };
  }
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
  return source
    .split("\n")
    .filter((row) => row.startsWith("{") && (JSON.parse(row) as DeclarationRecord).visible)
    .join("\n");
}

export function publicApiDifference(before: string, after: string): string {
  const previous = publicRows(before);
  const current = publicRows(after);
  return previous === current ? "" : apiDifference(previous, current, "public API").report;
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
