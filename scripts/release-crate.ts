// Publish only a crate that matches the verified archive and the registry's checksum.
import { createHash } from "node:crypto";
import { appendFile, copyFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { inspectCrate } from "./check-crate";
import { preflightRelease } from "./release-notes";

const reviewedDirectory = "rust/target/reviewed-crate";
const userAgent = "uuid-slug release (https://github.com/Anizoptera/uuid-slug)";

export function verifyCrateChecksum(bytes: Uint8Array, checksum: string): void {
  if (!/^[a-f0-9]{64}$/.test(checksum)) throw new Error("Invalid crate SHA-256 checksum.");
  if (createHash("sha256").update(bytes).digest("hex") !== checksum)
    throw new Error("Crate bytes differ; refuse publication, attestation or asset replacement.");
}

/** Only the registry's explicit not-found response permits a new publication. */
export async function crateChecksum(
  version: string,
  registry = "https://crates.io",
): Promise<string | undefined> {
  const response = await fetch(`${registry}/api/v1/crates/uuid-slug/${version}`, {
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

async function cargo(args: string[], manifest = "rust/Cargo.toml"): Promise<void> {
  const child = Bun.spawn(
    ["cargo", ...args, "--manifest-path", manifest, "--package", "uuid-slug", "--locked"],
    { stdout: "inherit", stderr: "inherit", timeout: 240_000 },
  );
  if ((await child.exited) !== 0) throw new Error(`cargo ${args[0]} failed.`);
}

export async function releaseCrate(mode: string): Promise<void> {
  if (!["prepare", "check", "publish"].includes(mode))
    throw new Error("Usage: release-crate.ts prepare|check|publish");
  const tag = process.env.GITHUB_REF_NAME;
  if (!tag || process.env.GITHUB_REF_TYPE !== "tag")
    throw new Error("A release must run on a Git tag.");
  const { version } = await preflightRelease(process.cwd(), tag);
  const filename = `uuid-slug-${version}.crate`;
  const packaged = join("rust/target/package", filename);
  const reviewed = join(reviewedDirectory, filename);
  if (mode === "prepare") {
    await mkdir(reviewedDirectory, { recursive: true });
    if ((await readdir(reviewedDirectory)).length)
      throw new Error("Reviewed crate directory must be empty before packaging.");
    await cargo(["package"]);
    await inspectCrate(packaged, version);
    // Package verification only compiles the library; run fixtures and docs from extracted bytes.
    await cargo(
      ["test", "--all-features"],
      join("rust/target/package", `uuid-slug-${version}`, "Cargo.toml"),
    );
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
    await cargo(["package", "--no-verify"]);
    verifyCrateChecksum(await Bun.file(packaged).bytes(), expected);
    const output = process.env.GITHUB_OUTPUT;
    if (!output) throw new Error("GITHUB_OUTPUT is required for the release preflight.");
    await appendFile(output, `published=${existing !== undefined}\n`);
    return;
  }
  if (!existing) {
    verifyCrateChecksum(await Bun.file(packaged).bytes(), expected);
    await cargo(["publish", "--no-verify", "--registry", "crates-io"]);
    verifyCrateChecksum(await Bun.file(packaged).bytes(), expected);
  }
  const published = existing ?? (await crateChecksum(version));
  if (!published)
    throw new Error("Crate upload is not observable yet; retry when crates.io exposes it.");
  verifyCrateChecksum(bytes, published);
}

if (import.meta.main)
  releaseCrate(process.argv[2] ?? "").catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
