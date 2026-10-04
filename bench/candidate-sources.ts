// SPDX-License-Identifier: Apache-2.0

/** A complete source replacement used only in an isolated benchmark checkout. */
export interface SourceCandidate {
  readonly name: string;
  readonly source: string;
}

export const CANDIDATE_GROUPS = [
  "v7-draw",
  "v4",
  "alphabet",
  "keyless",
  "format",
  "value",
  "value-options",
  "pool",
] as const;
export type CandidateGroup = (typeof CANDIDATE_GROUPS)[number];
export const CANDIDATE_FILES = {
  "v7-draw": "src/v7.ts",
  v4: "src/v4.ts",
  alphabet: "src/alphabet.ts",
  keyless: "src/v7-keyless.ts",
  format: "src/uuid.ts",
  value: "src/v7-value.ts",
  "value-options": "src/v7-value-options.ts",
  pool: "src/runtime/pool.ts",
} as const satisfies Record<CandidateGroup, string>;

function replaceOnce(source: string, from: string, to: string): string {
  // An old experiment must fail after its mechanism moves, never time an unchanged replacement.
  if (source.split(from).length !== 2)
    throw new Error(
      "Candidate source anchor changed. Update the experiment against its owning function before comparing it.",
    );
  return source.replace(from, to);
}

function v7Candidates(source: string): readonly SourceCandidate[] {
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
    // to measure only if complete text calls survive the screen (bench/PERFORMANCE.md).
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
  // Math.trunc plus the nonnegative 48-bit bound already proves a safe integer. Keep the
  // original number and negative-reading guards so invalid callbacks never gain coercion.
  const boundedClock = (ceiling: string) =>
    replaceOnce(
      source,
      'typeof reading !== "number" || reading < 0 || !isValidUuidV7UnixMs(now)',
      `typeof reading !== "number" || reading < 0 || !(now <= ${ceiling})`,
    );
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
      // both buffers; that cost must be measured before retention (bench/PERFORMANCE.md).
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
): readonly SourceCandidate[] {
  const builders = {
    v4: v4Candidates,
    "v7-draw": v7Candidates,
    alphabet: alphabetCandidates,
    keyless: keylessCandidates,
    format: formatCandidates,
    value: valueCandidates,
    "value-options": valueOptionCandidates,
    pool: poolCandidates,
  } satisfies Record<CandidateGroup, (source: string) => readonly SourceCandidate[]>;
  return builders[group](source);
}

function poolCandidates(source: string): readonly SourceCandidate[] {
  const loop =
    "for (let i = 0; i < length; i += 1) {\n      bytes[i] = pool[offset + i] as number;\n      pool[offset + i] = 0;\n    }";
  // Four-byte continuations dominate ordinary UUIDv7 draws. Keep erasure and refill transactional;
  // complete v4 and v7 calls decide whether the added size branch earns its cost.
  const four = Array.from(
    { length: 4 },
    (_, i) => `bytes[${i}] = pool[offset + ${i}] as number;\n      pool[offset + ${i}] = 0;`,
  ).join("\n      ");
  const fixedStart = source.indexOf("    if (length === 4) {");
  const fixedEnd = source.indexOf("    offset += length;", fixedStart);
  // Retained production stores remain the control; preserve the old indexed alternative so
  // later engine reviews can overturn the choice through the same complete-call comparison.
  if (fixedStart >= 0 && fixedEnd < fixedStart)
    throw new Error("Pool copying boundary changed; repair the source experiment before timing.");
  const indexed =
    fixedStart < 0
      ? source
      : source.slice(0, fixedStart) + `    ${loop}\n` + source.slice(fixedEnd);
  const fixed =
    fixedStart < 0
      ? replaceOnce(source, loop, `if (length === 4) {\n      ${four}\n    } else ${loop}`)
      : source;
  // Reseeds consume ten bytes, so subsequent four-byte reads can be unaligned. A DataView
  // handles both offsets without padding or discarding entropy; compare its retained view and
  // unpacking work against the existing byte stores through complete generation calls.
  const word = replaceOnce(
    replaceOnce(
      replaceOnce(
        fixed,
        "let pool: Uint8Array<ArrayBuffer> | undefined;",
        "let pool: Uint8Array<ArrayBuffer> | undefined;\n  let poolView: DataView | undefined;",
      ),
      "pool ??= new Uint8Array(POOL_BYTES);",
      "if (pool === undefined) { pool = new Uint8Array(POOL_BYTES); poolView = new DataView(pool.buffer); }",
    ),
    four,
    "const word = (poolView as DataView).getUint32(offset, false);\n      (poolView as DataView).setUint32(offset, 0, false);\n      bytes[0] = word >>> 24;\n      bytes[1] = (word >>> 16) & 0xff;\n      bytes[2] = (word >>> 8) & 0xff;\n      bytes[3] = word & 0xff;",
  );
  return [
    { name: "baseline", source },
    { name: "indexed-loop", source: indexed },
    { name: "fixed-four", source: fixed },
    { name: "word-four", source: word },
    {
      name: "word-four-lost-byte",
      source: replaceOnce(word, "bytes[3] = word & 0xff;", "bytes[3] = 0;"),
    },
    {
      name: "fixed-four-lost-byte",
      source: replaceOnce(fixed, "bytes[3] = pool[offset + 3] as number;", "bytes[3] = 0;"),
    },
    {
      name: "source-cursor",
      source: replaceOnce(
        indexed,
        loop,
        "for (let i = 0, sourceOffset = offset; i < length; i += 1, sourceOffset += 1) {\n      bytes[i] = pool[sourceOffset] as number;\n      pool[sourceOffset] = 0;\n    }",
      ),
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

function keylessCandidates(source: string): readonly SourceCandidate[] {
  const owned =
    "export const currentUuidV7Bytes = (): UuidV7Bytes | UuidSlugError =>\n  (generateDefaultUuidV7Bytes ??= v7Bytes().generateUuidV7Bytes)();";
  // This default has no options to parse. Reuse the existing private draw without changing
  // clocks, entropy, ownership or configured calls; compare lookup with a retained reference.
  const directOwned =
    "export const currentUuidV7Bytes = (): UuidV7Bytes | UuidSlugError =>\n  v7Bytes().drawUuidV7Bytes(undefined) as UuidV7Bytes | UuidSlugError;";
  const cachedOwned =
    'let drawDefaultOwnedBytes: PortableUuidV7Generator["drawUuidV7Bytes"] | undefined;\nexport const currentUuidV7Bytes = (): UuidV7Bytes | UuidSlugError =>\n  (drawDefaultOwnedBytes ??= v7Bytes().drawUuidV7Bytes)(undefined) as UuidV7Bytes | UuidSlugError;';
  // The draw closure is receiver-free and the module generator never changes after creation.
  // Compare caching that existing closure rather than adding a generator method or buffer.
  const scratch =
    "export const currentUuidV7Scratch = (): Uint8Array | UuidSlugError =>\n  v7Text().drawUuidV7Bytes(undefined, keylessTextBytes);";
  const cachedScratch =
    'let generateDefaultUuidV7Scratch: PortableUuidV7Generator["drawUuidV7Bytes"] | undefined;\nexport const currentUuidV7Scratch = (): Uint8Array | UuidSlugError =>\n  (generateDefaultUuidV7Scratch ??= v7Text().drawUuidV7Bytes)(undefined, keylessTextBytes);';
  // Change hot-wrapper size separately from selector work. Copy the original implementation
  // intact into the configured helper so a speed result cannot buy different failure behavior.
  const declaration =
    "export function generateUuidV7<Case extends UuidTextCase = typeof UUID_TEXT_LOWERCASE>(\n  textCaseOrOptions?: Case | GenerateUuidV7Options<Case>,\n): UuidV7StringFor<Case> | UuidSlugError {";
  const configured =
    '  let values = readGenerationOptions(textCaseOrOptions, UUID_V7_TEXT_OPTIONS, "UUIDv7 generation");';
  const start = source.indexOf(declaration);
  const end = source.indexOf(configured, start);
  if (start < 0 || end < start)
    throw new Error("Module UUIDv7 text implementation moved; update its wrapper experiment.");
  const direct = source.slice(start + declaration.length, end);
  const helperDeclaration = declaration.replace(
    "export function generateUuidV7",
    "function generateConfiguredUuidV7",
  );
  const thin = replaceOnce(
    source,
    declaration,
    declaration +
      direct +
      "  return generateConfiguredUuidV7(textCaseOrOptions);\n}\n\n" +
      helperDeclaration,
  );
  // The wrapper already routes all primitive strings. Keep only the unchanged configured tail
  // in the helper, avoiding a second preset dispatch on every options call.
  const cold = replaceOnce(thin, helperDeclaration + direct, helperDeclaration + "\n");
  const preset = (value: string) =>
    replaceOnce(
      value,
      "const selectedCase = resolveUuidTextCase(directCase);",
      "const selectedCase = directCase === UUID_TEXT_LOWERCASE || directCase === UUID_TEXT_UPPERCASE ? directCase : resolveUuidTextCase(directCase);",
    );
  const withUppercase = (value: string) =>
    replaceOnce(
      value,
      'import { UUID_TEXT_LOWERCASE } from "./types.ts";',
      'import { UUID_TEXT_LOWERCASE, UUID_TEXT_UPPERCASE } from "./types.ts";',
    );
  const thinPreset = () => {
    // Only the new wrapper changes; the helper retains its original selector validation.
    const header = thin.slice(0, thin.indexOf("function generateConfiguredUuidV7"));
    return preset(withUppercase(header)) + thin.slice(header.length);
  };
  return [
    { name: "baseline", source },
    { name: "direct-owned-draw", source: replaceOnce(source, owned, directOwned) },
    { name: "cached-owned-draw", source: replaceOnce(source, owned, cachedOwned) },
    {
      name: "direct-owned-lost-byte",
      source: replaceOnce(
        source,
        owned,
        "export const currentUuidV7Bytes = (): UuidV7Bytes | UuidSlugError => {\n  const value = v7Bytes().drawUuidV7Bytes(undefined);\n  if (!(value instanceof Error)) value[15] = 0;\n  return value as UuidV7Bytes | UuidSlugError;\n};",
      ),
    },
    {
      name: "cached-draw",
      get source() {
        return replaceOnce(source, scratch, cachedScratch);
      },
    },
    {
      name: "cached-draw-lost-byte",
      get source() {
        return replaceOnce(
          source,
          scratch,
          cachedScratch.replace(
            "=>\n  (generateDefaultUuidV7Scratch",
            "=> {\n  const bytes = (generateDefaultUuidV7Scratch",
          ) + "\n  if (!(bytes instanceof Error)) bytes[15] = 0;\n  return bytes;\n};",
        );
      },
    },
    { name: "thin-wrapper", source: thin },
    { name: "thin-configured", source: cold },
    {
      name: "thin-configured-lost-options",
      get source() {
        return replaceOnce(
          cold,
          "return generateConfiguredUuidV7(textCaseOrOptions);",
          "return generateConfiguredUuidV7({} as GenerateUuidV7Options<Case>);",
        );
      },
    },
    {
      name: "preset-fast",
      get source() {
        return preset(withUppercase(source));
      },
    },
    {
      name: "thin-preset",
      get source() {
        return thinPreset();
      },
    },
    {
      // The existing uppercase consumer oracle must reach the new default wrapper before timing.
      name: "thin-preset-wrong-case",
      get source() {
        return replaceOnce(
          thinPreset(),
          "? directCase : resolveUuidTextCase(directCase)",
          "? UUID_TEXT_LOWERCASE : resolveUuidTextCase(directCase)",
        );
      },
    },
  ];
}

function formatCandidates(source: string): readonly SourceCandidate[] {
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

function alphabetCandidates(source: string): readonly SourceCandidate[] {
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
