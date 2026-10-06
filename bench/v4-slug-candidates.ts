// SPDX-License-Identifier: Apache-2.0

import { replaceOnce } from "./candidate-source";
import type { SourceCandidate } from "./candidate-source";

export function v4SlugCandidates(source: string): readonly SourceCandidate[] {
  // The shared alphabet substitution loses complete calls. Isolate selection at the slug
  // entry instead; keep secure drawing, preset normalization and base32 writing unchanged.
  const native = [
    "// Select only Bun: native encoding on other hosts has not earned this path.",
    'let nativeV4SlugBase64 = typeof Bun === "undefined" ? undefined :',
    "  (Uint8Array.prototype as { toBase64?: (options: { alphabet: typeof BASE64URL_NAME; omitPadding: boolean }) => string }).toBase64;",
    "const V4_SLUG_BASE64_OPTIONS = { alphabet: BASE64URL_NAME, omitPadding: true } as const;",
    "",
  ].join("\n");
  return [
    { name: "baseline", source },
    {
      name: "shared-converter",
      get source() {
        // Reuse native capture and failure state before extracting another writer. The existing
        // converter's exact-array checks may erase the gain; complete generation decides that.
        return replaceOnce(
          replaceOnce(
            replaceOnce(source, "BASE64URL_NAME, encode", "BASE64URL, BASE64URL_NAME, encode"),
            "import { resolveSlugAlphabet }",
            "import { resolveSlugAlphabet, uuidBytesToPlainSlug }",
          ),
          "  return encode(generatedOrThrow(drawUuidV4Scratch()), resolved) as PlainUuidV4Slug;",
          [
            "  const bytes = generatedOrThrow(drawUuidV4Scratch());",
            "  return (resolved === BASE64URL ? uuidBytesToPlainSlug(bytes) : encode(bytes, resolved)) as PlainUuidV4Slug;",
          ].join("\n"),
        );
      },
    },
    {
      name: "preset-fast",
      get source() {
        // Isolate preset recognition before combining it with native encoding. Wrapped strings
        // and other alphabets still use the existing normalizer, including its failure boundary.
        return replaceOnce(
          replaceOnce(source, "BASE64URL_NAME, encode", "BASE64URL, BASE64URL_NAME, encode"),
          "  const resolved = resolveSlugAlphabet(alphabet);",
          "  const resolved = alphabet === BASE64URL_NAME ? BASE64URL : resolveSlugAlphabet(alphabet);",
        );
      },
    },
    {
      name: "native-entry",
      get source() {
        return replaceOnce(
          replaceOnce(
            replaceOnce(source, "BASE64URL_NAME, encode", "BASE64URL, BASE64URL_NAME, encode"),
            "/**\n * Generate a plain UUIDv4 slug",
            native + "/**\n * Generate a plain UUIDv4 slug",
          ),
          "  return encode(generatedOrThrow(drawUuidV4Scratch()), resolved) as PlainUuidV4Slug;",
          [
            "  const bytes = generatedOrThrow(drawUuidV4Scratch());",
            "  // A failed optional encoder permanently selects the existing writer; never redraw entropy.",
            "  if (resolved === BASE64URL && nativeV4SlugBase64) {",
            "    try { return nativeV4SlugBase64.call(bytes, V4_SLUG_BASE64_OPTIONS) as PlainUuidV4Slug; }",
            "    catch { nativeV4SlugBase64 = undefined; }",
            "  }",
            "  return encode(bytes, resolved) as PlainUuidV4Slug;",
          ].join("\n"),
        );
      },
    },
  ];
}
