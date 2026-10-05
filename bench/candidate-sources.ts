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
  "keyless",
  "format",
  "latin1",
  "value",
  "value-options",
  "pool",
  "feistel",
] as const;
export type CandidateGroup = (typeof CANDIDATE_GROUPS)[number];
export const CANDIDATE_FILES = {
  "v7-draw": "src/v7.ts",
  v4: "src/v4.ts",
  alphabet: "src/alphabet.ts",
  keyless: "src/v7-keyless.ts",
  format: "src/uuid.ts",
  latin1: "src/runtime/portable.ts",
  value: "src/v7-value.ts",
  "value-options": "src/v7-value-options.ts",
  pool: "src/runtime/pool.ts",
  feistel: "src/feistel.ts",
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
    keyless: keylessCandidates,
    format: formatCandidates,
    latin1: latin1Candidates,
    value: valueCandidates,
    "value-options": valueOptionCandidates,
    pool: poolCandidates,
    feistel: feistelCandidates,
  } satisfies Record<CandidateGroup, (source: string) => readonly SourceCandidate[]>;
  return builders[group](source);
}

function feistelCandidates(source: string): readonly SourceCandidate[] {
  // Preserve the round arithmetic verbatim; only select the three fixed message words sooner.
  // Outer Feistel traversal and the general hash's compression loops are separate experiments.
  const start = "    for (let block = 0; block < 3; block += 1) {\n";
  const end = "    // Two four-round squeezes yield the two output words.";
  const from = source.indexOf(start);
  const until = source.indexOf(end, from);
  if (from < 0 || until < 0)
    throw new Error("Fixed Feistel message-block loop is missing; inspect its current owner.");
  const loop = source.slice(from, until);
  const prefix = start + "      const m = block === 0 ? right0 : block === 1 ? right1 : 8 << 24;\n";
  const suffix = "    }\n";
  if (!loop.startsWith(prefix) || !loop.endsWith(suffix))
    throw new Error("Feistel message-block boundaries changed; do not time an unrelated span.");
  const body = loop.slice(prefix.length, -suffix.length);
  const expanded = ["right0", "right1", "8 << 24"]
    .map((message) => "    {\n      const m = " + message + ";\n" + body + suffix)
    .join("");
  const intact = replaceOnce(source, loop, expanded);
  return [
    { name: "baseline", source },
    { name: "fixed-message-blocks", source: intact },
    {
      name: "fixed-message-blocks-wrong-length",
      source: replaceOnce(intact, "      const m = 8 << 24;", "      const m = 7 << 24;"),
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
