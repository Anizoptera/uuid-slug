// SPDX-License-Identifier: Apache-2.0

/** A complete source replacement used only in an isolated benchmark checkout. */
export interface SourceCandidate {
  readonly name: string;
  readonly source: string;
}

export const CANDIDATE_GROUPS = ["v7-draw", "v4"] as const;
export type CandidateGroup = (typeof CANDIDATE_GROUPS)[number];

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
  return group === "v4" ? v4Candidates(source) : v7Candidates(source);
}
