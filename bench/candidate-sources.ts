// SPDX-License-Identifier: Apache-2.0

/** A complete source replacement used only in an isolated benchmark checkout. */
export interface SourceCandidate {
  readonly name: string;
  readonly source: string;
}

export const CANDIDATE_GROUPS = ["v7-draw", "v4", "alphabet", "keyless"] as const;
export type CandidateGroup = (typeof CANDIDATE_GROUPS)[number];
export const CANDIDATE_FILES = {
  "v7-draw": "src/v7.ts",
  v4: "src/v4.ts",
  alphabet: "src/alphabet.ts",
  keyless: "src/v7-keyless.ts",
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
  return [
    { name: "baseline", source },
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
  } satisfies Record<CandidateGroup, (source: string) => readonly SourceCandidate[]>;
  return builders[group](source);
}

function keylessCandidates(source: string): readonly SourceCandidate[] {
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
  return [
    { name: "baseline", source },
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
