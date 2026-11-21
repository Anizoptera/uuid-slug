// Publish only a crate that matches the verified archive and the registry's checksum.
import { createHash } from "node:crypto";
import { appendFile, copyFile, mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkCrateDocumentation, inspectCrate } from "./check-crate";
import { awaitPublished } from "./registry-integrity";
import { preflightRelease } from "./release-notes";
import { rustToolchain } from "./rust-toolchain";

const reviewedDirectory = "rust/target/reviewed-crate";
const userAgent = "uuid-slug release (https://github.com/Anizoptera/uuid-slug)";

export function verifyCrateChecksum(bytes: Uint8Array, checksum: string): void {
  if (!/^[a-f0-9]{64}$/.test(checksum)) throw new Error("Invalid crate SHA-256 checksum.");
  if (createHash("sha256").update(bytes).digest("hex") !== checksum)
    throw new Error("Crate bytes differ; refuse publication, attestation or asset replacement.");
}

/** Only the registry's explicit not-found response permits a new publication. */
export async function crateChecksum(version: string): Promise<string | undefined> {
  const response = await fetch(`https://crates.io/api/v1/crates/uuid-slug/${version}`, {
    headers: { "User-Agent": userAgent },
    signal: AbortSignal.timeout(20_000),
  });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`Crates.io lookup failed: HTTP ${response.status}.`);
  const metadata = await response.json();
  const checksum = metadata?.version?.checksum;
  if (typeof checksum !== "string" || !/^[a-f0-9]{64}$/.test(checksum))
    throw new Error("Crates.io did not return a SHA-256 checksum.");
  return checksum;
}

async function cargo(
  toolchain: Awaited<ReturnType<typeof rustToolchain>>,
  args: string[],
  manifest = "rust/Cargo.toml",
): Promise<void> {
  const child = Bun.spawn(
    [
      toolchain.cargo,
      ...toolchain.cargoArgs,
      ...args,
      "--manifest-path",
      manifest,
      "--package",
      "uuid-slug",
      "--locked",
    ],
    { env: toolchain.env, stdout: "inherit", stderr: "inherit", timeout: 240_000 },
  );
  if ((await child.exited) !== 0) throw new Error(`cargo ${args[0]} failed.`);
}

const crateDirectory = "rust/uuid-slug";
const stagedAgents = join(crateDirectory, "AGENTS.md");

// Consumers get rust/AGENTS.consumer.md as the crate-root AGENTS.md, but a tracked file there would
// auto-load for maintainers editing the crate. Cargo cannot rename on packing: an ignored file never
// ships, and `include` also ships ignored junk. So stage an untracked copy only while Cargo runs and
// allow exactly that one dirty path; the crate's VCS record then honestly says `dirty`.
async function withConsumerAgents(run: () => Promise<void>): Promise<void> {
  const dirty = (await Bun.$`git status --porcelain -- ${crateDirectory}`.text()).trim();
  if (dirty) throw new Error(`Commit crate sources before packaging; uncommitted:\n${dirty}`);
  // The `finally` below deletes this path, so it must be ours: a tracked file there is clean
  // (passes the check above) and would be overwritten, then deleted.
  if (await Bun.file(stagedAgents).exists())
    throw new Error(
      `${stagedAgents} must not exist: packaging stages rust/AGENTS.consumer.md there and deletes it afterwards. Move maintainer rules to rust/AGENTS.md.`,
    );
  await copyFile("rust/AGENTS.consumer.md", stagedAgents);
  try {
    await run();
  } finally {
    await rm(stagedAgents, { force: true });
  }
}

async function releaseCrate(mode: string): Promise<void> {
  if (!["prepare", "check", "publish"].includes(mode))
    throw new Error("Usage: release-crate.ts prepare|check|publish");
  const tag = process.env.GITHUB_REF_NAME;
  if (!tag || process.env.GITHUB_REF_TYPE !== "tag")
    throw new Error("A release must run on a Git tag.");
  const { version } = await preflightRelease(process.cwd(), tag);
  // Packaging, extracted-source verification and upload must use the same compiler selection.
  const toolchain = await rustToolchain();
  const filename = `uuid-slug-${version}.crate`;
  const packaged = join("rust/target/package", filename);
  const reviewed = join(reviewedDirectory, filename);
  if (mode === "prepare") {
    await mkdir(reviewedDirectory, { recursive: true });
    if ((await readdir(reviewedDirectory)).length)
      throw new Error("Reviewed crate directory must be empty before packaging.");
    await withConsumerAgents(() => cargo(toolchain, ["package", "--allow-dirty"]));
    await inspectCrate(packaged, version);
    // Package verification only compiles the library; run fixtures and docs from the archive's
    // own bytes. Extract it here rather than reuse Cargo's verification directory: with
    // `build.build-dir` configured, Cargo unpacks there instead of `target/package`. The copy must
    // sit outside `rust/`, or Cargo reads it as an undeclared member of that workspace.
    const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-crate-"));
    try {
      await Bun.$`tar -xzf ${packaged} -C ${scratch}`;
      const extracted = join(scratch, `uuid-slug-${version}`);
      await cargo(toolchain, ["test", "--all-features"], join(extracted, "Cargo.toml"));
      await checkCrateDocumentation(extracted);
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
    await copyFile(packaged, reviewed);
    return;
  }
  const files = await readdir(reviewedDirectory);
  if (files.length !== 1 || files[0] !== filename)
    throw new Error("Reviewed artifact must contain exactly the release crate.");
  const bytes = await Bun.file(reviewed).bytes();
  const expected = createHash("sha256").update(bytes).digest("hex");
  const existing = await crateChecksum(version);
  if (existing) verifyCrateChecksum(bytes, existing);
  if (mode === "check") {
    // Repack without building dependency code in the credential-bearing job.
    await withConsumerAgents(() => cargo(toolchain, ["package", "--no-verify", "--allow-dirty"]));
    verifyCrateChecksum(await Bun.file(packaged).bytes(), expected);
    const output = process.env.GITHUB_OUTPUT;
    if (!output) throw new Error("GITHUB_OUTPUT is required for the release preflight.");
    await appendFile(output, `published=${existing !== undefined}\n`);
    return;
  }
  if (!existing) {
    verifyCrateChecksum(await Bun.file(packaged).bytes(), expected);
    await withConsumerAgents(() =>
      cargo(toolchain, ["publish", "--no-verify", "--allow-dirty", "--registry", "crates-io"]),
    );
    verifyCrateChecksum(await Bun.file(packaged).bytes(), expected);
  }
  const published = existing ?? (await awaitPublished(() => crateChecksum(version)));
  if (!published)
    throw new Error("Crate upload is not observable yet; retry when crates.io exposes it.");
  verifyCrateChecksum(bytes, published);
}

if (import.meta.main)
  releaseCrate(process.argv[2] ?? "").catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
