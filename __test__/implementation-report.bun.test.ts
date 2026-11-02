// A complete-looking table must not hide lost processes, duplicate rows or inverted ratios.
import { expect, test } from "bun:test";
import { renderImplementationReport, validateRows } from "../bench/implementation-report";
import type { ImplementationReport } from "../bench/implementation-report";

function evidence(): ImplementationReport {
  const lanes = ["ts/node", "rust/native/release/fast-rng"].map((id) => ({
    id,
    family: "Comparison",
    version: "fixture",
    hash: "a".repeat(64),
    reference: "ts/node",
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
        [0, 1].flatMap((repeat) =>
          (["candidate", "reference"] as const).map((role) => ({
            lane: role === "candidate" ? lane.id : "ts/node",
            subject: lane.id,
            role,
            block,
            repeat,
            rows: [
              {
                name: "plain/base64",
                ns:
                  role === "reference" || lane.id === "ts/node"
                    ? [90, 100, 9000]
                    : [180, 200, 18000],
                operations: 300,
              },
            ],
          })),
        ),
      ),
    )
      .flat()
      .map((record, sequence) => Object.assign(record, { sequence })),
  };
}

test("paired process medians resist one paused batch and reverse with the reference", () => {
  const report = evidence();
  expect(renderImplementationReport(report)).toContain("2× [2–2]");
  expect(renderImplementationReport(report, "rust/native/release/fast-rng")).toContain(
    "0.5× [0.5–0.5]",
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
});
