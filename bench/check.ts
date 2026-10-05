// SPDX-License-Identifier: Apache-2.0

// Run gates without competing benchmarks; failed bundles must remain usable for reproduction.
import { mkdir, mkdtemp, rm, rmdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { command } from "../scripts/command";
import { performanceBaseline } from "./check-inputs";
import { selectComparisonRuntimes } from "./comparison-runtimes";

const root = resolve(import.meta.dir, "..");
const selectedRuntimes = selectComparisonRuntimes(
  process.env.UUID_SLUG_COMPARE_RUNTIMES ?? "node:bun",
);
const reports = join(import.meta.dir, "reports");
const hostRuntimes = selectedRuntimes.filter((runtime) => runtime === "node" || runtime === "bun");
let directory: string | undefined;
if (hostRuntimes.length) {
  await mkdir(reports, { recursive: true });
  directory = await mkdtemp(join(reports, "check-"));
}
let passed = false;
try {
  if (directory) {
    const result = await Bun.build({
      entrypoints: [join(import.meta.dir, "resources.ts"), join(import.meta.dir, "latency.ts")],
      target: "node",
      packages: "external",
      outdir: directory,
      naming: "[name].mjs",
    });
    if (!result.success) throw new AggregateError(result.logs, "Performance gate build failed");
    // These instruments depend on Node/Bun hooks; other hosts use the packed timing comparison
    // without repeating those hosts' counters or pretending that they prove browser resources.
    for (const selected of hostRuntimes) {
      const runtime = selected === "bun" ? process.execPath : selected;
      for (const name of ["resources", "latency"]) {
        const output = await command(runtime, [join(directory, `${name}.mjs`)], root);
        console.log(`${runtime}: ${name}\n${output.trim()}`);
      }
    }
  }
  // Compare complete calls against independently packed committed code when production changes.
  // Related-operation ratios cannot catch shared slowdowns. Skip unchanged production graphs;
  // rebuilding and timing them on every documentation commit buys no regression evidence.
  const baseline = await performanceBaseline(root);
  if (baseline) {
    const primaryCalls = [
      "v4.string",
      "v4.string.uppercase",
      "v4.bytes",
      "v4.slug",
      "v4.base32",
      "v7.string",
      "v7.string.uppercase",
      "v7.bytes",
      "v7.slug",
      "v7.base32",
      "v7.pair.default",
      "v7.pair.uppercase",
      "v7.pair.base32",
      "v7.pair.base32.uppercase",
      "format",
      "format.uppercase",
      "bytes.base64",
      "bytes.base32",
      "plain.encode",
      "plain.decode",
      "base32.encode",
      "base32.decode",
      "slug.bytes",
      "slug.base32.bytes",
      // Version-aware validation and version-neutral decoding do different work; compare the
      // complete guard with its committed implementation, not an assumed guard/decoder ratio.
      "guard.slug",
      "uuid.toBytes.uuid",
      "uuid.toString.bytes",
      "masked.generate",
      "masked.base32.generate",
      "masked.encode",
      "masked.encode.bytes",
      "masked.decode",
      "masked.decode.bytes",
      "masked.base32.encode",
      "masked.base32.encode.bytes",
      "masked.base32.decode",
      "masked.base32.decode.bytes",
      "value.parse.uuid",
      "value.parse.slug",
      "value.parse.bytes",
      "value.generate",
      "value.toString",
      "value.toPlainSlug",
      "value.toPlainSlug.base32",
      "value.toMaskedSlug",
    ];
    // The comparison owns bounded child commands; its whole multi-process acquisition must not
    // inherit command()'s single-tool timeout. Stream evidence without a second buffered copy.
    const comparison = Bun.spawn(
      [process.execPath, join(import.meta.dir, "compare.ts"), baseline, "--check"],
      {
        cwd: root,
        env: {
          ...process.env,
          UUID_SLUG_COMPARE_RUNTIMES: selectedRuntimes.join(":"),
          UUID_SLUG_PROFILE_FILTER: primaryCalls.map((name) => `=${name}`).join(","),
        },
        stdout: "inherit",
        stderr: "inherit",
      },
    );
    if ((await comparison.exited) !== 0)
      throw new Error("Packed primary-call timing regression check failed");
  }
  passed = true;
} finally {
  if (directory) {
    // Failure output names the exact executable and bundle; deleting it would prevent that replay.
    if (passed) await rm(directory, { recursive: true, force: true });
    else
      console.error(
        `Performance check failed. Files remain in ${directory}; rerun the failing command with the same environment.`,
      );
    await rmdir(reports).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT" && error.code !== "ENOTEMPTY") throw error;
    });
  }
}
