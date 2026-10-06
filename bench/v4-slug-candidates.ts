// SPDX-License-Identifier: Apache-2.0

import { replaceOnce } from "./candidate-source";
import type { SourceCandidate } from "./candidate-source";

export function v4SlugCandidates(source: string, slugSource?: string): readonly SourceCandidate[] {
  // The shared alphabet substitution loses complete calls. Isolate selection at the slug
  // entry instead; keep secure drawing, preset normalization and base32 writing unchanged.
  const native = [
    "// Select only Bun: native encoding on other hosts has not earned this path.",
    'let nativeV4SlugBase64 = typeof Bun === "undefined" ? undefined :',
    "  (Uint8Array.prototype as { toBase64?: (options: { alphabet: typeof BASE64URL_NAME; omitPadding: boolean }) => string }).toBase64;",
    "const V4_SLUG_BASE64_OPTIONS = { alphabet: BASE64URL_NAME, omitPadding: true } as const;",
    "",
  ].join("\n");
  function sharedWriterSource() {
    if (slugSource === undefined) throw new Error("Shared writer requires the plain-slug source.");
    const start = slugSource.indexOf("      if (nativePlainUuidBase64) {");
    const ending = "      return encode(bytes, BASE64URL) as PlainUuidSlug;\n";
    const end = slugSource.indexOf(ending, start);
    if (start < 0 || end < 0) throw new Error("Native plain writer anchors changed.");
    // Copy the complete body and its comments unchanged before replacing the original span.
    const body = slugSource.slice(start, end + ending.length);
    const helper = [
      "// Validated conversion and generation share native capture and permanent fallback state.",
      "// Keep input checks at their owners; remeasure both complete calls after changing this split.",
      "export function encodePlainUuidBase64urlUnchecked(bytes: Uint8Array): PlainUuidSlug {",
      body,
      "}",
      "",
    ].join("\n");
    const withHelper = replaceOnce(
      slugSource,
      "// Keep general normalization separate",
      helper + "// Keep general normalization separate",
    );
    const context =
      "    }\n  }\n  return uuidBytesToPlainSlugGeneral(bytes, offsetOrAlphabet, alphabet);";
    return replaceOnce(
      withHelper,
      body + context,
      "      return encodePlainUuidBase64urlUnchecked(bytes);\n" + context,
    );
  }
  return [
    { name: "baseline", source },
    {
      name: "shared-selected",
      get source() {
        // Select once so absent hosts retain the direct encoder; measure the native wrapper
        // through complete calls because its alphabet branch can still erase the small gain.
        const selector = [
          "// Select absent hosts directly; native support shares the converter's permanent fallback.",
          "// Remeasure complete calls if this wrapper or alphabet selection changes.",
          "function selectV4SlugWriter() {",
          "  const nativeWriter = nativePlainUuidBase64urlWriter;",
          "  if (!nativeWriter) return encode;",
          "  return (bytes: Uint8Array, alpha: typeof BASE64URL) => alpha === BASE64URL ? nativeWriter(bytes) : encode(bytes, alpha);",
          "}",
          "const encodeV4Slug = selectV4SlugWriter();",
          "",
        ].join("\n");
        return replaceOnce(
          replaceOnce(
            replaceOnce(
              replaceOnce(source, "BASE64URL_NAME, encode", "BASE64URL, BASE64URL_NAME, encode"),
              "import { resolveSlugAlphabet }",
              "import { resolveSlugAlphabet, nativePlainUuidBase64urlWriter }",
            ),
            "/**\n * Generate a plain UUIDv4 slug",
            selector + "/**\n * Generate a plain UUIDv4 slug",
          ),
          "return encode(generatedOrThrow(drawUuidV4Scratch()), resolved)",
          "return encodeV4Slug(generatedOrThrow(drawUuidV4Scratch()), resolved)",
        );
      },
      get slugSource() {
        return replaceOnce(
          sharedWriterSource(),
          "// Keep general normalization separate",
          "export const nativePlainUuidBase64urlWriter = nativePlainUuidBase64 ? encodePlainUuidBase64urlUnchecked : undefined;\n\n// Keep general normalization separate",
        );
      },
    },
    {
      name: "shared-writer",
      get source() {
        return replaceOnce(
          replaceOnce(
            replaceOnce(source, "BASE64URL_NAME, encode", "BASE64URL, BASE64URL_NAME, encode"),
            "import { resolveSlugAlphabet }",
            "import { resolveSlugAlphabet, encodePlainUuidBase64urlUnchecked }",
          ),
          "  return encode(generatedOrThrow(drawUuidV4Scratch()), resolved) as PlainUuidV4Slug;",
          [
            "  const bytes = generatedOrThrow(drawUuidV4Scratch());",
            "  return (resolved === BASE64URL ? encodePlainUuidBase64urlUnchecked(bytes) : encode(bytes, resolved)) as PlainUuidV4Slug;",
          ].join("\n"),
        );
      },
      get slugSource() {
        return sharedWriterSource();
      },
    },
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
