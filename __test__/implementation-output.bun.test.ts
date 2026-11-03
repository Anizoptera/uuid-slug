// Real filesystem failures and process death must preserve completed benchmark evidence.
import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { readdirSync } from "node:fs";
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
import { createImplementationReporter } from "../bench/implementation-report";
import { openRecovery, scheduledStep, validateRecovery } from "../bench/implementation-recovery";
import type { RecoverableReport } from "../bench/implementation-recovery";

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

const resumable: RecoverableReport = {
  ...header,
  exposure: "randomized",
  lanes: ["first", "second"].map((id) => ({
    id,
    family: "fixture",
    version: "1",
    hash: id,
    requiresRuntimeVersion: false,
    reference: "first",
  })),
  recovery: {
    collector: { "collector.ts": "source hash" },
    machine: "fixture",
    schedule: [
      [
        [1, 1],
        [0, 0],
      ],
    ],
  },
};

test("recovery keeps complete windows and reacquires the interrupted window in its saved order", async () => {
  const directory = await mkdtemp(join(tmpdir(), "uuid-slug-output-"));
  const source = join(directory, "partial.jsonl.gz");
  const records = Array.from({ length: 6 }, (_, sequence) => ({
    ...record,
    ...scheduledStep(resumable, sequence),
  }));
  try {
    await writeFile(
      source,
      gzipSync([resumable, ...records].map((value) => JSON.stringify(value)).join("\n")),
    );
    const recovered = await openRecovery(source);
    try {
      validateRecovery(recovered.header, resumable, resumable.recovery);
      expect((await Array.fromAsync(recovered.windows())).flat()).toEqual(records.slice(0, 4));
      expect(scheduledStep(recovered.header, 4)).toMatchObject({
        subject: "first",
        role: "reference",
        repeat: 0,
      });
    } finally {
      await recovered.close();
    }
    const wrongOrder = [...records];
    wrongOrder[1] = { ...record, ...scheduledStep(resumable, 2) };
    await writeFile(
      source,
      gzipSync([resumable, ...wrongOrder].map((value) => JSON.stringify(value)).join("\n")),
    );
    const corrupt = await openRecovery(source);
    try {
      const failure = await Array.fromAsync(corrupt.windows()).catch((error: unknown) => error);
      expect(failure).toBeInstanceOf(Error);
      expect(String(failure)).toContain("saved schedule");
    } finally {
      await corrupt.close();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("recovery rejects changed instruments and repeated or missing scheduled lanes", () => {
  const current = structuredClone(resumable);
  expect(() => validateRecovery(resumable, current, resumable.recovery)).not.toThrow();
  const changes: ((value: RecoverableReport) => void)[] = [
    (value) => {
      value.host = "another host";
    },
    (value) => {
      value.settings.samples++;
    },
    (value) => {
      value.blocks++;
    },
    (value) => {
      if (value.lanes[0]) value.lanes[0].hash = "another artifact";
    },
    (value) => {
      if (value.lanes[0]) value.lanes[0].version = "another runtime";
    },
  ];
  for (const change of changes) {
    const changed = structuredClone(current);
    change(changed);
    expect(() => validateRecovery(resumable, changed, resumable.recovery)).toThrow(
      "Resume inputs changed",
    );
  }
  expect(() =>
    validateRecovery(resumable, current, { ...resumable.recovery, machine: "other" }),
  ).toThrow("Resume inputs changed");
  expect(() =>
    validateRecovery(resumable, current, {
      ...resumable.recovery,
      collector: { "collector.ts": "changed" },
    }),
  ).toThrow("Resume inputs changed");
  const duplicate = structuredClone(resumable);
  duplicate.recovery.schedule = [
    [
      [0, 0],
      [0, 1],
    ],
  ];
  expect(() => validateRecovery(duplicate, current, resumable.recovery)).toThrow(
    "Invalid saved schedule",
  );
});

test("older copied attempts cannot bypass source-validation provenance", async () => {
  const directory = await mkdtemp(join(tmpdir(), "uuid-slug-output-"));
  const source = join(directory, "copied.jsonl.gz");
  let opened: Awaited<ReturnType<typeof openRecovery>> | undefined;
  try {
    const copied: RecoverableReport = {
      ...resumable,
      recovery: {
        ...resumable.recovery,
        resumedFrom: { path: "original.jsonl.gz", revision: "original", captured: "original" },
      },
    };
    await writeFile(source, gzipSync(`${JSON.stringify(copied)}\n`));
    const failure = await openRecovery(source)
      .then((input) => {
        opened = input;
        return input;
      })
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(Error);
    expect(String(failure)).toContain("source-validation receipt");
  } finally {
    await opened?.close();
    await rm(directory, { recursive: true, force: true });
  }
});

async function readCompressed(path: string): Promise<string> {
  // The independent Node decoder checks the writer separately from the streaming report reader.
  return gunzipSync(await readFile(path)).toString("utf8");
}

test("failed recovery cannot retain recompressed records from an unchecked gzip trailer", async () => {
  const directory = await mkdtemp(join(tmpdir(), "uuid-slug-output-"));
  const source = join(directory, "source.jsonl.gz");
  const destination = join(directory, "comparison.md");
  const records = Array.from({ length: 4 }, (_, sequence) => ({
    ...record,
    ...scheduledStep(resumable, sequence),
  }));
  const prefix = gzipSync(
    [resumable, ...records.slice(0, -1)].map((value) => JSON.stringify(value)).join("\n") + "\n",
  );
  const last = gzipSync(`${JSON.stringify(records.at(-1))}\n`);
  const damaged = Buffer.concat([prefix, last.subarray(0, -8)]);
  const planned: RecoverableReport = {
    ...resumable,
    recovery: {
      ...resumable.recovery,
      resumedFrom: { path: source, revision: resumable.revision, captured: resumable.captured },
    },
  };
  try {
    await writeFile(source, damaged);
    await writeFile(destination, "previous report\n");
    const input = await openRecovery(source);
    try {
      const failure = await openImplementationOutput(destination, planned, {
        source: input,
        admit: createImplementationReporter(planned).append,
      }).catch((error: unknown) => error);
      expect(failure).toBeInstanceOf(Error);
      expect(await readFile(source)).toEqual(damaged);
      expect(await readFile(destination, "utf8")).toBe("previous report\n");
      expect(new Set(await readdir(directory))).toEqual(
        new Set(["source.jsonl.gz", "comparison.md"]),
      );
    } finally {
      await input.close();
    }

    // Restore only the missing trailer on the same input; metadata and admission stay unchanged.
    await writeFile(source, Buffer.concat([prefix, last]));
    const valid = await openRecovery(source);
    try {
      const output = await openImplementationOutput(destination, planned, {
        source: valid,
        admit: createImplementationReporter(planned).append,
      });
      try {
        expect(output.reused).toBe(4);
        expect(
          (await readCompressed(output.raw))
            .trimEnd()
            .split("\n")
            .slice(1)
            .map((line) => JSON.parse(line)),
        ).toEqual(records);
        const resumed = await openRecovery(output.raw);
        try {
          expect((await Array.fromAsync(resumed.windows())).flat()).toEqual(records);
        } finally {
          await resumed.close();
        }
      } finally {
        await output.close();
      }
    } finally {
      await valid.close();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("a copied prefix stays private until every source window passes admission", async () => {
  const directory = await mkdtemp(join(tmpdir(), "uuid-slug-output-"));
  const source = join(directory, "source.jsonl.gz");
  const destination = join(directory, "comparison.md");
  const records = Array.from({ length: 8 }, (_, sequence) => ({
    ...record,
    ...scheduledStep(resumable, sequence),
  }));
  const last = records.at(-1);
  if (!last) throw new Error("Missing rejection fixture");
  // Control rows share storage; only the final record may change.
  last.rows = last.rows.map((row) => Object.assign({}, row, { ns: [0] }));
  try {
    await writeFile(
      source,
      gzipSync([resumable, ...records].map((value) => JSON.stringify(value)).join("\n")),
    );
    await writeFile(destination, "previous report\n");
    const input = await openRecovery(source);
    const reporter = createImplementationReporter(resumable);
    let admitted = 0;
    let visible: string[] | undefined;
    try {
      const failure = await openImplementationOutput(
        destination,
        {
          ...resumable,
          recovery: {
            ...resumable.recovery,
            resumedFrom: {
              path: source,
              revision: resumable.revision,
              captured: resumable.captured,
            },
          },
        },
        {
          source: input,
          admit(value) {
            reporter.append(value);
            // The first window has finished writing when the next window reaches admission.
            if (++admitted === 5) visible = readdirSync(directory);
          },
        },
      ).catch((error: unknown) => error);
      expect(failure).toBeInstanceOf(Error);
      expect(visible).toBeDefined();
      expect(new Set(visible)).toEqual(new Set(["source.jsonl.gz", "comparison.md"]));
      expect(new Set(await readdir(directory))).toEqual(new Set(visible));
      expect(await readFile(destination, "utf8")).toBe("previous report\n");
    } finally {
      await input.close();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

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
