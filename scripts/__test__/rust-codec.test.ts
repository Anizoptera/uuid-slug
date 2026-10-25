import { expect, test } from "bun:test";
import { codecOutput, codecTimingOutput } from "../../bench/rust-codec-output";

const prepared = [
  { operation: "decode/owned", preparedCalls: 64, rounds: 2, callsPerRound: 100_000 },
  { operation: "mask/base32", preparedCalls: 64, rounds: 2, callsPerRound: 100_000 },
];
const timings = prepared.flatMap(({ operation, rounds, callsPerRound }) =>
  Array.from({ length: rounds }, (_, round) => ({
    operation,
    round,
    calls: callsPerRound,
    nsPerCall: 12.5,
  })),
);

function output(rows: readonly object[]) {
  return [...rows, { complete: true }].map((row) => JSON.stringify(row)).join("\n");
}

test("codec evidence rejects missing, duplicated and misattributed completed work", () => {
  // Plausible positive timings must still fail when the selected workload was not completed.
  expect(codecTimingOutput(output(timings), prepared)).toEqual(timings);
  for (const rows of [
    timings.slice(1),
    [...timings, ...timings],
    timings.map((row) => ({ ...row, round: 0 })),
    timings.map((row) => ({ ...row, round: row.round + 2 })),
    timings.map((row) => ({ ...row, calls: row.calls - 1 })),
    timings.map((row) => ({ ...row, operation: "other/case" })),
    prepared,
  ]) {
    expect(() => codecTimingOutput(output(rows), prepared)).toThrow("Incomplete Rust codec");
  }
});

test("codec protocol rejects empty, interrupted and invalid numeric evidence", () => {
  expect(codecOutput(output(prepared))).toEqual(prepared);
  expect(() => codecOutput(output([]))).toThrow("incomplete or empty");
  expect(() => codecOutput(JSON.stringify(timings[0]))).toThrow("incomplete or empty");
  for (const field of ["calls", "nsPerCall", "round"])
    for (const value of [-1, null, "1"]) {
      expect(() => codecOutput(output([{ ...timings[0], [field]: value }]))).toThrow();
    }
  for (const field of ["calls", "round"])
    expect(() => codecOutput(output([{ ...timings[0], [field]: 0.5 }]))).toThrow();
  for (const value of [0, -1, 0.5, null, "1"])
    expect(() => codecOutput(output([{ ...prepared[0], preparedCalls: value }]))).toThrow();
});
