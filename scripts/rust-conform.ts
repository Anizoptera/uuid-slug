// Compare every requested result, including failures, through the real native development transport.
import { deepStrictEqual } from "node:assert";
import { readFile } from "node:fs/promises";
import { unwrap } from "../dev/unwrap";
import * as ts from "../src/index";
import { createPortableUuidV7Generator } from "../src/v7";
import type {
  UuidV7Mask,
  UuidV7MaskOptions,
  UuidSlugMigrationFormat,
  SlugAlphabet,
} from "../src/index";
import { bytePatterns } from "../__test__/byte-patterns";
import { uuidTailAliases } from "../__test__/uuid-tail-aliases";
import { uuidVariants } from "../__test__/uuid-variants";
import { candidates as generationCandidates } from "../bench/candidates";
import { loadRustBridge } from "./rust-bridge";

type Request = Record<string, unknown> & { op: string; input?: string };
type Outcome = { value: unknown } | { error: string };
const custom = unwrap(
  ts.createCustomUuidV7Mask({
    diagnosticLabel: "custom-mix",
    mask(input) {
      const output = new Uint8Array(16);
      for (let index = 0; index < 16; index++) {
        const target = (index * 5 + 3) % 16;
        output[index] = (input[target] as number) ^ (index * 17);
      }
      return output;
    },
    unmask(input) {
      const output = new Uint8Array(16);
      for (let index = 0; index < 16; index++) {
        const target = (index * 5 + 3) % 16;
        output[target] = (input[index] as number) ^ (index * 17);
      }
      return output;
    },
  }),
);

function mask(value: unknown): UuidV7Mask | UuidV7MaskOptions | undefined {
  if (value === undefined || value === null) return undefined;
  if (value === "custom-mix") return custom;
  const options = value as {
    seed?: string;
    bytes?: number[];
    utf16?: number[];
    iterations?: number | string;
  };
  return {
    seed: options.utf16
      ? String.fromCharCode(...options.utf16)
      : options.bytes
        ? Uint8Array.from(options.bytes)
        : (options.seed as string),
    ...(options.iterations === undefined
      ? {}
      : { keyDerivationIterations: Number(options.iterations) }),
  };
}

function result(value: unknown): Outcome {
  return value instanceof ts.UuidSlugError
    ? { error: value.code }
    : { value: value instanceof Uint8Array ? Array.from(value) : value };
}

function uuidV7FromPayload(unixMs: number, payload: bigint): string {
  const randA = payload >> 62n;
  const randB = payload & ((1n << 62n) - 1n);
  const value = (BigInt(unixMs) << 80n) | (7n << 76n) | (randA << 64n) | (2n << 62n) | randB;
  const hex = value.toString(16).padStart(32, "0");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function appendUuidV7CompatibilityRequests(requests: Request[], input: string): void {
  const parsed = ts.uuidStringToBytes(input);
  if (parsed instanceof Error) throw parsed;
  const canonical = ts.bytesToUuidString(parsed);
  if (canonical instanceof Error) throw canonical;
  const unixMs = Number.parseInt(canonical.slice(0, 8) + canonical.slice(9, 13), 16);
  deepStrictEqual(evaluate({ op: "guards", input }), {
    value: [true, false, true, false, false, false],
  });
  deepStrictEqual(evaluate({ op: "timestamp", input }), { value: unixMs });
  for (const op of ["parse", "timestamp", "guards"]) requests.push({ op, input });
  for (const alphabet of ["base64url", "base32hex"]) {
    const plain = evaluate({ op: "plain", input, alphabet });
    if (!("value" in plain) || typeof plain.value !== "string")
      throw new Error(`UUIDv7 compatibility input was rejected: ${input}`);
    deepStrictEqual(evaluate({ op: "plainToUuid", input: plain.value }), { value: canonical });
    requests.push({ op: "plain", input, alphabet }, { op: "plainToUuid", input: plain.value });
  }
  for (const maskedAlphabet of ["base64url", "base32hex"]) {
    const options = {
      mask: { seed: "external-v7-compatibility" },
      maskedAlphabet,
      timestampRangeStartUnixMs: unixMs,
    };
    const masked = evaluate({ ...options, op: "mask", input });
    if (!("value" in masked) || typeof masked.value !== "string")
      throw new Error(`UUIDv7 compatibility input could not be masked: ${input}`);
    deepStrictEqual(evaluate({ ...options, op: "unmask", input: masked.value }), {
      value: canonical,
    });
    requests.push(
      { ...options, op: "mask", input },
      { ...options, op: "unmask", input: masked.value },
    );
  }
}

export function evaluate(request: Request): Outcome {
  const input = request.input ?? "";
  try {
    switch (request.op) {
      case "generateSequence": {
        type Step = {
          clock?: number | string;
          at?: ts.UuidV7Instant;
          byte: number;
          fail?: boolean;
        };
        let current: Step = { byte: 0 };
        const generator = createPortableUuidV7Generator({
          readUnixMs: () => Number(current.clock),
          fillRandom: (bytes) => {
            if (current.fail) throw new Error("entropy unavailable");
            bytes.fill(current.byte);
          },
          subMillisecondFractionBits: Number(request.fractionBits ?? 0),
        });
        return result(
          (request.steps as Step[]).map((step) => {
            current = step;
            try {
              return result(
                step.at === undefined
                  ? generator.generateUuidV7()
                  : generator.generateUuidV7({ at: step.at }),
              );
            } catch (error) {
              if (error instanceof ts.UuidSlugError) return result(error);
              throw error;
            }
          }),
        );
      }
      case "parse":
        return result(ts.uuidStringToBytes(input));
      case "byteOperations": {
        const bytes = Uint8Array.from(request.bytes as number[]);
        const offset = request.offset as number;
        return result({
          uuid: result(ts.bytesToUuidString(bytes, offset)),
          base64: result(ts.uuidBytesToPlainSlug(bytes, offset, "base64url")),
          base32: result(ts.uuidBytesToPlainSlug(bytes, offset, "base32hex")),
          timestamp: result(ts.extractUuidV7UnixMs(bytes, offset)),
          v7: ts.isUuidV7Bytes(bytes),
        });
      }
      case "plain":
        return result(
          ts.uuidStringToPlainSlug(input, request.alphabet as SlugAlphabet | undefined),
        );
      case "plainToUuid":
        return result(ts.plainSlugToUuidString(input));
      case "timestamp": {
        const bytes = ts.uuidStringToBytes(input);
        return result(bytes instanceof Error ? bytes : ts.extractUuidV7UnixMs(bytes));
      }
      case "uuidV7StringBounds":
        return result(
          ts.uuidV7StringBounds(
            Number(request.start),
            Number(request.end),
            request.textCase as ts.UuidTextCase | undefined,
          ),
        );
      case "guards":
        return result([
          ts.isUuidText(input),
          ts.isUuidV4Text(input),
          ts.isUuidV7Text(input),
          ts.isPlainUuidSlug(input),
          ts.isPlainUuidV4Slug(input),
          ts.isPlainUuidV7Slug(input),
        ]);
      case "base64Encode": {
        const bytes = Uint8Array.from(request.bytes as number[]);
        return result(
          bytes.length === 16
            ? ts.uuidBytesToPlainSlug(bytes)
            : new ts.UuidSlugError("invalid_buffer", "Expected one 16-byte UUID payload."),
        );
      }
      case "base64Decode":
        return result(
          input.length === 22
            ? ts.uuidToBytes(input)
            : new ts.UuidSlugError(
                "invalid_base64url",
                "Expected a 22-character base64url UUID slug.",
              ),
        );
      case "base64Guard":
        return result(input.length === 22 && ts.isPlainUuidSlug(input));
      case "base64DecodeTo": {
        const out = new Uint8Array(request.capacity as number).fill(165);
        const offset = request.offset as number;
        const decoded =
          input.length === 22
            ? ts.uuidToBytes(input, out, offset)
            : new ts.UuidSlugError(
                "invalid_base64url",
                "Expected a 22-character base64url UUID slug.",
              );
        // Matching error codes cannot establish that a rejected range left caller storage intact.
        if (decoded instanceof ts.UuidSlugError && decoded.code === "invalid_buffer") {
          deepStrictEqual(out, new Uint8Array(out.length).fill(165));
          return result({ error: decoded.code, storage: Array.from(out) });
        }
        return decoded instanceof Error
          ? result(decoded)
          : result({
              bytes: Array.from(decoded.subarray(offset, offset + 16)),
              storage: Array.from(out),
            });
      }
      case "validateUuidV7StringUnixMs":
        return result(
          ts.validateUuidV7StringUnixMs(input, {
            maxTimestampDeltaMs: Number(request.window),
            referenceUnixMs: Number(request.now),
          }),
        );
      case "validatePlainUuidV7SlugUnixMs":
        return result(
          ts.validatePlainUuidV7SlugUnixMs(input, {
            maxTimestampDeltaMs: Number(request.window),
            referenceUnixMs: Number(request.now),
          }),
        );
    }
    const selectedMask = mask(request.mask);
    const codec = unwrap(
      ts.createUuidV7MaskingCodec({
        mask: selectedMask ?? ts.UUID_V7_TEST_MASK,
        ...(request.timestampRangeStartUnixMs === undefined
          ? {}
          : { timestampRangeStartUnixMs: Number(request.timestampRangeStartUnixMs) }),
        ...(request.previous === undefined
          ? {}
          : {
              previousMasks: (request.previous as unknown[]).map((value) => {
                const configured = value as { mask?: unknown; timestampRangeStartUnixMs?: number };
                if (configured.mask === undefined) return mask(value) as UuidV7MaskOptions;
                const previousMask = mask(configured.mask) as UuidV7MaskOptions;
                if (configured.timestampRangeStartUnixMs === undefined)
                  return { mask: previousMask };
                return {
                  mask: previousMask,
                  timestampRangeStartUnixMs: configured.timestampRangeStartUnixMs,
                };
              }),
            }),
        ...(request.maskedAlphabet === undefined
          ? {}
          : { maskedSlugAlphabet: request.maskedAlphabet as SlugAlphabet }),
        ...(request.sentinels === undefined
          ? {}
          : { sentinels: request.sentinels as ts.UuidV7SentinelConfig[] }),
      }),
    );
    switch (request.op) {
      case "mask":
        return result(codec.uuidToMaskedSlug(input));
      case "unmask":
        return result(
          request.acceptPlain === true
            ? codec
                .createUuidSlugMigrationDecoder({ acceptPlainSlug: true })
                .uuidSlugToUuidString(input)
            : codec.maskedSlugToUuidString(input),
        );
      case "unmaskV7":
        return result(codec.maskedSlugToUuidString(input));
      case "sentinels":
        return result(codec.sentinels);
      case "validateMaskedTimestamp":
        return result(
          codec.validateMaskedUuidV7SlugUnixMs(input, {
            maxTimestampDeltaMs: Number(request.window),
            referenceUnixMs: Number(request.now),
          }),
        );
      case "migration":
        return result(
          codec
            .createUuidSlugMigrationDecoder({
              acceptFixedMask: request.original === true,
              acceptPlainSlug: request.plain === true,
            })
            .uuidSlugToUuidString(input, request.format as UuidSlugMigrationFormat | undefined),
        );
      case "candidates":
        return result(
          codec
            .createUuidSlugMigrationDecoder({
              acceptFixedMask: request.original === true,
              acceptPlainSlug: request.plain === true,
            })
            .uuidSlugToUuidStringCandidates(
              input,
              request.format as UuidSlugMigrationFormat | undefined,
            ),
        );
      default:
        throw new Error(`Unknown conformance operation ${request.op}`);
    }
  } catch (error) {
    if (error instanceof ts.UuidSlugError) return result(error);
    throw error;
  }
}

export async function contractRequests(): Promise<Request[]> {
  const wire: { uuid: string; plain: string; masked: string; mask: string }[] = JSON.parse(
    await readFile("rust/uuid-slug/tests/fixtures/fixtures-wire-format.json", "utf8"),
  );
  const original: {
    issued: { uuid: string; slug: string; raw: string }[];
    plain: { uuid: string; slug: string }[];
    overlap: { slug: string; seed: string };
    keyOverlap: { slug: string; seeds: string[] };
  } = JSON.parse(
    await readFile("rust/uuid-slug/tests/fixtures/fixtures-original-slugs.json", "utf8"),
  );
  const requests: Request[] = [];
  const maxPayload = (1n << 74n) - 1n;
  let alternatingPayload = 0n;
  for (let bit = 0n; bit < 74n; bit += 2n) alternatingPayload |= 1n << bit;
  // Boundary, alternating, and one-hot payloads catch any code that assigns meaning to RFC rand_a/rand_b.
  const payloads = [0n, maxPayload, alternatingPayload, maxPayload ^ alternatingPayload];
  for (let bit = 0n; bit < 74n; bit++) payloads.push(1n << bit);
  for (const payload of payloads)
    appendUuidV7CompatibilityRequests(requests, uuidV7FromPayload(1_756_864_833_024, payload));
  for (const candidate of generationCandidates) {
    if (candidate.name === "package" || !candidate.uuidV7) continue;
    appendUuidV7CompatibilityRequests(requests, candidate.uuidV7());
  }
  for (const [start, end] of [
    [0, 0],
    [1, 2],
    [0xffff_ffff_ffff, 0xffff_ffff_ffff],
    [2, 1],
    [0x1_0000_0000_0000, 0x1_0000_0000_0000],
  ])
    for (const textCase of ["lowercase", "uppercase"])
      requests.push({ op: "uuidV7StringBounds", start, end, textCase });
  // Generic parsing accepts every version/variant; specialized guards must not widen with it.
  for (const { value, v4, v7 } of uuidVariants("0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051")) {
    deepStrictEqual(evaluate({ op: "guards", input: value }), {
      value: [true, v4, v7, false, false, false],
    });
    for (const op of ["parse", "timestamp", "guards"]) requests.push({ op, input: value });
  }
  const first = wire[0];
  const ordinary = wire[3];
  if (!first || !ordinary)
    throw new Error("Wire fixtures must include sentinel and ordinary UUIDs");
  const retainedSentinels = [{ name: "nil", uuid: first.uuid }];
  for (const text of [ordinary.uuid, first.uuid, "ffffffff-ffff-ffff-ffff-ffffffffffff"]) {
    const uuid = ts.uuidStringToBytes(text);
    if (uuid instanceof Error) throw uuid;
    for (const bytes of [[], [...uuid].slice(0, 15), [...uuid], [165, ...uuid, 165]])
      for (const offset of [0, 1, 2, 16, Number.MAX_SAFE_INTEGER])
        requests.push({ op: "byteOperations", bytes, offset });
  }
  for (const sentinels of [
    [],
    [{ name: "reserved", uuid: ordinary.uuid }],
    [{ name: "reserved", uuid: "ffffffff-ffff-7fff-bfff-ffffffffffff" }],
  ])
    for (const maskedAlphabet of ["base64url", "base32hex"])
      for (const op of ["sentinels", "mask", "unmask", "migration", "candidates"])
        requests.push({
          op,
          sentinels,
          maskedAlphabet,
          input: op === "mask" ? ordinary.uuid : ordinary.plain,
        });
  for (const sentinels of [
    [{ name: "", uuid: ordinary.uuid }],
    [
      { name: "reserved", uuid: ordinary.uuid },
      { name: "reserved", uuid: first.uuid },
    ],
    [{ name: "wrong-version", uuid: "00000000-0000-4000-8000-000000000000" }],
    [{ name: "malformed", uuid: "invalid" }],
    [
      { name: "first", uuid: first.uuid },
      { name: "duplicate", uuid: first.uuid },
    ],
  ])
    requests.push({
      op: "sentinels",
      sentinels,
      maskedAlphabet: "base64url",
      input: ordinary.plain,
    });
  for (const vector of wire) {
    const key =
      vector.mask === "custom-mix"
        ? "custom-mix"
        : vector.mask === "default"
          ? undefined
          : { seed: "golden-vector-seed-v3" };
    const encode: Request = {
      op: "mask",
      input: vector.uuid,
      mask: key,
      sentinels: retainedSentinels,
    };
    // Retained producer bytes constrain both implementations; mutual agreement alone cannot.
    deepStrictEqual(evaluate(encode), { value: vector.masked });
    deepStrictEqual(evaluate({ op: "plain", input: vector.uuid }), { value: vector.plain });
    requests.push(encode, {
      op: "unmask",
      input: vector.masked,
      mask: key,
      sentinels: retainedSentinels,
    });
    for (const maskedAlphabet of ["base64url", "base32hex"]) {
      const options = { mask: key, maskedAlphabet, sentinels: retainedSentinels };
      const encoded = evaluate({ ...options, op: "mask", input: vector.uuid });
      if (!("value" in encoded) || typeof encoded.value !== "string")
        throw new Error("Fixture encoding failed");
      requests.push(
        { ...options, op: "mask", input: vector.uuid },
        { ...options, op: "unmask", input: encoded.value },
        { ...options, op: "candidates", input: encoded.value },
        { ...options, op: "sentinels" },
      );
      if (encoded.value.length === 26) {
        for (const op of ["unmask", "migration", "candidates"]) {
          const upper: Request = { ...options, op, input: encoded.value.toUpperCase() };
          deepStrictEqual(evaluate(upper), evaluate({ ...upper, input: encoded.value }));
          requests.push(upper);
        }
      }
      if (encoded.value.length === 27) {
        const last = "0123456789abcdefghijklmnopqrstuv".indexOf(encoded.value.at(-1) as string);
        for (let bits = 1; bits < 8; bits++)
          requests.push({
            ...options,
            op: "unmask",
            input: encoded.value.slice(0, -1) + "0123456789abcdefghijklmnopqrstuv"[last | bits],
          });
      }
    }
  }
  for (const input of [
    "",
    "x",
    "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF",
    ordinary.uuid.replaceAll("-", "").toUpperCase(),
    ...wire.map((v) => v.uuid),
    ...original.plain.map((v) => v.uuid),
  ]) {
    for (const op of ["parse", "timestamp", "guards"]) requests.push({ op, input });
    for (const alphabet of ["base64url", "base32hex"]) {
      requests.push({ op: "plain", input, alphabet });
      const encoded = evaluate({ op: "plain", input, alphabet });
      if ("value" in encoded && typeof encoded.value === "string")
        for (const op of ["plainToUuid", "guards"]) requests.push({ op, input: encoded.value });
    }
  }
  for (const input of ["", "A", "Zg", "Zh", "Zg=", "Zg\n", "é", ...wire.map((v) => v.plain)]) {
    for (const op of ["base64Decode", "base64Guard", "plainToUuid", "guards"])
      requests.push({ op, input });
  }
  for (const input of [
    "",
    "A",
    ordinary.plain,
    first.plain,
    ts.uuidStringToPlainSlug(ordinary.uuid, "base32hex"),
    ts.uuidStringToPlainSlug("00000000-0000-4000-8000-000000000000"),
  ]) {
    if (input instanceof Error) throw input;
    for (const now of [
      0,
      Number.parseInt(ordinary.uuid.replaceAll("-", "").slice(0, 12), 16),
      2 ** 48,
      "NaN",
    ])
      for (const window of [0, 1000, -1, "Infinity"])
        requests.push({ op: "validatePlainUuidV7SlugUnixMs", input, now, window });
  }
  for (const length of [0, 1, 15, 16, 17, 64])
    requests.push({
      op: "base64Encode",
      bytes: Array.from({ length }, (_, i) => (i * 19 + length) & 255),
    });
  // Reuse the runtime probe's byte patterns; every 16-byte shape remains valid UUID payload data.
  for (const { bytes } of bytePatterns(new ArrayBuffer(80))) {
    const view = bytes.subarray(4, 20);
    const request: Request = { op: "base64Encode", bytes: Array.from(view) };
    deepStrictEqual(evaluate(request), { value: Buffer.from(view).toString("base64url") });
    requests.push(request);
  }
  // Plain UUID padding cannot carry data: every nonzero spelling must be rejected.
  for (const alphabet of ["base64url", "base32hex"] as const) {
    const symbols =
      alphabet === "base64url"
        ? "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
        : "0123456789abcdefghijklmnopqrstuv";
    const canonical = ts.uuidStringToPlainSlug(ordinary.uuid, alphabet);
    if (canonical instanceof Error) throw canonical;
    const last = symbols.indexOf(canonical.at(-1) as string);
    for (let bits = 1; bits < (alphabet === "base64url" ? 16 : 4); bits++) {
      const input = canonical.slice(0, -1) + symbols[last | bits];
      const decode: Request = { op: "plainToUuid", input };
      const guards: Request = { op: "guards", input };
      deepStrictEqual(evaluate(decode), {
        error: alphabet === "base64url" ? "invalid_base64url" : "invalid_base32hex",
      });
      deepStrictEqual(evaluate(guards), { value: [false, false, false, false, false, false] });
      requests.push(decode, guards);
    }
  }
  for (const input of ["", "A", "Zg", "Zh", "Zg=", ordinary.plain, `${ordinary.plain}=`, "é"])
    for (const capacity of [0, 1, 16, 17, 32])
      for (const offset of [0, 1, 16, 17, 2 ** 32, Number.MAX_SAFE_INTEGER])
        requests.push({ op: "base64DecodeTo", input, capacity, offset });
  for (const vector of original.issued) {
    for (const slug of [vector.slug, vector.raw])
      for (const input of uuidTailAliases(slug))
        for (const op of ["migration", "candidates"]) {
          for (const plain of [false, true])
            for (const enabled of [false, true])
              for (const format of [undefined, "plain-slug", "seeded-mask", "fixed-mask"])
                requests.push({ op, input, plain, original: enabled, format });
        }
  }
  const masks = [
    undefined,
    { seed: "short" },
    { seed: "golden-vector-seed-v3", iterations: 0 },
    { seed: "golden-vector-seed-v3", iterations: 2 },
    { utf16: [...Array(16).fill(65), 0xd800, 0xdc00, 0xd800] },
    { bytes: Array.from({ length: 19 }, (_, i) => i) },
  ];
  for (const byte of [0, 1, 255]) {
    requests.push({
      op: "generateSequence",
      fractionBits: 12,
      steps: [
        { clock: 10.9, byte },
        { clock: 9, byte, fail: true },
        { clock: 9, byte },
        { at: 1, byte },
        { clock: 9, byte },
        { at: 1.5, byte },
        { clock: "NaN", byte },
        { clock: 11, byte },
      ],
    });
    requests.push({
      op: "generateSequence",
      fractionBits: 12,
      steps: [
        { at: { seconds: 0, nanoseconds: 244 }, byte },
        { at: { seconds: 0, nanoseconds: 245 }, byte },
        { at: { seconds: 281_474_976_710, nanoseconds: 655_000_000 }, byte },
        { at: { seconds: 281_474_976_710, nanoseconds: 656_000_000 }, byte },
      ],
    });
    requests.push({
      op: "generateSequence",
      steps: [
        { clock: 2 ** 48 - 1, byte },
        { clock: 2 ** 48 - 1, byte },
        { clock: 2 ** 48 - 1, byte },
        { at: 2 ** 48, byte },
      ],
    });
  }
  for (const selectedMask of masks)
    requests.push({ op: "mask", input: ordinary.uuid, mask: selectedMask });
  const shiftedStart = 2 ** 42;
  const shiftedUuid = "04000000-0000-7000-8000-000000000000";
  const shiftedMask = { seed: "shifted-range-old-test-key" };
  const shifted = evaluate({
    op: "mask",
    input: shiftedUuid,
    mask: shiftedMask,
    timestampRangeStartUnixMs: shiftedStart,
  });
  if (!("value" in shifted) || typeof shifted.value !== "string")
    throw new Error("Shifted timestamp fixture failed to encode");
  requests.push(
    {
      op: "mask",
      input: shiftedUuid,
      mask: shiftedMask,
      timestampRangeStartUnixMs: shiftedStart,
    },
    {
      op: "unmask",
      input: shifted.value,
      mask: shiftedMask,
      timestampRangeStartUnixMs: shiftedStart,
    },
    {
      op: "unmask",
      input: shifted.value,
      mask: { seed: "shifted-range-new-test-key" },
      previous: [{ mask: shiftedMask, timestampRangeStartUnixMs: shiftedStart }],
    },
  );
  for (const window of [-1, 0, 0.5, 86_400_000, "NaN", "Infinity"]) {
    for (const now of [0, 1, 1.5, "NaN", "Infinity"])
      requests.push({ op: "validateUuidV7StringUnixMs", input: first.uuid, now, window });
  }
  const instant = Number.parseInt(ordinary.uuid.slice(0, 8) + ordinary.uuid.slice(9, 13), 16);
  for (const distance of [-1.5, -1, 0, 1, 1.5]) {
    requests.push({
      op: "validateUuidV7StringUnixMs",
      input: ordinary.uuid,
      now: instant + distance,
      window: 1,
    });
    for (const maskedAlphabet of ["base64url", "base32hex"]) {
      const key = { seed: "timestamp-private-test-key" };
      const encoded = evaluate({ op: "mask", input: ordinary.uuid, mask: key, maskedAlphabet });
      if (!("value" in encoded) || typeof encoded.value !== "string")
        throw new Error("Timestamp window fixture failed to encode");
      for (const previous of [false, true])
        requests.push({
          op: "validateMaskedTimestamp",
          input: encoded.value,
          maskedAlphabet,
          mask: previous ? { seed: "timestamp-new-test-key" } : key,
          previous: previous ? [key] : [],
          now: instant + distance,
          window: 1,
        });
    }
  }
  for (const input of [ordinary.plain, first.plain, "AAAAAAAAQACAAAAAAAAAAA"])
    for (const acceptPlain of [false, true])
      for (const op of ["unmask", "unmaskV7", "validateMaskedTimestamp"])
        requests.push({ op, input, acceptPlain, now: instant, window: 1 });
  requests.push({
    op: "candidates",
    input: original.overlap.slug,
    mask: { seed: original.overlap.seed },
    original: true,
    plain: true,
  });
  requests.push({
    op: "candidates",
    input: original.keyOverlap.slug,
    mask: { seed: original.keyOverlap.seeds[0] },
    previous: [{ seed: original.keyOverlap.seeds[1] }],
  });
  for (const input of ["é" + "A".repeat(21), "😀" + "A".repeat(20)])
    requests.push({ op: "plainToUuid", input });
  for (const input of ["é" + "0".repeat(26), "😀" + "0".repeat(25)]) {
    requests.push({ op: "unmask", input }, { op: "candidates", input });
  }
  return requests;
}

export function compare(requests: Request[], actual: unknown): void {
  if (!Array.isArray(actual) || !requests.length || actual.length !== requests.length)
    throw new Error(
      `Native adapter must return ${requests.length} observations; got ${Array.isArray(actual) ? actual.length : typeof actual}.`,
    );
  requests.forEach((request, index) => {
    const expected = evaluate(request);
    try {
      deepStrictEqual(actual[index], expected);
    } catch {
      throw new Error(
        [
          `Parity failure in ${request.op}.`,
          `TypeScript: ${JSON.stringify(expected)}`,
          `Rust: ${JSON.stringify(actual[index])}`,
          `Input: ${JSON.stringify(request)}`,
          "Required fix: make both implementations satisfy the shared consumer contract.",
        ].join("\n"),
      );
    }
  });
}

if (import.meta.main) {
  const requests = await contractRequests();
  const bridge = await loadRustBridge();
  try {
    compare(requests, JSON.parse(bridge.evaluate(JSON.stringify(requests))));
    if (bridge.plain("0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f0000") !== "AZChssPUfl-KmwwdLj8AAA")
      throw new Error(`${bridge.transport} plain conversion diverged from its wire vector.`);
    console.log(`${bridge.transport}: ${requests.length} shared contract observations passed`);
  } finally {
    bridge.close();
  }
}
