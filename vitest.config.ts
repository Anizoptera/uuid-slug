import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import TEST_DISCOVERY from "./__test__/shared-test-suites.json" with { type: "json" };

const runtime = process.env.UUID_SLUG_TEST_RUNTIME ?? "node";
const backend = process.env.UUID_SLUG_TEST_BACKEND ?? "typescript";
const wasm = process.env.UUID_SLUG_WASM_BRIDGE;
if (backend !== "typescript" && backend !== "rust")
  throw new Error(`Unknown test backend: ${backend}; use typescript or rust.`);

export default defineConfig({
  plugins: backend === "rust" ? [rustTestPlugin(fileURLToPath(new URL(".", import.meta.url)))] : [],
  // Resolver selection changes the implementation while preserving the test bodies and oracles.
  resolve: {
    conditions: [runtime],
    alias:
      backend === "rust"
        ? {
            "./test-implementation": fileURLToPath(
              new URL("./__test__/rust-test-implementation.ts", import.meta.url),
            ),
            ...(wasm
              ? {
                  "../scripts/rust-bridge": fileURLToPath(
                    new URL("./__test__/wasm-test-bridge.ts", import.meta.url),
                  ),
                }
              : {}),
          }
        : {},
  },
  ssr: { resolve: { conditions: [runtime] } },
  test: {
    fsModuleCache: true,
    setupFiles: [
      "./__test__/runtime-host.ts",
      ...(backend === "rust" ? ["./__test__/rust-test-implementation.ts"] : []),
    ],
    // Bun-specific files run under `bun test`; Node cannot resolve their `bun:test` imports.
    ...TEST_DISCOVERY,
  },
});
// Redirect test consumers in one pass; original modules supply metadata, never fallback functions.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import ts from "typescript-checker";
import type { Plugin } from "vite";

const PREFIX = "\0uuid-slug-rust-test:";

function exportedNames(file: string, seen = new Set<string>()): string[] {
  if (seen.has(file)) return [];
  seen.add(file);
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const names = new Set<string>();
  for (const statement of source.statements) {
    if (ts.isExportDeclaration(statement) && !statement.isTypeOnly) {
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        for (const item of statement.exportClause.elements)
          if (!item.isTypeOnly) names.add(item.name.text);
      } else if (
        !statement.exportClause &&
        statement.moduleSpecifier &&
        ts.isStringLiteral(statement.moduleSpecifier)
      ) {
        const dependency = resolve(dirname(file), statement.moduleSpecifier.text);
        for (const name of exportedNames(dependency, seen)) names.add(name);
      }
    } else if (
      ts.canHaveModifiers(statement) &&
      ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      if (
        (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) &&
        statement.name
      )
        names.add(statement.name.text);
      if (ts.isVariableStatement(statement))
        for (const declaration of statement.declarationList.declarations)
          if (ts.isIdentifier(declaration.name)) names.add(declaration.name.text);
    }
  }
  return [...names];
}

export function rustTestPlugin(root: string): Plugin {
  const tests = resolve(root, "__test__") + "/";
  const adapter = resolve(root, "__test__/rust-test-public-api.ts");
  return {
    name: "uuid-slug-rust-test-implementation",
    enforce: "pre",
    resolveId(source, importer) {
      if (
        !importer?.startsWith(tests) ||
        !source.startsWith("../src/") ||
        importer.includes("/rust-test-") ||
        importer.endsWith("/test-implementation.ts") ||
        source.includes("/runtime/") ||
        source === "../src/errors"
      )
        return undefined;
      const file = resolve(dirname(importer), source);
      return PREFIX + (file.endsWith(".ts") ? file : file + ".ts");
    },
    load(id) {
      if (!id.startsWith(PREFIX)) return undefined;
      const file = id.slice(PREFIX.length);
      const names = exportedNames(file);
      return [
        `import * as metadata from ${JSON.stringify(file)};`,
        `import { bindRustExport } from ${JSON.stringify(adapter)};`,
        ...names.map(
          (name, index) =>
            `const value${index} = bindRustExport(${JSON.stringify(name)}, metadata[${JSON.stringify(name)}]); export { value${index} as ${JSON.stringify(name)} };`,
        ),
      ].join("\n");
    },
  };
}
