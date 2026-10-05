// SPDX-License-Identifier: Apache-2.0

import { replaceOnce } from "./candidate-source";
import type { SourceCandidate } from "./candidate-source";
import { poolCandidates } from "./pool-candidates";
import { alphabetCandidates } from "./alphabet-candidates";
import { keylessCandidates } from "./keyless-candidates";
import { v7Candidates } from "./v7-draw-candidates";

export type { SourceCandidate } from "./candidate-source";

export const CANDIDATE_GROUPS = [
  "v7-draw",
  "v4",
  "alphabet",
  "slug",
  "keyless",
  "format",
  "latin1",
  "codec",
  "value",
  "value-options",
  "pool",
] as const;
export type CandidateGroup = (typeof CANDIDATE_GROUPS)[number];
export const CANDIDATE_FILES = {
  "v7-draw": "src/v7.ts",
  v4: "src/v4.ts",
  alphabet: "src/alphabet.ts",
  slug: "src/slug.ts",
  keyless: "src/v7-keyless.ts",
  format: "src/uuid.ts",
  latin1: "src/runtime/portable.ts",
  codec: "src/masking-codec.ts",
  value: "src/v7-value.ts",
  "value-options": "src/v7-value-options.ts",
  pool: "src/runtime/pool.ts",
} as const satisfies Record<CandidateGroup, string>;

function v4Candidates(source: string): readonly SourceCandidate[] {
  // Isolate the extra native helper call from preset checks and failure containment. Copy its
  // entire body and comments into the public implementation; only its return boundary changes.
  // The string-first variant tests recognition cost separately from helper placement.
  const nativeReturn = [
    "  return (",
    '    textCase === UUID_TEXT_UPPERCASE && typeof uuid === "string" ? uuid.toUpperCase() : uuid',
    "  ) as UuidV4StringFor<Case> | UuidSlugError;",
  ].join("\n");
  const inlineNative = (stringFirst = false): string => {
    // Retained inlining removes this historical helper; reject that experiment explicitly
    // without preventing baseline or independent byte-allocation candidates from running.
    const nativeStart = source.indexOf("function nativeOrPortableUuidV4<");
    const nativeEnd = source.indexOf("\n/**\n * Generate UUIDv4 text with platform", nativeStart);
    if (nativeStart < 0 || nativeEnd < 0) throw new Error("UUIDv4 native helper span is missing");
    const nativeSpan = source.slice(nativeStart, nativeEnd);
    const bodyStart = nativeSpan.indexOf("\n): UuidV4StringFor<Case> | UuidSlugError {\n");
    if (bodyStart < 0) throw new Error("UUIDv4 native helper signature is missing");
    const nativeBody = nativeSpan.slice(nativeSpan.indexOf("{\n", bodyStart) + 2, -2);
    const body = replaceOnce(
      replaceOnce(
        nativeBody,
        "if (!native) return generatePortableUuidV4(textCase);",
        "if (!native) return generatedOrThrow(generatePortableUuidV4(textCase));",
      ),
      nativeReturn,
      stringFirst
        ? [
            '  if (typeof uuid !== "string") return generatedOrThrow(uuid);',
            "  return (textCase === UUID_TEXT_UPPERCASE ? uuid.toUpperCase() : uuid) as UuidV4StringFor<Case>;",
          ].join("\n")
        : [
            "  return generatedOrThrow(",
            '    (textCase === UUID_TEXT_UPPERCASE && typeof uuid === "string" ? uuid.toUpperCase() : uuid) as UuidV4StringFor<Case> | UuidSlugError,',
            "  );",
          ].join("\n"),
    );
    return replaceOnce(
      source.slice(0, nativeStart) + source.slice(nativeEnd),
      "  return generatedOrThrow(nativeOrPortableUuidV4(textCase));",
      body.trimEnd(),
    );
  };
  const nativeAllocation = (method: "fromHex" | "fromBase64", input: string) =>
    replaceOnce(
      replaceOnce(
        source,
        "const UUID_V4_GENERATION =",
        `const allocateUuidV4Bytes = (Uint8Array as { ${method}?: (value: string) => Uint8Array<ArrayBuffer> }).${method}?.bind(Uint8Array, "${input}") ?? (() => new Uint8Array(16));\nconst UUID_V4_GENERATION =`,
      ),
      "const output = new Uint8Array(16);",
      "const output = allocateUuidV4Bytes();",
    );
  const anchor =
    "export function generateUuidV4<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(\n  textCase: Case = UUID_TEXT_LOWERCASE as Case,\n): UuidV4StringFor<Case> | UuidSlugError {\n  if (!isUuidTextCase(textCase)) {";
  const fast = (condition: string) =>
    replaceOnce(
      source,
      anchor,
      anchor
        .replace("textCase: Case = UUID_TEXT_LOWERCASE as Case", "textCase?: Case")
        .replace(
          "  if (!isUuidTextCase(textCase)) {",
          "  if (" +
            condition +
            ") return generatedOrThrow(nativeOrPortableUuidV4(UUID_TEXT_LOWERCASE)) as UuidV4StringFor<Case>;\n  if (!isUuidTextCase(textCase)) {",
        ),
    );
  return [
    { name: "baseline", source },
    {
      name: "duplicate-generation-timing",
      get source() {
        // Keep the valid returned identifier while restoring observable redundant secure draws.
        // This mutation proves a packed timing gate reaches generation, not just its reporter.
        return replaceOnce(
          source,
          "  const native = runtime.uuidV4;",
          "  for (let draw = 0; draw < 16; draw += 1) generatePortableUuidV4(textCase);\n  const native = runtime.uuidV4;",
        );
      },
    },
    {
      name: "inline-native",
      get source() {
        return inlineNative();
      },
    },
    {
      name: "inline-native-string-first",
      get source() {
        return inlineNative(true);
      },
    },
    {
      name: "inline-native-extra-buffer",
      get source() {
        return replaceOnce(
          source.includes("function nativeOrPortableUuidV4<") ? inlineNative(true) : source,
          '  if (typeof uuid !== "string") return generatedOrThrow(uuid);',
          '  if (typeof uuid !== "string") return generatedOrThrow(uuid);\n  new Uint8Array(16);',
        );
      },
    },
    {
      name: "string-first",
      get source() {
        return replaceOnce(
          source,
          "  return generatedOrThrow(nativeOrPortableUuidV4(textCase));",
          [
            "  const uuid = nativeOrPortableUuidV4(textCase);",
            '  return typeof uuid === "string" ? uuid : generatedOrThrow(uuid);',
          ].join("\n"),
        );
      },
    },
    {
      name: "string-first-lost-throw",
      get source() {
        return replaceOnce(
          source,
          "  return generatedOrThrow(nativeOrPortableUuidV4(textCase));",
          "  return nativeOrPortableUuidV4(textCase);",
        );
      },
    },
    {
      name: "inline-native-lost-fallback",
      get source() {
        return replaceOnce(
          source.includes("function nativeOrPortableUuidV4<") ? inlineNative() : source,
          [
            "      uuid = portableAfterNative<UuidTextCase>(",
            "        nativeCause,",
            "        generatePortableUuidV4,",
            "        UUID_TEXT_LOWERCASE,",
            "        UUID_V4_GENERATION,",
            "      );",
          ].join("\n"),
          "      throw nativeCause;",
        );
      },
    },
    {
      // Engine-native decoders allocate owned arrays; secure fill still supplies every UUID bit.
      name: "native-zero-hex",
      get source() {
        return nativeAllocation("fromHex", "00000000000000000000000000000000");
      },
    },
    {
      name: "native-zero-base64",
      get source() {
        return nativeAllocation("fromBase64", "AAAAAAAAAAAAAAAAAAAAAA==");
      },
    },
    {
      name: "undefined-fast",
      get source() {
        return fast("textCase === undefined");
      },
    },
    {
      name: "argument-fast",
      get source() {
        return fast("arguments.length === 0 || textCase === undefined");
      },
    },
    {
      name: "literal-guards",
      get source() {
        return replaceOnce(
          source,
          anchor,
          anchor.replace(
            "!isUuidTextCase(textCase)",
            "textCase !== UUID_TEXT_LOWERCASE && textCase !== UUID_TEXT_UPPERCASE",
          ),
        );
      },
    },
    {
      name: "native-direct-return",
      get source() {
        // Native results need no package validation; move error handling off successful calls.
        // Exact anchors restrict this experiment to the direct-delegation baseline.
        return replaceOnce(
          replaceOnce(
            source,
            "  let uuid: string | UuidSlugError;\n  try {\n    uuid = native();",
            "  try {\n    const uuid = native();\n    return (textCase === UUID_TEXT_UPPERCASE ? uuid.toUpperCase() : uuid) as UuidV4StringFor<Case>;",
          ),
          [
            "    uuid = portableAfterNative<UuidTextCase>(",
            "      nativeCause,",
            "      generatePortableUuidV4,",
            "      UUID_TEXT_LOWERCASE,",
            "      UUID_V4_GENERATION,",
            "    );",
            "  }",
            '  if (typeof uuid !== "string") return generatedOrThrow(uuid);',
            "  return (textCase === UUID_TEXT_UPPERCASE ? uuid.toUpperCase() : uuid) as UuidV4StringFor<Case>;",
          ].join("\n"),
          [
            "    return generatedOrThrow(portableAfterNative<UuidTextCase>(",
            "      nativeCause, generatePortableUuidV4, textCase, UUID_V4_GENERATION,",
            "    )) as UuidV4StringFor<Case>;",
            "  }",
          ].join("\n"),
        );
      },
    },
    {
      name: "array-buffer",
      get source() {
        return replaceOnce(
          source,
          "const output = new Uint8Array(16);",
          "const output = new Uint8Array(new ArrayBuffer(16));",
        );
      },
    },
    {
      name: "scratch-slice",
      get source() {
        return replaceOnce(
          source,
          "const output = new Uint8Array(16);",
          "const output = random.slice();",
        );
      },
    },
  ];
}

/** Build live alternatives from the exact checkout being measured; stale anchors fail before timing. */
export function createSourceCandidates(
  group: CandidateGroup,
  source: string,
  uuidSource?: string,
): readonly SourceCandidate[] {
  const builders = {
    v4: v4Candidates,
    "v7-draw": (value: string) => v7Candidates(value, uuidSource),
    alphabet: alphabetCandidates,
    slug: slugCandidates,
    keyless: keylessCandidates,
    format: formatCandidates,
    latin1: latin1Candidates,
    codec: codecCandidates,
    value: valueCandidates,
    "value-options": valueOptionCandidates,
    pool: poolCandidates,
  } satisfies Record<CandidateGroup, (source: string) => readonly SourceCandidate[]>;
  return builders[group](source);
}

function codecCandidates(source: string): readonly SourceCandidate[] {
  // Primitive-text decoders own their result; byte inputs must retain the existing copy.
  const ownedText = () =>
    replaceOnce(
      source,
      "    return encodeMasked(bytes);",
      '    return encodeMasked(bytes, typeof uuid === "string");',
    );
  const scratchText = () =>
    replaceOnce(
      source,
      "  function uuidToMaskedSlug(uuid: unknown): MaskedOrSentinelUuidV7Slug | UuidSlugError {",
      [
        "  function uuidToMaskedSlug(uuid: unknown): MaskedOrSentinelUuidV7Slug | UuidSlugError {",
        '    if (typeof uuid === "string" && (uuid.length === 36 || uuid.length === 32)) {',
        "      const bytes = uuidStringToBytes(uuid, encodeScratch);",
        "      return bytes instanceof Error ? bytes : encodeMasked(encodeScratch, true);",
        "    }",
      ].join("\n"),
    );
  return [
    { name: "baseline", source },
    {
      name: "scratch-text",
      get source() {
        return scratchText();
      },
    },
    {
      name: "scratch-text-lost-borrow",
      get source() {
        return replaceOnce(
          scratchText(),
          "    if (localBytes) return encodeMasked(localBytes);",
          "    if (localBytes) return encodeMasked(localBytes, true);",
        );
      },
    },
    {
      name: "owned-text",
      get source() {
        return ownedText();
      },
    },
    {
      name: "owned-text-lost-borrow",
      get source() {
        return replaceOnce(
          ownedText(),
          "    if (localBytes) return encodeMasked(localBytes);",
          "    if (localBytes) return encodeMasked(localBytes, true);",
        );
      },
    },
  ];
}

function slugCandidates(source: string): readonly SourceCandidate[] {
  // Isolate caller normalization from encoding: scalar presets identify the alphabet already,
  // while boxed strings and untyped values still need the original normalization and errors.
  const original = [
    "  const alpha = resolveSlugAlphabet(",
    "    alphabetIsSecond ? offsetOrAlphabet : (alphabet ?? BASE64URL_NAME),",
    "  );",
  ].join("\n");
  const selected =
    "  const selectedAlphabet = alphabetIsSecond ? offsetOrAlphabet : (alphabet ?? BASE64URL_NAME);\n";
  const nativePlain = (
    placement:
      | "resolved"
      | "default-inline"
      | "default-helper"
      | "default-intrinsic"
      | "default-split"
      | "presets-split" = "resolved",
  ): string => {
    // Keep writer functions out of decoder metadata; the public conversion owns this selection.
    const capability = [
      'let nativePlainUuidBase64 = typeof Bun === "undefined" ? undefined : (Uint8Array.prototype as { toBase64?: (options: { alphabet: typeof BASE64URL_NAME; omitPadding: boolean }) => string }).toBase64;',
      "const NATIVE_PLAIN_UUID_BASE64_OPTIONS = { alphabet: BASE64URL_NAME, omitPadding: true } as const;",
      "",
    ].join("\n");
    if (placement !== "resolved") {
      const signature = "): PlainUuidSlug | UuidSlugError {\n  const alphabetIsSecond";
      const selectedNative =
        placement === "presets-split"
          ? [
              "  if (nativePlainUuidBase64 && isUint8Array(bytes) && bytes.length === 16) {",
              '    const selectedAlphabet = typeof offsetOrAlphabet === "number"',
              "      ? offsetOrAlphabet === 0 ? (alphabet ?? BASE64URL_NAME) : undefined",
              "      : alphabet === undefined ? offsetOrAlphabet : undefined;",
              "    if (selectedAlphabet === BASE32HEX_NAME) return encode(bytes, BASE32HEX) as PlainUuidSlug;",
              "    if (selectedAlphabet === BASE64URL_NAME) {",
              "      try { return nativePlainUuidBase64.call(bytes, NATIVE_PLAIN_UUID_BASE64_OPTIONS) as PlainUuidSlug; } catch { nativePlainUuidBase64 = undefined; }",
              "    }",
              "  }",
              "  const alphabetIsSecond",
            ].join("\n")
          : [
              "  if (nativePlainUuidBase64 &&",
              "      (offsetOrAlphabet === 0 || offsetOrAlphabet === BASE64URL_NAME) &&",
              "      (alphabet === undefined || (offsetOrAlphabet === 0 && alphabet === BASE64URL_NAME)) &&",
              placement === "default-intrinsic"
                ? "      true) {"
                : "      isUint8Array(bytes) && bytes.length === 16) {",
              placement === "default-intrinsic"
                ? "    try { const encoded = nativePlainUuidBase64.call(bytes, NATIVE_PLAIN_UUID_BASE64_OPTIONS); if (encoded.length === 22) return encoded as PlainUuidSlug; } catch { if (isUint8Array(bytes) && bytes.length === 16) nativePlainUuidBase64 = undefined; }"
                : placement === "default-helper"
                  ? "    return nativeDefaultPlainUuid(bytes, nativePlainUuidBase64);"
                  : "    try { return nativePlainUuidBase64.call(bytes, NATIVE_PLAIN_UUID_BASE64_OPTIONS) as PlainUuidSlug; } catch { nativePlainUuidBase64 = undefined; }",
              "  }",
              "  const alphabetIsSecond",
            ].join("\n");
      if (placement === "default-split" || placement === "presets-split") {
        // Copy the general body intact so only native dispatch placement differs. A stale
        // boundary must reject the experiment rather than silently drop checks or comments.
        const start = source.indexOf(
          "/*#__NO_SIDE_EFFECTS__*/\nexport function uuidBytesToPlainSlug(",
        );
        const end = source.indexOf("\n}\n\n/**\n * Decode a canonical plain slug", start) + 2;
        if (start < 0 || end <= start) throw new Error("UUID byte conversion span is missing");
        const originalSpan = source.slice(start, end);
        const bodyStart = originalSpan.indexOf("  const alphabetIsSecond");
        if (bodyStart < 0) throw new Error("UUID byte conversion body is missing");
        const general = replaceOnce(
          originalSpan,
          "export function uuidBytesToPlainSlug(",
          "function generalUuidBytesToPlainSlug(",
        );
        const wrapper =
          originalSpan.slice(0, bodyStart) +
          replaceOnce(
            selectedNative,
            "  const alphabetIsSecond",
            "  return generalUuidBytesToPlainSlug(bytes, offsetOrAlphabet, alphabet);\n}",
          );
        return replaceOnce(
          replaceOnce(source, originalSpan, wrapper + "\n\n" + general),
          "const SLUG_ALPHABET_BY_LENGTH:",
          capability + "const SLUG_ALPHABET_BY_LENGTH:",
        );
      }
      const helper =
        placement === "default-helper"
          ? [
              "function nativeDefaultPlainUuid(bytes: Uint8Array, native: (options: { alphabet: typeof BASE64URL_NAME; omitPadding: boolean }) => string): PlainUuidSlug {",
              "  try { return native.call(bytes, NATIVE_PLAIN_UUID_BASE64_OPTIONS) as PlainUuidSlug; }",
              "  catch { nativePlainUuidBase64 = undefined; return encode(bytes, BASE64URL) as PlainUuidSlug; }",
              "}",
              "",
            ].join("\n")
          : "";
      return replaceOnce(
        replaceOnce(
          source,
          "const SLUG_ALPHABET_BY_LENGTH:",
          capability + helper + "const SLUG_ALPHABET_BY_LENGTH:",
        ),
        signature,
        "): PlainUuidSlug | UuidSlugError {\n" + selectedNative,
      );
    }
    const before = "  if (alpha instanceof Error) return alpha;\n  return encode(\n";
    const after = before.replace(
      "  return encode(\n",
      [
        "  if (nativePlainUuidBase64 && alpha === BASE64URL) {",
        "    try { return nativePlainUuidBase64.call(view.length === 16 ? view : view.subarray(offset, offset + 16), NATIVE_PLAIN_UUID_BASE64_OPTIONS) as PlainUuidSlug; }",
        "    catch { nativePlainUuidBase64 = undefined; }",
        "  }",
        "  return encode(\n",
      ].join("\n"),
    );
    return replaceOnce(
      replaceOnce(
        source,
        "const SLUG_ALPHABET_BY_LENGTH:",
        capability + "const SLUG_ALPHABET_BY_LENGTH:",
      ),
      before,
      after,
    );
  };
  const presetReturns = (native: boolean): string => {
    const alphaSelection = [
      "  const alpha =",
      "    selectedAlphabet === BASE64URL_NAME",
      "      ? BASE64URL",
      "      : selectedAlphabet === BASE32HEX_NAME",
      "        ? BASE32HEX",
      "        : resolveSlugAlphabet(selectedAlphabet);",
    ].join("\n");
    const direct = [
      "  const payload = view.length === 16 ? view : view.subarray(offset, offset + 16);",
      "  if (selectedAlphabet === BASE32HEX_NAME) return encode(payload, BASE32HEX) as PlainUuidSlug;",
      "  if (selectedAlphabet === BASE64URL_NAME) {",
      ...(native
        ? [
            "    if (nativePlainUuidBase64) {",
            "      try { return nativePlainUuidBase64.call(payload, NATIVE_PLAIN_UUID_BASE64_OPTIONS) as PlainUuidSlug; }",
            "      catch { nativePlainUuidBase64 = undefined; }",
            "    }",
          ]
        : []),
      "    return encode(payload, BASE64URL) as PlainUuidSlug;",
      "  }",
      "  const alpha = resolveSlugAlphabet(selectedAlphabet);",
    ].join("\n");
    return replaceOnce(native ? nativePlain() : source, alphaSelection, direct);
  };
  return [
    { name: "baseline", source },
    {
      // Preserve guard results while forcing redundant validation before its normal return.
      name: "duplicate-guard-timing",
      get source() {
        const anchor =
          "export function isPlainUuidV7Slug(value: unknown): value is PlainUuidV7Slug {\n";
        return replaceOnce(
          source,
          anchor,
          anchor +
            "  for (let repeat = 0; repeat < 64; repeat += 1) { if (!isVersionedSlug(value, 7)) return false; }\n",
        );
      },
    },
    {
      name: "preset-returns",
      get source() {
        return presetReturns(false);
      },
    },
    {
      name: "native-preset-returns",
      get source() {
        return presetReturns(true);
      },
    },
    {
      name: "native-public",
      get source() {
        return nativePlain();
      },
    },
    {
      name: "native-fixed-entry",
      get source() {
        const encoder = [
          "const PLAIN_UUID_ENCODER = /*#__PURE__*/ (() => {",
          '  const native = typeof Bun === "undefined" ? undefined : (Uint8Array.prototype as { toBase64?: (options: { alphabet: typeof BASE64URL_NAME; omitPadding: boolean }) => string }).toBase64;',
          "  const entry: { write: (bytes: Uint8Array, alpha: Alphabet) => string } = { write: encode };",
          "  if (!native) return entry;",
          "  const options = { alphabet: BASE64URL_NAME, omitPadding: true } as const;",
          "  entry.write = (bytes, alpha) => {",
          "    if (alpha !== BASE64URL) return encode(bytes, alpha);",
          "    try { return native.call(bytes, options); }",
          "    catch { entry.write = encode; return encode(bytes, alpha); }",
          "  };",
          "  return entry;",
          "})();",
          "",
        ].join("\n");
        return replaceOnce(
          replaceOnce(
            source,
            "const SLUG_ALPHABET_BY_LENGTH:",
            encoder + "const SLUG_ALPHABET_BY_LENGTH:",
          ),
          "  return encode(\n    view.length === 16 ? view : view.subarray(offset, offset + 16),\n    alpha,\n  ) as PlainUuidSlug;",
          "  return PLAIN_UUID_ENCODER.write(view.length === 16 ? view : view.subarray(offset, offset + 16), alpha) as PlainUuidSlug;",
        );
      },
    },
    {
      name: "native-encoder-map",
      get source() {
        const encoders = [
          "const PLAIN_UUID_ENCODERS = /*#__PURE__*/ (() => {",
          "  const portableBase64 = (bytes: Uint8Array) => encode(bytes, BASE64URL);",
          "  const writers = {",
          "    [BASE64URL_NAME]: portableBase64,",
          "    [BASE32HEX_NAME]: (bytes: Uint8Array) => encode(bytes, BASE32HEX),",
          "  };",
          '  const native = typeof Bun === "undefined" ? undefined : (Uint8Array.prototype as { toBase64?: (options: { alphabet: typeof BASE64URL_NAME; omitPadding: boolean }) => string }).toBase64;',
          "  const options = { alphabet: BASE64URL_NAME, omitPadding: true } as const;",
          "  if (native) writers[BASE64URL_NAME] = (bytes) => {",
          "    try { return native.call(bytes, options); }",
          "    catch { writers[BASE64URL_NAME] = portableBase64; return portableBase64(bytes); }",
          "  };",
          "  return writers;",
          "})();",
          "",
        ].join("\n");
        return replaceOnce(
          replaceOnce(
            source,
            "const SLUG_ALPHABET_BY_LENGTH:",
            encoders + "const SLUG_ALPHABET_BY_LENGTH:",
          ),
          "  return encode(\n    view.length === 16 ? view : view.subarray(offset, offset + 16),\n    alpha,\n  ) as PlainUuidSlug;",
          "  // The selector returns only built-in alphabets; generic Alphabet.name also models private encoders.\n  return PLAIN_UUID_ENCODERS[alpha.name as SlugAlphabet](view.length === 16 ? view : view.subarray(offset, offset + 16)) as PlainUuidSlug;",
        );
      },
    },
    {
      name: "exact-range",
      get source() {
        // Exact length and numeric zero prove the same range without calling the general guard.
        return replaceOnce(
          source,
          "  const badRange = checkRange(view.length, offset, 16);",
          "  const badRange = view.length === 16 && offset === 0 ? undefined : checkRange(view.length, offset, 16);",
        );
      },
    },
    {
      name: "exact-range-lost-offset",
      get source() {
        return replaceOnce(
          source,
          "  const badRange = checkRange(view.length, offset, 16);",
          "  const badRange = view.length === 16 ? undefined : checkRange(view.length, offset, 16);",
        );
      },
    },
    {
      name: "native-default-intrinsic",
      get source() {
        return nativePlain("default-intrinsic");
      },
    },
    {
      name: "native-default-inline",
      get source() {
        return nativePlain("default-inline");
      },
    },
    {
      name: "native-default-helper",
      get source() {
        return nativePlain("default-helper");
      },
    },
    {
      name: "native-default-split",
      get source() {
        return nativePlain("default-split");
      },
    },
    {
      name: "native-presets-split",
      get source() {
        return nativePlain("presets-split");
      },
    },
    {
      name: "native-presets-helper",
      get source() {
        // Reuse the exact helper while keeping preset dispatch and the general body fixed.
        // Only exception placement differs from native-presets-split.
        const helperSource = nativePlain("default-helper");
        const start = helperSource.indexOf("function nativeDefaultPlainUuid(");
        const end = helperSource.indexOf("const SLUG_ALPHABET_BY_LENGTH:", start);
        if (start < 0 || end <= start) throw new Error("Native helper span is missing");
        return replaceOnce(
          replaceOnce(
            nativePlain("presets-split"),
            "const SLUG_ALPHABET_BY_LENGTH:",
            helperSource.slice(start, end) + "const SLUG_ALPHABET_BY_LENGTH:",
          ),
          "      try { return nativePlainUuidBase64.call(bytes, NATIVE_PLAIN_UUID_BASE64_OPTIONS) as PlainUuidSlug; } catch { nativePlainUuidBase64 = undefined; }",
          "      return nativeDefaultPlainUuid(bytes, nativePlainUuidBase64);",
        );
      },
    },
    {
      name: "default-alphabet",
      get source() {
        return replaceOnce(
          source,
          original,
          selected +
            "  const alpha = selectedAlphabet === BASE64URL_NAME ? BASE64URL : resolveSlugAlphabet(selectedAlphabet);",
        );
      },
    },
    {
      name: "scalar-alphabets",
      get source() {
        return replaceOnce(
          source,
          original,
          selected +
            "  const alpha = selectedAlphabet === BASE64URL_NAME ? BASE64URL : selectedAlphabet === BASE32HEX_NAME ? BASE32HEX : resolveSlugAlphabet(selectedAlphabet);",
        );
      },
    },
    {
      name: "default-alphabet-lost-selection",
      get source() {
        return replaceOnce(
          source,
          original,
          selected +
            "  const alpha = selectedAlphabet === BASE64URL_NAME ? BASE32HEX : resolveSlugAlphabet(selectedAlphabet);",
        );
      },
    },
  ];
}

function latin1Candidates(source: string): readonly SourceCandidate[] {
  const from = `export function bufferLatin1Scratch(hostBuffer: NonNullable<HostBuffer>) {
  return (length: number): Latin1Scratch => {
    const bytes = hostBuffer.alloc(length);
    return { bytes, text: () => bytes.toString("latin1", 0, length) };
  };
}`;
  const direct = (corrupt = false, loseFallback = false): string =>
    replaceOnce(
      source,
      from,
      `export function bufferLatin1Scratch(hostBuffer: NonNullable<HostBuffer>) {
  const slice = (hostBuffer as {
    prototype?: { latin1Slice?: (this: Uint8Array, start: number, end: number) => string };
  }).prototype?.latin1Slice;
  return (length: number): Latin1Scratch => {
    const bytes = hostBuffer.alloc(length);
    if (typeof slice !== "function")
      return { bytes, text: () => bytes.toString("latin1", 0, length) };
    // Select at factory construction, without changing the portable UUID writer or allocating
    // a second wrapper. Complete caller measurements must pay for the captured method.
    const scratch: Latin1Scratch = {
      bytes,
      text: () => {
        try {
          return slice.call(bytes, 0, ${corrupt ? "length - 1" : "length"});
        } catch {
          ${
            loseFallback
              ? 'throw new Error("lost native Latin-1 fallback");'
              : `// A failed optional method must not be retried on every subsequent read.
          scratch.text = () => bytes.toString("latin1", 0, length);
          return scratch.text();`
          }
        }
      },
    };
    return scratch;
  };
}`,
    );
  return [
    { name: "baseline", source },
    {
      name: "whole-buffer",
      get source() {
        // Scratch owns exactly the requested bytes, so a whole-buffer read can avoid explicit
        // range arguments without a new capability or allocation. Complete calls decide value.
        return replaceOnce(
          replaceOnce(
            source,
            'toString(encoding: "latin1", start: number, end: number): string;',
            'toString(encoding: "latin1", start?: number, end?: number): string;',
          ),
          from,
          from.replace('bytes.toString("latin1", 0, length)', 'bytes.toString("latin1")'),
        );
      },
    },
    {
      name: "whole-buffer-lost-byte",
      get source() {
        return replaceOnce(source, from, from.replace("0, length)", "0, length - 1)"));
      },
    },
    {
      name: "direct-latin1",
      get source() {
        return direct();
      },
    },
    {
      name: "direct-latin1-lost-byte",
      get source() {
        return direct(true);
      },
    },
    {
      name: "direct-latin1-no-fallback",
      get source() {
        return direct(false, true);
      },
    },
  ];
}

function valueOptionCandidates(source: string): readonly SourceCandidate[] {
  // All consumers only read this record. Compare one frozen empty record with per-call
  // allocation while leaving public control flow and configured reads intact.
  const shared = replaceOnce(
    replaceOnce(
      source,
      "/** Read untrusted value-generation options once and reject every unsupported key. */",
      "const EMPTY_UUID_V7_VALUE_OPTIONS: UuidV7ValueOptionValues = Object.freeze({});\n\n/** Read untrusted value-generation options once and reject every unsupported key. */",
    ),
    "if (options === undefined) return {};",
    "if (options === undefined) return EMPTY_UUID_V7_VALUE_OPTIONS;",
  );
  return [
    { name: "baseline", source },
    { name: "shared-empty", source: shared },
  ];
}

function valueCandidates(source: string): readonly SourceCandidate[] {
  // No caller options exist on this path. Skip the empty record and configuration readers,
  // but preserve the same owned draw, payload layout, immutable value and entropy failure.
  // Compare complete value calls; inlining may already remove much of the apparent work.
  const anchor = "  const values = readUuidV7ValueOptions(options, UUID_V7_VALUE_OPTIONS);";
  const fast = replaceOnce(
    source,
    anchor,
    `  if (options === undefined) {
    const generated = currentUuidV7Bytes();
    if (generated instanceof Error) throw generated;
    return createUuidValue<7, boolean, true>(generated, undefined, uuidV7DefaultPayloadLayout());
  }
${anchor}`,
  );
  const split = replaceOnce(
    fast,
    `  }
${anchor}`,
    `  }
  return generateConfiguredUuidV7Value(options);
}

function generateConfiguredUuidV7Value(options: UuidV7ValueOptions): Uuid<7, boolean, true> | UuidSlugError {
${anchor}`,
  );
  return [
    { name: "baseline", source },
    { name: "default-fast", source: fast },
    { name: "default-split", source: split },
    {
      name: "default-lost-throw",
      source: replaceOnce(
        fast,
        "    if (generated instanceof Error) throw generated;",
        "    if (generated instanceof Error) return generated;",
      ),
    },
  ];
}

function formatCandidates(source: string): readonly SourceCandidate[] {
  const asciiText = (encoding: "utf8" | "ascii", corrupt = false) =>
    replaceOnce(
      source,
      "  return scratch;\n}\n/**\n * Format through one native byte-to-string call",
      `  // UUID characters are ASCII; compare native decoding without changing any digit writes.
  // This experiment changes UUID text only, never the general Latin-1 scratch contract.
  const bytes = scratch.bytes as Uint8Array & {
    toString(encoding: "utf8" | "ascii", start: number, end: number): string;
  };
  return { bytes, text: () => bytes.toString("${encoding}", 0, ${corrupt ? "UUID_LENGTH - 1" : "UUID_LENGTH"}) };
}\n/**\n * Format through one native byte-to-string call`,
    );
  const directLatin1 = (corrupt = false) =>
    replaceOnce(
      source,
      "  return scratch;\n}\n/**\n * Format through one native byte-to-string call",
      '  const bytes = scratch.bytes;\n  const slice = (bytes as Uint8Array & {\n    latin1Slice?: (this: Uint8Array, start: number, end: number) => string;\n  }).latin1Slice;\n  // Probe once at scratch construction; generic text remains the absent-capability control.\n  // Complete consumer calls must justify the extra construction closure before retention.\n  return typeof slice === "function"\n    ? { bytes, text: () => slice.call(bytes, 0, ' +
        (corrupt ? "UUID_LENGTH - 1" : "UUID_LENGTH") +
        ") }\n    : scratch;\n}\n/**\n * Format through one native byte-to-string call",
    );
  // Keep tables, retained storage and string construction identical; only remove loop indexing.
  // Complete caller measurements decide whether the larger fixed body pays for itself.
  const loop = [
    "  for (let byteIndex = 0; byteIndex < 16; byteIndex += 1) {",
    "    const textOffset = UUID_BYTE_OFFSETS[byteIndex] as number;",
    "    const code = (bytes[offset + byteIndex] as number) * 2;",
    "    text[textOffset] = codes[code] as number;",
    "    text[textOffset + 1] = codes[code + 1] as number;",
    "  }",
  ].join("\n");
  const offsets = [0, 2, 4, 6, 9, 11, 14, 16, 19, 21, 24, 26, 28, 30, 32, 34];
  const fixed = offsets
    .map(
      (textOffset, byteIndex) =>
        `  const code${byteIndex} = (bytes[offset + ${byteIndex}] as number) * 2;\n  text[${textOffset}] = codes[code${byteIndex}] as number;\n  text[${textOffset + 1}] = codes[code${byteIndex} + 1] as number;`,
    )
    .join("\n");
  const fixedSelected = source.includes(fixed);
  const reusedPrefix = (corrupt = false): string => {
    // Keep the existing native buffer and tables; varying prefixes must pay for the comparisons.
    // Every use of this scratch goes through this writer, so other UUIDs refresh the same keys.
    const prefix = fixed.split("\n").slice(0, 30).join("\n");
    const packedWords = (
      [
        [0, 4],
        [4, 4],
        [8, 2],
      ] as const
    ).map(([start, count]) =>
      Array.from({ length: count }, (_, index) => {
        const byte = `(bytes[offset + ${start + index}] as number)`;
        const shift = (count - index - 1) * 8;
        return shift ? `(${byte} << ${shift})` : byte;
      }).join(" | "),
    );
    const guard = corrupt
      ? "latin1PrefixCodes === undefined"
      : "latin1Prefix0 !== prefix0 || latin1Prefix1 !== prefix1 || latin1Prefix2 !== prefix2 || latin1PrefixCodes !== codes";
    return replaceOnce(
      replaceOnce(
        source,
        "let uuidTextScratch: Latin1Scratch | undefined;",
        "let uuidTextScratch: Latin1Scratch | undefined;\nlet latin1Prefix0: number | undefined;\nlet latin1Prefix1: number | undefined;\nlet latin1Prefix2: number | undefined;\nlet latin1PrefixCodes: Uint8Array | undefined;",
      ),
      prefix,
      `  const prefix0 = ${packedWords[0]};\n  const prefix1 = ${packedWords[1]};\n  const prefix2 = ${packedWords[2]};\n  if (${guard}) {\n${prefix}\n    latin1Prefix0 = prefix0; latin1Prefix1 = prefix1; latin1Prefix2 = prefix2; latin1PrefixCodes = codes;\n  }`,
    );
  };
  // Wider stores exchange byte writes for packing and one retained view; complete calls decide
  // whether that trade pays. Explicit little-endian stores preserve text on every host.
  const wide = (width: 2 | 4, corrupt = false): string => {
    const positions = new Map<number, string>();
    const declarations = offsets.map((textOffset, byteIndex) => {
      positions.set(textOffset, `codes[code${byteIndex}] as number`);
      positions.set(textOffset + 1, `codes[code${byteIndex} + 1] as number`);
      return `  const code${byteIndex} = (bytes[offset + ${byteIndex}] as number) * 2;`;
    });
    const stores =
      width === 2
        ? offsets.map(
            (textOffset, byteIndex) =>
              `  words.setUint16(${textOffset}, (codes[code${byteIndex}] as number) | ((codes[code${byteIndex} + 1] as number) << 8), true);`,
          )
        : Array.from({ length: 9 }, (_, block) => {
            const packed = Array.from({ length: 4 }, (_character, index) => {
              const value = positions.get(block * 4 + index) ?? "45";
              return index === 0 ? `(${value})` : `((${value}) << ${index * 8})`;
            }).join(" | ");
            return `  words.setUint32(${block * 4}, ${packed}, true);`;
          });
    const body = [
      "  const words = (uuidTextScratchWords ??= new DataView(text.buffer, text.byteOffset, text.byteLength));",
      ...declarations,
      ...stores,
      ...(corrupt ? ["  text[35] = 0;"] : []),
    ].join("\n");
    return replaceOnce(
      replaceOnce(source, fixedSelected ? fixed : loop, body),
      "let uuidTextScratch: Latin1Scratch | undefined;",
      "let uuidTextScratch: Latin1Scratch | undefined;\nlet uuidTextScratchWords: DataView | undefined;",
    );
  };
  return [
    { name: "baseline", source },
    {
      name: "utf8-text",
      get source() {
        return asciiText("utf8");
      },
    },
    {
      name: "ascii-text",
      get source() {
        return asciiText("ascii");
      },
    },
    {
      name: "utf8-text-lost-byte",
      get source() {
        return asciiText("utf8", true);
      },
    },
    {
      name: "reused-prefix",
      get source() {
        return reusedPrefix();
      },
    },
    {
      name: "reused-prefix-stale",
      get source() {
        return reusedPrefix(true);
      },
    },
    {
      name: "direct-latin1",
      get source() {
        return directLatin1();
      },
    },
    {
      name: "direct-latin1-lost-byte",
      get source() {
        return directLatin1(true);
      },
    },
    {
      name: "word16",
      get source() {
        return wide(2);
      },
    },
    {
      name: "word32",
      get source() {
        return wide(4);
      },
    },
    {
      name: "word32-lost-byte",
      get source() {
        return wide(4, true);
      },
    },
    {
      name: fixedSelected ? "indexed-loop" : "fixed-writes",
      get source() {
        return fixedSelected ? replaceOnce(source, fixed, loop) : replaceOnce(source, loop, fixed);
      },
    },
    {
      name: "fixed-writes-lost-byte",
      get source() {
        return replaceOnce(source, fixedSelected ? fixed : loop, fixed + "\n  text[35] = 0;");
      },
    },
  ];
}
