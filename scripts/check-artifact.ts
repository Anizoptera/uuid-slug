import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const FORBIDDEN_TEXT = [
  [83, 99, 105, 101, 110, 99, 101, 32, 65, 73],
  [115, 99, 105, 101, 110, 99, 101, 45, 97, 105],
  [115, 104, 97, 114, 101, 100, 45, 117, 116, 105, 108],
  [115, 104, 97, 114, 101, 100, 45, 112, 117, 98, 108, 105, 115, 104],
  [64, 102, 108, 117, 120, 111, 45, 112, 114, 105, 118, 97, 116, 101],
].map((codes) => String.fromCharCode(...codes));

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

    for (const file of files) {
      if (!/\.(?:js|ts|json|md|txt|map)$/.test(file)) continue;
      const text = await readFile(path.join(extracted, file), "utf8").catch(() => "");
      for (const dep of FORBIDDEN_DEPS) {
        if (text.includes(`from "${dep}"`) || text.includes(`from '${dep}'`))
          throw new Error(`Dev dependency import leaked in ${file}: ${dep}`);
      }
      for (const forbidden of FORBIDDEN_TEXT) {
        if (text.includes(forbidden))
          throw new Error(`Forbidden private source text leaked in ${file}`);
      }
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
