// One serial scheduler owns process blocks, progress, retained observations and report regeneration.
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir, cpus, platform, arch } from "node:os";
import { join, resolve } from "node:path";
import { randomInt } from "node:crypto";
import { command } from "../scripts/command";
import { acquire } from "./implementation-host-acquire";
import { prepareImplementations } from "./implementation-build";
import { comparisonWindow, createImplementationReporter } from "./implementation-report";
import type { ImplementationReport, UnvalidatedMeasurement } from "./implementation-report";
import type { Settings } from "./implementation-worker";
import {
  openImplementationOutput,
  readImplementationLines,
  resolveImplementationEvidence,
  writeImplementationReport,
} from "./implementation-output";

const root = process.cwd();
// Bun's implicit development condition otherwise outranks the published Node adapter.
process.env.NODE_ENV = "production";

const args = process.argv.slice(2);
const reportIndex = args.indexOf("--report");
const baselineIndex = args.indexOf("--baseline");
const destination = resolve(
  process.env.UUID_SLUG_IMPLEMENTATION_REPORT ?? "bench/results/implementations.md",
);
if (reportIndex >= 0) {
  const source = args[reportIndex + 1];
  if (!source) throw new Error("--report requires the Markdown report or its retained .jsonl file");
  const evidence = await resolveImplementationEvidence(source);
  let reporter: ReturnType<typeof createImplementationReporter> | undefined;
  let complete = false;
  for await (const line of readImplementationLines(evidence)) {
    if (complete) throw new Error("Unexpected data after acquisition completion");
    if (!reporter) reporter = createImplementationReporter(JSON.parse(line));
    else if (line === '{"complete":true}') complete = true;
    else reporter.append(JSON.parse(line));
  }
  if (!reporter || !complete)
    throw new Error(
      "Incomplete acquisition; rerun the comparison before publishing a final report.",
    );
  await writeImplementationReport(
    destination,
    reporter.render(baselineIndex >= 0 ? args[baselineIndex + 1] : undefined),
    evidence,
  );
  console.log(destination);
} else {
  if (args.some((arg) => arg !== "--smoke"))
    throw new Error("Use --smoke or --report file [--baseline lane]");
  const smoke = args.includes("--smoke");
  // Inherit the established comparison windows; smoke changes only acquisition depth.
  const settings: Settings = {
    samples: Number(process.env.UUID_SLUG_PROFILE_SAMPLES ?? (smoke ? 1 : 7)),
    duration: Number(process.env.UUID_SLUG_PROFILE_MS ?? (smoke ? 1 : 5)),
    warmup: Number(process.env.UUID_SLUG_PROFILE_WARMUP_MS ?? (smoke ? 2 : 16)),
    filter: process.env.UUID_SLUG_IMPLEMENTATION_FILTER ?? "",
    // Forty measured ticks put clock granularity below the report's coarse comparison precision.
    batchTicks: 40,
  };
  const blocks = Number(process.env.UUID_SLUG_COMPARE_ROUNDS ?? (smoke ? 1 : 6));
  if (
    !Number.isSafeInteger(blocks) ||
    blocks < 1 ||
    !Number.isSafeInteger(settings.samples) ||
    settings.samples < 1 ||
    !Number.isFinite(settings.duration) ||
    settings.duration <= 0 ||
    !Number.isFinite(settings.warmup) ||
    settings.warmup <= 0
  )
    throw new Error(
      "Blocks and batches must be positive integers; timing windows must be finite positive milliseconds",
    );
  const directory = await mkdtemp(join(tmpdir(), "uuid-slug-implementations-"));
  const report: Omit<ImplementationReport, "measurements"> = {
    revision: (await command("git", ["rev-parse", "HEAD"], root)).trim(),
    captured: new Date().toISOString(),
    host: `${platform()}/${arch()}; ${cpus()[0]?.model ?? "CPU unreported"}`,
    smoke,
    exposure: "randomized",
    runtimeReceipts: true,
    settings,
    blocks,
    lanes: [],
  };
  let output: Awaited<ReturnType<typeof openImplementationOutput>> | undefined;
  try {
    console.log("Preparing every implementation before timing...");
    const lanes = await prepareImplementations(directory, settings);
    report.lanes = lanes.map(({ environment: _environment, ...lane }) => lane);
    const reporter = createImplementationReporter(report);
    // Fix the small randomized schedule before timing; growing results cannot change exposure.
    const schedule = Array.from({ length: blocks }, () => {
      const order = [...lanes];
      for (const [index, lane] of order.entries()) {
        const swap = randomInt(index + 1);
        const previous = order[swap];
        if (!previous) throw new Error("Missing lane during exposure randomization");
        order[index] = previous;
        order[swap] = lane;
      }
      return order.map((lane) => ({ lane, steps: comparisonWindow(randomInt(2)) }));
    });
    // Append each capture once; rewriting the growing history makes checkpoint I/O quadratic.
    output = await openImplementationOutput(destination, report);
    let sequence = 0;
    for (const [block, windows] of schedule.entries()) {
      for (const { lane, steps } of windows) {
        const referenceId =
          lane.reference ??
          (lane.id.startsWith("ts/") ? "ts/node" : "rust/native/release/fast-rng");
        const reference = lanes.find((item) => item.id === referenceId);
        if (!reference) throw new Error(`Missing comparison reference: ${referenceId}`);
        for (const step of steps) {
          const selected = step.role === "candidate" ? lane : reference;
          console.log(`Block ${block + 1}/${blocks}: ${lane.id}; ${step.role} ${step.repeat + 1}`);
          const capture = await acquire(selected, settings);
          const record: UnvalidatedMeasurement = {
            lane: selected.id,
            subject: lane.id,
            block,
            repeat: step.repeat,
            role: step.role,
            sequence: sequence++,
            ...capture,
          };
          // Persist once before admission so malformed output survives without becoming a completed report.
          await output.append(record);
          reporter.append(record);
        }
      }
    }
    const raw = await output.publish(reporter.render());
    console.log(`Report: ${destination}\nRaw observations: ${raw}`);
  } finally {
    // Successful observations keep hashes, counts and versions; disposable binaries do not need indefinite retention.
    await rm(directory, { recursive: true, force: true });
    await output?.close();
  }
}
