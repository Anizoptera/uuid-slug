type CodecObservation =
  | { operation: string; preparedCalls: number; rounds: number; callsPerRound: number }
  | { operation: string; round: number; calls: number; nsPerCall: number };

function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export function codecOutput(output: string): CodecObservation[] {
  const lines = output.trim().split("\n");
  // The footer belongs to this benchmark protocol; a successful process alone proves no cases ran.
  if (lines.pop() !== '{"complete":true}' || !lines.length)
    throw new Error(
      "Rust codec output is incomplete or empty; check the filter and run the current codec benchmark source.",
    );
  return lines.map<CodecObservation>((line) => {
    const row: unknown = JSON.parse(line);
    if (
      typeof row !== "object" ||
      row === null ||
      !("operation" in row) ||
      typeof row.operation !== "string"
    )
      throw new Error(`Invalid Rust codec record: ${line}`);
    if (
      "preparedCalls" in row &&
      positiveInteger(row.preparedCalls) &&
      "rounds" in row &&
      positiveInteger(row.rounds) &&
      "callsPerRound" in row &&
      positiveInteger(row.callsPerRound)
    )
      return {
        operation: row.operation,
        preparedCalls: row.preparedCalls,
        rounds: row.rounds,
        callsPerRound: row.callsPerRound,
      };
    if (
      "round" in row &&
      typeof row.round === "number" &&
      Number.isSafeInteger(row.round) &&
      row.round >= 0 &&
      "calls" in row &&
      positiveInteger(row.calls) &&
      "nsPerCall" in row &&
      typeof row.nsPerCall === "number" &&
      Number.isFinite(row.nsPerCall) &&
      row.nsPerCall > 0
    )
      return {
        operation: row.operation,
        round: row.round,
        calls: row.calls,
        nsPerCall: row.nsPerCall,
      };
    throw new Error(`Invalid Rust codec counts or timing: ${line}`);
  });
}

export function codecTimingOutput(
  output: string,
  prepared: readonly Extract<CodecObservation, { preparedCalls: number }>[],
) {
  const records = codecOutput(output);
  // Exact cardinality and unique in-range rounds reject omissions, duplicates and extra cases.
  if (
    !records.every((row) => "nsPerCall" in row) ||
    records.length !== prepared.reduce((sum, row) => sum + row.rounds, 0) ||
    prepared.some(
      (expected) =>
        new Set(
          records
            .filter(
              (row) =>
                row.operation === expected.operation &&
                row.calls === expected.callsPerRound &&
                row.round < expected.rounds,
            )
            .map((row) => row.round),
        ).size !== expected.rounds,
    )
  )
    throw new Error("Incomplete Rust codec timing rows; retain the requested cases and rounds.");
  return records;
}
