// Publish one Markdown pointer atomically; immutable evidence avoids a two-file transaction.
import { mkdir, mkdtemp, open, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import type { ImplementationReport, UnvalidatedMeasurement } from "./implementation-report";

const RAW_LINK = "Raw observations: [JSON Lines](";

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
) {
  if (!destination.endsWith(".md")) throw new Error("Report destination must end with .md");
  const parent = dirname(destination);
  await mkdir(parent, { recursive: true });
  const captureDirectory = await mkdtemp(join(parent, `${basename(destination, ".md")}-evidence-`));
  // Acquisition cannot touch completed outputs; only a fully captured run may replace the report.
  const raw = join(captureDirectory, "observations.jsonl");
  const output = await open(raw, "wx");
  let state: "collecting" | "captured" | "published" = "collecting";
  let closed = false;
  async function appendLine(value: object) {
    const line = `${JSON.stringify(value)}\n`;
    await output.writeFile(line);
  }
  async function closeRaw() {
    if (!closed) {
      await output.close();
      closed = true;
    }
  }
  try {
    await appendLine(header);
  } catch (error) {
    await closeRaw();
    throw error;
  }
  return {
    raw,
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
    async close() {
      await closeRaw();
      if (state !== "published") {
        // Markdown is regenerable; only the failed attempt's observations justify retention.
        await rm(join(captureDirectory, "complete.md"), { force: true });
        console.error(
          `Report not updated; existing completed files were not overwritten. Observations: ${raw}\n${state === "captured" ? "Regenerate with --report and this file; timing does not need repeating." : "Acquisition did not finish. Diagnose the failure before repeating measurements; remove this attempt when diagnosis no longer needs it."}`,
        );
      }
    },
  };
}
