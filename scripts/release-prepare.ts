// Prepares a tagged release without publishing: reviewed archives, retained history and the
// release report with its consumer notes. The tag workflow and `bun run release` run this one
// sequence, so every release-only check judges the candidate before any tag leaves the machine;
// otherwise each defect costs a pushed tag and a full CI round.
// Expects a built tree (`bun run build`) and the annotated tag at HEAD. pnpm runs it as the
// `postversion` script right after `bun run release` creates that tag, so it takes no argument there.
import { rm } from "node:fs/promises";
import { Glob } from "bun";

const manifest = (await Bun.file("package.json").json()) as { version: string };
const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME ?? `v${manifest.version}`;
// Stale archives from an earlier attempt would fail the single-archive checks below.
await Promise.all(
  ["release-artifacts", "rust/target/reviewed-crate"].map((path) =>
    rm(path, { recursive: true, force: true }),
  ),
);
// The step scripts read the tag as the tag workflow provides it.
const env = { ...process.env, GITHUB_REF_NAME: tag, GITHUB_REF_TYPE: "tag" };

async function step(...args: string[]): Promise<void> {
  const child = Bun.spawn(["bun", ...args], { env, stdout: "inherit", stderr: "inherit" });
  const status = await child.exited;
  if (status !== 0)
    throw new Error(
      `Release preparation stopped at: bun ${args.join(" ")}. Unless ${tag} is already pushed or published, fix and re-tag locally: dev/release.md §Repair an unpushed or unpublished tag.`,
    );
}

async function single(pattern: string): Promise<string> {
  const found = await Array.fromAsync(new Glob(pattern).scan("."));
  if (found.length !== 1 || !found[0])
    throw new Error(`Expected exactly one ${pattern}, found ${found.length}.`);
  return found[0];
}

await step("scripts/release-package.ts", "prepare");
await step("scripts/release-crate.ts", "prepare");
const [npm, crate] = await Promise.all([
  single("release-artifacts/reviewed-npm/*.tgz"),
  single("rust/target/reviewed-crate/*.crate"),
]);
await step("scripts/release-inputs.ts", tag, "release-artifacts/history", npm, crate);
await step("scripts/release-report.ts");
