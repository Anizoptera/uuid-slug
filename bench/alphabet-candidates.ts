// SPDX-License-Identifier: Apache-2.0

import { replaceOnce } from "./candidate-source";
import type { SourceCandidate } from "./candidate-source";

export function alphabetCandidates(source: string): readonly SourceCandidate[] {
  // Compare complete calls: a native kernel can lose once dispatch and exception containment
  // are included. Non-Bun runtimes must keep their original writer without a per-call Bun test.
  const declaration =
    "export function encode(bytes: Uint8Array, alpha: Alphabet, tail = 0, tailBits = 0): string {";
  const capability = "const createLatin1Scratch = runtime.latin1Scratch;";
  const native =
    'const bunPlainToBase64 = typeof Bun !== "undefined" ? nativeToBase64 : undefined;\n';
  const call =
    "if (bunPlainToBase64 && bytes.length === 16 && alpha === BASE64URL && tailBits === 0) {\n    try { return bunPlainToBase64.call(bytes, BASE64_OPTIONS); } catch { /* Keep the existing writer when the optional native capability fails. */ }\n  }\n";
  // Keep native string construction, tables and tails identical; complete slug calls decide
  // whether removing five loop iterations earns the larger fixed body.
  const loop = [
    "  for (let offset = 0, written = 0; offset < 15; offset += 3, written += 4) {",
    "    const block =",
    "      ((bytes[offset] as number) << 16) |",
    "      ((bytes[offset + 1] as number) << 8) |",
    "      (bytes[offset + 2] as number);",
    "    text[written] = codes[block >>> 18] as number;",
    "    text[written + 1] = codes[(block >>> 12) & 63] as number;",
    "    text[written + 2] = codes[(block >>> 6) & 63] as number;",
    "    text[written + 3] = codes[block & 63] as number;",
    "  }",
  ].join("\n");
  const fixed = Array.from({ length: 5 }, (_, index) => {
    const offset = index * 3;
    const written = index * 4;
    const block = `block${index}`;
    return [
      `  const ${block} = ((bytes[${offset}] as number) << 16) | ((bytes[${offset + 1}] as number) << 8) | (bytes[${offset + 2}] as number);`,
      `  text[${written}] = codes[${block} >>> 18] as number;`,
      `  text[${written + 1}] = codes[(${block} >>> 12) & 63] as number;`,
      `  text[${written + 2}] = codes[(${block} >>> 6) & 63] as number;`,
      `  text[${written + 3}] = codes[${block} & 63] as number;`,
    ].join("\n");
  }).join("\n");
  return [
    { name: "baseline", source },
    {
      name: "fixed-blocks",
      get source() {
        return replaceOnce(source, loop, fixed);
      },
    },
    {
      name: "fixed-blocks-lost-byte",
      get source() {
        return replaceOnce(source, loop, fixed + "\n  text[19] = 0;");
      },
    },
    {
      name: "native-branch",
      get source() {
        return replaceOnce(
          replaceOnce(source, capability, native + capability),
          declaration,
          declaration + "\n  " + call,
        );
      },
    },
    {
      name: "native-dispatch",
      get source() {
        return (
          replaceOnce(
            replaceOnce(source, capability, native + capability),
            declaration,
            "function encodeFixed(bytes: Uint8Array, alpha: Alphabet, tail = 0, tailBits = 0): string {",
          ) +
          "\n/*#__NO_SIDE_EFFECTS__*/\nfunction encodeNativePlain(bytes: Uint8Array, alpha: Alphabet, tail = 0, tailBits = 0): string {\n  " +
          call +
          "  return encodeFixed(bytes, alpha, tail, tailBits);\n}\nexport const encode = bunPlainToBase64 ? encodeNativePlain : encodeFixed;\n"
        );
      },
    },
  ];
}
