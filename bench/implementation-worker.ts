// Qualify the real provider and prepare the application corpus before invoking the shared timer.
import { implementationCases } from "./implementation-cases";
import * as api from "../src/index";
import { qualifyEntropy } from "./implementation-entropy";
import type { EntropyEvidence } from "./implementation-entropy";
import { ASYNC_JOBS, measureAsync } from "./implementation-async";
import { selectProfileCases } from "./profile-case";
import { measureImplementationCases } from "./implementation-timing";
import type { Settings, Observation } from "./implementation-timing";
export type { Settings, Observation } from "./implementation-timing";
import { exposeBenchmark } from "./implementation-host";

export async function run(
  settings: Settings,
): Promise<{ rows: Observation[]; entropy: EntropyEvidence }> {
  const probeOutput = new Uint8Array(16);
  const qualified = qualifyEntropy(() => {
    const v4 = api.generateUuidV4Bytes(probeOutput);
    const v7 = api.generateUuidV7Bytes(probeOutput);
    return { uuidV4: !(v4 instanceof Error), uuidV7: !(v7 instanceof Error) };
  }, implementationCases);
  const cases = qualified.value;
  const names = [...Object.keys(cases), ...ASYNC_JOBS.map((job) => job.name)];
  const selected = new Set(
    selectProfileCases(Object.fromEntries(names.map((name) => [name, true])), settings.filter).map(
      ([name]) => name,
    ),
  );
  const timed = measureImplementationCases(
    settings,
    Object.fromEntries(Object.entries(cases).filter(([name]) => selected.has(name))),
  );
  return {
    entropy: qualified.entropy,
    rows: [...timed.rows, ...(await measureAsync(timed.settings, timed.quantum, selected))],
  };
}
exposeBenchmark(run);
