// SPDX-License-Identifier: Apache-2.0

/**
 * Import the browser bundle and make it produce one id of each kind. Takes the bundle path so the
 * same probe runs against the working `dist/` and against the copy inside the packed tarball.
 *
 * It exists because `exports["."]` sends `deno`, `browser` AND `default` to that one file, so it is
 * what every runtime other than Bun and Node receives — and until this ran, nothing executed it
 * anywhere except in-process under Bun. A bundle can be well-formed, dependency-free and still dead:
 * an entry that throws at import time or resolves `#runtime` to nothing passes every textual check.
 *
 * Deliberately plain and dependency-free so Node, Bun and Deno can each run it unmodified. Node
 * strips the types itself (native since 23.6); the others run TypeScript directly.
 *
 * It cannot tell the browser bundle from the NODE bundle, and is not meant to: Node runs the Node
 * build perfectly, so this probe passes on it. Measured 2026-08-12 by pointing it at
 * `dist/node/index.js`. The two instruments that do catch that swap are the `node:` specifier grep in
 * `check-artifact.ts` and `bun run test:browser`, whose engine genuinely lacks the capability — the
 * latter fails there naming `node:crypto`.
 */
const [, , bundle] = process.argv;
if (!bundle) throw new Error("usage: probe-web-bundle <path to dist/index.js>");

// Exported to make the file a module, which top-level `await` requires. It has no imports of its
// own on purpose, so Node, Bun and Deno each run it with no resolver configuration.
export const api = (await import(bundle)) as {
  isUuidV4String: (value: string) => boolean;
  isUuidV7String: (value: string) => boolean;
  slugToUuid: (slug: string) => Error | string;
  uuidV4: () => string;
  uuidV7: () => string;
  uuidV7Slug: () => string;
};

if (!api.isUuidV7String(api.uuidV7())) throw new Error(`${bundle} did not generate a valid UUIDv7`);
if (!api.isUuidV4String(api.uuidV4())) throw new Error(`${bundle} did not generate a valid UUIDv4`);
// Decoded rather than measured: unpadded base64url of 16 bytes is ALWAYS 22 characters, so a length
// check alone would pass against any 22-character string.
const slug = api.uuidV7Slug();
const decoded = api.slugToUuid(slug);
if (typeof decoded !== "string" || !api.isUuidV7String(decoded))
  throw new Error(`${bundle} produced a slug that does not decode: ${slug}`);
