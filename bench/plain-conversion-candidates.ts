// SPDX-License-Identifier: Apache-2.0

import { replaceOnce } from "./candidate-source";
import type { SourceCandidate } from "./candidate-source";

/** Compare validated plain conversion without changing shared masked or generated writers. */
export function plainConversionCandidates(source: string): readonly SourceCandidate[] {
  const selection = [
    "// The public converters validate exactly one UUID before selecting its plain spelling.",
    "// No mask tail or arbitrary byte length reaches this selected writer; those keep encode.",
    'const nativePlain = typeof Bun === "undefined" ? undefined : (Uint8Array.prototype as {',
    '  toBase64?: (options: { alphabet: "base64url"; omitPadding: boolean }) => string;',
    "}).toBase64;",
    "const plainBase64Options = { alphabet: BASE64URL_NAME, omitPadding: true } as const;",
    "const encodePlain = nativePlain ? (bytes: Uint8Array, alpha: Alphabet): string => {",
    "  if (alpha === BASE64URL) {",
    "    try { return nativePlain.call(bytes, plainBase64Options); } catch { /* Keep the portable result on capability failure. */ }",
    "  }",
    "  return encode(bytes, alpha);",
    "} : encode;",
    "",
  ].join("\n");
  return [
    { name: "baseline", source },
    {
      name: "native-plain-boundary",
      get source() {
        return replaceOnce(
          replaceOnce(
            replaceOnce(
              source,
              "const textSlugScratch = new Uint8Array(16);",
              selection + "const textSlugScratch = new Uint8Array(16);",
            ),
            "  return encode(\n    view.length",
            "  return encodePlain(\n    view.length",
          ),
          "  return encode(bytes, alpha) as PlainUuidSlug;",
          "  return encodePlain(bytes, alpha) as PlainUuidSlug;",
        );
      },
    },
  ];
}
