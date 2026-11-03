// One serial scheduler owns process blocks, progress, retained observations and report regeneration.
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir, cpus, platform, arch } from "node:os";
import { join, resolve } from "node:path";
import { command } from "../scripts/command";
import { acquire } from "./implementation-host-acquire";
import { prepareImplementations } from "./implementation-build";
import { createImplementationReporter } from "./implementation-report";
import {
  collectorReceipt,
  openRecovery,
  randomSchedule,
  scheduledStep,
  validateRecovery,
} from "./implementation-recovery";
import type { RecoverableReport } from "./implementation-recovery";
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
const resumeIndex = args.indexOf("--resume");
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
  const resumeSource = resumeIndex >= 0 ? args[resumeIndex + 1] : undefined;
  if (
    (resumeIndex >= 0 && (!resumeSource || args.length !== 2)) ||
    (resumeIndex < 0 && args.some((arg) => arg !== "--smoke"))
  )
    throw new Error("Use --smoke, --resume raw-file or --report file [--baseline lane]");
  const recovery = resumeSource ? await openRecovery(resumeSource) : undefined;
  const smoke = recovery?.header.smoke ?? args.includes("--smoke");
  // Inherit the established comparison windows; smoke changes only acquisition depth.
  const settings: Settings = recovery?.header.settings ?? {
    samples: Number(process.env.UUID_SLUG_PROFILE_SAMPLES ?? (smoke ? 1 : 7)),
    duration: Number(process.env.UUID_SLUG_PROFILE_MS ?? (smoke ? 1 : 5)),
    warmup: Number(process.env.UUID_SLUG_PROFILE_WARMUP_MS ?? (smoke ? 2 : 16)),
    filter: process.env.UUID_SLUG_IMPLEMENTATION_FILTER ?? "",
    // Forty measured ticks put clock granularity below the report's coarse comparison precision.
    batchTicks: 40,
  };
  const blocks =
    recovery?.header.blocks ?? Number(process.env.UUID_SLUG_COMPARE_ROUNDS ?? (smoke ? 1 : 6));
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
    const receipt = await collectorReceipt();
    if (recovery) validateRecovery(recovery.header, report, receipt);
    const planned: RecoverableReport = {
      ...report,
      recovery: {
        ...receipt,
        schedule: recovery?.header.recovery.schedule ?? randomSchedule(lanes.length, blocks),
        ...(recovery
          ? {
              resumedFrom: {
                path: recovery.path,
                revision: recovery.header.revision,
                captured: recovery.header.captured,
              },
            }
          : {}),
      },
    };
    const reporter = createImplementationReporter(planned);
    // Append each capture once; rewriting the growing history makes checkpoint I/O quadratic.
    output = await openImplementationOutput(destination, planned);
    let sequence = 0;
    if (recovery)
      for await (const window of recovery.windows()) {
        // Validate the entire unit before copying it; never resume across an interrupted pair.
        for (const record of window) reporter.append(record);
        for (const record of window) {
          await output.append(record);
          sequence++;
        }
      }
    console.log(
      `Reused ${sequence} completed process captures; ${blocks * lanes.length * 4 - sequence} remain.`,
    );
    while (sequence < blocks * lanes.length * 4) {
      const step = scheduledStep(planned, sequence++);
      const selected = lanes.find((lane) => lane.id === step.lane);
      if (!selected) throw new Error(`Missing comparison lane: ${step.lane}`);
      console.log(
        `Block ${step.block + 1}/${blocks}: ${step.subject}; ${step.role} ${step.repeat + 1}`,
      );
      const capture = await acquire(selected, settings);
      const record: UnvalidatedMeasurement = { ...step, ...capture };
      // Persist once before admission so malformed output survives without becoming a completed report.
      await output.append(record);
      reporter.append(record);
    }
    const raw = await output.publish(reporter.render());
    console.log(`Report: ${destination}\nRaw observations: ${raw}`);
  } finally {
    // Successful observations keep hashes, counts and versions; disposable binaries do not need indefinite retention.
    await rm(directory, { recursive: true, force: true });
    await output?.close();
    await recovery?.close();
  }
}
