// Real filesystem failures and process death must preserve completed benchmark evidence.
import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync, gunzipSync } from "node:zlib";
import {
  openImplementationOutput,
  readImplementationLines,
  resolveImplementationEvidence,
} from "../bench/implementation-output";
import type { ImplementationReport, Measurement } from "../bench/implementation-report";

const header: Omit<ImplementationReport, "measurements"> = {
  revision: "fixture",
  captured: "fixture",
  host: "fixture",
  smoke: true,
  blocks: 1,
  settings: { samples: 1, duration: 1, warmup: 1, filter: "", batchTicks: 40 },
  lanes: [],
};
const record: Measurement = {
  lane: "fixture",
  subject: "fixture",
  role: "candidate",
  block: 0,
  repeat: 0,
  sequence: 0,
  rows: [{ name: "plain/base32", ns: [1], operations: 1 }],
};

async function readCompressed(path: string): Promise<string> {
  // The independent Node decoder checks the writer separately from the streaming report reader.
  return gunzipSync(await readFile(path)).toString("utf8");
}

test("streamed evidence preserves legacy lines and rejects truncated gzip", async () => {
  const directory = await mkdtemp(join(tmpdir(), "uuid-slug-output-"));
  try {
    const legacy = join(directory, "legacy.jsonl");
    await writeFile(legacy, '"first"\n"last"');
    expect(await Array.fromAsync(readImplementationLines(legacy))).toEqual(['"first"', '"last"']);
    const truncated = join(directory, "truncated.jsonl.gz");
    const bytes = gzipSync('"first"\n');
    await writeFile(truncated, bytes.subarray(0, -1));
    const failure = await Array.fromAsync(readImplementationLines(truncated)).catch(
      (error: unknown) => error,
    );
    expect(failure).toBeInstanceOf(Error);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("overlapping completed writers publish a report pointing to their own immutable evidence", async () => {
  const directory = await mkdtemp(join(tmpdir(), "uuid-slug-output-"));
  const destination = join(directory, "comparison #1 (warm).md");
  const first = await openImplementationOutput(destination, header);
  const second = await openImplementationOutput(destination, { ...header, revision: "second" });
  try {
    await first.append(record);
    await second.append(record);
    const [firstRaw, secondRaw] = await Promise.all([
      first.publish("# First\n\nFirst comparison.\n"),
      second.publish("# Second\n\nSecond comparison.\n"),
    ]);
    const firstBytes = await readCompressed(firstRaw);
    expect(
      firstBytes
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line)),
    ).toEqual([header, record, { complete: true }]);
    expect(await Array.fromAsync(readImplementationLines(firstRaw))).toEqual(
      firstBytes.trimEnd().split("\n"),
    );
    const markdown = await readFile(destination, "utf8");
    const selected = await resolveImplementationEvidence(destination);
    expect([firstRaw, secondRaw]).toContain(selected);
    expect(markdown).toContain(selected === firstRaw ? "# First" : "# Second");
    const href = markdown.match(/^Raw observations: \[JSON Lines\]\(([^)]+)\)$/m)?.[1];
    if (!href) throw new Error("Report omitted its evidence link");
    expect(fileURLToPath(new URL(href, pathToFileURL(destination)))).toBe(selected);
    await Promise.all([first.close(), second.close()]);
    expect((await readdir(directory)).filter((name) => name.endsWith(".md"))).toEqual([
      basename(destination),
    ]);
  } finally {
    await Promise.all([first.close(), second.close()]);
    await rm(directory, { recursive: true, force: true });
  }
});

test("failed Markdown publication retains completed raw evidence instead of overwriting another capture", async () => {
  const directory = await mkdtemp(join(tmpdir(), "uuid-slug-output-"));
  const destination = join(directory, "blocked.md");
  await mkdir(destination);
  const output = await openImplementationOutput(destination, header);
  try {
    await output.append(record);
    const failure = await output
      .publish("# Comparison\n\nResult.\n")
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(Error);
    const retained = await readCompressed(output.raw);
    expect(retained).toEndWith('{"complete":true}\n');
    expect(retained).toContain(JSON.stringify(record));
  } finally {
    await output.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("killing an acquiring process leaves the previous report and evidence unchanged", async () => {
  const directory = await mkdtemp(join(tmpdir(), "uuid-slug-output-"));
  const destination = join(directory, "comparison.md");
  const previousRaw = join(directory, "comparison.jsonl");
  await writeFile(destination, "Previous complete report");
  await writeFile(previousRaw, "Previous complete evidence");
  const child = Bun.spawn(
    [
      process.execPath,
      join(import.meta.dir, "implementation-output-interrupt.ts"),
      JSON.stringify({ destination, header, record }),
    ],
    { stdin: "pipe", stdout: "pipe", stderr: "pipe" },
  );
  const stderr = new Response(child.stderr).text();
  try {
    let ready = "";
    const decoder = new TextDecoder();
    for await (const chunk of child.stdout) {
      ready += decoder.decode(chunk, { stream: true });
      if (ready.includes("\n")) break;
    }
    if (!ready.includes("\n")) throw new Error(`Writer exited before capture: ${await stderr}`);
    child.kill("SIGKILL");
    await child.exited;
    expect(await readFile(destination, "utf8")).toBe("Previous complete report");
    expect(await readFile(previousRaw, "utf8")).toBe("Previous complete evidence");
    const attempted = await readCompressed(ready.trim());
    expect(attempted).toContain(JSON.stringify(record));
    expect(attempted).not.toContain('{"complete":true}');
  } finally {
    if (child.exitCode === null) child.kill("SIGKILL");
    await Promise.all([child.exited, stderr]);
    await rm(directory, { recursive: true, force: true });
  }
});
