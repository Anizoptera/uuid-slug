// SPDX-License-Identifier: Apache-2.0

import { createUuidV7MaskAsync, isUuidSlugError } from "../src/index";

interface AsyncProfileRow {
  readonly callMs: number;
  readonly maxTaskGapMs: number;
  readonly name: string;
  readonly settledMs: number;
  readonly tasks: number;
}

const encoder = new TextEncoder();
const cases = [
  { name: "string.ascii.16.iteration.1", seed: "a".repeat(16), iterations: 1 },
  { name: "bytes.16.iteration.1", seed: new Uint8Array(16), iterations: 1 },
  { name: "bytes.4095.iteration.1", seed: new Uint8Array(4095), iterations: 1 },
  { name: "bytes.4096.iteration.1", seed: new Uint8Array(4096), iterations: 1 },
  { name: "bytes.4097.iteration.1", seed: new Uint8Array(4097), iterations: 1 },
  {
    name: "string.utf8-boundary.iteration.1",
    seed: `${"a".repeat(4095)}\ud83d\ude00b`,
    iterations: 1,
  },
  { name: "bytes.16.iteration.64", seed: new Uint8Array(16), iterations: 64 },
  { name: "bytes.16.iteration.4096", seed: new Uint8Array(16), iterations: 4096 },
  { name: "bytes.16.iteration.65536", seed: new Uint8Array(16), iterations: 65_536 },
] as const;

function postedTask(callback: () => void): void {
  const immediate = (globalThis as { setImmediate?: (run: () => void) => void }).setImmediate;
  if (immediate) {
    immediate(callback);
    return;
  }
  const channel = new MessageChannel();
  channel.port1.addEventListener(
    "message",
    () => {
      channel.port1.close();
      channel.port2.close();
      callback();
    },
    { once: true },
  );
  channel.port1.start();
  channel.port2.postMessage(undefined);
}

async function measure(
  name: string,
  seed: string | Uint8Array,
  keyDerivationIterations: number,
  controller?: AbortController,
): Promise<AsyncProfileRow> {
  let active = true;
  let lastTask = performance.now();
  let maxTaskGapMs = 0;
  let tasks = 0;
  const pump = () => {
    if (!active) return;
    const now = performance.now();
    maxTaskGapMs = Math.max(maxTaskGapMs, now - lastTask);
    lastTask = now;
    tasks += 1;
    postedTask(pump);
  };
  postedTask(pump);
  const began = performance.now();
  const pending = createUuidV7MaskAsync({
    seed,
    keyDerivationIterations,
    ...(controller ? { signal: controller.signal } : {}),
  });
  const callMs = performance.now() - began;
  if (controller) postedTask(() => controller.abort("profile cancellation"));
  const result = await pending;
  const settledMs = performance.now() - began;
  active = false;
  if (controller) {
    if (!isUuidSlugError(result) || result.code !== "aborted")
      throw new Error("Cooperative cancellation did not reach the aborted result");
  } else if (isUuidSlugError(result)) throw result;
  return { callMs, maxTaskGapMs, name, settledMs, tasks };
}

async function measureCancellation(): Promise<AsyncProfileRow> {
  const controller = new AbortController();
  return measure("cancel.after-first-host-task", new Uint8Array(4097), 1 << 24, controller);
}

/** Measure cooperative construction at packing, UTF-8, iteration and cancellation boundaries. */
export async function runAsyncProfile(): Promise<readonly AsyncProfileRow[]> {
  if (encoder.encode(cases[5].seed).length !== 4100)
    throw new Error("UTF-8 boundary fixture changed length");
  const rows: AsyncProfileRow[] = [];
  for (const entry of cases) rows.push(await measure(entry.name, entry.seed, entry.iterations));
  rows.push(await measureCancellation());
  return rows;
}

if (typeof document === "undefined") {
  for (const row of await runAsyncProfile()) console.log(JSON.stringify(row));
} else {
  (
    globalThis as typeof globalThis & { runUuidSlugAsyncProfile?: typeof runAsyncProfile }
  ).runUuidSlugAsyncProfile = runAsyncProfile;
}
