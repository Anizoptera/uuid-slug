import { readFileSync } from "node:fs";

import type { UserConfig } from "tsdown";
import { defineConfig } from "tsdown";

/**
 * Two lines on every built file, because each one is installed and read on its own: a
 * consumer resolves exactly one of `dist/index.js`, `dist/node/index.js` or
 * `dist/web/index.js` by condition, and may never see the others.
 *
 * The licence line is the SPDX short-form identifier, the entire standard for declaring a
 * file's licence to a scanner that sees the file and nothing around it. REUSE 3.3 terminates
 * a tag value at a newline, so these are line comments: a `/* *\/` block's closing delimiter
 * would sit inside the value for every parser to strip, and none is obliged to. The shipped
 * `src/*.ts` carry the same licence line by hand, without the identity line, since a version
 * written into source goes stale the next time one is cut.
 *
 * A copyright notice is deliberately absent. REUSE compliance would additionally want one
 * `SPDX-FileCopyrightText:` line per holder; the holders are declared in LICENSE, which ships
 * in the same tarball, and restating them here creates a second place to update.
 *
 * Every value is read from the manifest, so an artifact cannot claim a licence or a version
 * the package does not. Nothing volatile goes in — no build date, no machine, no git hash —
 * because the published tarball must stay byte-identical across runs.
 */
const manifest: Record<string, unknown> = JSON.parse(
  readFileSync(new URL("package.json", import.meta.url), "utf8"),
);
const field = (key: string): string => {
  const value = manifest[key];
  // Fails the build rather than emitting `undefined` into every consumer's copy, where no
  // later check looks and no test would notice.
  if (typeof value !== "string" || value === "")
    throw new Error(`package.json "${key}" must be a non-empty string for the dist banner.`);
  return value;
};
const stamp = [
  `// SPDX-License-Identifier: ${field("license")}`,
  `// ${field("name")} ${field("version")} | ${field("homepage")}`,
].join("\n");
// `dts` as well as `js`: `package.json#types` points at the emitted declarations, so they are
// installed and read on their own exactly as the JavaScript is.
const banner = { js: stamp, dts: stamp };

/**
 * Identical across the three builds; only the platform and destination differ. `satisfies`
 * rather than a plain literal, so the union-typed fields are checked here and widen the way
 * the spread needs — an annotation would erase the literal types, and a cast would assert
 * what this asks the compiler to prove.
 */
const common = {
  entry: { index: "src/index.ts" },
  format: ["esm"],
  outExtensions: () => ({ js: ".js" }),
  banner,
} satisfies UserConfig;

export default defineConfig([
  { ...common, dts: true, clean: true, outDir: "dist" },
  { ...common, dts: false, outDir: "dist/node", platform: "node" },
  { ...common, dts: false, outDir: "dist/web", platform: "browser" },
]);
