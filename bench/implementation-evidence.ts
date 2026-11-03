// Reject incomplete or malformed process evidence before comparing implementations.
import type { Observation } from "./implementation-worker";
import { secureEntropySources } from "./implementation-entropy";
import { NATIVE_TRANSPORT_LABELS } from "../scripts/rust-native-matrix";
import type { NativeTransportLabel } from "../scripts/rust-native-matrix";

export interface ExecutionReceipt {
  runtimeVersion?: string;
  transport?: NativeTransportLabel;
}

export function validateExecutionReceipt(
  input: { runtimeVersion?: unknown; transport?: unknown },
  expected: { version: string; nativeTransport?: NativeTransportLabel },
  requireRuntimeVersion: boolean,
): void {
  // Selected-host metadata cannot substitute for what the executing process actually returned.
  const version = input.runtimeVersion;
  if (
    (requireRuntimeVersion && typeof version !== "string") ||
    (version !== undefined &&
      (typeof version !== "string" || !version || !expected.version.includes(version)))
  )
    throw new Error(
      `Runtime receipt ${typeof version === "string" ? JSON.stringify(version) : "missing or non-string"} does not match ${JSON.stringify(expected.version)}. Check the selected executable and processRuntimeVersion(); keep the runtime assertion enabled.`,
    );
  const transport =
    input.transport === undefined
      ? undefined
      : NATIVE_TRANSPORT_LABELS.find((label) => label === input.transport);
  if (
    (input.transport !== undefined && transport === undefined) ||
    transport !== expected.nativeTransport
  )
    throw new Error(
      `Native transport receipt does not match ${expected.nativeTransport ?? "a non-native lane"}; retain the actual loader selection and its output field.`,
    );
}

export function validateEntropyEvidence(input: unknown, required: boolean): void {
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
}

export function validateRows(input: unknown, samples: number): Observation[] {
  if (input && typeof input === "object" && "failure" in input && typeof input.failure === "string")
    throw new Error(
      `Benchmark worker failed: ${input.failure}. Inspect its retained incomplete capture before rerunning.`,
    );
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
