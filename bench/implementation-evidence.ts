// Reject incomplete or malformed process evidence before comparing implementations.
import type { Observation } from "./implementation-worker";
import type { EntropyEvidence } from "./implementation-entropy";
import { secureEntropySources } from "./implementation-entropy";

export function validateEntropyEvidence(input: unknown, required: boolean): EntropyEvidence {
  if (
    !input ||
    typeof input !== "object" ||
    !("required" in input) ||
    input.required !== required ||
    !("rejectedSourceCalls" in input) ||
    typeof input.rejectedSourceCalls !== "number" ||
    !Number.isSafeInteger(input.rejectedSourceCalls) ||
    input.rejectedSourceCalls < (required ? 1 : 0) ||
    !("secureSourceCalls" in input) ||
    typeof input.secureSourceCalls !== "number" ||
    !Number.isSafeInteger(input.secureSourceCalls) ||
    input.secureSourceCalls < (required ? 1 : 0) ||
    !("sources" in input) ||
    !Array.isArray(input.sources) ||
    input.sources.some(
      (source: unknown) => !Object.values(secureEntropySources).some((secure) => secure === source),
    ) ||
    (required && !input.sources.length)
  )
    throw new Error(
      "Missing secure-source success/failure evidence; refuse generation comparisons.",
    );
  return {
    required,
    rejectedSourceCalls: input.rejectedSourceCalls,
    secureSourceCalls: input.secureSourceCalls,
    sources: input.sources,
  };
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
    const witness: Pick<Observation, "resultWitness"> = {};
    if ("resultWitness" in row) {
      if (
        typeof row.resultWitness !== "number" ||
        !Number.isInteger(row.resultWitness) ||
        row.resultWitness < -0x8000_0000 ||
        row.resultWitness > 0x7fff_ffff
      )
        throw new Error("Invalid emitted result witness");
      witness.resultWitness = row.resultWitness;
    }
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
    const clocks: Pick<Observation, "clockQuantumMs" | "targetBatchMs" | "threadCpuNs"> = {};
    if ("threadCpuNs" in row) {
      if (
        !Array.isArray(row.threadCpuNs) ||
        row.threadCpuNs.length !== samples ||
        !row.threadCpuNs.every(
          (value: unknown) => typeof value === "number" && Number.isFinite(value) && value > 0,
        )
      )
        throw new Error("Invalid caller-thread CPU observations");
      clocks.threadCpuNs = row.threadCpuNs;
    }
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
    return {
      name: row.name,
      ns: row.ns,
      operations: row.operations,
      calibration,
      ...clocks,
      ...witness,
    };
  });
}
