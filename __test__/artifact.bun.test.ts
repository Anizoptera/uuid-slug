import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "bun:test";
import { rejects } from "node:assert/strict";
import { inspectArtifact } from "../scripts/check-artifact";

/** Minimal archives isolate rejection guards before consumer execution could reject instead. */
async function rejected(files: Record<string, string>, message: string): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "uuid-slug-invalid-"));
  try {
    const tarball = join(root, "input.tgz");
    await Bun.write(tarball, new Bun.Archive(files));
    await rejects(inspectArtifact(tarball, false, false, join(root, "reports")), (error: Error) =>
      error.message.includes(message),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
const repositoryManifest = await Bun.file(new URL("../package.json", import.meta.url)).json();
const manifest = {
  name: "@anizoptera/uuid-slug",
  version: "0.0.0",
  type: "module",
  exports: repositoryManifest.exports,
  imports: repositoryManifest.imports,
};
const base = {
  "package/package.json": JSON.stringify(manifest),
  "package/dist/index.js": "export {};",
  "package/dist/node/runtime.js": "export {};",
  "package/src/index.ts": "export {};",
};

test("refuses an archive without its manifest", () => rejected({}, "no package/package.json"));
for (const field of [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
]) {
  test(`refuses arbitrary ${field}`, () =>
    rejected(
      {
        ...base,
        "package/package.json": JSON.stringify({
          ...manifest,
          [field]: { "unknown-package": "*" },
        }),
      },
      `${field} must be empty`,
    ));
}
test("refuses a wildcard export", () =>
  rejected(
    {
      ...base,
      "package/package.json": JSON.stringify({
        ...manifest,
        exports: { ...manifest.exports, "./*": "./dist/*" },
      }),
    },
    "Packed exports",
  ));
test("refuses a changed private runtime map", () =>
  rejected(
    {
      ...base,
      "package/package.json": JSON.stringify({ ...manifest, imports: {} }),
    },
    "Packed imports are wrong",
  ));
test("refuses runtime conditions before source conditions", () =>
  rejected(
    {
      ...base,
      "package/package.json": JSON.stringify({
        ...manifest,
        exports: {
          ...manifest.exports,
          ".": {
            node: "./dist/node/index.js",
            types: "./dist/index.d.ts",
            bun: "./src/index.ts",
            development: "./src/index.ts",
            default: "./dist/index.js",
          },
        },
      }),
    },
    'must be ordered "types", "bun", "deno", "development", then "default"',
  ));
test("finds machine paths in extensionless files", () =>
  rejected({ ...base, "package/leak": "/Users/builder/private" }, "Build-machine path"));
test("refuses extensionless imports in published TypeScript", () =>
  rejected(
    {
      ...base,
      "package/src/index.ts": 'export * from "./internal";',
      "package/src/internal.ts": "export {};",
    },
    "package/src/index.ts -> ./internal",
  ));
test.each([
  ["absolute POSIX input", { sources: ["/opt/build/src/index.ts"] }],
  ["file URL input", { sources: ["file:///private/var/build/src/index.ts"] }],
  ["absolute Windows input", { sources: ["D:\\build\\src\\index.ts"] }],
  ["escaping relative input", { sources: ["../../../outside.ts"] }],
  ["missing relative input", { sources: ["../missing.ts"] }],
  ["absolute source root", { sourceRoot: "/workspace/source", sources: ["index.ts"] }],
])("refuses a source map with %s", (_name, fields) =>
  rejected(
    {
      ...base,
      "package/dist/index.js.map": JSON.stringify({ version: 3, mappings: "", ...fields }),
    },
    "Source map input must stay inside the package",
  ),
);
test("refuses malformed source maps before consumer execution", () =>
  rejected({ ...base, "package/dist/index.js.map": "{" }, "Invalid source map"));
test("refuses source-map metadata that cannot describe a usable map", () =>
  rejected(
    { ...base, "package/dist/index.js.map": JSON.stringify({ version: 2, sources: [] }) },
    "must use version 3 with string mappings, string sourceRoot, and a sources array",
  ));
test("refuses source text duplicated inside a source map", () =>
  rejected(
    {
      ...base,
      "package/dist/index.js.map": JSON.stringify({
        version: 3,
        mappings: "",
        sources: ["../src/index.ts"],
        sourcesContent: ["export {};"],
      }),
    },
    "Source map duplicates source already shipped",
  ));
test("refuses optimizer annotations stripped from JavaScript", () =>
  rejected(
    {
      ...base,
      "package/src/index.ts":
        "export const first = /*#__PURE__*/ factory(); export const second = /*#__PURE__*/ factory();",
      "package/dist/index.js": "const first = /*#__PURE__*/ factory(); export { first };",
      "package/dist/index.js.map": JSON.stringify({
        version: 3,
        mappings: "",
        sources: ["../src/index.ts"],
      }),
    },
    "Optimizer annotation /*#__PURE__*/ was stripped",
  ));
test.each(["test/hidden.js", "src/__test__/hidden.ts", "dist/__test__/hidden.js"])(
  "refuses development files at %s",
  (name) => rejected({ ...base, [`package/${name}`]: "" }, "Forbidden artifact path"),
);
test("refuses a duplicated Node implementation tree", () =>
  rejected(
    { ...base, "package/dist/node/index.js": "export {};" },
    "Only the Node runtime adapter belongs in dist/node",
  ));
for (const code of [
  'import "unknown-package";',
  'export { value } from "unknown-package/subpath";',
  'await import("unknown-package");',
  'require("unknown-package");',
  'import "node:crypto";',
]) {
  test(`refuses a dependency in an unreferenced browser module: ${code}`, () =>
    rejected(
      { ...base, "package/dist/unreferenced.js": code },
      "browser artifact module graph failed",
    ));
}

for (const extension of ["mjs", "cjs"]) {
  test(`inspects unreferenced ${extension} modules too`, () =>
    rejected(
      { ...base, [`package/dist/hidden.${extension}`]: 'import "unknown-package";' },
      "browser artifact module graph failed",
    ));
}
