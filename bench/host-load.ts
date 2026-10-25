// A shared limit keeps Rust and JavaScript comparisons on the same host conditions.
import { availableParallelism, loadavg } from "node:os";

// Timing on a busy host measures the other work: it can show unchanged calls 20% slower and hide
// real changes. The comparison runs one runtime at a time, about one core, so
// any 1-minute load above this means competing work. Checked before and after timing.
const BUSY_LOAD = Math.max(2, availableParallelism() / 4);

export function refuseBusyHost(when: string): void {
  const [load] = loadavg();
  if ((load ?? 0) <= BUSY_LOAD) return;
  const message = `Host too busy ${when} timing: 1-minute load ${load?.toFixed(1)} > ${BUSY_LOAD}. Results would measure other work, not this code. Stop competing jobs (builds, tests, other benchmarks) and rerun the same command.`;
  // A maintainer can force a run when the competing work cannot be stopped; the warning keeps the
  // load beside the results so a failure is read as possibly contaminated.
  if (process.env.UUID_SLUG_PERF_ALLOW_BUSY === "1") console.error(`warning: ${message}`);
  else throw new Error(`${message} UUID_SLUG_PERF_ALLOW_BUSY=1 forces the run.`);
}
