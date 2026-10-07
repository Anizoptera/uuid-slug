// Query editor documentation from source or emitted declarations; text searches cannot prove hover output.
import { resolve } from "node:path";
import ts from "typescript-floor";

const [file, interfaceName, memberName] = process.argv.slice(2);
if (!file || !interfaceName || !memberName)
  throw new Error("Use: bun scripts/editor-help.ts <file> <interface|module> <symbol>.");
const configPath = ts.findConfigFile(process.cwd(), (path) => ts.sys.fileExists(path));
if (!configPath) throw new Error("Run from the package directory containing tsconfig.json.");
const config = ts.readConfigFile(configPath, (path) => ts.sys.readFile(path));
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
// The legacy service cannot interpret the newer emit-only rewrite option; all other config errors matter.
const errors = parsed.errors.filter(
  (error) =>
    error.code !== 5023 ||
    !ts
      .flattenDiagnosticMessageText(error.messageText, "\n")
      .includes("rewriteRelativeImportExtensions"),
);
if (errors.length)
  throw new Error(
    errors.map((error) => ts.flattenDiagnosticMessageText(error.messageText, "\n")).join("\n"),
  );
const filename = resolve(file);
const snapshots = new Map<string, ts.IScriptSnapshot>();
const service = ts.createLanguageService({
  ...ts.sys,
  useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
  getCompilationSettings: () => parsed.options,
  getScriptFileNames: () => [filename],
  getScriptVersion: () => "0",
  getScriptSnapshot(path) {
    const cached = snapshots.get(path);
    if (cached) return cached;
    const content = ts.sys.readFile(path);
    if (content === undefined) return undefined;
    const snapshot = ts.ScriptSnapshot.fromString(content);
    snapshots.set(path, snapshot);
    return snapshot;
  },
  getCurrentDirectory: () => process.cwd(),
  getDefaultLibFileName: ts.getDefaultLibFilePath,
});
try {
  const source = service.getProgram()?.getSourceFile(filename);
  if (!source) throw new Error(`Language service did not load ${filename}.`);
  const declaration = source.statements.find(
    (node): node is ts.InterfaceDeclaration =>
      ts.isInterfaceDeclaration(node) && node.name.text === interfaceName,
  );
  // Root functions and receiver-free methods are both consumer editor surfaces; query their
  // actual declarations rather than copying documentation into a synthetic interface.
  const members =
    interfaceName === "module"
      ? source.statements.filter(
          (node): node is ts.FunctionDeclaration =>
            ts.isFunctionDeclaration(node) && node.name?.text === memberName,
        )
      : declaration?.members.filter((member) => member.name?.getText(source) === memberName);
  if (!members?.length)
    throw new Error(`No declaration for ${interfaceName}.${memberName} in ${filename}.`);
  for (const member of members) {
    const info = service.getQuickInfoAtPosition(filename, member.name!.getStart(source));
    if (!info?.documentation?.length)
      throw new Error(`No hover documentation for ${interfaceName}.${memberName} in ${filename}.`);
    console.log(
      JSON.stringify({
        file: filename,
        compiler: ts.version,
        declaration: ts.displayPartsToString(info.displayParts),
        documentation: ts.displayPartsToString(info.documentation),
        tags: info.tags,
      }),
    );
  }
} finally {
  service.dispose();
}
