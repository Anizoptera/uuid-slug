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

    // The browser-facing bundles must reach no Node builtin. `tsdown.config.ts` records the exact
    // regression: with `platform` unset, the browser-resolved build baked in `node:crypto` and
    // `randomFillSync`, and nothing in this repo executed or read a built file, so the only way to
    // find out was a consumer's bundler failing.
    for (const entry of ["dist/index.js", "dist/web/index.js"]) {
      const text = await readFile(path.join(extracted, entry), "utf8");
      const builtin = /["']node:[a-z_]+["']/.exec(text);
      if (builtin) throw new Error(`${entry} must not reach a Node builtin, found ${builtin[0]}`);
    }

    // Executed, not just read. Every bundle is imported and made to produce one id of each kind,
    // because a build can be well-formed, dependency-free and still dead -- an entry that throws at
    // import time or resolves `#runtime` to nothing passes every textual check above.
    for (const entry of ["dist/index.js", "dist/web/index.js", "dist/node/index.js"]) {
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
