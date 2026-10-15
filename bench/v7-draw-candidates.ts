// SPDX-License-Identifier: Apache-2.0

import { replaceOnce } from "./candidate-source";
import type { SourceCandidate } from "./candidate-source";

const inlineClock = (value: string) =>
  replaceOnce(
    value,
    "const reading = readClock(readUnixMs);",
    "let reading: number | UuidSlugError;\n      try { reading = readUnixMs(); } catch (cause) { reading = readClock(() => { throw cause; }); }",
  );

const unrollTail = (value: string) =>
  replaceOnce(
    value,
    "for (let i = 12; i < 16; i += 1) target[offset + i] = randomTail[i - 12] as number;",
    [0, 1, 2, 3]
      .map((index) => `target[offset + ${12 + index}] = randomTail[${index}] as number;`)
      .join("\n    "),
  );

const inlineCounter = (value: string) => {
  const start = value.indexOf("function writeCounter(");
  const bodyStart = value.indexOf("{", start) + 1;
  const bodyEnd = value.indexOf("\n}", bodyStart);
  if (start < 0 || bodyEnd < bodyStart)
    throw new Error("Counter writer moved; update its experiment.");
  const body = value
    .slice(bodyStart, bodyEnd)
    .trim()
    .replaceAll("bytes[", "target[")
    .replaceAll(/\bhi\b/g, "sequenceHi")
    .replaceAll(/\blo\b/g, "sequenceLo");
  return replaceOnce(value, "writeCounter(target, sequenceHi, sequenceLo, offset);", body);
};

const directSeed = (value: string) =>
  replaceOnce(
    value,
    "const seededCounter = (seedHi(random) * 0x1_0000_0000 + seedLo(random)) % counterModulus;\n    const payloadPrefix = fraction * counterModulus + seededCounter;\n    lastMs = ms;\n    counterHi = Math.floor(payloadPrefix / 0x1_0000_0000);\n    counterLo = payloadPrefix >>> 0;",
    "lastMs = ms;\n    if (fractionBits === 0) { counterHi = seedHi(random); counterLo = seedLo(random); }\n    else { const seededCounter = (seedHi(random) * 0x1_0000_0000 + seedLo(random)) % counterModulus; const payloadPrefix = fraction * counterModulus + seededCounter; counterHi = Math.floor(payloadPrefix / 0x1_0000_0000); counterLo = payloadPrefix >>> 0; }",
  );

const separateContinuation = (value: string) => {
  const start = value.indexOf("      const nextLo = (counterLo + 1) >>> 0;");
  const end = value.indexOf("\n    }\n    if (rollback !== undefined", start);
  if (start < 0 || end < start)
    throw new Error("Sequence continuation moved; update its experiment.");
  const body = value.slice(start, end);
  const renamed = replaceOnce(
    value,
    "function advanceSequence(now: number, fraction: number)",
    "function advanceConfiguredSequence(now: number, fraction: number)",
  );
  return replaceOnce(
    renamed,
    "  function bytes(out?: Uint8Array, offset = 0)",
    "  const advanceSequence = rollback === undefined && fractionBits === 0 ? (now: number, _fraction: number): UuidSlugError | undefined => { if (now > lastMs) return reseed(now, 0);\n" +
      body +
      "\nreturn undefined; } : advanceConfiguredSequence;\n\n  function bytes(out?: Uint8Array, offset = 0)",
  );
};

export function v7Candidates(source: string, uuidSource?: string): readonly SourceCandidate[] {
  const narrowCounter = (lowBits: 30 | 31) => {
    // Compare narrow closure integers with array-backed words without adding retained storage.
    // The 30-bit split also fits pointer-compressed V8 small integers; the 31-bit split tests
    // the wider non-compressed boundary. Extra writer shifts must earn complete-call savings.
    const modulus = `0x${(2 ** lowBits).toString(16)}`;
    const mask = `0x${(2 ** lowBits - 1).toString(16)}`;
    const highLimit = `0x${(2 ** (42 - lowBits) - 1).toString(16)}`;
    let value = replaceOnce(
      source,
      "counterHi = Math.floor(payloadPrefix / 0x1_0000_0000);\n    counterLo = payloadPrefix >>> 0;",
      `counterHi = Math.floor(payloadPrefix / ${modulus});\n    counterLo = payloadPrefix & ${mask};`,
    );
    value = replaceOnce(
      value,
      "counterHi * 0x1_0000_0000 + counterLo",
      `counterHi * ${modulus} + counterLo`,
    );
    value = replaceOnce(
      value,
      "const nextLo = (counterLo + 1) >>> 0;",
      `const nextLo = (counterLo + 1) & ${mask};`,
    );
    value = replaceOnce(value, "if (nextHi > 0x3ff)", `if (nextHi > ${highLimit})`);
    const writer = "writeBytes(target, offset, lastMs, counterHi, counterLo)";
    if (value.split(writer).length !== 3)
      throw new Error("Counter writers moved; repair the narrow-word experiment.");
    return value.replaceAll(
      writer,
      `writeBytes(target, offset, lastMs, counterHi >>> ${32 - lowBits}, (counterLo | ((counterHi & ${2 ** (32 - lowBits) - 1}) << ${lowBits})) >>> 0)`,
    );
  };
  const directNarrowCounter = () => {
    // Keep the narrow state experiment fixed while removing reconstruction of a wider low word.
    // Every byte writer must receive the same split, including independently seeded instants;
    // otherwise successful default calls could hide a different explicit-time wire format.
    let value = narrowCounter(31);
    const reconstructed =
      "writeBytes(target, offset, lastMs, counterHi >>> 1, (counterLo | ((counterHi & 1) << 31)) >>> 0)";
    if (value.split(reconstructed).length !== 3)
      throw new Error("Narrow counter consumers moved; repair the direct writer experiment.");
    value = value.replaceAll(
      reconstructed,
      "writeBytes(target, offset, lastMs, counterHi, counterLo)",
    );
    value = replaceOnce(
      value,
      "Math.floor(payloadPrefix / 0x1_0000_0000),\n        payloadPrefix >>> 0,",
      "Math.floor(payloadPrefix / 0x80000000),\n        payloadPrefix & 0x7fffffff,",
    );
    return replaceOnce(
      value,
      "writeCounter(target, sequenceHi, sequenceLo, offset);",
      "target[offset + 6] = 0x70 | (sequenceHi >>> 7);\n    target[offset + 7] = ((sequenceHi & 0x7f) << 1) | (sequenceLo >>> 30);\n    target[offset + 8] = 0x80 | ((sequenceLo >>> 24) & 0x3f);\n    target[offset + 9] = (sequenceLo >>> 16) & 0xff;\n    target[offset + 10] = (sequenceLo >>> 8) & 0xff;\n    target[offset + 11] = sequenceLo & 0xff;",
    );
  };
  const counterStorage = (array: "Float64Array" | "Uint32Array") => {
    // Hold timestamps fixed while testing whether counter writes account for sequence allocation.
    // Both stores preserve unsigned words; Uint32 omits Float64's unused precision. Neither
    // earns retained storage without complete-call gains and construction/resource evidence.
    let value = replaceOnce(
      source,
      "  let counterHi = 0;\n  let counterLo = 0;",
      `  const counterState = new ${array}(2) as ${array}<ArrayBuffer> & { 0: number; 1: number };`,
    );
    for (const [name, slot] of [
      ["counterHi", 0],
      ["counterLo", 1],
    ] as const) {
      const pattern = new RegExp(`\\b${name}\\b`, "g");
      if (!pattern.test(value)) throw new Error(`Counter consumer moved: ${name}`);
      value = value.replaceAll(pattern, () => `counterState[${slot}]`);
    }
    return value;
  };
  const numericState = () => {
    // Test whether mutable closure numbers explain allocation under scratch-backed generation.
    // Float64 storage preserves every accepted timestamp and all 42 sequence bits exactly;
    // clocks, entropy, transactional updates and formatting remain the controls. Its extra
    // retained array must earn its construction cost if complete calls survive the screen.
    let value = replaceOnce(
      source,
      "  let lastMs = -1;\n  let clockHighWaterMs = -1;\n  let counterHi = 0;\n  let counterLo = 0;",
      [
        "  const sequenceState = new Float64Array(4) as Float64Array<ArrayBuffer> & {",
        "    0: number; 1: number; 2: number; 3: number;",
        "  };",
        "  sequenceState[0] = -1;",
        "  sequenceState[1] = -1;",
      ].join("\n"),
    );
    for (const [name, slot] of [
      ["lastMs", 0],
      ["clockHighWaterMs", 1],
      ["counterHi", 2],
      ["counterLo", 3],
    ] as const) {
      const pattern = new RegExp(`\\b${name}\\b`, "g");
      if (!pattern.test(value)) throw new Error(`Sequence state consumer moved: ${name}`);
      value = value.replaceAll(pattern, () => `sequenceState[${slot}]`);
    }
    return value;
  };
  const directText = (latin1 = false, pairs = false, reusePrefix = false) => {
    // Remove intermediate stores without changing sequence policy or adding tables and buffers.
    // A separate function leaves owned-byte calls unchanged; its extra closure is a cold cost
    // to measure only if complete text calls survive the screen (bench/decisions.md).
    const start = source.indexOf("  function bytes(out?: Uint8Array, offset = 0)");
    const end = source.indexOf("\n  function bytesAt(", start);
    if (start < 0 || end < start) throw new Error("Clock draw moved; repair the text experiment.");
    const original = source.slice(start, end);
    let draw = replaceOnce(
      original,
      "function bytes(out?: Uint8Array, offset = 0): Uint8Array | UuidSlugError",
      "function directClockText<Case extends UuidTextCase>(textCase: Case): UuidV7StringFor<Case> | UuidSlugError",
    );
    const rangeStart = draw.indexOf("      const target = out ?? new Uint8Array(16);");
    const rangeEnd = draw.indexOf("      // Split THEN validated", rangeStart);
    if (rangeStart < 0 || rangeEnd < rangeStart)
      throw new Error("Private output checks moved; repair the text experiment.");
    draw = draw.slice(0, rangeStart) + draw.slice(rangeEnd);
    draw = replaceOnce(
      draw,
      "return writeBytes(target, offset, lastMs, counterHi, counterLo);",
      "return directUuidV7Text(lastMs, counterHi, counterLo, randomTail, textCase);",
    );
    const byteExpressions = [
      "high >>> 8",
      "high & 255",
      "(ms >>> 24) & 255",
      "(ms >>> 16) & 255",
      "(ms >>> 8) & 255",
      "ms & 255",
      "0x70 | ((hi >>> 6) & 15)",
      "((hi & 63) << 2) | (lo >>> 30)",
      "0x80 | ((lo >>> 24) & 63)",
      "(lo >>> 16) & 255",
      "(lo >>> 8) & 255",
      "lo & 255",
      "tail[0] as number",
      "tail[1] as number",
      "tail[2] as number",
      "tail[3] as number",
    ];
    const characters: string[] = [];
    for (let index = 0; index < byteExpressions.length; index++) {
      if ([4, 6, 8, 10].includes(index)) characters.push("45");
      characters.push(
        ...(pairs
          ? [`codes[byte${index} * 2] as number`, `codes[byte${index} * 2 + 1] as number`]
          : [`digits.charCodeAt(byte${index} >>> 4)`, `digits.charCodeAt(byte${index} & 15)`]),
      );
    }
    const characterWriter = `return String.fromCharCode(${characters.join(", ")}) as UuidV7StringFor<Case>;`;
    const prefixDeclarations = [
      "const high = Math.floor(ms / 0x1_0000_0000);",
      ...byteExpressions
        .slice(0, 10)
        .map((expression, index) => `const byte${index} = ${expression};`),
    ];
    const characterStores = characters.flatMap((character, index) =>
      character === "45" ? [] : [`text[${index}] = ${character};`],
    );
    // Reuse only characters whose complete inputs match; generators share the text scratch.
    // Timestamp, upper counter and case changes must refresh the prefix before reading it.
    const prefixGuard =
      "if (directPrefixMs !== ms || directPrefixHi !== hi || directPrefixLo !== (lo >>> 16) || directPrefixCodes !== codes) {";
    const nativeWriter = [
      "const create = createDirectLatin1Scratch;",
      reusePrefix
        ? `if (!create) { ${prefixDeclarations.join(" ")} ${characterWriter} }`
        : `if (!create) ${characterWriter}`,
      "let scratch = directLatin1Scratch;",
      "if (!scratch) {",
      "  scratch = directLatin1Scratch = create(36);",
      "  for (const index of [8, 13, 18, 23]) scratch.bytes[index] = 45;",
      "}",
      "const text = scratch.bytes;",
      ...(reusePrefix
        ? [
            prefixGuard,
            ...prefixDeclarations,
            ...characterStores.slice(0, 20),
            "directPrefixMs = ms; directPrefixHi = hi; directPrefixLo = lo >>> 16; directPrefixCodes = codes;",
            "}",
            ...characterStores.slice(20),
          ]
        : characterStores),
      "return scratch.text() as UuidV7StringFor<Case>;",
    ].join("\n  ");
    const writer = [
      ...(latin1
        ? [
            'import { runtime } from "#runtime";',
            'import type { Latin1Scratch } from "./runtime/types.ts";',
            "// Select native string construction once; defer its storage until preset text is requested.",
            "const createDirectLatin1Scratch = runtime.latin1Scratch;",
            "let directLatin1Scratch: Latin1Scratch | undefined;",
            ...(reusePrefix
              ? [
                  "// These keys describe the shared prefix; refresh it after any input changes.",
                  "let directPrefixMs = -1;",
                  "let directPrefixHi = -1;",
                  "let directPrefixLo = -1;",
                  "let directPrefixCodes: Uint8Array | undefined;",
                ]
              : []),
          ]
        : []),
      ...(pairs
        ? [
            "// Paired codes keep the original formatter's lookup strategy; only byte stores disappear.",
            "let directLowercaseCodes: Uint8Array | undefined;",
            "let directUppercaseCodes: Uint8Array | undefined;",
            "function directHexCodes(digits: string): Uint8Array {",
            "  const codes = new Uint8Array(512);",
            "  for (let byte = 0; byte < 256; byte++) { codes[byte * 2] = digits.charCodeAt(byte >>> 4); codes[byte * 2 + 1] = digits.charCodeAt(byte & 15); }",
            "  return codes;",
            "}",
          ]
        : []),
      "// Direct text avoids the 16-byte write/read round trip; no callback runs during formatting.",
      "// Compare complete calls with native Latin-1 formatting before retaining this specialization.",
      "function directUuidV7Text<Case extends UuidTextCase>(ms: number, hi: number, lo: number, tail: Uint8Array, textCase: Case): UuidV7StringFor<Case> {",
      '  const digits = textCase === UUID_TEXT_LOWERCASE ? "0123456789abcdef" : "0123456789ABCDEF";',
      ...(pairs
        ? [
            "  const codes = textCase === UUID_TEXT_LOWERCASE ? (directLowercaseCodes ??= directHexCodes(digits)) : (directUppercaseCodes ??= directHexCodes(digits));",
          ]
        : []),
      ...(!reusePrefix ? ["  const high = Math.floor(ms / 0x1_0000_0000);"] : []),
      ...byteExpressions.flatMap((expression, index) =>
        reusePrefix && index < 10 ? [] : [`  const byte${index} = ${expression};`],
      ),
      "  " + (latin1 ? nativeWriter : characterWriter),
      "}",
      "",
    ].join("\n");
    return (
      replaceOnce(
        replaceOnce(source, original, original + "\n" + draw),
        "formatUuidV7(bytes(textBytes), textCase as Case)",
        latin1
          ? "createDirectLatin1Scratch ? directClockText(textCase as Case) : formatUuidV7(bytes(textBytes), textCase as Case)"
          : "directClockText(textCase as Case)",
      ) +
      "\n" +
      writer
    );
  };
  const sharedText = (reusePrefix: boolean, corrupt = false, stale = false): SourceCandidate => {
    if (uuidSource === undefined)
      throw new Error("Shared text requires the committed UUID formatter source.");
    const generated = directText(true, true, reusePrefix);
    const writerStart = generated.indexOf('\nimport { runtime } from "#runtime";', source.length);
    const functionStart = generated.indexOf("// Direct text avoids", writerStart);
    if (writerStart < 0 || functionStart < writerStart)
      throw new Error("Direct formatter boundaries moved; repair the shared-storage experiment.");
    let generator = generated.slice(0, writerStart);
    generator = replaceOnce(
      generator,
      "formatUuidBytesUnchecked, resolveUuidTextCase",
      "formatUuidBytesUnchecked, formatUuidV7FieldsUnchecked, resolveUuidTextCase",
    );
    generator = generator
      .replaceAll("createDirectLatin1Scratch", "formatUuidV7FieldsUnchecked")
      .replaceAll("directUuidV7Text", "formatUuidV7FieldsUnchecked!");
    generator = replaceOnce(
      generator,
      "function directClockText<Case extends UuidTextCase>",
      "const directClockText = formatUuidV7FieldsUnchecked ? function directClockText<Case extends UuidTextCase>",
    );
    generator = replaceOnce(
      generator,
      "\n  }\n\n  function bytesAt(",
      "\n  } : undefined;\n\n  function bytesAt(",
    );
    generator = generator.replaceAll(
      "? directClockText(textCase as Case)",
      "? directClockText!(textCase as Case)",
    );
    let writer = generated
      .slice(functionStart)
      .replaceAll("directUuidV7Text", "formatUuidV7FieldsUnchecked")
      .replaceAll("createDirectLatin1Scratch", "createLatin1Scratch")
      .replaceAll("directLatin1Scratch", "uuidTextScratch")
      .replaceAll("directLowercaseCodes", "lowercaseHexCodes")
      .replaceAll("directUppercaseCodes", "uppercaseHexCodes")
      .replaceAll("directHexCodes", "hexCodes");
    writer = replaceOnce(
      writer,
      "function formatUuidV7FieldsUnchecked",
      "export const formatUuidV7FieldsUnchecked = createLatin1Scratch ? function formatUuidV7FieldsUnchecked",
    );
    writer = writer.trimEnd() + " : undefined;\n";
    writer = replaceOnce(
      writer,
      "let scratch = uuidTextScratch;\n  if (!scratch) {\n    scratch = uuidTextScratch = create(36);\n    for (const index of [8, 13, 18, 23]) scratch.bytes[index] = 45;\n  }",
      "const scratch = (uuidTextScratch ??= createUuidTextScratch(create));",
    );
    if (corrupt)
      writer = replaceOnce(writer, "const byte15 = tail[3] as number;", "const byte15 = 0;");
    if (stale)
      writer = replaceOnce(
        writer,
        "if (directPrefixMs !== ms || directPrefixHi !== hi || directPrefixLo !== (lo >>> 16) || directPrefixCodes !== codes) {",
        "if (directPrefixCodes === undefined) {",
      );
    let formatter = replaceOnce(
      uuidSource,
      "  UuidV7String,",
      "  UuidV7String,\n  UuidV7StringFor,",
    );
    if (reusePrefix) {
      // A generic conversion overwrites shared text. Invalidate rather than compare its input bytes.
      formatter = replaceOnce(
        formatter,
        "  const text = scratch.bytes;",
        "  directPrefixMs = -1;\n  const text = scratch.bytes;",
      );
      writer =
        "let directPrefixMs = -1;\nlet directPrefixHi = -1;\nlet directPrefixLo = -1;\nlet directPrefixCodes: Uint8Array | undefined;\n" +
        writer;
    }
    return { name: "shared-text", source: generator, uuidSource: formatter + "\n" + writer };
  };
  // Math.trunc plus the nonnegative 48-bit bound already proves a safe integer. Keep the
  // original number and negative-reading guards so invalid callbacks never gain coercion.
  const boundedClock = (ceiling: string) =>
    replaceOnce(
      source,
      'typeof reading !== "number" || reading < 0 || !isValidUuidV7UnixMs(now)',
      `typeof reading !== "number" || reading < 0 || !(now <= ${ceiling})`,
    );
  const independentAnchor =
    "      const failed = advanceSequence(now, fraction);\n      if (failed) return failed;\n      return writeBytes(target, offset, lastMs, counterHi, counterLo);";
  // Module calls promise no cross-call ordering; compare fresh seeds without weakening created generators.
  const independent = () =>
    replaceOnce(
      source,
      independentAnchor,
      "      if (!coordinateExplicitInstants && fractionBits === 0) {\n        const failed = fillRandomBytes(fill, random);\n        if (failed) return failed;\n        return writeBytes(target, offset, now, seedHi(random), seedLo(random));\n      }\n" +
        independentAnchor,
    );
  // Preserve the existing seed bit positions while avoiding the intermediate counter words.
  const direct = () =>
    replaceOnce(
      independent(),
      "return writeBytes(target, offset, now, seedHi(random), seedLo(random));",
      "writeTimestamp(target, now, offset);\n        target[offset+6] = 0x70 | ((random[0] as number) >>> 4);\n        target[offset+7] = ((random[0] as number) << 4) | ((random[1] as number) >>> 4);\n        target[offset+8] = 0x80 | (((random[1] as number) & 15) << 2) | ((random[2] as number) >>> 6);\n        target[offset+9] = ((random[2] as number) << 2) | ((random[3] as number) >>> 6);\n        target[offset+10] = ((random[3] as number) << 2) | ((random[4] as number) >>> 6);\n        target[offset+11] = ((random[4] as number) << 2) | ((random[5] as number) & 3);\n        for(let i=12;i<16;i++) target[offset+i]=random[i-6] as number;\n        return target;",
    );
  const constructors = "out ?? new Uint8Array(16)";
  const owned = (replacement: string) => {
    if (source.split(constructors).length !== 3)
      throw new Error("Owned UUIDv7 constructors moved; update their experiments.");
    return source.replaceAll(constructors, replacement);
  };
  const numberCounter = () => {
    // A 42-bit integer is exact in Number. Compare one transactional increment with split
    // words, deriving the same writer inputs only after entropy succeeds; layouts stay unchanged.
    let value = replaceOnce(source, "let counterHi = 0;\n  let counterLo = 0;", "let counter = 0;");
    value = replaceOnce(
      value,
      "counterHi = Math.floor(payloadPrefix / 0x1_0000_0000);\n    counterLo = payloadPrefix >>> 0;",
      "counter = payloadPrefix;",
    );
    value = replaceOnce(value, "counterHi * 0x1_0000_0000 + counterLo", "counter");
    value = replaceOnce(
      value,
      "const nextLo = (counterLo + 1) >>> 0;\n      const nextHi = counterHi + (nextLo === 0 ? 1 : 0);",
      "const nextCounter = counter + 1;",
    );
    value = replaceOnce(value, "if (nextHi > 0x3ff)", "if (nextCounter >= 2 ** 42)");
    value = replaceOnce(
      value,
      "counterLo = nextLo;\n        counterHi = nextHi;",
      "counter = nextCounter;",
    );
    const writer = "writeBytes(target, offset, lastMs, counterHi, counterLo)";
    if (value.split(writer).length !== 3)
      throw new Error("Counter consumers moved; repair the experiment.");
    return value.replaceAll(
      writer,
      "writeBytes(target, offset, lastMs, Math.floor(counter / 0x1_0000_0000), counter >>> 0)",
    );
  };
  return [
    { name: "baseline", source },
    ...(
      [
        "shared-text",
        "shared-text-prefix",
        "shared-text-lost-tail",
        "shared-text-prefix-stale",
        "shared-text-prefix-no-invalidation",
      ] as const
    ).map((name) => ({
      name,
      get source() {
        return sharedText(
          name.startsWith("shared-text-prefix"),
          name === "shared-text-lost-tail",
          name === "shared-text-prefix-stale",
        ).source;
      },
      get uuidSource() {
        const formatter = sharedText(
          name.startsWith("shared-text-prefix"),
          name === "shared-text-lost-tail",
          name === "shared-text-prefix-stale",
        ).uuidSource!;
        return name === "shared-text-prefix-no-invalidation"
          ? replaceOnce(formatter, "  directPrefixMs = -1;\n", "")
          : formatter;
      },
    })),
    {
      name: "counter-low30",
      get source() {
        return narrowCounter(30);
      },
    },
    {
      name: "counter-low31",
      get source() {
        return narrowCounter(31);
      },
    },
    {
      name: "counter-low31-direct",
      get source() {
        return directNarrowCounter();
      },
    },
    {
      name: "counter-low31-direct-lost-bit",
      get source() {
        return replaceOnce(
          directNarrowCounter(),
          "((sequenceHi & 0x7f) << 1)",
          "((sequenceHi & 0x3f) << 1)",
        );
      },
    },
    {
      name: "counter-low30-lost-carry",
      get source() {
        return replaceOnce(
          narrowCounter(30),
          "const nextHi = counterHi + (nextLo === 0 ? 1 : 0);",
          "const nextHi = counterHi;",
        );
      },
    },
    {
      name: "counter-float64",
      get source() {
        return counterStorage("Float64Array");
      },
    },
    {
      name: "counter-uint32",
      get source() {
        return counterStorage("Uint32Array");
      },
    },
    {
      name: "counter-uint32-lost-carry",
      get source() {
        return replaceOnce(
          counterStorage("Uint32Array"),
          "const nextHi = counterState[0] + (nextLo === 0 ? 1 : 0);",
          "const nextHi = counterState[0];",
        );
      },
    },
    {
      name: "numeric-state",
      get source() {
        return numericState();
      },
    },
    {
      name: "numeric-state-lost-timestamp",
      get source() {
        return replaceOnce(
          numericState(),
          "    sequenceState[0] = ms;",
          "    sequenceState[0] = 0;",
        );
      },
    },
    {
      name: "direct-text-reused-prefix",
      get source() {
        return directText(true, true, true);
      },
    },
    {
      name: "direct-text-reused-prefix-native-only",
      get source() {
        // Absent native formatting must not create another per-generator draw closure.
        // Compare complete calls; removing a closure alone does not prove a speed benefit.
        return replaceOnce(
          replaceOnce(
            replaceOnce(
              directText(true, true, true),
              "function directClockText<Case extends UuidTextCase>",
              "const directClockText = createDirectLatin1Scratch ? function directClockText<Case extends UuidTextCase>",
            ),
            "\n  function bytesAt(",
            " : undefined;\n  function bytesAt(",
          ),
          "createDirectLatin1Scratch ? directClockText(textCase as Case)",
          "directClockText ? directClockText(textCase as Case)",
        );
      },
    },
    {
      name: "direct-text-reused-prefix-stale",
      get source() {
        return replaceOnce(
          directText(true, true, true),
          "if (directPrefixMs !== ms || directPrefixHi !== hi || directPrefixLo !== (lo >>> 16) || directPrefixCodes !== codes) {",
          "if (directPrefixMs === -1) {",
        );
      },
    },
    {
      name: "direct-text-latin1-pairs",
      get source() {
        return directText(true, true);
      },
    },
    {
      name: "direct-text-latin1-pairs-lost-tail",
      get source() {
        return replaceOnce(
          directText(true, true),
          "const byte15 = tail[3] as number;",
          "const byte15 = 0;",
        );
      },
    },
    {
      // Keep byte elimination fixed while changing string construction. Native storage replaces
      // the generic formatter's storage for preset-only consumers, but mixed calls can retain
      // both buffers; that cost must be measured before retention (bench/decisions.md).
      name: "direct-text-latin1",
      get source() {
        return directText(true);
      },
    },
    {
      name: "direct-text-latin1-lost-tail",
      get source() {
        return replaceOnce(
          directText(true),
          "const byte15 = tail[3] as number;",
          "const byte15 = 0;",
        );
      },
    },
    {
      name: "direct-text",
      get source() {
        return directText();
      },
    },
    {
      name: "direct-text-lost-tail",
      get source() {
        return replaceOnce(directText(), "const byte15 = tail[3] as number;", "const byte15 = 0;");
      },
    },
    {
      name: "direct-text-lost-timestamp",
      get source() {
        return replaceOnce(directText(), "const byte0 = high >>> 8;", "const byte0 = 0;");
      },
    },
    {
      name: "number-counter",
      get source() {
        return numberCounter();
      },
    },
    {
      name: "number-counter-overflow",
      get source() {
        return replaceOnce(numberCounter(), "nextCounter >= 2 ** 42", "nextCounter >= 2 ** 43");
      },
    },
    {
      name: "bounded-clock",
      get source() {
        return boundedClock("MAX_UUID_V7_UNIX_MS");
      },
    },
    {
      name: "bounded-clock-overflow",
      get source() {
        return boundedClock("MAX_UUID_V7_UNIX_MS + 1");
      },
    },
    {
      // Restore the old retained array so the cold resource witness must reject it before timing.
      name: "duplicate-text-scratch",
      get source() {
        return replaceOnce(
          source,
          "const textBytes = options.textScratch ?? new Uint8Array(16);",
          "const textBytes = new Uint8Array(16);",
        );
      },
    },
    {
      // A fresh fixed-size output at offset zero already satisfies the range contract.
      // Other offsets and caller-owned output must retain their existing validation.
      name: "owned-range-zero",
      get source() {
        return replaceOnce(
          source,
          "target === textBytes\n          ? undefined",
          "target === textBytes || (out === undefined && offset === 0)\n          ? undefined",
        );
      },
    },
    {
      // Ordinary clock numbers need no cross-realm error recognition; keep it for other readings.
      name: "numeric-clock-first",
      get source() {
        return replaceOnce(
          source,
          "if (isUuidSlugError(reading)) return reading;",
          'if (typeof reading !== "number" && isUuidSlugError(reading)) return reading;',
        );
      },
    },
    {
      // Compare complete draws: a writer-only win may disappear behind clock and entropy costs.
      name: "timestamp-words",
      get source() {
        return replaceOnce(
          source,
          "const writeTimestamp = (globalThis as { Bun?: object }).Bun\n  ? writeTimestampLoop\n  : writeTimestampWords;",
          "const writeTimestamp = writeTimestampWords;",
        );
      },
    },
    {
      // The known default needs no normalization; other inputs retain the shared resolver.
      name: "lowercase-fast",
      get source() {
        return replaceOnce(
          source,
          "const textCase = resolveUuidTextCase(textCaseOrOptions);",
          "const textCase = textCaseOrOptions === UUID_TEXT_LOWERCASE ? UUID_TEXT_LOWERCASE : resolveUuidTextCase(textCaseOrOptions);",
        );
      },
    },
    {
      name: "inline-clock",
      get source() {
        return inlineClock(source);
      },
    },
    {
      // Removing exception containment must fail the shared throwing-clock witness in both
      // runners; successful clock readings cannot establish this fallback contract.
      name: "inline-clock-lost-catch",
      get source() {
        return replaceOnce(
          source,
          "const reading = readClock(readUnixMs);",
          "const reading = readUnixMs();",
        );
      },
    },
    {
      name: "unroll-tail",
      get source() {
        return unrollTail(source);
      },
    },
    {
      name: "inline-counter",
      get source() {
        return inlineCounter(source);
      },
    },
    {
      name: "direct-seed",
      get source() {
        return directSeed(source);
      },
    },
    {
      name: "separate-continuation",
      get source() {
        return separateContinuation(source);
      },
    },
    {
      name: "combined",
      get source() {
        return unrollTail(inlineCounter(directSeed(separateContinuation(inlineClock(source)))));
      },
    },
    {
      name: "array-buffer",
      get source() {
        return owned("out ?? new Uint8Array(new ArrayBuffer(16))");
      },
    },
    {
      name: "scratch-slice",
      get source() {
        return owned("out ?? textBytes.slice()");
      },
    },
    {
      name: "independent",
      get source() {
        return independent();
      },
    },
    {
      name: "independent-direct",
      get source() {
        return direct();
      },
    },
    {
      // This falsifier must fail both bit oracles before the runner starts any timing.
      name: "independent-direct-lost-bit",
      get source() {
        return replaceOnce(
          direct(),
          "((random[1] as number) & 15)",
          "((random[1] as number) & 14)",
        );
      },
    },
    {
      name: "independent-full-block",
      get source() {
        return replaceOnce(
          replaceOnce(
            independent(),
            "const random = new Uint8Array(10);",
            "const random = new Uint8Array(coordinateExplicitInstants ? 10 : 16);",
          ),
          "const randomTail = random.subarray(6);",
          "const randomTail = random.subarray(6, 10);",
        );
      },
    },
  ];
}
