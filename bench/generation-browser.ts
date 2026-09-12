// SPDX-License-Identifier: Apache-2.0

import { generationCases } from "./generation-cases";
import { measureGenerationCases } from "./generation-measure";

/** Yield through a posted task without using elapsed time as a readiness signal. */
const yieldControl = () =>
  new Promise<void>((resolve) => {
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

export async function runGenerationBenchmark(search: string) {
  const parameters = new URLSearchParams(search);
  const filter = parameters.get("filter");
  const selected = generationCases.filter(
    (candidate) => filter === null || candidate.name.includes(filter),
  );
  if (selected.length === 0) throw new Error("Generation benchmark filter selected no cases");
  return measureGenerationCases(selected, {
    durationMs: Number(parameters.get("duration") ?? 20),
    samples: Number(parameters.get("samples") ?? 9),
    warmupMs: Number(parameters.get("warmup") ?? 32),
    yieldControl,
  });
}

Object.assign(globalThis, { runGenerationBenchmark });
