import { readFileSync } from "node:fs";

import type { UserConfig } from "tsdown";
import { defineConfig } from "tsdown";

/**
 * Two lines on every built file because each module is installed and can be read on its own.
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

/** Public entries also own declaration output; runtime-only entries emit JavaScript and maps. */
const publicEntries = {
  index: "src/index.ts",
  "entries/slug": "src/entries/slug.ts",
  "entries/uuid": "src/entries/uuid.ts",
  "entries/v4": "src/entries/v4.ts",
  "entries/v7": "src/entries/v7.ts",
  "v4-slug": "src/v4-slug.ts",
  "v7-slug": "src/v7-slug.ts",
} as const;

const common = {
  entry: {
    ...publicEntries,
    "node/runtime": "src/runtime/node.ts",
    "runtime/portable": "src/runtime/portable.ts",
  },
  format: ["esm"],
  failOnWarn: true,
  publint: true,
  attw: { profile: "esm-only", level: "error" },
  // Keep the browser and Node artifacts stable when the manifest's Node floor changes.
  target: "es2022",
  outExtensions: () => ({ js: ".js" }),
  banner,
  // Whitespace removal currently strips optimizer annotations from unbundled modules. Compression
  // and mangling retain nearly all size savings while leaving those consumer-facing hints intact.
  minify: {
    codegen: { removeWhitespace: false },
    // Source maps restore source locations, not readable frame names. Preserve both kinds of name;
    // method property keys are already untouched because property mangling is not enabled.
    compress: { keepNames: { function: true, class: true } },
    mangle: { keepNames: { function: true, class: true } },
  },
  sourcemap: true,
  // The published archive already carries `src/`; embedding the same source in every browser and
  // Node map duplicates it without improving stack mapping or editor navigation.
  outputOptions: {
    comments: { annotation: true, jsdoc: false, legal: false },
    sourcemapExcludeSources: true,
  },
  // Consumer bundlers need these ESM seams to remove masking from keyless imports. A pre-bundled
  // package made the same import appear removable while hiding the graph users actually receive.
  unbundle: true,
} satisfies UserConfig;

export default defineConfig([
  // One graph gives every output one producer. Separate concurrent builds can both emit shared
  // dependencies, making final bytes depend on which writer finishes last.
  {
    ...common,
    dts: {
      generator: "oxc",
      entry: Object.values(publicEntries),
    },
    clean: true,
    inputOptions: { external: ["#runtime", "node:buffer", "node:crypto"] },
    outDir: "dist",
    platform: "neutral",
  },
]);
