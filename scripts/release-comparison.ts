import { fromMarkdown } from "mdast-util-from-markdown";
import ts from "typescript-checker";

export type ReleaseLevel = "prerelease" | "patch" | "minor" | "major";

export interface ApiDifference {
  readonly report: string;
  readonly level: ReleaseLevel;
}

export interface DeclarationRecord {
  readonly text: string;
  readonly family: string;
  readonly visible: boolean;
  /** Top-level declaration that owns the row; release notes group changes by it. */
  readonly root: string;
  /** Identifiers the row mentions, so notes can follow an export into the unexported types it uses. */
  readonly refs: readonly string[];
}

/** Consumer-facing API changes, each a Markdown fragment or empty, placed under the matching notes heading. */
export interface ApiSections {
  readonly breaking: string;
  readonly changed: string;
  readonly added: string;
}

function declarationName(node: ts.Node, file: ts.SourceFile): string {
  if (ts.isVariableStatement(node))
    return node.declarationList.declarations.map(({ name }) => name.getText(file)).join(", ");
  // Emitted declarations may be unnamed signatures; NamedDeclaration's optional name covers both.
  const name = (node as ts.NamedDeclaration).name;
  return name?.getText(file) ?? ts.SyntaxKind[node.kind];
}

export function exported(node: ts.Node): boolean {
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

export function combineReleaseLevels(...levels: readonly ReleaseLevel[]): ReleaseLevel {
  return levels.includes("major") ? "major" : levels.includes("minor") ? "minor" : "patch";
}

export function normalizeDeclarations(source: string): string {
  // Keep compiler names and visibility with the printed text: reparsing names loses valid API changes.
  const file = ts.createSourceFile("public.d.ts", source, ts.ScriptTarget.Latest, true);
  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
    removeComments: true,
  });
  const entries: DeclarationRecord[] = [];
  const namedExports = new Set(
    file.statements.flatMap((node) =>
      ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)
        ? node.exportClause.elements.map((entry) => (entry.propertyName ?? entry.name).text)
        : ts.isExportAssignment(node) && ts.isIdentifier(node.expression)
          ? [node.expression.text]
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
    const refs = new Set<string>();
    const collect = (child: ts.Node): void => {
      if (ts.isIdentifier(child)) refs.add(child.text);
      ts.forEachChild(child, collect);
    };
    ts.forEachChild(node, collect);
    entries.push({
      text,
      family: [...owners, declarationName(node, file)].join("."),
      visible: visible && !hidden,
      root: owners[0] ?? declarationName(node, file),
      refs: [...refs],
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

function declarationFamilies(rows: readonly string[]): Map<string, string[]> {
  // Pure reorder changes need the affected overload family, not the entire declaration inventory.
  // normalizeDeclarations carries the compiler's family; never guess names from signature text.
  const families = new Map<string, string[]>();
  for (const row of rows) {
    const name = row.startsWith("{") ? (JSON.parse(row) as DeclarationRecord).family : row;
    const family = families.get(name);
    if (family) family.push(row);
    else families.set(name, [row]);
  }
  return families;
}

function compareApi(before: string, after: string) {
  const previous = before.split("\n").filter(Boolean);
  const current = after.split("\n").filter(Boolean);
  const oldLines = new Set(previous.map((line) => line.trim()).filter(Boolean));
  const newLines = new Set(current.map((line) => line.trim()).filter(Boolean));
  const removed = [...oldLines].filter((line) => !newLines.has(line));
  const added = [...newLines].filter((line) => !oldLines.has(line));
  let retained = 0;
  for (const line of current) if (line === previous[retained]) retained++;
  // Additions are minor only when every old row survives in order; sets alone miss overload priority.
  const level: ReleaseLevel =
    (!removed.length && !added.length) || removed.length > 0 || retained !== previous.length
      ? "major"
      : "minor";
  return { previous, current, removed, added, level };
}

export function apiChangeLevel(before: string, after: string): ReleaseLevel {
  // Compatibility checks need the decision, not Markdown for an inventory nobody will read.
  return before === after ? "patch" : compareApi(before, after).level;
}

export function apiDifference(before: string, after: string, language: string): ApiDifference {
  if (before === after) return { report: `No packaged ${language} changes.`, level: "patch" };
  const { previous, current, removed, added, level } = compareApi(before, after);
  // Sets cannot detect moved members, repeated declarations, or overload precedence.
  if (!removed.length && !added.length) {
    const oldFamilies = declarationFamilies(previous);
    const newFamilies = declarationFamilies(current);
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
        level,
      };
    return {
      report: changed.length
        ? declarationDiff(
            changed.flatMap((name) => oldFamilies.get(name) ?? []),
            changed.flatMap((name) => newFamilies.get(name) ?? []),
          )
        : "Declaration order changed; public signatures are unchanged.",
      level,
    };
  }
  return {
    report: declarationDiff(removed, added),
    level,
  };
}

export function records(source: string): DeclarationRecord[] {
  return source
    .split("\n")
    .filter((row) => row.startsWith("{"))
    .map((row) => JSON.parse(row) as DeclarationRecord);
}

/** Roots reachable from `from` through the identifiers each root's rows mention. */
export function reachable(rows: readonly DeclarationRecord[], from: Iterable<string>): Set<string> {
  const refs = new Map<string, string[]>();
  for (const row of rows) refs.set(row.root, [...(refs.get(row.root) ?? []), ...row.refs]);
  const seen = new Set<string>();
  const queue = [...from];
  for (let root = queue.pop(); root !== undefined; root = queue.pop()) {
    if (seen.has(root) || !refs.has(root)) continue;
    seen.add(root);
    queue.push(...(refs.get(root) ?? []));
  }
  return seen;
}

// A wholly added or removed declaration shows its own row on one line, not each member.
function headerRows(rows: readonly DeclarationRecord[], root: string): string[] {
  return rows
    .filter((row) => row.family === root)
    .map(({ text }) =>
      text.startsWith(`${root}: `) ? text.slice(root.length + 2).replace(/\{\n\}$/, "{ … }") : text,
    );
}

// Rows of `list` that `other` also has, in `list`'s order and count, comparable as one string.
function shared(list: readonly string[], other: readonly string[]): string {
  return JSON.stringify(list.filter((text) => other.includes(text)));
}

// `export {}` only marks the file as a module; it is no API.
function isApiRow({ text }: DeclarationRecord): boolean {
  return text !== "export {};";
}

function sectionDiff({ removed, added }: { removed: string[]; added: string[] }): string {
  return removed.length || added.length ? declarationDiff(removed, added) : "";
}

/**
 * Sorts changed public declarations into the notes sections a caller acts on. Unexported types
 * appear only when an export uses them and they changed: they explain why the export broke.
 * A wholly removed or added declaration shows only its own rows, not every member.
 */
export function typeScriptApiSections(
  before: string,
  after: string,
  incompatible: ReadonlySet<string>,
): ApiSections {
  const previous = records(before);
  const current = records(after);
  const roots = (rows: readonly DeclarationRecord[]) =>
    reachable(
      rows,
      rows.filter(({ visible }) => visible).map(({ root }) => root),
    );
  const shown = new Set([...roots(previous), ...roots(current)]);
  // Breaking: an incompatible export, the types it uses, or a row naming it (`export { a as b }`).
  const breakingRoots = new Set([
    ...reachable(previous, incompatible),
    ...reachable(current, incompatible),
    ...[...previous, ...current]
      .filter(({ refs }) => refs.some((name) => incompatible.has(name)))
      .map(({ root }) => root),
  ]);
  const sections = {
    breaking: { removed: [] as string[], added: [] as string[] },
    changed: { removed: [] as string[], added: [] as string[] },
    added: { removed: [] as string[], added: [] as string[] },
  };
  for (const root of new Set([...previous, ...current].map((row) => row.root))) {
    if (!shown.has(root)) continue;
    // A new or removed unexported type is never named by callers; the exports using it show the change.
    const visibleRoot = [...previous, ...current].some((row) => row.root === root && row.visible);
    // An export shows only rows callers can reach: private brand members stay hidden.
    const rowsOf = (rows: readonly DeclarationRecord[]) =>
      rows.filter((row) => row.root === root && isApiRow(row) && (row.visible || !visibleRoot));
    const old = rowsOf(previous).map(({ text }) => text);
    const now = rowsOf(current).map(({ text }) => text);
    if (JSON.stringify(old) === JSON.stringify(now)) continue;
    if (!old.length) {
      if (visibleRoot) sections.added.added.push(...headerRows(current, root));
      continue;
    }
    if (!now.length) {
      if (visibleRoot) sections.breaking.removed.push(...headerRows(previous, root));
      continue;
    }
    const family = (rows: readonly DeclarationRecord[], name: string) =>
      rowsOf(rows)
        .filter((row) => row.family === name)
        .map(({ text }) => text);
    const removed: string[] = [];
    const added: string[] = [];
    let reordered = false;
    for (const name of new Set(
      [...rowsOf(previous), ...rowsOf(current)].map((row) => row.family),
    )) {
      const was = family(previous, name);
      const is = family(current, name);
      if (JSON.stringify(was) === JSON.stringify(is)) continue;
      // Kept overloads in another order or count change overload resolution; only the whole
      // family before and after shows that, since a row-by-row diff of identical text is empty.
      if (shared(was, is) !== shared(is, was)) {
        reordered = true;
        removed.push(...was);
        added.push(...is);
      } else {
        removed.push(...was.filter((text) => !is.includes(text)));
        added.push(...is.filter((text) => !was.includes(text)));
      }
    }
    const target =
      reordered || breakingRoots.has(root)
        ? sections.breaking
        : removed.length
          ? sections.changed
          : sections.added;
    target.removed.push(...removed);
    target.added.push(...added);
  }
  return {
    breaking: sectionDiff(sections.breaking),
    changed: sectionDiff(sections.changed),
    added: sectionDiff(sections.added),
  };
}

/**
 * Sections for a line-based API report such as the Rust public API. `breaking` comes from the
 * language's own compatibility checker (cargo-semver-checks), because changed lines alone cannot
 * tell a loosened bound from a broken one.
 */
export function lineApiSections(before: string, after: string, breaking: boolean): ApiSections {
  if (before === after) return { breaking: "", changed: "", added: "" };
  const { removed } = compareApi(before, after);
  const diff = apiDifference(before, after, "public API").report;
  return {
    breaking: breaking ? diff : "",
    changed: !breaking && removed.length ? diff : "",
    added: !breaking && !removed.length ? diff : "",
  };
}

/** Binary units, as GitHub and package managers show them: 1 KB is 1024 bytes. */
export function binarySize(bytes: number): string {
  const units = ["KB", "MB", "GB"];
  let value = Math.abs(bytes);
  let unit = -1;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return unit < 0 ? `${value} bytes` : `${value.toFixed(1)} ${units[unit]}`;
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
  const strongest = combineReleaseLevels(declared, ...languages);
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

/** Release level an API change needs: any breaking change is major, any other change minor. */
export function sectionsLevel({ breaking, changed, added }: ApiSections): ReleaseLevel {
  return breaking ? "major" : changed || added ? "minor" : "patch";
}
