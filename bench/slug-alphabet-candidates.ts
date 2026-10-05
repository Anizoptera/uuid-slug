// SPDX-License-Identifier: Apache-2.0

import { replaceOnce } from "./candidate-source";
import type { SourceCandidate } from "./candidate-source";

export function slugAlphabetCandidates(source: string): readonly SourceCandidate[] {
  // Complete consumer calls decide whether fixed comparisons remove work or merely alter JIT shape.
  // Keep wrapper normalization and the invalid-name diagnostic outside this substitution.
  const lookup =
    "  if (name !== undefined && Object.prototype.hasOwnProperty.call(SLUG_ALPHABET_CODECS, name))\n" +
    "    return SLUG_ALPHABET_CODECS[name as SlugAlphabet];";
  const direct = (base32Result: string) =>
    replaceOnce(
      source,
      lookup,
      "  if (name === BASE64URL_NAME) return BASE64URL;\n" +
        `  if (name === BASE32HEX_NAME) return ${base32Result};`,
    );
  return [
    { name: "baseline", source },
    {
      name: "direct",
      get source() {
        return direct("BASE32HEX");
      },
    },
    {
      name: "direct-wrong-alphabet",
      get source() {
        return direct("BASE64URL");
      },
    },
  ];
}
