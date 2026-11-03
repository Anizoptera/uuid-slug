// Publish one Markdown pointer atomically; immutable evidence avoids a two-file transaction.
import { mkdir, mkdtemp, open, rename, rm, writeFile, copyFile } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { gzip } from "node:zlib";
import { promisify } from "node:util";
import type { ImplementationReport, UnvalidatedMeasurement } from "./implementation-report";
import type { openRecovery } from "./implementation-recovery";

const RAW_LINK = "Raw observations: [JSON Lines](";
const compress = promisify(gzip);

export async function* readImplementationLines(source: string): AsyncGenerator<string> {
  // Stream both legacy text and compressed captures without retaining the growing history.
  const bytes = Bun.file(source).stream();
  const decoded = source.endsWith(".gz")
    ? bytes.pipeThrough(new DecompressionStream("gzip"))
    : bytes;
  let pending = "";
  for await (const chunk of decoded.pipeThrough(new TextDecoderStream())) {
    pending += chunk;
    let start = 0;
    let end: number;
    while ((end = pending.indexOf("\n", start)) >= 0) {
      yield pending.slice(start, end);
      start = end + 1;
    }
    pending = pending.slice(start);
  }
  if (pending) yield pending;
}

export async function resolveImplementationEvidence(source: string): Promise<string> {
  if (!source.endsWith(".md")) return source;
  await using input = await open(source, "r");
  for await (const line of input.readLines())
    if (line.startsWith(RAW_LINK) && line.endsWith(")"))
      return resolve(dirname(source), decodeURIComponent(line.slice(RAW_LINK.length, -1)));
  // Earlier captures used an adjacent .jsonl file; keep explicit legacy regeneration working.
  return source.replace(/\.md$/, ".jsonl");
}

function evidenceLink(markdown: string, destination: string, raw: string): string {
  // Encode path segments so punctuation and # stay filenames rather than Markdown link syntax.
  const target = relative(dirname(destination), raw)
    .split(sep)
    .map((part) => encodeURIComponent(part).replaceAll("(", "%28").replaceAll(")", "%29"))
    .join("/");
  return markdown.replace("\n", `\n\n${RAW_LINK}${target})\n`);
}

async function writeMarkdown(
  temporary: string,
  destination: string,
  markdown: string,
  raw: string,
) {
  // Staging beside the destination makes rename the only operation that replaces the current report.
  await writeFile(temporary, evidenceLink(markdown, destination, raw));
  await rename(temporary, destination);
}

export async function writeImplementationReport(
  destination: string,
  markdown: string,
  raw: string,
) {
  await mkdir(dirname(destination), { recursive: true });
  const stage = await mkdtemp(join(dirname(destination), `.${basename(destination)}-`));
  try {
    await writeMarkdown(join(stage, "report.md"), destination, markdown, raw);
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

export async function openImplementationOutput(
  destination: string,
  header: Omit<ImplementationReport, "measurements">,
  recovery?: {
    source: Awaited<ReturnType<typeof openRecovery>>;
    admit: (record: UnvalidatedMeasurement) => void;
  },
) {
  if (!destination.endsWith(".md")) throw new Error("Report destination must end with .md");
  if (Boolean(recovery) !== Boolean(header.recovery?.resumedFrom))
    throw new Error(
      "Supply recovery records and source provenance together; use --report for completed captures.",
    );
  const parent = dirname(destination);
  await mkdir(parent, { recursive: true });
  const prefix = join(parent, `${basename(destination, ".md")}-evidence-`);
  // The supervisor removes private staging after process death. Nothing resumable is exposed
  // until source EOF and admission succeed; decompression can yield bytes before a bad trailer.
  const stage = recovery ? await mkdtemp(join(tmpdir(), "uuid-slug-recovery-")) : undefined;
  let captureDirectory = stage ?? (await mkdtemp(prefix));
  // Acquisition cannot touch completed outputs; only a fully captured run may replace the report.
  let raw = join(captureDirectory, stage ? "unverified" : "observations.jsonl.gz");
  let output = await open(raw, "wx");
  let state: "collecting" | "captured" | "published" = "collecting";
  let closed = false;
  let reused = 0;
  async function appendLine(value: object) {
    const line = `${JSON.stringify(value)}\n`;
    // Each completed append is independently decompressible even if collection is interrupted.
    await output.writeFile(await compress(line));
  }
  async function closeRaw() {
    if (!closed) {
      await output.close();
      closed = true;
    }
  }
  async function close() {
    await closeRaw();
    if (state !== "published") {
      // Markdown is regenerable; only the failed attempt's observations justify retention.
      await rm(join(captureDirectory, "complete.md"), { force: true });
      console.error(
        `Report not updated; existing completed files were not overwritten. Observations: ${raw}\n${state === "captured" ? "Regenerate with --report and this file; timing does not need repeating." : "Acquisition did not finish. Diagnose the failure before repeating measurements; remove this attempt when diagnosis no longer needs it."}`,
      );
    }
  }
  try {
    // This receipt describes the committed capture; its private stage is not a readable .gz path.
    await appendLine(
      recovery && header.recovery
        ? {
            ...header,
            recovery: { ...header.recovery, sourceValidated: true },
          }
        : header,
    );
    if (recovery)
      for await (const window of recovery.source.windows()) {
        // Validate the entire unit before copying it; never resume across an interrupted pair.
        for (const record of window) recovery.admit(record);
        for (const record of window) {
          await appendLine(record);
          reused++;
        }
      }
    if (stage) {
      const stagedRaw = raw;
      captureDirectory = await mkdtemp(prefix);
      raw = join(captureDirectory, "observations.jsonl.gz");
      try {
        await rename(stagedRaw, raw);
      } catch (cause) {
        if (!cause || typeof cause !== "object" || !("code" in cause) || cause.code !== "EXDEV")
          throw cause;
        // Different filesystems require copying; only already-validated bytes can reach this path.
        await closeRaw();
        await copyFile(stagedRaw, raw, constants.COPYFILE_EXCL);
        output = await open(raw, constants.O_WRONLY | constants.O_APPEND);
        closed = false;
      }
    }
  } catch (error) {
    await closeRaw();
    if (stage && captureDirectory !== stage)
      await rm(captureDirectory, { recursive: true, force: true });
    throw error;
  } finally {
    if (stage) await rm(stage, { recursive: true, force: true });
  }
  return {
    raw,
    reused,
    append: (record: UnvalidatedMeasurement) => appendLine(record),
    async publish(markdown: string) {
      await appendLine({ complete: true });
      state = "captured";
      await output.sync();
      await closeRaw();
      const final = join(captureDirectory, "complete.md");
      await writeMarkdown(final, destination, markdown, raw);
      state = "published";
      return raw;
    },
    close,
  };
}
