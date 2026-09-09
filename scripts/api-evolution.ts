import ts from "typescript-floor";
import { command } from "./command";
import {
  apiDifference,
  minimumRelease,
  normalizeDeclarations,
  satisfiesMinimum,
} from "./release-comparison";
import type { ReleaseLevel } from "./release-comparison";
import { latestRelease } from "./release-history";
import { checkReleaseVersion } from "./release-version";
import {
  cargoManifestSurface,
  cargoSurfaceDifference,
  npmReleaseSurface,
  npmSurfaceDifference,
} from "./release-surface";

interface ApiReports {
  readonly typescript: string;
  readonly rust: string;
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

function sections(report: string): ReadonlyMap<string, string> {
  const result = new Map<string, string>();
  let name: string | undefined;
  let lines: string[] = [];
  for (const line of report.split("\n")) {
    if (line.startsWith("## ")) {
      if (name) result.set(name, lines.join("\n").trim());
      name = line.slice(3);
      lines = [];
    } else if (name) lines.push(line);
  }
  if (name) result.set(name, lines.join("\n").trim());
  return result;
}

function code(section: string | undefined): string {
  if (!section) return "";
  const lines = section.split("\n");
  return lines[0]?.startsWith("```") && lines.at(-1) === "```"
    ? lines.slice(1, -1).join("\n")
    : section === "(none)"
      ? ""
      : section;
}

function typescriptName(node: ts.Node): string | undefined {
  if (
    ts.isClassDeclaration(node) ||
    ts.isEnumDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isModuleDeclaration(node) ||
    ts.isTypeAliasDeclaration(node)
  )
    return node.name?.text;
  return undefined;
}

function typescriptEntries(source: string): ReadonlySet<string> {
  const file = ts.createSourceFile("public.d.ts", source, ts.ScriptTarget.Latest, true);
  return collectTypeScriptEntries(file, file.statements);
}

function collectTypeScriptEntries(
  file: ts.SourceFile,
  roots: readonly ts.Node[],
): ReadonlySet<string> {
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: true });
  const entries = new Set<string>();
  const ownersFor = (node: ts.Node): string[] => {
    const owners: string[] = [];
    for (let current = node.parent; current && current !== file; current = current.parent) {
      const name = typescriptName(current);
      if (
        name &&
        (ts.isClassDeclaration(current) ||
          ts.isEnumDeclaration(current) ||
          ts.isInterfaceDeclaration(current) ||
          ts.isModuleDeclaration(current))
      )
        owners.unshift(name);
    }
    return owners;
  };
  const visit = (node: ts.Node, owners: readonly string[]): void => {
    const name = typescriptName(node);
    if (isDeclarationContainer(node) && name) {
      const path = [...owners, name];
      entries.add(`${ts.SyntaxKind[node.kind]} ${path.join(".")}`);
      if (ts.isModuleDeclaration(node)) {
        if (node.body && ts.isModuleDeclaration(node.body)) visit(node.body, path);
        else if (node.body && ts.isModuleBlock(node.body))
          for (const statement of node.body.statements) visit(statement, path);
      } else for (const member of node.members) visit(member, path);
      return;
    }
    const declaration = printer.printNode(ts.EmitHint.Unspecified, node, file).trim();
    entries.add(owners.length ? `${owners.join(".")}: ${declaration}` : declaration);
  };
  for (const root of roots) visit(root, ownersFor(root));
  return entries;
}

export function typescriptDeclarations(source: string): string {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.Standard,
    source,
  );
  let cleaned = "";
  let offset = 0;
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    const start = scanner.getTokenPos();
    const end = scanner.getTextPos();
    const comment =
      token === ts.SyntaxKind.SingleLineCommentTrivia ||
      token === ts.SyntaxKind.MultiLineCommentTrivia;
    if (comment && !scanner.getTokenText().includes("@deprecated")) {
      cleaned += source.slice(offset, start);
      cleaned += source.slice(start, end).replace(/[^\r\n]/g, " ");
      offset = end;
    }
  }
  cleaned += source.slice(offset);
  const file = ts.createSourceFile("public.d.ts", cleaned, ts.ScriptTarget.Latest, true);
  const statements = file.statements.filter(
    (node) =>
      !(
        ts.isExportDeclaration(node) &&
        !node.moduleSpecifier &&
        node.exportClause &&
        ts.isNamedExports(node.exportClause) &&
        node.exportClause.elements.length === 0
      ),
  );
  const normalized = ts.factory.updateSourceFile(file, statements);
  return ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }).printFile(normalized).trim();
}

function rustEntries(report: ReadonlyMap<string, string>): ReadonlySet<string> {
  return new Set(
    ["All features", "No default features"]
      .flatMap((name) =>
        code(report.get(name))
          .split("\n")
          .map((line) => (line ? `${name}: ${line.replace(/^#\[deprecated\] /, "")}` : line)),
      )
      .filter(Boolean),
  );
}

function rustDeprecations(report: ReadonlyMap<string, string>): ReadonlySet<string> {
  const deprecated = new Set<string>();
  for (const name of ["All features", "No default features"]) {
    for (const line of code(report.get(name)).split("\n")) {
      if (line.startsWith("#[deprecated] "))
        deprecated.add(`${name}: ${line.slice("#[deprecated] ".length)}`);
    }
  }
  return deprecated;
}

function removals(
  language: string,
  before: ReadonlySet<string>,
  after: ReadonlySet<string>,
  wasDeprecated: (entry: string) => boolean,
): void {
  const illegal = [...before].filter((entry) => !after.has(entry) && !wasDeprecated(entry));
  if (illegal.length)
    throw new Error(
      `${language} removes API that was not deprecated in the latest release:\n${illegal.join("\n")}`,
    );
}

function majorMinor(value: string): readonly [bigint, bigint] | undefined {
  const match = /^(\d+)\.(\d+)\./.exec(value);
  return match?.[1] && match[2] ? [BigInt(match[1]), BigInt(match[2])] : undefined;
}

function removalBoundary(previous: string, current: string): boolean {
  const before = majorMinor(previous);
  const after = majorMinor(current);
  if (!before || !after) return false;
  const [oldMajor, oldMinor] = before;
  const [newMajor, newMinor] = after;
  return oldMajor === 0n ? newMajor > 0n || newMinor > oldMinor : newMajor > oldMajor;
}

function typescriptDeprecations(source: string): ReadonlySet<string> {
  const file = ts.createSourceFile("public.d.ts", source, ts.ScriptTarget.Latest, true);
  const deprecated = new Set<string>();
  function visit(node: ts.Node): void {
    if (ts.getJSDocDeprecatedTag(node))
      for (const entry of collectTypeScriptEntries(file, [node])) deprecated.add(entry);
    if (
      ts.isSourceFile(node) ||
      ts.isClassDeclaration(node) ||
      ts.isEnumDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isModuleDeclaration(node)
    )
      ts.forEachChild(node, visit);
  }
  visit(file);
  return deprecated;
}

export function validateVersion(version: string, tag?: string): void {
  const core = String.raw`(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)`;
  if (tag) {
    if (tag !== `v${version}`) throw new Error(`Tag ${tag} does not match version ${version}.`);
    if (!new RegExp(`^${core}$`).test(version))
      throw new Error(`Release version ${version} must be stable.`);
  } else if (!new RegExp(`^${core}-dev$`).test(version)) {
    throw new Error(`Development version ${version} must use X.Y.Z-dev.`);
  }
}

export function selectReleaseTag(tags: string, currentTag: string): string | undefined {
  const latest = latestRelease(
    tags
      .trim()
      .split("\n")
      .filter((tag) => /^v\d/.test(tag)),
    currentTag || undefined,
  );
  return latest && Bun.semver.order(latest.slice(1), "0.4.0") >= 0 ? latest : undefined;
}

export function verifyEvolution(
  previousVersion: string,
  currentVersion: string,
  before: ApiReports,
  after: ApiReports,
  packageLevels: readonly ReleaseLevel[] = [],
  tagged = true,
): void {
  const oldRust = sections(before.rust);
  const newRust = sections(after.rust);
  const oldTsSource = before.typescript;
  const newTsSource = after.typescript;
  const oldTsEntries = typescriptEntries(oldTsSource);
  const newTsEntries = typescriptEntries(newTsSource);
  const oldRustEntries = rustEntries(oldRust);
  const newRustEntries = rustEntries(newRust);
  const oldTsNormalized = normalizeDeclarations(oldTsSource);
  const newTsNormalized = normalizeDeclarations(newTsSource);
  const deprecatedTypeScript = typescriptDeprecations(oldTsSource);
  const deprecatedRust = rustDeprecations(oldRust);
  removals("TypeScript", oldTsEntries, newTsEntries, (entry) => deprecatedTypeScript.has(entry));
  removals("Rust", oldRustEntries, newRustEntries, (entry) => deprecatedRust.has(entry));
  const changed =
    packageLevels.some((level) => level !== "patch") ||
    oldTsNormalized !== newTsNormalized ||
    oldRustEntries.size !== newRustEntries.size ||
    [...oldRustEntries].some((entry) => !newRustEntries.has(entry));
  validateVersion(currentVersion, tagged ? `v${currentVersion}` : undefined);
  if (!changed) return;
  const removed =
    [...oldTsEntries].some((entry) => !newTsEntries.has(entry)) ||
    [...oldRustEntries].some((entry) => !newRustEntries.has(entry));
  if (removed && !removalBoundary(previousVersion, currentVersion))
    throw new Error(
      `Deprecated API removal requires the next major release, or next minor in 0.x.`,
    );
  const levels: ReleaseLevel[] = [
    ...packageLevels,
    apiDifference(oldTsNormalized, newTsNormalized, "TypeScript declaration").level,
    apiDifference(
      [...oldRustEntries].join("\n"),
      [...newRustEntries].join("\n"),
      "Rust declaration",
    ).level,
  ];
  const minimum = minimumRelease(currentVersion.split("-", 1)[0] ?? currentVersion, "", levels);
  if (!satisfiesMinimum(previousVersion, currentVersion, minimum))
    throw new Error(
      `${currentVersion} does not satisfy the ${minimum} API change from ${previousVersion}.`,
    );
}

export async function checkReleasedApi(root: string, current: ApiReports): Promise<void> {
  const manifest = (await Bun.file(`${root}/package.json`).json()) as Record<string, unknown> & {
    version: string;
  };
  const [tags, currentTags, currentCargoText, currentCargoPackageText] = await Promise.all([
    command("git", ["tag", "--list", "v*"], root),
    command("git", ["tag", "--points-at", "HEAD", "--list", "v*"], root),
    Bun.file(`${root}/rust/Cargo.toml`).text(),
    Bun.file(`${root}/rust/uuid-slug/Cargo.toml`).text(),
  ]);
  const tagsAtHead = currentTags.trim().split("\n").filter(Boolean);
  if (tagsAtHead.length > 1) throw new Error("HEAD has multiple release tags.");
  const tagged = tagsAtHead[0] ?? "";
  validateVersion(manifest.version, tagged || undefined);
  await checkReleaseVersion(root, manifest.version);
  const tag = selectReleaseTag(tags, tagged);
  if (!tag) {
    console.log("Released API: no governed release exists; v0.4.0 will create the first baseline.");
    return;
  }
  const [typescript, rust] = await Promise.all([
    command("git", ["show", `${tag}:api/typescript.api.d.ts`], root),
    command("git", ["show", `${tag}:api/rust.api.md`], root),
  ]);
  const [oldNpmText, oldCargoText, oldCargoPackageText] = await Promise.all([
    command("git", ["show", `${tag}:package.json`], root),
    command("git", ["show", `${tag}:rust/Cargo.toml`], root),
    command("git", ["show", `${tag}:rust/uuid-slug/Cargo.toml`], root),
  ]);
  const oldNpm = JSON.parse(oldNpmText) as Record<string, unknown>;
  const packageLevels = [
    npmSurfaceDifference(npmReleaseSurface(oldNpm), npmReleaseSurface(manifest)).level,
    cargoSurfaceDifference(
      cargoManifestSurface(oldCargoText, oldCargoPackageText),
      cargoManifestSurface(currentCargoText, currentCargoPackageText),
    ).level,
  ];
  verifyEvolution(
    tag.slice(1),
    manifest.version,
    { typescript, rust },
    current,
    packageLevels,
    !!tagged,
  );
  console.log(`Released API: compatible with ${tag}`);
}
