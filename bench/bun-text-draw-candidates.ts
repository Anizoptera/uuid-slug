// SPDX-License-Identifier: Apache-2.0

import { replaceOnce } from "./candidate-source";
import type { SourceCandidate } from "./candidate-source";

export function bunTextDrawCandidates(source: string): readonly SourceCandidate[] {
  const companionEdits = {
    "src/runtime/portable.ts": (value: string) =>
      value + "\nexport const useIndependentUuidV7TextDraws = false;\n",
    "src/runtime/node.ts": (value: string) =>
      value + "\nexport const useIndependentUuidV7TextDraws = false;\n",
    "src/runtime/bun.ts": (value: string) =>
      value + "\nexport const useIndependentUuidV7TextDraws = true;\n",
  } satisfies NonNullable<SourceCandidate["companionEdits"]>;
  // Only module text construction supplies private scratch and uncoordinated instants. Reuse
  // its existing entropy storage and reentrancy guard without changing created generators or
  // explicit instants. A full seed per draw can cost more than sequence continuation; retain
  // nothing without complete-call gains and unchanged allocation ceilings. The private adapter
  // chooses once: full draws regress on Node LTS and Deno, while Bun pairs improve. Select the
  // state updater at construction; a false module flag survives both packed consumer optimizers
  // when it remains inside each draw. Keep the ordinary sequence updater on unselected hosts.
  // Remeasure complete calls if entropy copying, state writes or sequence continuation changes.
  const independent = () => {
    const selected = replaceOnce(
      replaceOnce(
        source,
        "import {\n",
        'import { useIndependentUuidV7TextDraws } from "#runtime";\n\nimport {\n',
      ),
      "  const textBytes = options.textScratch ?? new Uint8Array(16);",
      "  const textBytes = options.textScratch ?? new Uint8Array(16);\n" +
        "  const independentText = useIndependentUuidV7TextDraws && options.textScratch !== undefined && !coordinateExplicitInstants && fractionBits === 0 && rollback === undefined;",
    );
    const withUpdater = replaceOnce(
      selected,
      "  function bytes(out?: Uint8Array, offset = 0): Uint8Array | UuidSlugError {",
      [
        "  // Private module text draws have no ordering promise. Select their updater once so",
        "  // unselected hosts and created generators keep sequence work without a per-draw test.",
        "  // Keep entropy failure atomic; explicit instants still use advanceSequence directly.",
        "  const advanceCurrent = independentText ? (now: number) => {",
        "    const drawFailed = fillRandomBytes(fill, random);",
        "    if (drawFailed) return drawFailed;",
        "    lastMs = now;",
        "    counterHi = seedHi(random);",
        "    counterLo = seedLo(random);",
        "    return undefined;",
        "  } : advanceSequence;",
        "",
        "  function bytes(out?: Uint8Array, offset = 0): Uint8Array | UuidSlugError {",
      ].join("\n"),
    );
    return replaceOnce(
      withUpdater,
      "      const failed = advanceSequence(now, fraction);",
      "      const failed = advanceCurrent(now, fraction);",
    );
  };
  return [
    {
      name: "bun-independent-step",
      companionEdits,
      get source() {
        return independent();
      },
    },
    {
      name: "bun-independent-step-lost-tail",
      companionEdits,
      get source() {
        return replaceOnce(
          independent(),
          "    lastMs = now;",
          "    random[9] = 0;\n    lastMs = now;",
        );
      },
    },
    {
      name: "bun-independent-step-lost-prefix",
      companionEdits,
      get source() {
        return replaceOnce(independent(), "    counterHi = seedHi(random);", "    counterHi = 0;");
      },
    },
    {
      name: "bun-independent-step-lost-clock",
      companionEdits,
      get source() {
        return replaceOnce(independent(), "    lastMs = now;", "    lastMs = 0;");
      },
    },
  ];
}
