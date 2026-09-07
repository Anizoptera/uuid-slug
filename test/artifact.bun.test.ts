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
    await rejects(inspectArtifact(tarball), (error: Error) => error.message.includes(message));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
const manifest = {
  name: "@anizoptera/uuid-slug",
  version: "0.0.0",
  type: "module",
  exports: { ".": "./dist/index.js", "./package.json": "./package.json" },
};
const base = {
  "package/package.json": JSON.stringify(manifest),
  "package/dist/index.js": "export {};",
  "package/dist/node/index.js": "export {};",
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
test("finds machine paths in extensionless files", () =>
  rejected({ ...base, "package/leak": "/Users/builder/private" }, "Build-machine path"));
test("refuses development files", () =>
  rejected({ ...base, "package/test/hidden.js": "" }, "Forbidden artifact path"));
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
