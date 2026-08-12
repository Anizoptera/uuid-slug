import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * A build-machine path in a shipped file is the leak this package can actually produce: a bundler
 * or a sourcemap that inlines `/Users/someone/...` or `/home/runner/...` publishes the layout of
 * the machine that built it, and nothing else in the pipeline looks.
 *
 * What stood here before was five char-code-obfuscated names belonging to an unrelated private
 * monorepo, with no comment saying so. They matched nothing in this tree and could not: this is a
 * standalone public repository. A check that cannot fail is not a check, and the obfuscation made
 * it unreadable as well.
 */
const BUILD_PATH_LEAK = /(?:\/Users\/|\/home\/[a-z]|[A-Z]:\\Users\\)/;

const FORBIDDEN_PATHS = [
  "bench/",
  "test/",
  ".github/",
  "scripts/",
  "AGENTS.md",
  "NOTICE",
  "vitest.config",
  "tsconfig",
];

const FORBIDDEN_DEPS = [
  "uuid",
  "uuidv7",
  "fastv7",
  "uuidv7-js",
  "@kripod/uuidv7",
  "playwright",
  "@vitest/browser",
  "@vitest/browser-playwright",
  "vitest",
  "tsdown",
];

function run(command: string, args: string[], cwd: string) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.status !== 0)
    throw new Error(`${command} ${args.join(" ")} failed\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

async function main() {
  // --tarball-out is the only supported way to obtain the published bytes: it writes them
  // into a directory this script names and therefore owns, so cleanup is not conditional on
  // parsing anything. Reading paths out of the CLI's stdout instead couples this check to
  // the wording of a human-facing message — it broke silently when that wording changed.
  const root = await mkdtemp(path.join(tmpdir(), "uuid-slug-artifact-"));
  try {
    run("publish-clean", ["--dry-run", "--no-git-checks", "--tarball-out", root], process.cwd());
    const packed = (await readdir(root)).filter((entry) => entry.endsWith(".tgz"));
    const [name] = packed;
    if (packed.length !== 1 || !name)
      throw new Error(`expected exactly one tarball in ${root}, found ${packed.length}`);

    const tarball = path.join(root, name);
    run("tar", ["xzf", tarball, "-C", root], process.cwd());
    const extracted = path.join(root, "package");
    // The tarball's own listing, rather than a walk of the extracted tree: it is the
    // shipped index, and it cannot disagree with what a consumer receives.
    const files = run("tar", ["tzf", tarball], process.cwd())
      .trim()
      .split("\n")
      .filter((line) => line.length > 0 && !line.endsWith("/"))
      .map((line) => line.replace(/^package\//, ""));

    const forbiddenPath = files.find((file) =>
      FORBIDDEN_PATHS.some((prefix) => file.startsWith(prefix) || file.includes(`/${prefix}`)),
    );
    if (forbiddenPath)
      throw new Error(`Forbidden path leaked into package artifact: ${forbiddenPath}`);

    const packageJson = JSON.parse(
      await readFile(path.join(extracted, "package.json"), "utf8"),
    ) as Record<string, unknown>;
    if (
      Object.keys((packageJson.dependencies as Record<string, unknown> | undefined) ?? {}).length >
      0
    )
      throw new Error("Runtime dependencies leaked into package artifact.");
    for (const field of [
      "dependencies",
      "devDependencies",
      "optionalDependencies",
      "peerDependencies",
    ]) {
      const deps = packageJson[field] as Record<string, unknown> | undefined;
      for (const dep of FORBIDDEN_DEPS) {
        if (deps && dep in deps)
          throw new Error(`Dev dependency leaked into packed manifest ${field}: ${dep}`);
      }
    }

    // The entry points, and ONLY these. `dist` is built unbundled -- one file per source module --
    // so every internal module is now a separate shipped file that LOOKS like a usable entry, and
    // `"./*": "./dist/*"` is the natural-looking change that would freeze this package's internal
    // layout as public API permanently. Node's resolver blocks deep imports only for as long as
    // this map stays closed. It is also pointless to open it: the module split already delivers the
    // tree-shaking a deep import would be reached for (see src/keyless.ts).
    const exportKeys = Object.keys((packageJson.exports as Record<string, unknown>) ?? {});
    const ENTRY_POINTS = new Set([".", "./package.json"]);
    if (exportKeys.length !== ENTRY_POINTS.size || exportKeys.some((key) => !ENTRY_POINTS.has(key)))
      throw new Error(
        `Packed "exports" must expose exactly "." and "./package.json", found: ${exportKeys.join(", ")}. ` +
          `A wildcard or subpath entry makes dist/'s internal module layout public API forever.`,
      );

    // The declared floor and the CI matrix are ONE claim living in two files, and nothing else
    // couples them: `engines.node` promises consumers a runtime, and `check.yml`'s `runtimes`
    // matrix is the only thing that ever runs it. Raising the floor without moving that entry
    // silently reverts the package to promising a version no lane exercises, which is the state
    // this check exists to end. Assert on the PACKED manifest, since that is what consumers read.
    const engines = packageJson.engines as Record<string, string> | undefined;
    if (engines?.node !== ">=20")
      throw new Error(
        `engines.node is "${String(engines?.node)}", not ">=20". That floor is pinned by the ` +
          `"20" entry in the runtimes matrix of .github/workflows/check.yml -- change both ` +
          `together, or the declared floor stops being tested.`,
      );

    // EVERY shipped file is read, and an unreadable one FAILS. Both used to be the other way: an
    // extension allow-list skipped `.mjs`, `.cjs` and extensionless files, and `.catch(() => "")`
    // turned a file this script could not open into an empty string that passed every scan below.
    // Each reported clean for a reason other than cleanliness.
    for (const file of files) {
      const text = await readFile(path.join(extracted, file), "utf8");
      for (const dep of FORBIDDEN_DEPS) {
        // Bare specifier, subpath, `require` and dynamic `import` alike. Matching only
        // `from "dep"` missed `require("uuid")`, `import("uuid")` and `from "uuid/v7"` — three
        // spellings of the same leak, in a check whose whole job is that this package ships no
        // dependency.
        const specifier = String.raw`["']${dep.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)}(?:/[^"']*)?["']`;
        if (
          new RegExp(String.raw`(?:\bfrom\s*|\brequire\s*\(\s*|\bimport\s*\(\s*)${specifier}`).test(
            text,
          )
        )
          throw new Error(`Dev dependency import leaked in ${file}: ${dep}`);
      }
      if (BUILD_PATH_LEAK.test(text))
        throw new Error(`A build-machine filesystem path leaked in ${file}`);
    }

    // The browser-facing bundle must reach no Node builtin. `dist/node/index.js` is EXCLUDED and
    // must stay so -- it is the Node build and `node:crypto` is exactly what it is for.
    // `tsdown.config.ts` records the regression this catches: with `platform` unset, the
    // browser-resolved build baked in `node:crypto` and `randomFillSync`, and nothing in this repo
    // executed or read a built file, so the only way to find out was a consumer's bundler failing.
    // EVERY file of that build is scanned, not just its entry. The build is UNBUNDLED -- one output
    // per source module -- so `dist/index.js` is a re-export barrel holding no code, and a builtin
    // baked into the runtime adapter beside it would sail past a check that reads only the entry.
    {
      const browserFiles = files.filter(
        (file) =>
          file.startsWith("dist/") && !file.startsWith("dist/node/") && file.endsWith(".js"),
      );
      // An empty list would pass vacuously, and the layout above is exactly the kind that changes.
      if (browserFiles.length === 0)
        throw new Error("No browser-build JavaScript found under dist/ to scan for Node builtins.");
      for (const file of browserFiles) {
        const builtin = /["']node:[a-z_]+["']/.exec(
          await readFile(path.join(extracted, file), "utf8"),
        );
        if (builtin) throw new Error(`${file} must not reach a Node builtin, found ${builtin[0]}`);
      }
    }

    // Executed, not just read. Both bundles are imported and made to produce one id of each kind,
    // because a build can be well-formed, dependency-free and still dead -- an entry that throws at
    // import time or resolves `#runtime` to nothing passes every textual check above.
    for (const entry of ["dist/index.js", "dist/node/index.js"]) {
      const module = (await import(path.join(extracted, entry))) as {
        isUuidV7String: (value: string) => boolean;
        uuidV4: () => string;
        uuidV7Slug: () => string;
        uuidV7: () => string;
      };
      if (!module.isUuidV7String(module.uuidV7()))
        throw new Error(`${entry} did not generate a valid UUIDv7`);
      if (module.uuidV7Slug().length !== 22 || module.uuidV4().length !== 36)
        throw new Error(`${entry} generated a malformed slug or v4`);
    }

    // Executed by a SECOND engine, from the packed bytes. Every import above ran in this process,
    // which is Bun -- and `exports["."]` sends Bun to `src/index.ts`, so nothing here had yet proved
    // the browser bundle starts under any other runtime. Node is the one guaranteed present: this
    // lane already needs it for publish-clean. Deno and a real browser are covered by the browser
    // CI job, which is out of `bun run check` because it needs a Chromium download.
    run(
      "node",
      [
        path.join(process.cwd(), "scripts", "probe-web-bundle.ts"),
        path.join(extracted, "dist/index.js"),
      ],
      process.cwd(),
    );

    run("bunx", ["publint", "run", extracted, "--pack", "false"], process.cwd());
    run("bunx", ["@arethetypeswrong/cli", tarball, "--profile", "esm-only"], process.cwd());
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
