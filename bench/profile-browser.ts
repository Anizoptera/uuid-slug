// SPDX-License-Identifier: Apache-2.0

import originalFixtures from "../rust/uuid-slug/tests/fixtures/fixtures-original-slugs.json" with { type: "json" };
import * as api from "../src/index";
import * as privateAlphabetApi from "../src/alphabet";
import * as privateV4Api from "../src/v4";
import { assertProfileOutcome, createProfileCases } from "./profile-cases";
import type { ProfileCase, ProfileValue } from "./profile-cases";

export interface BrowserProfileOptions {
  readonly duration: number;
  readonly filter?: string;
  readonly samples: number;
  readonly warmup: number;
  readonly privateImplementations?: boolean;
}

export interface BrowserProfileRow {
  readonly maxBatchMs: number;
  readonly maxUninterruptedMs: number;
  readonly name: string;
  readonly ns: readonly number[];
  readonly operations: number;
  readonly sink: number;
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

function batch(operation: ProfileCase, count: number, expectedError: boolean): void {
  for (let index = 0; index < count; index += 1) {
    const value = operation(index);
    if (expectedError !== value instanceof Error)
      throw new Error("Profile operation changed its expected success/failure outcome", {
        cause: value,
      });
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
    options.warmup <= 0
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
  const selected = Object.entries(suite.cases).filter(
    ([name]) => !options.filter || name.includes(options.filter),
  );
  if (selected.length === 0) throw new Error("Profile filter selected no cases");
  for (const [name, operation] of selected) {
    const expectedError = assertProfileOutcome(name, operation(0));
    const started = performance.now();
    do batch(operation, 256, expectedError);
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
    batch(operation, 2048, expectedError);
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
        batch(operation, 256, expectedError);
        maxBatchMs = Math.max(maxBatchMs, performance.now() - began);
        count += 256;
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
  return rows;
}

/** Measure the browser artifact with the same operation corpus used by server runtimes. */
export function runBrowserProfile(
  options: BrowserProfileOptions,
): Promise<readonly BrowserProfileRow[]> {
  return measureProfileCases(selectProfileCases(options), options);
}

const parameters = new URL(location.href).searchParams;
const filter = parameters.get("filter");
const options = {
  duration: Number(parameters.get("duration") ?? 2),
  samples: Number(parameters.get("samples") ?? 7),
  warmup: Number(parameters.get("warmup") ?? 20),
  privateImplementations: parameters.get("private") === "1",
  ...(filter === null ? {} : { filter }),
};
const selected = selectProfileCases(options);
(
  globalThis as typeof globalThis & {
    runUuidSlugProfile?: () => Promise<readonly BrowserProfileRow[]>;
  }
).runUuidSlugProfile = () => measureProfileCases(selected, options);
