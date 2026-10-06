// SPDX-License-Identifier: Apache-2.0

import { replaceOnce } from "./candidate-source";
import type { SourceCandidate } from "./candidate-source";

export function v4Candidates(source: string): readonly SourceCandidate[] {
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
