// Compiler-backed API compatibility: writes old caller code against two declaration versions and
// asks every supported TypeScript checker whether it still compiles, which text cannot decide.
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript-checker";
import { exported, normalizeDeclarations, reachable, records } from "./release-comparison";
import type { DeclarationRecord } from "./release-comparison";
import { typeScriptCheckers } from "./typescript-compilers";

// One configuration for the in-process program and every checker command. Default libraries ship
// with each compiler and are not re-checked; checking them dominates every command's run time.
const compilerOptions = {
  strict: true,
  noEmit: true,
  target: "ESNext",
  module: "ESNext",
  moduleResolution: "Bundler",
  // The API names web globals such as `AbortSignal`, which only the DOM library declares.
  lib: ["ESNext", "DOM"],
  types: [],
  skipDefaultLibCheck: true,
};

// Every compatibility check builds two programs over the same standard library; parsing `lib.dom`
// dominates their cost, and those files never change while the process runs.
const libraryFiles = new Map<string, ts.SourceFile | undefined>();
function libraryFile(
  disk: ts.CompilerHost,
  name: string,
  version: ts.ScriptTarget | ts.CreateSourceFileOptions,
): ts.SourceFile | undefined {
  if (!libraryFiles.has(name)) libraryFiles.set(name, disk.getSourceFile(name, version));
  return libraryFiles.get(name);
}

// Type parameters a generic type declares; both versions are instantiated with that many `any`s.
function typeArity(symbol: ts.Symbol): number {
  return Math.max(
    0,
    ...(symbol.declarations ?? []).map((node) =>
      ts.isTypeAliasDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isClassDeclaration(node)
        ? (node.typeParameters?.length ?? 0)
        : 0,
    ),
  );
}

// Arguments a call may pass; a rest parameter takes any number.
function acceptedArguments(signature: ts.Signature): number {
  return signature.declaration?.parameters.some(
    (parameter) => ts.isParameter(parameter) && !!parameter.dotDotDotToken,
  )
    ? Number.POSITIVE_INFINITY
    : signature.parameters.length;
}

// Ordered printed rows a top-level declaration owns, comparable as one string.
function rootTexts(rows: readonly DeclarationRecord[], root: string): string {
  return JSON.stringify(rows.filter((row) => row.root === root).map(({ text }) => text));
}

/**
 * Names exported by the old declarations that old callers can no longer use: removed, or failing
 * a compiler assignability check. Text comparison cannot decide this: `generate(options: Options)`
 * prints identically after the unexported `Options.at` becomes required, yet `generate({})` breaks.
 */
export async function incompatibleExports(before: string, after: string): Promise<Set<string>> {
  const directory = await mkdtemp(join(tmpdir(), "uuid-slug-api-compatibility-"));
  try {
    return await checkDirectory(directory, before, after);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function checkDirectory(
  directory: string,
  before: string,
  after: string,
): Promise<Set<string>> {
  // Each file's `unique symbol` would be a distinct type, making every branded type look
  // unrelated across versions. A caller has one version installed, so a brand keeps its identity
  // by name: both versions import each such symbol from one shared module.
  const symbols = new Set<string>();
  const shareSymbols = (source: string) => {
    const file = ts.createSourceFile("api.d.ts", source, ts.ScriptTarget.Latest, true);
    let text = "";
    let copied = 0;
    for (const statement of file.statements) {
      if (!ts.isVariableStatement(statement)) continue;
      const names = statement.declarationList.declarations
        .filter(
          ({ type }) =>
            type && ts.isTypeOperatorNode(type) && type.operator === ts.SyntaxKind.UniqueKeyword,
        )
        .map(({ name }) => name.getText(file));
      if (names.length !== statement.declarationList.declarations.length || !names.length) continue;
      for (const name of names) symbols.add(name);
      const list = names.join(", ");
      text += `${source.slice(copied, statement.getStart(file))}import { ${list} } from "./symbols";${exported(statement) ? ` export { ${list} };` : ""}`;
      copied = statement.end;
    }
    // A file without exports is a global script with no API; `export {}` keeps it importable.
    return `${text}${source.slice(copied)}\nexport {};\n`;
  };
  const oldFile = join(directory, "old.d.ts");
  // Array elements evaluate in order: both versions fill `symbols` before its module is written.
  await Promise.all([
    writeFile(oldFile, shareSymbols(before)),
    writeFile(join(directory, "new.d.ts"), shareSymbols(after)),
    writeFile(
      join(directory, "symbols.d.ts"),
      [...symbols].map((name) => `export declare const ${name}: unique symbol;`).join("\n"),
    ),
  ]);
  // The in-process program only finds exports and argument counts; checker commands give the verdict.
  const { options } = ts.convertCompilerOptionsFromJson(compilerOptions, directory);
  const disk = ts.createCompilerHost(options);
  const program = ts.createProgram([oldFile, join(directory, "new.d.ts")], options, {
    ...disk,
    getSourceFile: (name, version) =>
      name.startsWith(directory)
        ? disk.getSourceFile(name, version)
        : libraryFile(disk, name, version),
  });
  const checker = program.getTypeChecker();
  const exportsOf = (name: string) => {
    const file = program.getSourceFile(join(directory, name));
    const module = file && checker.getSymbolAtLocation(file);
    return new Map(
      (module ? checker.getExportsOfModule(module) : []).map((symbol) => [
        symbol.name,
        symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol,
      ]),
    );
  };
  // Assignability lets a function with fewer parameters replace one with more, yet a caller passing
  // the dropped argument stops compiling. Every old call or construct signature, including methods
  // and results reached from it, needs a new one accepting at least as many arguments.
  const arityKept = (oldType: ts.Type, newType: ts.Type, seen = new Set<string>()): boolean => {
    // Generic instantiations are new type objects on every visit; their printed form repeats.
    const key = checker.typeToString(oldType);
    if (seen.has(key)) return true;
    seen.add(key);
    for (const kind of [ts.SignatureKind.Call, ts.SignatureKind.Construct]) {
      const fresh = checker.getSignaturesOfType(newType, kind);
      for (const signature of checker.getSignaturesOfType(oldType, kind)) {
        const match = fresh.find(
          (candidate) => acceptedArguments(candidate) >= acceptedArguments(signature),
        );
        if (
          !match ||
          !arityKept(
            checker.getReturnTypeOfSignature(signature),
            checker.getReturnTypeOfSignature(match),
            seen,
          )
        )
          return false;
      }
    }
    // Only package-declared members: built-in types such as `String` are the same in both versions.
    return checker.getPropertiesOfType(oldType).every((property) => {
      const counterpart = checker.getPropertyOfType(newType, property.name);
      return (
        !counterpart ||
        !property.declarations?.some((node) => node.getSourceFile().fileName === oldFile) ||
        arityKept(checker.getTypeOfSymbol(property), checker.getTypeOfSymbol(counterpart), seen)
      );
    });
  };
  const previous = exportsOf("old.d.ts");
  const current = exportsOf("new.d.ts");
  // TypeScript never relates deferred conditional types declared in different files, so even an
  // identical export can fail the check. An export whose declarations and the types they use are
  // unchanged is compatible by definition; only exports reaching a changed declaration are
  // checked, so a false failure can only mark a changed export as breaking.
  const oldRows = records(normalizeDeclarations(before));
  const newRows = records(normalizeDeclarations(after));
  const changed = new Set(
    [...oldRows, ...newRows]
      .map(({ root }) => root)
      .filter((root) => rootTexts(oldRows, root) !== rootTexts(newRows, root)),
  );
  const touchesChange = (root: string) =>
    [...reachable(oldRows, [root]), ...reachable(newRows, [root])].some((name) =>
      changed.has(name),
    );
  const incompatible = new Set<string>();
  const checks: { name: string; line: string }[] = [];
  for (const [name, old] of previous) {
    const now = current.get(name);
    if (now && !touchesChange(old.name) && !touchesChange(now.name)) continue;
    // Quoted export names cannot be written as `O.name`; treat their changes as breaking.
    if (!now || !/^[\p{ID_Start}$_][\p{ID_Continue}$\u200c\u200d]*$/u.test(name)) {
      incompatible.add(name);
      continue;
    }
    if (
      old.flags & ts.SymbolFlags.Value &&
      !arityKept(checker.getTypeOfSymbol(old), checker.getTypeOfSymbol(now))
    ) {
      incompatible.add(name);
      continue;
    }
    // Values flow from the package to callers: the new value must fit wherever the old one was used.
    if (old.flags & ts.SymbolFlags.Value)
      checks.push({
        name,
        line: `export function v${checks.length}(value: typeof N.${name}): typeof O.${name} { return value; }`,
      });
    // Types are annotations callers fill with their own values: old values must fit the new type.
    if (old.flags & ts.SymbolFlags.Type) {
      const count = typeArity(old);
      const args = count ? `<${Array<string>(count).fill("any").join(", ")}>` : "";
      checks.push({
        name,
        line: `export function t${checks.length}(value: O.${name}${args}): N.${name}${args} { return value; }`,
      });
    }
  }
  const header = ['import type * as O from "./old";', 'import type * as N from "./new";'];
  // Every export not given a check line is already decided.
  if (!checks.length) return incompatible;
  await Promise.all([
    writeFile(
      join(directory, "check.ts"),
      [...header, ...checks.map(({ line }) => line)].join("\n"),
    ),
    writeFile(
      join(directory, "tsconfig.json"),
      JSON.stringify({ compilerOptions, files: ["check.ts"] }),
    ),
  ]);
  const runs = await Promise.all(
    typeScriptCheckers.map(async (command) => {
      const child = Bun.spawn(command, { cwd: directory, stdout: "pipe", stderr: "pipe" });
      const [stdout, stderr, code] = await Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited,
      ]);
      return { command: command.join(" "), output: stdout + stderr, code };
    }),
  );
  for (const { command, output, code } of runs) {
    const errors = [...output.matchAll(/^(.+?)\((\d+),\d+\): error (TS\d+: .*)$/gm)];
    // A failed run without diagnostics crashed or could not start; its silence proves nothing.
    if (code !== 0 && !errors.length)
      throw new Error(`${command} failed without a diagnostic:\n${output}`);
    for (const [, file, line, message] of errors) {
      // Unresolved names in a declaration file become error types that accept anything, so a
      // version some supported compiler cannot check proves no export compatible under it.
      if (file !== "check.ts") {
        for (const { name } of checks) incompatible.add(name);
        continue;
      }
      const check = checks[Number(line) - 1 - header.length];
      if (!check)
        throw new Error(
          `Compatibility check failed outside an export under ${command}: ${message}`,
        );
      incompatible.add(check.name);
    }
  }
  return incompatible;
}
