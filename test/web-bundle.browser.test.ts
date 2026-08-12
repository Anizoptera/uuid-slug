// SPDX-License-Identifier: Apache-2.0

/**
 * The browser bundle, executed in a real headless browser.
 *
 * Every other lane runs on Node or Bun, where `process`, `Buffer` and `node:crypto` all exist — so
 * none of them can tell a browser bundle that reaches for one from a browser bundle that does not.
 * `tsdown.config.ts` records that exact regression: with `platform` unset, the browser-resolved
 * build baked in `node:crypto` and `randomFillSync`, and the first thing to notice was a consumer's
 * bundler. `scripts/check-artifact.ts` now greps the built file for a `node:` specifier, which
 * catches the spelling; this catches the CAPABILITY, because a browser genuinely does not have it.
 *
 * It imports `dist/`, so `bun run build` must have run. Deliberately OUT of `bun run check`: this
 * needs a ~150 MB Chromium download, and committing must not require one. It has its own script
 * (`bun run test:browser`) and its own CI job.
 */
import { expect, test } from "vitest";

/**
 * Loaded by PATH, not by package name: `exports["."]` resolves `browser` to this same file, but
 * nothing installs this package into its own `node_modules`, so the condition itself cannot be
 * exercised from inside the repository. It is the same file `dist/index.js` that `main`/`module`
 * point at, because a dedicated `dist/web` build was byte-identical to it and was deleted.
 */
import * as api from "../dist/index.js";

test("the environment really is a browser, so the assertions below mean what they say", () => {
  // Without this the whole file would pass just as happily under Node, where the bundle
  // could reach for a Node builtin and nothing here would notice — which is the only defect this
  // lane exists to catch.
  expect(typeof process).toBe("undefined");
  expect(typeof globalThis.crypto.getRandomValues).toBe("function");
});

test("the browser bundle generates and round-trips every id with Web Crypto alone", () => {
  expect(api.isUuidV7String(api.uuidV7())).toBe(true);
  expect(api.isUuidV4String(api.uuidV4())).toBe(true);
  const slug = api.uuidV7Slug();
  expect(slug).toHaveLength(22);
  // Decoded, not measured: unpadded base64url of 16 bytes is ALWAYS 22 characters, so a length
  // assertion alone would pass against any 22-character string whatsoever.
  expect(api.isUuidV7String(api.slugToUuid(slug) as string)).toBe(true);
});
