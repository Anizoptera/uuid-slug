// SPDX-License-Identifier: Apache-2.0

import originalFixtures from "../rust/uuid-slug/tests/fixtures/fixtures-original-slugs.json" with { type: "json" };
import * as api from "../src/index";
import * as privateAlphabetApi from "../src/alphabet";
import * as privateV4Api from "../src/v4";
import {
  assertProfileOutcome,
  createProfileCases,
  selectProfileCases as selectByFilter,
} from "./profile-cases";
import type { ProfileCase, ProfileValue } from "./profile-cases";
import { sampleCallLatency } from "./call-latency";

interface BrowserProfileOptions {
  readonly duration: number;
  readonly filter?: string;
  readonly samples: number;
  readonly warmup: number;
  readonly privateImplementations?: boolean;
  readonly latencySamples?: number;
}

interface BrowserProfileRow {
  readonly maxBatchMs: number;
  readonly maxUninterruptedMs: number;
  readonly name: string;
  readonly ns: readonly number[];
  readonly operations: number;
  readonly sink: number;
  readonly callLatency?: Awaited<ReturnType<typeof sampleCallLatency>>;
}

let sink = 0;

function consume(value: ProfileValue, index: number): void {
  if (typeof value === "string") sink ^= value.charCodeAt(index % value.length);
  else if (typeof value === "number") sink ^= value;
  else if (typeof value === "boolean") sink ^= Number(value);
  else if (value instanceof Uint8Array) sink ^= value[index % value.length] as number;
  else if (value instanceof Error) sink ^= value.message.length;
  else sink ^= 1;
}

function batch(name: string, operation: ProfileCase, count: number, expectedError: boolean): void {
  for (let index = 0; index < count; index += 1) {
    const value = operation(index);
    if (expectedError !== value instanceof Error)
      throw new Error(
        `Profile operation changed its expected success/failure outcome: ${name} at index ${index}${value instanceof Error ? `: ${value.message}` : ""}`,
        { cause: value },
      );
    consume(value, index);
  }
}

/** Yield through a posted task without using elapsed time as a readiness signal. */
function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.addEventListener(
      "message",
      () => {
        channel.port1.close();
        resolve();
      },
      { once: true },
    );
    channel.port1.start();
    channel.port2.postMessage(undefined);
    channel.port2.close();
  });
}

function selectProfileCases(options: BrowserProfileOptions): readonly [string, ProfileCase][] {
  if (
    !Number.isSafeInteger(options.samples) ||
    options.samples < 1 ||
    !Number.isFinite(options.duration) ||
    options.duration <= 0 ||
    !Number.isFinite(options.warmup) ||
    options.warmup <= 0 ||
    (options.latencySamples !== undefined &&
      (!Number.isSafeInteger(options.latencySamples) || options.latencySamples < 1))
  )
    throw new Error(
      "Profile samples must be positive, with positive duration and warm-up milliseconds",
    );
  const suite = createProfileCases(
    api,
    originalFixtures.issued,
    options.privateImplementations ? privateV4Api : undefined,
    options.privateImplementations ? privateAlphabetApi : undefined,
  );
  suite.verify();
  const selected = selectByFilter(suite.cases, options.filter);
  for (const [name, operation] of selected) {
    const expectedError = assertProfileOutcome(name, operation(0));
    const started = performance.now();
    do batch(name, operation, 64, expectedError);
    while (performance.now() - started < options.warmup);
  }
  return selected;
}

async function measureProfileCases(
  selected: readonly [string, ProfileCase][],
  options: BrowserProfileOptions,
): Promise<readonly BrowserProfileRow[]> {
  const rows: BrowserProfileRow[] = [];
  for (const [name, operation] of selected) {
    const expectedError = name.startsWith("invalid.");
    const ns: number[] = [];
    let maxBatchMs = 0;
    let maxUninterruptedMs = 0;
    let operations = 0;
    for (let sample = 0; sample < options.samples; sample += 1) {
      let count = 0;
      const start = performance.now();
      let elapsed = 0;
      do {
        const began = performance.now();
        batch(name, operation, 64, expectedError);
        maxBatchMs = Math.max(maxBatchMs, performance.now() - began);
        count += 64;
        elapsed = performance.now() - start;
      } while (elapsed < options.duration);
      maxUninterruptedMs = Math.max(maxUninterruptedMs, elapsed);
      ns.push((elapsed * 1e6) / count);
      operations += count;
      await yieldToBrowser();
    }
    ns.sort((left, right) => left - right);
    rows.push({ name, ns, operations, maxBatchMs, maxUninterruptedMs, sink });
  }
  // Finish every throughput row before per-call clocks can alter another row's engine state.
  if (options.latencySamples !== undefined) {
    for (const [caseIndex, [name, operation]] of selected.entries()) {
      const witness = operation(0);
      if (typeof witness === "object" && !(witness instanceof Uint8Array))
        throw new Error(
          `Call latency requires a scalar or byte result; narrow the filter: ${name}`,
        );
      const callLatency = await sampleCallLatency(
        operation,
        (value, index) => {
          if (value instanceof Error) throw value;
          if (typeof value === "object" && !(value instanceof Uint8Array))
            throw new Error(`Call latency result changed shape: ${name}`);
          consume(value, index);
        },
        options.latencySamples,
        yieldToBrowser,
      );
      rows[caseIndex] = { ...rows[caseIndex]!, callLatency, sink };
    }
  }
  return rows;
}

const parameters = new URL(location.href).searchParams;
const filter = parameters.get("filter");
const options = {
  duration: Number(parameters.get("duration") ?? 2),
  samples: Number(parameters.get("samples") ?? 7),
  warmup: Number(parameters.get("warmup") ?? 16),
  privateImplementations: parameters.get("private") === "1",
  ...(parameters.has("latencySamples")
    ? { latencySamples: Number(parameters.get("latencySamples")) }
    : {}),
  ...(filter === null ? {} : { filter }),
};
const selected = selectProfileCases(options);
(
  globalThis as typeof globalThis & {
    runUuidSlugProfile?: () => Promise<readonly BrowserProfileRow[]>;
  }
).runUuidSlugProfile = () => measureProfileCases(selected, options);
