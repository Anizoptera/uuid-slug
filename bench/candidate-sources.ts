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
  return [
    { name: "baseline", source },
    { name: "indexed-loop", source: indexed },
    { name: "fixed-four", source: fixed },
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
