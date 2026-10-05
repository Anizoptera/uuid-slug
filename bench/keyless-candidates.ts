// SPDX-License-Identifier: Apache-2.0

import { replaceOnce } from "./candidate-source";
import type { SourceCandidate } from "./candidate-source";

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

export function keylessCandidates(source: string): readonly SourceCandidate[] {
  // Reuse the secure fill rather than retaining UUIDv4 generation in unrelated consumers. Only
  // the no-argument public byte path changes; immutable values still use their declared layout.
  // More copied entropy and the extra call can erase the removed sequence work.
  // Hold helper bytes fixed while testing source order; fresh processes must decide whether
  // placement changes complete-call cost, including configured calls that never use this helper.
  const randomOwned = (helperAtEnd = false) => {
    const helper = [
      'import { fillRandomBytes, readClock, INVALID_TIMESTAMP } from "./errors.ts";',
      "function generateDefaultOwnedUuidV7Bytes(): UuidV7Bytes | UuidSlugError {",
      "  const clock = readClock(Date.now);",
      "  if (clock instanceof Error) return clock;",
      '  if (typeof clock !== "number" || !(clock >= 0 && clock < 0x1_0000_0000_0000))',
      '    return new UuidSlugError(INVALID_TIMESTAMP, "Clock must fit the UUIDv7 timestamp.");',
      "  const ms = Math.trunc(clock);",
      "  const bytes = new Uint8Array(16);",
      "  const failed = fillRandomBytes(runtime.fillRandom, bytes);",
      "  if (failed) return failed;",
      "  const high = Math.floor(ms / 0x1_0000_0000);",
      "  const low = ms >>> 0;",
      "  bytes[0] = high >>> 8;",
      "  bytes[1] = high;",
      "  bytes[2] = low >>> 24;",
      "  bytes[3] = low >>> 16;",
      "  bytes[4] = low >>> 8;",
      "  bytes[5] = low;",
      "  bytes[6] = (bytes[6]! & 0x0f) | 0x70;",
      "  bytes[8] = (bytes[8]! & 0x3f) | 0x80;",
      "  return bytes as unknown as UuidV7Bytes;",
      "}",
      "",
    ].join("\n");
    return (
      (helperAtEnd ? "" : helper) +
      replaceOnce(
        replaceOnce(
          source,
          owned,
          owned +
            "\nconst generateSelectedDefaultUuidV7Bytes = runtime.jitless ? currentUuidV7Bytes : generateDefaultOwnedUuidV7Bytes;",
        ),
        "return generatedOrThrow(currentUuidV7Bytes());",
        "return generatedOrThrow(generateSelectedDefaultUuidV7Bytes());",
      ) +
      (helperAtEnd ? helper : "")
    );
  };
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
    "  let values = readGenerationOptions(textCaseOrOptions, UUID_V7_TEXT_OPTIONS, UUID_V7_GENERATION);";
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
  const thinPreset = () => {
    // Only the new wrapper changes; the helper retains its original selector validation.
    const header = thin.slice(0, thin.indexOf("function generateConfiguredUuidV7"));
    return preset(withUppercase(header)) + thin.slice(header.length);
  };
  return [
    { name: "baseline", source },
    {
      name: "owned-direct-clock",
      get source() {
        // Isolate the sampled clock wrapper without changing its failure or timestamp checks.
        return replaceOnce(
          source,
          "  const clock = readClock(Date.now);\n  if (clock instanceof Error) return clock;",
          '  let clock: number;\n  try { clock = Date.now(); }\n  catch (cause) { return new UuidSlugError(INVALID_TIMESTAMP, "Clock reading failed.", { cause }); }',
        );
      },
    },
    {
      name: "random-owned-timestamp",
      get source() {
        return randomOwned();
      },
    },
    {
      name: "random-owned-timestamp-tail",
      get source() {
        return randomOwned(true);
      },
    },
    {
      name: "random-owned-timestamp-lost-clock",
      get source() {
        return replaceOnce(
          randomOwned(),
          "  return bytes as unknown as UuidV7Bytes;",
          "  bytes[0] = 0;\n  return bytes as unknown as UuidV7Bytes;",
        );
      },
    },
    {
      name: "random-owned-timestamp-lost-byte",
      get source() {
        return replaceOnce(
          randomOwned(),
          "  return bytes as unknown as UuidV7Bytes;",
          "  bytes[15] = 0;\n  return bytes as unknown as UuidV7Bytes;",
        );
      },
    },
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
