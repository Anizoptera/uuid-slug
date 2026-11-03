// Reuse complete experimental windows without choosing observations from their timings.
import { createHash, randomInt } from "node:crypto";
import { hostname, release } from "node:os";
import { resolve } from "node:path";
import { comparisonWindow } from "./implementation-report";
import type { ImplementationReport, UnvalidatedMeasurement } from "./implementation-report";
import { readImplementationLines } from "./implementation-output";

type Header = Omit<ImplementationReport, "measurements">;
export interface RecoveryReceipt {
  collector: Record<string, string>;
  machine: string;
  // Each pair names a lane index and the ABBA/BAAB orientation, before any timing occurs.
  schedule: [number, number][][];
  resumedFrom?: { path: string; revision: string; captured: string };
}
export type RecoverableReport = Header & { recovery: RecoveryReceipt };

export async function collectorReceipt(): Promise<Pick<RecoveryReceipt, "collector" | "machine">> {
  // Discover imported collectors/builders, including generated-wrapper templates; artifact hashes
  // separately protect worker code. Report and scheduling edits do not change the instrument.
  const built = await Bun.build({
    entrypoints: ["bench/implementation-host-acquire.ts", "bench/implementation-build.ts"],
    target: "bun",
    packages: "external",
    metafile: true,
    check: true,
  });
  if (!built.success)
    throw new AggregateError(built.logs, "Cannot fingerprint benchmark collectors");
  if (!built.metafile) throw new Error("Collector build did not return its source inventory");
  const collector = Object.fromEntries(
    await Promise.all(
      Object.keys(built.metafile.inputs)
        // eslint-disable-next-line unicorn/no-array-sort -- This private list is newly allocated; ES2022 has no toSorted.
        .sort()
        .map(async (path) => [
          path,
          createHash("sha256")
            .update(await Bun.file(path).bytes())
            .digest("hex"),
        ]),
    ),
  );
  return { collector, machine: `${hostname()}; ${release()}; Bun ${Bun.version}` };
}

export function randomSchedule(lanes: number, blocks: number): RecoveryReceipt["schedule"] {
  return Array.from({ length: blocks }, () => {
    const order = Array.from({ length: lanes }, (_, index) => index);
    for (const [index, lane] of order.entries()) {
      const swap = randomInt(index + 1);
      const previous = order[swap];
      if (previous === undefined) throw new Error("Missing lane during exposure randomization");
      order[index] = previous;
      order[swap] = lane;
    }
    return order.map((lane) => [lane, randomInt(2)]);
  });
}

export function validateRecovery(
  report: RecoverableReport,
  current: Header,
  receipt: Pick<RecoveryReceipt, "collector" | "machine">,
): void {
  // Scratch paths differ on rebuild; compare only semantic lane identity and the actual artifact.
  const identity = (header: Header) => ({
    host: header.host,
    smoke: header.smoke,
    settings: header.settings,
    blocks: header.blocks,
    lanes: header.lanes.map(
      ({
        id,
        family,
        version,
        hash,
        reference,
        requiresEntropy,
        requiresRuntimeVersion,
        nativeTransport,
      }) => ({
        id,
        family,
        version,
        hash,
        reference,
        requiresEntropy,
        requiresRuntimeVersion,
        nativeTransport,
      }),
    ),
  });
  if (
    JSON.stringify(identity(report)) !== JSON.stringify(identity(current)) ||
    report.recovery.machine !== receipt.machine ||
    JSON.stringify(report.recovery.collector) !== JSON.stringify(receipt.collector)
  )
    throw new Error(
      "Resume inputs changed: require identical collectors, artifacts, versions, host and settings; keep the old evidence and start a separate comparison.",
    );
  const { schedule } = report.recovery;
  if (
    schedule.length !== report.blocks ||
    schedule.some(
      (windows) =>
        windows.length !== report.lanes.length ||
        new Set(windows.map(([lane]) => lane)).size !== report.lanes.length ||
        windows.some(
          ([lane, orientation]) =>
            !Number.isSafeInteger(lane) ||
            lane < 0 ||
            lane >= report.lanes.length ||
            (orientation !== 0 && orientation !== 1),
        ),
    )
  )
    throw new Error(
      "Invalid saved schedule: each block must contain every lane once with a valid orientation.",
    );
}

export function scheduledStep(report: RecoverableReport, sequence: number) {
  const window = Math.floor(sequence / 4);
  const block = Math.floor(window / report.lanes.length);
  const selection = report.recovery.schedule[block]?.[window % report.lanes.length];
  const lane = selection && report.lanes[selection[0]];
  const step = selection && comparisonWindow(selection[1])[sequence % 4];
  if (!lane || !step) throw new Error("Observation exceeds the saved acquisition schedule");
  const reference =
    lane.reference ?? (lane.id.startsWith("ts/") ? "ts/node" : "rust/native/release/fast-rng");
  return {
    lane: step.role === "candidate" ? lane.id : reference,
    subject: lane.id,
    block,
    ...step,
    sequence,
  };
}

export function requireScheduledRecord(
  report: RecoverableReport,
  record: UnvalidatedMeasurement,
  sequence: number,
): void {
  const expected = scheduledStep(report, sequence);
  if (
    Object.entries(expected).some(
      ([key, value]) => record[key as keyof UnvalidatedMeasurement] !== value,
    )
  )
    throw new Error(
      "Observation does not match the saved schedule; never reorder or skip measurements during recovery.",
    );
}

export async function openRecovery(source: string) {
  const path = resolve(source);
  const lines = readImplementationLines(path);
  const first = await lines.next();
  if (first.done) throw new Error("Cannot resume empty evidence");
  const header: RecoverableReport = JSON.parse(first.value);
  if (!header.recovery) {
    await lines.return(undefined);
    throw new Error(
      "This capture has no collector receipt or saved schedule; source-check and migrate it separately before recovery.",
    );
  }
  return {
    path,
    header,
    async *windows() {
      let sequence = 0;
      let pending: UnvalidatedMeasurement[] = [];
      for await (const line of lines) {
        if (line === '{"complete":true}')
          throw new Error("Capture is already complete; use --report instead of --resume.");
        const record: UnvalidatedMeasurement = JSON.parse(line);
        requireScheduledRecord(header, record, sequence++);
        pending.push(record);
        if (pending.length === 4) {
          yield pending;
          pending = [];
        }
      }
      // Only an unfinished final window is discarded; no timing value affects admission.
    },
    close: () => lines.return(undefined),
  };
}
