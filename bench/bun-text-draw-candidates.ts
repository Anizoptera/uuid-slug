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
  // chooses once: full draws regress on Node LTS and Deno, while Bun pairs improve.
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
    return replaceOnce(
      selected,
      "      const failed = advanceSequence(now, fraction);",
      [
        "      // Private module text draws have no ordering promise. Keep the shared guard and",
        "      // buffer; created generators and explicit instants retain sequence behavior.",
        "      // Remeasure full calls if seed copying or sequence continuation costs change.",
        "      if (independentText && target === textBytes) {",
        "        const drawFailed = fillRandomBytes(fill, random);",
        "        if (drawFailed) return drawFailed;",
        "        return writeBytes(target, offset, now, seedHi(random), seedLo(random));",
        "      }",
        "      const failed = advanceSequence(now, fraction);",
      ].join("\n"),
    );
  };
  return [
    {
      name: "bun-independent-text",
      companionEdits,
      get source() {
        return independent();
      },
    },
    {
      name: "bun-independent-text-lost-tail",
      companionEdits,
      get source() {
        return replaceOnce(
          independent(),
          "        return writeBytes(target, offset, now, seedHi(random), seedLo(random));",
          "        random[9] = 0;\n        return writeBytes(target, offset, now, seedHi(random), seedLo(random));",
        );
      },
    },
    {
      name: "bun-independent-text-lost-prefix",
      companionEdits,
      get source() {
        return replaceOnce(
          independent(),
          "        return writeBytes(target, offset, now, seedHi(random), seedLo(random));",
          "        return writeBytes(target, offset, now, 0, seedLo(random));",
        );
      },
    },
    {
      name: "bun-independent-text-lost-clock",
      companionEdits,
      get source() {
        return replaceOnce(
          independent(),
          "        return writeBytes(target, offset, now, seedHi(random), seedLo(random));",
          "        return writeBytes(target, offset, 0, seedHi(random), seedLo(random));",
        );
      },
    },
  ];
}
