// Render paired process evidence without turning scheduling noise into a league table.
import { medianConfidence95, medianRatio, sampleMedian } from "./statistics";
import type { Lane } from "./implementation-build";
import type { Observation, Settings } from "./implementation-worker";
import type { EntropyEvidence } from "./implementation-entropy";
import {
  validateEntropyEvidence,
  validateExecutionReceipt,
  validateRows,
} from "./implementation-evidence";
import type { ExecutionReceipt } from "./implementation-evidence";
import type { RecoveryReceipt } from "./implementation-recovery";

export interface Measurement extends ExecutionReceipt {
  lane: string;
  subject: string;
  role: "candidate" | "reference";
  sequence: number;
  rows: Observation[];
  block: number;
  repeat: number;
  entropy?: EntropyEvidence;
}

export type UnvalidatedMeasurement = Omit<
  Measurement,
  "rows" | "entropy" | keyof ExecutionReceipt
> & {
  rows: unknown;
  entropy?: unknown;
} & { [Key in keyof ExecutionReceipt]?: unknown };

export function comparisonWindow(block: number): readonly Pick<Measurement, "role" | "repeat">[] {
  const reference = { role: "reference", repeat: 0 } as const;
  const candidate = { role: "candidate", repeat: 0 } as const;
  return block % 2
    ? [candidate, reference, { ...reference, repeat: 1 }, { ...candidate, repeat: 1 }]
    : [reference, candidate, { ...candidate, repeat: 1 }, { ...reference, repeat: 1 }];
}
export interface ImplementationReport {
  revision: string;
  captured: string;
  host: string;
  smoke: boolean;
  exposure?: "randomized";
  runtimeReceipts?: boolean;
  recovery?: RecoveryReceipt;
  settings: Settings;
  blocks: number;
  lanes: Pick<
    Lane,
    | "id"
    | "family"
    | "version"
    | "hash"
    | "reference"
    | "requiresEntropy"
    | "requiresRuntimeVersion"
    | "nativeTransport"
  >[];
  measurements: Measurement[];
}

function cell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}
function table(rows: string[][]): string {
  return rows.map((row) => `| ${row.map(cell).join(" | ")} |`).join("\n");
}

const number = (value: number) => Number(value.toPrecision(2)).toString();

function ratio(values: number[]): string {
  const median = medianRatio(values);
  const interval = medianConfidence95(values);
  // Two significant figures suppress digits that suggest precision these small process samples lack.
  return `${number(median)}×${interval ? ` [${number(interval[0])}–${number(interval[1])}]${interval[0] <= 1 && interval[1] >= 1 ? " unresolved" : ""}` : " [?]"}`;
}

export function createImplementationReporter(report: Omit<ImplementationReport, "measurements">) {
  if (
    !Number.isSafeInteger(report.blocks) ||
    report.blocks < 1 ||
    !Number.isSafeInteger(report.settings.samples) ||
    report.settings.samples < 1 ||
    (report.runtimeReceipts !== undefined && typeof report.runtimeReceipts !== "boolean") ||
    !report.lanes.length ||
    new Set(report.lanes.map((lane) => lane.id)).size !== report.lanes.length
  )
    throw new Error("Invalid comparison dimensions; regenerate from a complete benchmark run.");
  for (const lane of report.lanes) {
    if (report.runtimeReceipts === true && typeof lane.requiresRuntimeVersion !== "boolean")
      throw new Error(
        "Missing execution-time version policy; retain each host's receipt capability in the report header.",
      );
    if (
      (lane.id.startsWith("ts/") && lane.requiresEntropy !== true) ||
      // Application lanes include generation; direct transport lanes convert fixed UUID inputs only.
      (lane.id.startsWith("rust/wasm32-unknown-unknown/") &&
        typeof lane.requiresEntropy !== "boolean")
    )
      throw new Error("Missing secure-source qualification policy for JavaScript host lane.");
  }
  // Raw batches and calibration belong on disk; each process median is computed only once.
  const indexed = new Map<string, Map<string, number>>();
  const inventory = new Map<string, readonly string[]>();
  // Intern ordered lists for exact, constant-time context checks without delimiter collisions.
  const workloads = new Map<string, readonly string[]>();
  const windows = new Map<number, { identity: string; orientation: number }>();
  let sequence = 0;
  function append(record: UnvalidatedMeasurement): void {
    const actual = report.lanes.find((lane) => lane.id === record.lane);
    const subject = report.lanes.find((lane) => lane.id === record.subject);
    const reference =
      subject?.reference ??
      (record.subject.startsWith("ts/") ? "ts/node" : "rust/native/release/fast-rng");
    if (
      !actual ||
      !subject ||
      (record.role !== "candidate" && record.role !== "reference") ||
      !Number.isSafeInteger(record.block) ||
      record.block < 0 ||
      record.block >= report.blocks ||
      (record.repeat !== 0 && record.repeat !== 1)
    )
      throw new Error("Unexpected measurement identity");
    const rows = validateRows(record.rows, report.settings.samples);
    if (actual.requiresEntropy !== undefined)
      validateEntropyEvidence(record.entropy, actual.requiresEntropy);
    // Legacy captures have no receipts; current producers must retain the independent host evidence.
    const requireRuntimeVersion = report.runtimeReceipts === true && actual.requiresRuntimeVersion;
    validateExecutionReceipt(record, actual, requireRuntimeVersion);
    if (record.lane !== (record.role === "candidate" ? record.subject : reference))
      throw new Error("Comparison used the wrong reference artifact");
    const key = `${record.subject}:${record.block}:${record.repeat}:${record.role}`;
    if (indexed.has(key)) throw new Error(`Duplicate process: ${key}`);
    if (record.sequence !== sequence++)
      throw new Error(
        "Process acquisition order is missing or changed; regenerate from a complete current benchmark run.",
      );
    const window = Math.floor(record.sequence / 4);
    const identity = `${record.subject}:${record.block}`;
    const orientation =
      windows.get(window)?.orientation ??
      (report.exposure === "randomized" ? Number(record.role === "candidate") : record.block);
    const expected = comparisonWindow(orientation)[record.sequence % 4];
    if (
      expected?.role !== record.role ||
      expected.repeat !== record.repeat ||
      (windows.has(window) && windows.get(window)?.identity !== identity)
    )
      throw new Error("Unbalanced acquisition window; retain adjacent ABBA/BAAB process order.");
    windows.set(window, { identity, orientation });
    const inventoryKey = `${record.subject}:${record.role}`;
    const prior = inventory.get(inventoryKey);
    if (
      prior !== undefined &&
      (prior.length !== rows.length || rows.some((row, index) => row.name !== prior[index]))
    )
      throw new Error(`Workload changed between processes: ${record.lane}`);
    if (prior === undefined) {
      const names = rows.map((row) => row.name);
      const workloadKey = JSON.stringify(names);
      const shared = workloads.get(workloadKey) ?? names;
      if (shared === names) workloads.set(workloadKey, names);
      inventory.set(inventoryKey, shared);
    }
    indexed.set(key, new Map(rows.map((row) => [row.name, sampleMedian(row.ns)])));
  }
  const read = (lane: string, block: number, repeat: number, name: string, role = "candidate") =>
    indexed.get(`${lane}:${block}:${repeat}:${role}`)?.get(name);
  const localRatio = (lane: string, block: number, name: string): number | undefined => {
    const before = read(lane, block, 0, name, "reference");
    const after = read(lane, block, 1, name, "reference");
    const first = read(lane, block, 0, name);
    const second = read(lane, block, 1, name);
    return before === undefined ||
      after === undefined ||
      first === undefined ||
      second === undefined
      ? undefined
      : Math.sqrt((first / before) * (second / after));
  };
  const native = report.lanes.find((lane) => lane.id === "rust/native/release/fast-rng");
  const bridge = report.lanes.find((lane) => lane.id === "cross-language/rust-native");
  const matchedBridge =
    native &&
    bridge &&
    bridge.hash === native.hash &&
    bridge.version === native.version &&
    bridge.reference === "ts/node";
  const normalized = (
    lane: string,
    block: number,
    name: string,
  ): { referenceLane: string; cost: number } | undefined => {
    if (read(lane, block, 0, name) === undefined) return undefined;
    if (lane === "ts/node") return { referenceLane: lane, cost: 1 };
    const reference =
      report.lanes.find((item) => item.id === lane)?.reference ??
      (lane.startsWith("ts/") ? "ts/node" : "rust/native/release/fast-rng");
    // A different preceding job sequence can change VM state despite the same timed operation name.
    const sameReferenceContext =
      inventory.get(`${lane}:reference`) === inventory.get(`${reference}:candidate`);
    if (lane === "rust/native/release/fast-rng") {
      const anchor =
        matchedBridge &&
        inventory.get("cross-language/rust-native:candidate") === inventory.get(`${lane}:candidate`)
          ? normalized("cross-language/rust-native", block, name)?.cost
          : undefined;
      const direct =
        anchor ??
        (reference === "ts/node" && sameReferenceContext
          ? localRatio(lane, block, name)
          : undefined);
      return direct === undefined
        ? { referenceLane: lane, cost: 1 }
        : { referenceLane: "ts/node", cost: direct };
    }
    if (!sameReferenceContext) return undefined;
    // Transport callers form their own measured component rather than borrowing a native loop's scale.
    if (reference === lane) return { referenceLane: lane, cost: 1 };
    const value = localRatio(lane, block, name);
    if (value === undefined) return undefined;
    // Keep the scale with the cost: disconnected reference graphs cannot imply equal timings.
    if (reference === "ts/node") return { referenceLane: reference, cost: value };
    if (reference !== "rust/native/release/fast-rng") {
      const root = report.lanes.find((item) => item.id === reference);
      return root?.reference === reference ? { referenceLane: reference, cost: value } : undefined;
    }
    const base = normalized(reference, block, name);
    return base && { referenceLane: base.referenceLane, cost: value * base.cost };
  };
  function render(baseline = "ts/node"): string {
    const blocks = report.blocks;
    if (!report.lanes.some((lane) => lane.id === baseline))
      throw new Error(`Unknown reference lane: ${baseline}`);
    for (const lane of report.lanes)
      for (let block = 0; block < blocks; block++)
        for (let repeat = 0; repeat < 2; repeat++) {
          for (const role of ["candidate", "reference"])
            if (!indexed.has(`${lane.id}:${block}:${repeat}:${role}`))
              throw new Error(`Missing process: ${lane.id}/${block}/${repeat}/${role}`);
        }
    const referenceOrder = [
      ...new Set([
        baseline,
        "ts/node",
        "rust/native/release/fast-rng",
        ...report.lanes.filter((lane) => lane.reference === lane.id).map((lane) => lane.id),
        ...report.lanes.map((lane) => lane.id),
      ]),
    ];
    const references = new Map<string, string | undefined>();
    const referenceForJob = (name: string) => {
      if (!references.has(name))
        references.set(
          name,
          referenceOrder.find((lane) => normalized(lane, 0, name) !== undefined),
        );
      return references.get(name);
    };
    const relative = (lane: string, name: string): string => {
      if (read(lane, 0, 0, name) === undefined) return "unavailable";
      const reference = referenceForJob(name);
      const value = normalized(lane, 0, name);
      const against = reference && normalized(reference, 0, name);
      if (!value || !against || value.referenceLane !== against.referenceLane) return "uncompared";
      if (lane === reference) return "reference";
      return ratio(
        Array.from({ length: blocks }, (_, block) => {
          const candidate = normalized(lane, block, name);
          const control = normalized(reference, block, name);
          if (!candidate || !control || candidate.referenceLane !== control.referenceLane)
            throw new Error(`Comparison lost its measured reference: ${lane}/${name}/${block}`);
          return candidate.cost / control.cost;
        }),
      );
    };
    const lines = [
      "# Implementation comparisons",
      "",
      `Captured ${report.captured}; revision \`${report.revision}\`; host ${report.host}.`,
      ...(report.recovery?.resumedFrom
        ? [
            "",
            `Collection resumed from ${report.recovery.resumedFrom.captured} at revision \`${report.recovery.resumedFrom.revision}\`. Complete four-process windows were reused after collector, artifact, runtime and host checks; the interrupted window was reacquired. A pause can change host conditions, so common-distribution assumptions remain conditional.`,
          ]
        : []),
      "",
      report.smoke
        ? "**Wiring check only. These samples are not performance evidence.**"
        : "Relative batch cost: smaller is faster. Brackets are distribution-free 95% intervals for the median of paired fresh-process ratios, conditional on independent blocks drawn from a common comparison distribution. They are not per-call latency percentiles or simultaneous confidence across the whole report.",
      ...(report.runtimeReceipts
        ? [
            "",
            "Raw captures retain execution-time host versions and native transport selections where available; other versions come from the selected executable or compiler records.",
          ]
        : []),
      "",
      `Requested reference: \`${baseline}\`. Each job names its actual reference: the requested lane when available, otherwise Node, native release Rust, a measured component root, then another connected measured lane. Each comparison runs reference/candidate/candidate/reference or the reverse. ${report.exposure === "randomized" ? "Lane order within each block and each window's orientation were independently randomized before timing." : "Windows reverse in alternate blocks; lane exposure was not randomized."} Ratios combine the two neighboring pairs geometrically. Native Rust connects to Node only through a matching artifact, version record and ordered workload. ${blocks} fresh-process blocks, ${report.settings.samples} batches per process. A missing interval is unresolved. Retained JSON Lines keep every batch and acquisition order.`,
      "",
      "Rust application rows time complete compiled calls with result consumption in the native or WASM loop; they exclude a JS crossing per identifier. JS rows include their result witness and errors-as-values checks. Rust owns fixed-array values where JavaScript owns heap arrays. These are consumer-path comparisons, not isolated language or compiler effects. No overall winner is calculated.",
      ...(report.lanes.some((lane) => lane.id.startsWith("transport/"))
        ? [
            "",
            "Per-call transport rows include one real native or WebAssembly crossing for each UUID, text parsing and owned base64url string output, checked against the same JavaScript text-to-slug job. They exclude JSON dispatch. Native libraries and WASM bindings are development-only and are not shipped in the npm package; Bun prefers FFI and Node prefers Node-API. Forced alternative rows measure fallback capabilities, not a recommendation to change those defaults.",
          ]
        : []),
      "",
      "JavaScript graphs are warmed and minified. Rust uses release optimization level 3, ThinLTO and one code-generation unit, with native CPU tuning for this machine; WASM then uses the maintained Binaryen O2 pipeline. Debug and disabled-JIT runs are excluded. Browser workers use cross-origin isolation. “Unavailable” means no measured result for that job in the lane; it does not establish missing API support. “Uncompared” means a measured result lacks a connection to the reference under matching conditions. Neither means zero cost. Installed Node patches are represented by the newest installed patch per major plus the checkout's selected Node.",
      "",
      "workerd labels identify requested compatibility settings, not an absence of Node APIs. These are local workerd measurements, not deployed Workers latency. Warm-up executes real work before sampling; it does not prove a globally optimal compiler or JIT state.",
      "",
      "Browser OS entropy without std uses a harness-selected getrandom JS backend; the product's std feature stays disabled. Reduced and std-only browser builds retain operations that need no entropy. Native results cover this host only; other operating systems and CPU architectures are not measured by this run.",
      "",
      "## Common caller jobs",
      "",
    ];
    // This short view lets readers compare languages without hunting the same row across families.
    const common = [
      "generation/v7/text",
      "plain/base64",
      "plain/base32",
      "mask/binary/owned",
      "unmask/binary/owned",
    ].filter((name) => report.lanes.some((lane) => read(lane.id, 0, 0, name) !== undefined));
    lines.push(
      table([
        ["Lane", ...common],
        ["---", ...common.map(() => "---:")],
        ["Reference", ...common.map((name) => referenceForJob(name) ?? "none")],
        ...report.lanes
          .filter(
            (lane) =>
              lane.family !== "Cross-language anchor" &&
              common.some((name) => read(lane.id, 0, 0, name) !== undefined),
          )
          .map((lane) => [lane.id].concat(common.map((name) => relative(lane.id, name)))),
      ]),
      "",
      "## Runtime and control evidence",
      "",
    );
    const controls = [
      ["Lane", "Runtime", "SHA-256 prefix", "A/A repeat ratio, median [95% interval]"],
      ["---", "---", "---", "---"],
    ];
    for (const lane of report.lanes) {
      const names = inventory.get(`${lane.id}:candidate`) ?? [];
      // Report the most displaced job, not a cross-job average that could cancel drift.
      let worst = { name: "", distance: -1, values: [] as number[] };
      for (const name of names) {
        const values = Array.from(
          { length: blocks },
          (_, block) =>
            (read(lane.id, block, 1, name) as number) / (read(lane.id, block, 0, name) as number),
        );
        const distance = Math.abs(Math.log(medianRatio(values)));
        if (distance > worst.distance) worst = { name, distance, values };
      }
      const version = [
        lane.version.split("\n")[0],
        lane.version.split("\n").find((line) => line.startsWith("Host:")),
      ]
        .filter(Boolean)
        .join("; ");
      controls.push([
        lane.id,
        version,
        lane.hash.slice(0, 12),
        `${ratio(worst.values)}; ${worst.name}`,
      ]);
    }
    lines.push(
      table(controls),
      "",
      "A/A uses identical artifacts in separate processes. Its worst median displacement exposes unstable jobs; it is not a correction factor. Inspect the retained per-job repeats before attributing a small gap to implementation. Host load can affect implementations differently, so order balancing and controls reduce confounding but cannot remove it.",
    );
    const families = [...new Set(report.lanes.map((lane) => lane.family))];
    for (const family of families) {
      const lanes = report.lanes.filter((lane) => lane.family === family);
      const names = [
        ...new Set(lanes.flatMap((lane) => inventory.get(`${lane.id}:candidate`) ?? [])),
        // eslint-disable-next-line unicorn/no-array-sort -- Sort a private list under the ES2022 library floor.
      ].sort();
      lines.push("", `## ${family}`, "");
      if (family === "Per-call transports") {
        // Many implementations of one job belong on rows, so results fit an ordinary viewport.
        for (const name of names)
          lines.push(
            `### ${name}`,
            "",
            table([
              ["Lane", "Reference", "Relative cost"],
              ["---", "---", "---:"],
              ...lanes.map((lane) => [
                lane.id,
                referenceForJob(name) ?? "none",
                relative(lane.id, name),
              ]),
            ]),
            "",
          );
        continue;
      }
      const rows = [
        ["Caller job", "Reference", ...lanes.map((lane) => lane.id)],
        ["---", "---", ...lanes.map(() => "---:")],
      ];
      for (const name of names)
        rows.push([
          name,
          referenceForJob(name) ?? "none",
          ...lanes.map((lane) => relative(lane.id, name)),
        ]);
      lines.push(table(rows));
    }
    return `${lines.join("\n")}\n`;
  }
  return { append, render };
}

export function renderImplementationReport(
  report: ImplementationReport,
  baseline = "ts/node",
): string {
  const reporter = createImplementationReporter(report);
  for (const record of report.measurements) reporter.append(record);
  return reporter.render(baseline);
}
