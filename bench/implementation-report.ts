// Render paired process evidence without turning scheduling noise into a league table.
import { medianConfidence95, sampleMedian } from "./statistics";
import type { Lane } from "./implementation-build";
import type { Observation, Settings } from "./implementation-worker";

export interface Measurement {
  lane: string;
  subject: string;
  role: "candidate" | "reference";
  sequence: number;
  rows: Observation[];
  block: number;
  repeat: number;
}

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
  settings: Settings;
  blocks: number;
  lanes: Pick<Lane, "id" | "family" | "version" | "hash" | "reference" | "filter">[];
  measurements: Measurement[];
}

export function validateRows(input: unknown, samples: number): Observation[] {
  if (!Array.isArray(input) || !input.length) throw new Error("Empty benchmark lane");
  const names = new Set<string>();
  return input.map((row: unknown) => {
    if (
      !row ||
      typeof row !== "object" ||
      !("name" in row) ||
      typeof row.name !== "string" ||
      !row.name ||
      names.has(row.name) ||
      !("ns" in row) ||
      !Array.isArray(row.ns) ||
      row.ns.length !== samples ||
      !row.ns.every(
        (value: unknown) => typeof value === "number" && Number.isFinite(value) && value > 0,
      ) ||
      !("operations" in row) ||
      typeof row.operations !== "number" ||
      !Number.isSafeInteger(row.operations) ||
      row.operations <= 0
    )
      throw new Error("Malformed or duplicate benchmark observation");
    names.add(row.name);
    const calibration: NonNullable<Observation["calibration"]> = [];
    if ("calibration" in row) {
      if (!Array.isArray(row.calibration)) throw new Error("Malformed calibration evidence");
      for (const attempt of row.calibration) {
        if (
          !attempt ||
          typeof attempt !== "object" ||
          !("count" in attempt) ||
          typeof attempt.count !== "number" ||
          !Number.isSafeInteger(attempt.count) ||
          attempt.count < 1 ||
          !("elapsedMs" in attempt) ||
          typeof attempt.elapsedMs !== "number" ||
          !Number.isFinite(attempt.elapsedMs) ||
          attempt.elapsedMs < 0
        )
          throw new Error("Malformed calibration attempt");
        calibration.push({ count: attempt.count, elapsedMs: attempt.elapsedMs });
      }
    }
    const clocks: Pick<Observation, "clockQuantumMs" | "targetBatchMs"> = {};
    if ("clockQuantumMs" in row) {
      if (
        typeof row.clockQuantumMs !== "number" ||
        !Number.isFinite(row.clockQuantumMs) ||
        row.clockQuantumMs <= 0
      )
        throw new Error("Invalid clock quantum");
      clocks.clockQuantumMs = row.clockQuantumMs;
    }
    if ("targetBatchMs" in row) {
      if (
        typeof row.targetBatchMs !== "number" ||
        !Number.isFinite(row.targetBatchMs) ||
        row.targetBatchMs <= 0
      )
        throw new Error("Invalid batch target");
      clocks.targetBatchMs = row.targetBatchMs;
    }
    return { name: row.name, ns: row.ns, operations: row.operations, calibration, ...clocks };
  });
}

function cell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}
function table(rows: string[][]): string {
  return rows.map((row) => `| ${row.map(cell).join(" | ")} |`).join("\n");
}

const number = (value: number) => Number(value.toPrecision(2)).toString();

function ratio(values: number[]): string {
  const median = sampleMedian(values);
  const interval = medianConfidence95(values);
  // Two significant figures suppress digits that suggest precision these small process samples lack.
  return `${number(median)}×${interval ? ` [${number(interval[0])}–${number(interval[1])}]` : " [?]"}`;
}

export function renderImplementationReport(
  report: ImplementationReport,
  baseline = "ts/node",
): string {
  if (
    !Number.isSafeInteger(report.blocks) ||
    report.blocks < 1 ||
    !Number.isSafeInteger(report.settings.samples) ||
    report.settings.samples < 1 ||
    !report.lanes.length ||
    new Set(report.lanes.map((lane) => lane.id)).size !== report.lanes.length
  )
    throw new Error("Invalid comparison dimensions; regenerate from a complete benchmark run.");
  if (!report.lanes.some((lane) => lane.id === baseline))
    throw new Error(`Unknown reference lane: ${baseline}`);
  const indexed = new Map<string, Map<string, Observation>>();
  const inventory = new Map<string, string>();
  const windows = new Map<number, string>();
  let sequence = 0;
  for (const record of report.measurements) {
    const subject = report.lanes.find((lane) => lane.id === record.subject);
    const reference =
      subject?.reference ??
      (record.subject.startsWith("ts/") ? "ts/node" : "rust/native/release/fast-rng");
    if (
      !report.lanes.some((lane) => lane.id === record.lane) ||
      !report.lanes.some((lane) => lane.id === record.subject) ||
      (record.role !== "candidate" && record.role !== "reference") ||
      !Number.isSafeInteger(record.block) ||
      record.block < 0 ||
      record.block >= report.blocks ||
      (record.repeat !== 0 && record.repeat !== 1)
    )
      throw new Error("Unexpected measurement identity");
    if (record.lane !== (record.role === "candidate" ? record.subject : reference))
      throw new Error("Comparison used the wrong reference artifact");
    const key = `${record.subject}:${record.block}:${record.repeat}:${record.role}`;
    if (indexed.has(key)) throw new Error(`Duplicate process: ${key}`);
    if (record.sequence !== sequence++)
      throw new Error(
        "Process acquisition order is missing or changed; regenerate from a complete current benchmark run.",
      );
    const expected = comparisonWindow(record.block)[record.sequence % 4];
    const window = Math.floor(record.sequence / 4);
    const identity = `${record.subject}:${record.block}`;
    if (
      expected?.role !== record.role ||
      expected.repeat !== record.repeat ||
      (windows.has(window) && windows.get(window) !== identity)
    )
      throw new Error("Unbalanced acquisition window; retain adjacent ABBA/BAAB process order.");
    windows.set(window, identity);
    const rows = validateRows(record.rows, report.settings.samples);
    const names = rows
      .map((row) => row.name)
      // eslint-disable-next-line unicorn/no-array-sort -- Sort a private list under the ES2022 library floor.
      .sort()
      .join("\n");
    const inventoryKey = `${record.subject}:${record.role}`;
    const prior = inventory.get(inventoryKey);
    if (prior && prior !== names)
      throw new Error(`Workload changed between processes: ${record.lane}`);
    inventory.set(inventoryKey, names);
    indexed.set(key, new Map(rows.map((row) => [row.name, row])));
  }
  for (const lane of report.lanes)
    for (let block = 0; block < report.blocks; block++)
      for (let repeat = 0; repeat < 2; repeat++) {
        for (const role of ["candidate", "reference"])
          if (!indexed.has(`${lane.id}:${block}:${repeat}:${role}`))
            throw new Error(`Missing process: ${lane.id}/${block}/${repeat}/${role}`);
      }
  const read = (lane: string, block: number, repeat: number, name: string, role = "candidate") => {
    const row = indexed.get(`${lane}:${block}:${repeat}:${role}`)?.get(name);
    return row ? sampleMedian(row.ns) : undefined;
  };
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
  const normalized = (lane: string, block: number, name: string): number | undefined => {
    if (read(lane, block, 0, name) === undefined) return undefined;
    if (lane === "ts/node") return 1;
    const anchor = localRatio("cross-language/rust-native", block, name);
    if (lane === "rust/native/release/fast-rng")
      return (
        anchor ??
        (report.lanes.find((item) => item.id === lane)?.reference === "ts/node"
          ? localRatio(lane, block, name)
          : 1)
      );
    const value = localRatio(lane, block, name);
    if (value === undefined) return undefined;
    const reference =
      report.lanes.find((item) => item.id === lane)?.reference ??
      (lane.startsWith("ts/") ? "ts/node" : "rust/native/release/fast-rng");
    return reference === "rust/native/release/fast-rng" && anchor !== undefined
      ? value * anchor
      : value;
  };
  const lines = [
    "# Implementation comparisons",
    "",
    `Captured ${report.captured}; revision \`${report.revision}\`; host ${report.host}.`,
    "",
    report.smoke
      ? "**Wiring check only. These samples are not performance evidence.**"
      : "Relative batch cost: smaller is faster. Brackets are distribution-free 95% intervals for the median of paired fresh-process ratios, conditional on independent blocks. They are not per-call latency percentiles or simultaneous confidence across the whole report.",
    "",
    `Reference: \`${baseline}\`; Rust-only jobs use \`rust/native/release/fast-rng\`. Each candidate has adjacent reference/candidate/candidate/reference runs, reversed in alternate blocks. Ratios combine the two neighboring pairs geometrically; Rust reaches Node through the measured native Rust anchor. ${report.blocks} fresh-process blocks, ${report.settings.samples} batches per process. A missing interval is unresolved. Retained JSON Lines keep every batch and acquisition order.`,
    "",
    "Rust rows time complete compiled application calls with result consumption in the native or WASM loop; they exclude a JS crossing per identifier. JS rows include their result witness and errors-as-values checks. Rust owns fixed-array values where JavaScript owns heap arrays. These are consumer-path comparisons, not isolated language or compiler effects. No overall winner is calculated.",
    "",
    "JavaScript graphs are warmed and minified. Rust uses release optimization level 3, ThinLTO and one code-generation unit, with native CPU tuning for this machine; WASM then uses the maintained Binaryen O2 pipeline. Debug and disabled-JIT runs are excluded. Browser workers use cross-origin isolation. Unavailable cells mean the job is absent in that language or feature selection, not zero cost. Installed Node patches are represented by the newest installed patch per major plus the checkout's selected Node.",
    "",
    "## Runtime and control evidence",
    "",
  ];
  const controls = [
    ["Lane", "Runtime", "SHA-256 prefix", "A/A repeat ratio, median [95% interval]"],
    ["---", "---", "---", "---"],
  ];
  for (const lane of report.lanes) {
    const names = inventory.get(`${lane.id}:candidate`)?.split("\n") ?? [];
    // Report the most displaced job, not a cross-job average that could cancel drift.
    let worst = { name: "", distance: -1, values: [] as number[] };
    for (const name of names) {
      const values = Array.from(
        { length: report.blocks },
        (_, block) =>
          (read(lane.id, block, 1, name) as number) / (read(lane.id, block, 0, name) as number),
      );
      const distance = Math.abs(Math.log(sampleMedian(values)));
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
      ...new Set(lanes.flatMap((lane) => inventory.get(`${lane.id}:candidate`)?.split("\n") ?? [])),
      // eslint-disable-next-line unicorn/no-array-sort -- Sort a private list under the ES2022 library floor.
    ].sort();
    lines.push("", `## ${family}`, "");
    const rows = [
      ["Caller job", ...lanes.map((lane) => lane.id)],
      ["---", ...lanes.map(() => "---:")],
    ];
    for (const name of names) {
      const reference =
        read(baseline, 0, 0, name) === undefined ? "rust/native/release/fast-rng" : baseline;
      rows.push([
        name,
        ...lanes.map((lane) => {
          if (
            normalized(lane.id, 0, name) === undefined ||
            normalized(reference, 0, name) === undefined
          )
            return "unavailable";
          if (lane.id === reference) return "reference";
          const values = Array.from(
            { length: report.blocks },
            (_, block) =>
              (normalized(lane.id, block, name) as number) /
              (normalized(reference, block, name) as number),
          );
          return ratio(values);
        }),
      ]);
    }
    lines.push(table(rows));
  }
  return `${lines.join("\n")}\n`;
}
