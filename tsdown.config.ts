import { readFileSync } from "node:fs";

import type { UserConfig } from "tsdown";
import { defineConfig } from "tsdown";

/**
 * Two lines on every built file, because each one is installed and read on its own: a
 * consumer resolves exactly one of `dist/index.js` or `dist/node/index.js` by condition, and may
 * never see the other.
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
  /**
   * One output file per source module, NOT one bundle. A bundler can only drop what it can see as
   * separable, and flattening every module into one file destroys exactly that information:
   * measured 2026-08-12 on this package, an entry importing only `uuidToSlug` cost 12,725 bytes
   * through the bundled artifact and 2,188 through the unbundled one, and `uuidV7Slug` 12,735
   * against 4,559 — under two independent bundlers, which disagreed on everything else.
   *
   * It is worth nothing on its own and must not be reverted on its own: with the keyless shortcuts
   * still bound as property reads of `defaultCodec`, unbundling saved one profile under one
   * bundler and nothing anywhere else. The pair is the fix; see `src/keyless.ts` for the other half.
   */
  unbundle: true,
} satisfies UserConfig;

export default defineConfig([
  // TWO builds, not three. `platform` is explicit because the DEFAULT is node: left unset, this
  // build baked `node:crypto` and `randomFillSync` into the file a browser resolves, which fails at
  // bundle time or ships a broken bundle.
  //
  // This one is browser-platform and NOT optional in that: it is what `main`/`module` reach, the
  // path taken by any tool that ignores `exports` (legacy bundlers, classic module resolution), so
  // it has to be the safe one. That forces it to be identical to a dedicated browser build — and a
  // third `dist/web` entry was exactly that, byte-for-byte, shipping the same 54 KB bundle and its
  // 101 KB sourcemap twice. `exports` sends `browser`, `deno` and `default` here instead. The web
  // adapter uses `crypto.getRandomValues` only, so this file is correct on Node, Bun, Deno and the
  // browser alike; `dist/node` exists only because Node has a faster path.
  { ...common, dts: true, clean: true, outDir: "dist", platform: "browser" },
  { ...common, dts: false, outDir: "dist/node", platform: "node" },
]);
