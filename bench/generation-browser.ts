// SPDX-License-Identifier: Apache-2.0

import { generationCases } from "./generation-cases";
import { generationNameFilter } from "./generation-case";
import { measureGenerationCases } from "./generation-measure";
import { createConversionCases } from "./conversion-cases";

const conversions = createConversionCases(undefined, undefined, generationCases);
const browserCases = [...generationCases, ...conversions.cases];

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

async function runGenerationBenchmark(search: string) {
  const parameters = new URLSearchParams(search);
  const filter = parameters.get("filter");
  const matchesName = generationNameFilter(filter);
  const selected = browserCases.filter((candidate) => matchesName(candidate.name));
  if (selected.length === 0) throw new Error("Generation benchmark filter selected no cases");
  const rows = await measureGenerationCases(selected, {
    durationMs: Number(parameters.get("duration") ?? 20),
    samples: Number(parameters.get("samples") ?? 9),
    warmupMs: Number(parameters.get("warmup") ?? 32),
    yieldControl,
  });
  return {
    rows,
    unsupported: conversions.unsupported.filter(({ name }) => matchesName(name)),
  };
}

Object.assign(globalThis, { runGenerationBenchmark });
