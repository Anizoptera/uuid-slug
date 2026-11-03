// A complete-looking table must not hide lost processes, duplicate rows or inverted ratios.
import { expect, test } from "bun:test";
import {
  createImplementationReporter,
  renderImplementationReport,
} from "../bench/implementation-report";
import { validateExecutionReceipt, validateRows } from "../bench/implementation-evidence";
import type { ImplementationReport } from "../bench/implementation-report";
import { secureEntropySources } from "../bench/implementation-entropy";
import { medianRatio } from "../bench/statistics";

function evidence(): ImplementationReport {
  const lanes = ["ts/node", "rust/native/release/fast-rng"].map((id) => ({
    id,
    family: "Comparison",
    version: "fixture",
    hash: "a".repeat(64),
    requiresRuntimeVersion: false,
    reference: "ts/node",
    requiresEntropy: true,
  }));
  return {
    revision: "fixture",
    captured: "fixture",
    host: "fixture",
    smoke: false,
    blocks: 6,
    settings: { samples: 3, duration: 5, warmup: 16, filter: "", batchTicks: 40 },
    lanes,
    measurements: Array.from({ length: 6 }, (_, block) =>
      lanes.flatMap((lane) =>
        (block % 2
          ? (["candidate", "reference", "reference", "candidate"] as const)
          : (["reference", "candidate", "candidate", "reference"] as const)
        ).map((role, position) => ({
          lane: role === "candidate" ? lane.id : "ts/node",
          subject: lane.id,
          role,
          block,
          repeat: Number(position >= 2),
          // Protocol fixtures test report rejection; a separate real worker tests the providers.
          entropy: {
            required: true,
            rejectedSourceCalls: 1,
            secureSourceCalls: 1,
            sources: [secureEntropySources.web],
          },
          rows: [
            {
              name: "plain/base64",
              ns:
                role === "reference" || lane.id === "ts/node" ? [90, 100, 9000] : [180, 200, 18000],
              operations: 300,
            },
          ],
        })),
      ),
    )
      .flat()
      .map((record, sequence) => Object.assign(record, { sequence })),
  };
}

test.each([
  "transport/native/bun/ffi",
  "transport/rust/wasm32-unknown-unknown/release/reduced/node",
])("transport %s uses its measured reference without requiring generation", (candidateId) => {
  const report = evidence();
  const ids = new Map([
    ["ts/node", "transport/typescript/node"],
    ["rust/native/release/fast-rng", candidateId],
  ]);
  for (const lane of report.lanes) {
    lane.id = ids.get(lane.id) as string;
    lane.reference = "transport/typescript/node";
    delete lane.requiresEntropy;
  }
  for (const record of report.measurements) {
    record.lane = ids.get(record.lane) as string;
    record.subject = ids.get(record.subject) as string;
    const row = record.rows[0];
    if (row && record.subject === "transport/typescript/node" && record.role === "reference")
      row.ns = [900, 1000, 90000];
  }
  const rendered = renderImplementationReport(report, "transport/typescript/node");
  const row = rendered.split("\n").find((line) => line.startsWith("| plain/base64 |"));
  expect(row).toContain("transport/typescript/node");
  expect(row).toContain("2×");
  const root = report.lanes[0];
  if (!root) throw new Error("Fixture omitted its root");
  root.reference = candidateId;
  for (const record of report.measurements)
    if (record.subject === root.id && record.role === "reference") record.lane = root.reference;
  expect(renderImplementationReport(report, root.id)).toContain("uncompared");
});

test("current captures require matching execution-time version receipts", () => {
  const report = evidence();
  report.runtimeReceipts = true;
  for (const lane of report.lanes) {
    lane.requiresRuntimeVersion = true;
    lane.version = "Node 26.13.0";
  }
  const first = report.measurements[0];
  if (!first) throw new Error("Fixture omitted its first process");
  expect(() =>
    createImplementationReporter(report).append({ ...first, runtimeVersion: "26.13.0" }),
  ).not.toThrow();
  expect(() => createImplementationReporter(report).append(first)).toThrow(/Runtime receipt/);
  expect(() =>
    createImplementationReporter(report).append({ ...first, runtimeVersion: "22.23.4" }),
  ).toThrow(/Runtime receipt/);
  expect(() =>
    createImplementationReporter(report).append({ ...first, runtimeVersion: 26 }),
  ).toThrow(/Runtime receipt/);
});

test("native receipts cannot hide a missing field, unknown label or different transport", () => {
  const expected = { version: "Bun 1.4.4", nativeTransport: "Bun FFI" as const };
  const receipt = { runtimeVersion: "1.4.4", transport: "Bun FFI" } as const;
  expect(() => validateExecutionReceipt(receipt, expected, true)).not.toThrow();
  for (const transport of [undefined, "Bun Node-API", "insecure", false])
    expect(() => validateExecutionReceipt({ ...receipt, transport }, expected, true)).toThrow(
      /transport receipt/,
    );
  expect(() => validateRows({ failure: "invalid process JSON", output: "not JSON" }, 1)).toThrow(
    /invalid process JSON/,
  );
});

function nativeReferenceEvidence() {
  const report = evidence();
  const native = report.lanes.find((lane) => lane.id === "rust/native/release/fast-rng");
  if (!native) throw new Error("Fixture omitted its native reference");
  native.reference = native.id;
  const records = report.measurements.filter((record) => record.subject === native.id);
  for (const record of records) if (record.role === "reference") record.lane = native.id;
  return { report, native };
}

function bridgedEvidence(): ImplementationReport {
  const { report, native } = nativeReferenceEvidence();
  const records = report.measurements.filter((record) => record.subject === native.id);
  const bridge = { ...native, id: "cross-language/rust-native", reference: "ts/node" };
  report.lanes.push(bridge);
  const offset = report.measurements.length;
  report.measurements.push(
    ...records.map((record, index) =>
      Object.assign({}, record, {
        subject: bridge.id,
        lane: record.role === "reference" ? "ts/node" : bridge.id,
        sequence: offset + index,
        rows: record.rows.map((row) => Object.assign({}, row)),
      }),
    ),
  );
  return report;
}

test("paired process medians resist one paused batch and reverse with the reference", () => {
  const report = evidence();
  expect(renderImplementationReport(report)).toContain("2× [2–2]");
  expect(renderImplementationReport(report, "rust/native/release/fast-rng")).toContain(
    "0.5× [0.5–0.5]",
  );
});

test("a Rust reference cannot hide measured JavaScript-only jobs", () => {
  const report = evidence();
  for (const record of report.measurements)
    if (record.lane === "ts/node")
      record.rows.push({ name: "async.mask.derive", ns: [500, 600, 900], operations: 300 });
  const rendered = renderImplementationReport(report, "rust/native/release/fast-rng");
  const row = rendered.split("\n").find((line) => line.startsWith("| async.mask.derive |"));
  expect(row).toContain("reference");
});

test("disconnected Node and native Rust scales cannot imply equal implementation costs", () => {
  const { report } = nativeReferenceEvidence();
  const rendered = renderImplementationReport(report);
  const row = rendered.split("\n").find((line) => line.startsWith("| plain/base64 |"));
  expect(row).toContain("uncompared");
});

test("a Node reference cannot hide measured Rust-only jobs", () => {
  const { report, native } = nativeReferenceEvidence();
  for (const record of report.measurements)
    if (record.lane === native.id)
      record.rows.push({ name: "rust-only/inspect", ns: [1, 1, 1], operations: 300 });
  const row = renderImplementationReport(report)
    .split("\n")
    .find((line) => line.startsWith("| rust-only/inspect |"));
  expect(row).toContain(native.id);
  expect(row).toContain("reference");
});

test("cross-language normalization requires matching artifacts, version records and both workloads", () => {
  expect(renderImplementationReport(bridgedEvidence())).toContain("2× [2–2]");
  for (const changed of ["hash", "version", "edge", "reference", "candidate"] as const) {
    const report = bridgedEvidence();
    const bridge = report.lanes.find((lane) => lane.id === "cross-language/rust-native");
    if (!bridge) throw new Error("Fixture omitted its connecting comparison");
    if (changed === "hash") bridge.hash = "b".repeat(64);
    else if (changed === "version") bridge.version = "different execution settings";
    else if (changed === "edge") {
      bridge.reference = "rust/native/release/fast-rng";
      for (const record of report.measurements)
        if (record.subject === bridge.id && record.role === "reference")
          record.lane = bridge.reference;
    } else
      for (const record of report.measurements)
        if (record.subject === bridge.id && record.role === changed)
          record.rows.push({ name: "extra-context-work", ns: [1, 1, 1], operations: 300 });
    const row = renderImplementationReport(report)
      .split("\n")
      .find((line) => line.startsWith("| plain/base64 |"));
    expect(row).toContain("uncompared");
  }
});

test("reordering the same jobs cannot pass as the same process workload", () => {
  const report = evidence();
  for (const record of report.measurements)
    record.rows.push({ name: "second-job", ns: [1, 1, 1], operations: 300 });
  const final = report.measurements.at(-1);
  const first = final?.rows[0];
  const second = final?.rows[1];
  if (!final || !first || !second) throw new Error("Fixture omitted its ordered workload");
  final.rows = [second, first];
  expect(() => renderImplementationReport(report)).toThrow("Workload changed");
});

test("a newline inside one job name cannot impersonate two preceding jobs", () => {
  const report = bridgedEvidence();
  for (const record of report.measurements) {
    if (record.subject === "rust/native/release/fast-rng")
      record.rows.unshift(
        ...["alpha\nbeta", "alpha", "beta"].map((name) => ({
          name,
          ns: [1, 1, 1],
          operations: 300,
        })),
      );
    if (record.subject === "cross-language/rust-native" && record.role === "candidate")
      record.rows.unshift(
        ...["alpha", "beta\nalpha", "beta"].map((name) => ({
          name,
          ns: [1, 1, 1],
          operations: 300,
        })),
      );
  }
  const row = renderImplementationReport(report)
    .split("\n")
    .find((line) => line.startsWith("| plain/base64 |"));
  expect(row).toContain("uncompared");
});

test("reversing a reference preserves reciprocal summaries for varied even-sized samples", () => {
  const report = evidence();
  const factors = [1, 1, 2, 4, 8, 8];
  for (const record of report.measurements) {
    if (record.subject !== "rust/native/release/fast-rng" || record.role !== "candidate") continue;
    const factor = factors[record.block];
    if (factor === undefined) throw new Error("Fixture omitted its block ratio");
    for (const row of record.rows) row.ns = row.ns.map((value) => (value * factor) / 2);
  }
  // The central ratios are 2 and 4; their geometric midpoint has the reciprocal midpoint on reversal.
  expect(renderImplementationReport(report)).toContain("2.8×");
  expect(renderImplementationReport(report, "rust/native/release/fast-rng")).toContain("0.35×");
});

test("ratio summaries reject invalid contrasts and avoid large-value multiplication overflow", () => {
  for (const invalid of [[], [0], [-1], [NaN], [Infinity]])
    expect(() => medianRatio(invalid)).toThrow();
  const relativeError = Math.abs(medianRatio([1e300, 4e300]) / 2e300 - 1);
  // Two square roots, multiplication and normalization each contribute rounding error.
  expect(relativeError).toBeLessThanOrEqual(4 * Number.EPSILON);
});

test("report regeneration refuses omitted entropy policy and insecure source labels", () => {
  const omitted = evidence();
  const lane = omitted.lanes[0];
  if (!lane) throw new Error("Fixture omitted its JavaScript lane");
  delete lane.requiresEntropy;
  expect(() => renderImplementationReport(omitted)).toThrow("qualification policy");
  const insecure = evidence();
  const entropy = insecure.measurements[0]?.entropy;
  if (!entropy) throw new Error("Fixture omitted its qualification receipt");
  entropy.sources = ["Math.random"];
  expect(() => renderImplementationReport(insecure)).toThrow(
    "secure-source success/failure evidence",
  );
});

test("a successful neighbor cannot hide a missing process or changed case inventory", () => {
  const missing = evidence();
  missing.measurements.pop();
  expect(() => renderImplementationReport(missing)).toThrow("Missing process");
  const changed = evidence();
  const row = changed.measurements.at(-1)?.rows[0];
  if (!row) throw new Error("Fixture omitted its final row");
  row.name = "different operation";
  expect(() => renderImplementationReport(changed)).toThrow("Workload changed");
});

test("duplicate observations and unresolved timers cannot become zero-cost winners", () => {
  const report = evidence();
  const record = report.measurements[0];
  if (!record) throw new Error("Fixture omitted its first process");
  report.measurements.push(record);
  expect(() => renderImplementationReport(report)).toThrow("Duplicate process");
  expect(() => validateRows([{ name: "job", ns: [1, 0, 2], operations: 3 }], 3)).toThrow();
  expect(() => validateRows([{ name: "job", ns: [1, 2], operations: 3 }], 3)).toThrow();
  expect(() => validateRows([], 3)).toThrow("Empty benchmark lane");
  expect(() =>
    validateRows([{ name: "job", ns: [1, 2, 3], operations: 3, threadCpuNs: [1] }], 3),
  ).toThrow("caller-thread CPU");
  expect(
    validateRows([{ name: "job", ns: [1, 2, 3], operations: 3, threadCpuNs: [1, 1, 2] }], 3)[0]
      ?.threadCpuNs,
  ).toEqual([1, 1, 2]);
});

test("valid timings cannot hide an unbalanced process window or wrong reference", () => {
  const reordered = evidence();
  const first = reordered.measurements[0];
  const second = reordered.measurements[1];
  if (!first || !second) throw new Error("Fixture omitted its first pair");
  reordered.measurements[0] = { ...second, sequence: 0 };
  reordered.measurements[1] = { ...first, sequence: 1 };
  expect(() => renderImplementationReport(reordered)).toThrow("Unbalanced acquisition window");
  const wrong = evidence();
  const reference = wrong.measurements[0];
  if (!reference) throw new Error("Fixture omitted its reference");
  reference.lane = "rust/native/release/fast-rng";
  expect(() => renderImplementationReport(wrong)).toThrow("wrong reference artifact");
  const unqualified = evidence();
  const lane = unqualified.lanes[0];
  if (!lane) throw new Error("Fixture omitted its JavaScript lane");
  lane.requiresEntropy = true;
  const capture = unqualified.measurements[0];
  if (!capture) throw new Error("Fixture omitted its first process");
  delete capture.entropy;
  expect(() => renderImplementationReport(unqualified)).toThrow(
    "secure-source success/failure evidence",
  );
});

test("randomized exposure accepts either balanced orientation without accepting a broken window", () => {
  const report = evidence();
  report.exposure = "randomized";
  // Reverse only the first window: unlike fixed alternation, its orientation is not block parity.
  // eslint-disable-next-line unicorn/no-array-reverse -- Reverse a private copy under the ES2022 library floor.
  const reversed = report.measurements.slice(0, 4).reverse();
  report.measurements.splice(0, 4, ...reversed);
  for (const [sequence, record] of report.measurements.entries()) {
    record.sequence = sequence;
    if (sequence < 4) record.repeat = Number(sequence >= 2);
  }
  expect(renderImplementationReport(report)).toContain("2× [2–2]");
  expect(renderImplementationReport(report)).toContain("independently randomized before timing");
  const first = report.measurements[0];
  if (!first) throw new Error("Fixture omitted its first process");
  first.repeat = 1;
  expect(() => renderImplementationReport(report)).toThrow("Unbalanced acquisition window");
});

test("incremental reports retain summaries independently of reusable raw process buffers", () => {
  const { measurements, ...metadata } = evidence();
  const reporter = createImplementationReporter(metadata);
  for (const record of measurements.slice(0, -1)) reporter.append(record);
  expect(() => reporter.render()).toThrow("Missing process");
  const final = measurements.at(-1);
  if (!final) throw new Error("Fixture omitted its final process");
  reporter.append(final);
  const original = reporter.render();
  // Raw batches may be released or reused after serialization; rendering must not retain their state.
  for (const record of measurements)
    for (const row of record.rows) {
      row.ns.fill(1);
      row.name = "overwritten raw buffer";
    }
  expect(reporter.render()).toBe(original);
  expect(reporter.render("rust/native/release/fast-rng")).toContain("0.5× [0.5–0.5]");
});
