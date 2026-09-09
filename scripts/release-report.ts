import { mkdir, mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { command } from "./command";
import type { ReleaseInputs, RetainedArchive } from "./release-inputs";
import { preflightRelease } from "./release-notes";

interface Sizes {
  readonly npm?: number;
  readonly crate?: number;
  readonly native?: number;
  readonly wasm?: number;
}

export async function measureLinkedSizes(
  cwd: string,
  crate: string,
  work: string,
  label: string,
): Promise<Pick<Sizes, "native" | "wasm">> {
  const driver = join(work, `driver-${label}`);
  const target = join(work, `target-${label}`);
  await mkdir(join(driver, "src"), { recursive: true });
  await Promise.all([
    Bun.write(
      join(driver, "Cargo.toml"),
      `[package]\nname = "uuid-slug-linked-probe"\nversion = "0.0.0"\nedition = "2021"\n\n[dependencies]\nuuid-slug = { path = ${JSON.stringify(crate)}, default-features = false }\n`,
    ),
    Bun.write(
      join(driver, "src/main.rs"),
      `use std::hint::black_box;\nuse uuid_slug::{Codec, CodecOptions, Uuid};\nfn main() {\n let uuid = Uuid::parse("01890f3e-93b8-7cc6-a76b-b2a67b746c2a").unwrap();\n black_box(Codec::new(CodecOptions::default()).unwrap().uuid_to_slug(uuid));\n}\n`,
    ),
  ]);
  const manifest = join(driver, "Cargo.toml");
  const base = ["build", "--release", "--manifest-path", manifest];
  const env = { CARGO_TARGET_DIR: target };
  await command("cargo", base, cwd, env);
  await command("cargo", [...base, "--target", "wasm32-unknown-unknown"], cwd, env);
  return {
    native: (await stat(join(target, "release/uuid-slug-linked-probe"))).size,
    wasm: (await stat(join(target, "wasm32-unknown-unknown/release/uuid-slug-linked-probe.wasm")))
      .size,
  };
}

async function extractArchive(archive: string, destination: string): Promise<string> {
  const contents = new Bun.Archive(await Bun.file(archive).bytes());
  const files = await contents.files();
  await contents.extract(destination);
  const manifest = [...files.keys()].find((name) => /^[^/]+\/Cargo\.toml$/.test(name));
  if (!manifest) throw new Error(`${basename(archive)} has no crate manifest.`);
  return dirname(join(destination, manifest));
}

async function declaration(archive: string): Promise<string> {
  const files = await new Bun.Archive(await Bun.file(archive).bytes()).files();
  const entry = files.get("package/dist/index.d.ts");
  if (!entry) throw new Error(`${basename(archive)} has no packaged TypeScript declarations.`);
  return entry.text();
}

export function apiDiff(before: string, after: string): string {
  const oldLines = new Set(
    before
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  );
  const newLines = new Set(
    after
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  );
  const removed = [...oldLines].filter((line) => !newLines.has(line));
  const added = [...newLines].filter((line) => !oldLines.has(line));
  if (!removed.length && !added.length) return "No packaged TypeScript declaration changes.";
  return [
    ...removed.map((line) => `- \`${line.replaceAll("`", "\\`")}\``),
    ...added.map((line) => `- \`${line.replaceAll("`", "\\`")}\` (added)`),
  ].join("\n");
}

export function sizeDelta(current: number | undefined, previous: number | undefined): string {
  if (current === undefined || previous === undefined) return "unavailable";
  const absolute = current - previous;
  if (previous === 0) return `${current} B (${absolute >= 0 ? "+" : ""}${absolute} B)`;
  const percentage = (absolute / previous) * 100;
  return `${current} B (${absolute >= 0 ? "+" : ""}${absolute} B, ${percentage >= 0 ? "+" : ""}${percentage.toFixed(1)}%)`;
}

function sizeTable(current: Sizes, previous: Sizes): string {
  return [
    "| Artifact | Current | Change |",
    "| --- | ---: | ---: |",
    ...(["npm", "crate", "native", "wasm"] as const).map(
      (key) =>
        `| ${key} | ${current[key] ?? "unavailable"} | ${sizeDelta(current[key], previous[key])} |`,
    ),
  ].join("\n");
}

async function historicalSizes(
  root: string,
  work: string,
  npm: RetainedArchive | undefined,
  crate: RetainedArchive | undefined,
): Promise<Sizes> {
  if (!crate) return { ...(npm ? { npm: (await stat(resolve(root, npm.file))).size } : {}) };
  const extracted = join(work, basename(crate.file, ".crate"));
  const crateRoot = await extractArchive(resolve(root, crate.file), extracted);
  return {
    ...(npm ? { npm: (await stat(resolve(root, npm.file))).size } : {}),
    crate: (await stat(resolve(root, crate.file))).size,
    ...(await measureLinkedSizes(extracted, crateRoot, work, basename(crate.file, ".crate"))),
  };
}

/** Generate retry-stable notes from retained bytes and final linked caller outputs. */
export async function releaseReport(cwd: string, artifacts = "release-artifacts"): Promise<void> {
  const root = resolve(cwd);
  const directory = resolve(root, artifacts);
  const inputs = (await Bun.file(
    join(directory, "history/release-inputs.json"),
  ).json()) as ReleaseInputs;
  const { notes } = await preflightRelease(root, inputs.tag);
  const npm = resolve(root, inputs.candidate.npm.file);
  const crate = resolve(root, inputs.candidate.crate.file);
  const work = await mkdtemp(join(tmpdir(), "uuid-slug-release-report-"));
  try {
    const currentDeclaration = await declaration(npm);
    const current: Sizes = {
      npm: (await stat(npm)).size,
      crate: (await stat(crate)).size,
      ...(await measureLinkedSizes(root, join(root, "rust/uuid-slug"), work, "current")),
    };
    const sections = await Promise.all(
      inputs.comparisons.map(async (comparison) => {
        const previous = await historicalSizes(root, work, comparison.npm, comparison.crate);
        const changes = comparison.npm
          ? apiDiff(await declaration(resolve(root, comparison.npm.file)), currentDeclaration)
          : "TypeScript comparison unavailable because npm has no release history.";
        return `## ${comparison.role === "immediate" ? "Previous release" : "Previous release line"}: ${comparison.tag}\n\n### Packaged API\n\n${changes}\n\n### Size\n\n${sizeTable(current, previous)}`;
      }),
    );
    const report = {
      current,
      comparisons: inputs.comparisons.map(({ role, tag }) => ({ role, tag })),
    };
    await Promise.all([
      Bun.write(join(directory, "release-report.json"), `${JSON.stringify(report, null, 2)}\n`),
      Bun.write(join(directory, "notes.md"), `${notes.trimEnd()}\n\n${sections.join("\n\n")}\n`),
    ]);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

if (import.meta.main)
  releaseReport(process.cwd(), process.argv[2]).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
