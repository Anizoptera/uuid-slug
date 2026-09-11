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
import { bytePatterns } from "../test/byte-patterns";
import { uuidTailAliases } from "../test/uuid-tail-aliases";
import { uuidVariants } from "../test/uuid-variants";
import { loadRustBridge } from "./rust-bridge";

type Request = Record<string, unknown> & { op: string; input?: string };
type Outcome = { value: unknown } | { error: string };
const custom = unwrap(
  ts.createCustomUuidV7Mask({
    label: "custom-mix",
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

export function evaluate(request: Request): Outcome {
  const input = request.input ?? "";
  try {
    switch (request.op) {
      case "generateSequence": {
        type Step = { clock?: number | string; at?: number | string; byte: number; fail?: boolean };
        let current: Step = { byte: 0 };
        const generator = createPortableUuidV7Generator({
          clock: () => Number(current.clock),
          fillRandom: (bytes) => {
            if (current.fail) throw new Error("entropy unavailable");
            bytes.fill(current.byte);
          },
        });
        return result(
          (request.steps as Step[]).map((step) => {
            current = step;
            try {
              return result(
                step.at === undefined
                  ? generator.generateUuidV7()
                  : generator.generateUuidV7At(Number(step.at)),
              );
            } catch (error) {
              if (error instanceof ts.UuidSlugError) return result(error);
              throw error;
            }
          }),
        );
      }
      case "parse":
        return result(ts.uuidToBytes(input));
      case "byteOperations": {
        const bytes = Uint8Array.from(request.bytes as number[]);
        const offset = request.offset as number;
        return result({
          uuid: result(ts.bytesToUuid(bytes, offset)),
          base64: result(ts.bytesToSlug(bytes, offset, "base64url")),
          base32: result(ts.bytesToSlug(bytes, offset, "base32hex")),
          timestamp: result(ts.extractUuidV7Timestamp(bytes, offset)),
          v7: ts.isUuidV7Bytes(bytes),
        });
      }
      case "plain":
        return result(ts.uuidToSlug(input, request.alphabet as SlugAlphabet | undefined));
      case "unplain":
        return result(ts.slugToUuid(input));
      case "timestamp": {
        const bytes = ts.uuidToBytes(input);
        return result(bytes instanceof Error ? bytes : ts.extractUuidV7Timestamp(bytes));
      }
      case "guards":
        return result([
          ts.isUuidString(input),
          ts.isUuidV4String(input),
          ts.isUuidV7String(input),
          ts.isUuidSlug(input),
          ts.isUuidV4Slug(input),
          ts.isUuidV7Slug(input),
        ]);
      case "base64Encode": {
        const bytes = Uint8Array.from(request.bytes as number[]);
        return result(
          bytes.length === 16
            ? ts.bytesToSlug(bytes)
            : new ts.UuidSlugError("invalid_buffer", "Expected one 16-byte UUID payload."),
        );
      }
      case "base64Decode":
        return result(
          input.length === 22
            ? ts.slugToBytes(input)
            : new ts.UuidSlugError(
                "invalid_base64url",
                "Expected a 22-character base64url UUID slug.",
              ),
        );
      case "base64Guard":
        return result(input.length === 22 && ts.isUuidSlug(input));
      case "base64DecodeTo": {
        const out = new Uint8Array(request.capacity as number).fill(165);
        const offset = request.offset as number;
        const decoded =
          input.length === 22
            ? ts.slugToBytes(input, out, offset)
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
      case "validateUuidTimestamp":
      case "validateSlugTimestamp":
        return result(
          (request.op === "validateUuidTimestamp"
            ? ts.validateUuidV7Timestamp
            : ts.validateUuidV7SlugTimestamp)(input, {
            maxTimestampDeltaMs: Number(request.window),
            referenceUnixMs: Number(request.now),
          }),
        );
    }
    const selectedMask = mask(request.mask);
    const codec = unwrap(
      ts.createUuidV7SlugCodec({
        mask: selectedMask ?? ts.UUID_V7_TEST_MASK,
        ...(request.previous === undefined
          ? {}
          : {
              previousMasks: (request.previous as unknown[]).map(
                (value) => mask(value) as UuidV7MaskOptions,
              ),
            }),
        ...(request.maskedAlphabet === undefined
          ? {}
          : { outputAlphabet: request.maskedAlphabet as SlugAlphabet }),
        ...(request.sentinels === undefined
          ? {}
          : { sentinels: request.sentinels as ts.UuidV7SentinelConfig[] }),
      }),
    );
    switch (request.op) {
      case "mask":
        return result(codec.encodeUuid(input));
      case "unmask":
        return result(
          request.acceptPlain === true
            ? codec.createMigrationDecoder({ plainSlug: true }).decodeSlug(input)
            : codec.decodeSlug(input),
        );
      case "unmaskV7":
        return result(codec.decodeSlug(input));
      case "sentinels":
        return result(codec.sentinels);
      case "validateMaskedTimestamp":
        return result(
          codec.validateSlugTimestamp(input, {
            maxTimestampDeltaMs: Number(request.window),
            referenceUnixMs: Number(request.now),
          }),
        );
      case "migration":
        return result(
          codec
            .createMigrationDecoder({
              originalMask: request.original === true,
              plainSlug: request.plain === true,
            })
            .decodeSlug(input, request.format as UuidSlugMigrationFormat | undefined),
        );
      case "candidates":
        return result(
          codec
            .createMigrationDecoder({
              originalMask: request.original === true,
              plainSlug: request.plain === true,
            })
            .decodeSlugCandidates(input, request.format as UuidSlugMigrationFormat | undefined),
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
  const wire: { uuid: string; direct: string; masked: string; schema: string }[] = JSON.parse(
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
    const uuid = ts.uuidToBytes(text);
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
          input: op === "mask" ? ordinary.uuid : ordinary.direct,
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
      input: ordinary.direct,
    });
  for (const vector of wire) {
    const key =
      vector.schema === "custom-mix"
        ? "custom-mix"
        : vector.schema === "default"
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
    deepStrictEqual(evaluate({ op: "plain", input: vector.uuid }), { value: vector.direct });
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
    ...wire.map((v) => v.uuid),
    ...original.plain.map((v) => v.uuid),
  ]) {
    for (const op of ["parse", "timestamp", "guards"]) requests.push({ op, input });
    for (const alphabet of ["base64url", "base32hex"]) {
      requests.push({ op: "plain", input, alphabet });
      const encoded = evaluate({ op: "plain", input, alphabet });
      if ("value" in encoded && typeof encoded.value === "string")
        for (const op of ["unplain", "guards"]) requests.push({ op, input: encoded.value });
    }
  }
  for (const input of ["", "A", "Zg", "Zh", "Zg=", "Zg\n", "é", ...wire.map((v) => v.direct)]) {
    for (const op of ["base64Decode", "base64Guard", "unplain", "guards"])
      requests.push({ op, input });
  }
  for (const input of [
    "",
    "A",
    ordinary.direct,
    first.direct,
    ts.uuidToSlug(ordinary.uuid, "base32hex"),
    ts.uuidToSlug("00000000-0000-4000-8000-000000000000"),
  ]) {
    if (input instanceof Error) throw input;
    for (const now of [
      0,
      Number.parseInt(ordinary.uuid.replaceAll("-", "").slice(0, 12), 16),
      2 ** 48,
      "NaN",
    ])
      for (const window of [0, 1000, -1, "Infinity"])
        requests.push({ op: "validateSlugTimestamp", input, now, window });
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
    const canonical = ts.uuidToSlug(ordinary.uuid, alphabet);
    if (canonical instanceof Error) throw canonical;
    const last = symbols.indexOf(canonical.at(-1) as string);
    for (let bits = 1; bits < (alphabet === "base64url" ? 16 : 4); bits++) {
      const input = canonical.slice(0, -1) + symbols[last | bits];
      const decode: Request = { op: "unplain", input };
      const guards: Request = { op: "guards", input };
      deepStrictEqual(evaluate(decode), {
        error: alphabet === "base64url" ? "invalid_base64url" : "invalid_base32",
      });
      deepStrictEqual(evaluate(guards), { value: [false, false, false, false, false, false] });
      requests.push(decode, guards);
    }
  }
  for (const input of ["", "A", "Zg", "Zh", "Zg=", ordinary.direct, `${ordinary.direct}=`, "é"])
    for (const capacity of [0, 1, 16, 17, 32])
      for (const offset of [0, 1, 16, 17, 2 ** 32, Number.MAX_SAFE_INTEGER])
        requests.push({ op: "base64DecodeTo", input, capacity, offset });
  for (const vector of original.issued) {
    for (const slug of [vector.slug, vector.raw])
      for (const input of uuidTailAliases(slug))
        for (const op of ["migration", "candidates"]) {
          for (const plain of [false, true])
            for (const enabled of [false, true])
              for (const format of [undefined, "plain-slug", "current-mask", "original-mask"])
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
  for (const window of [-1, 0, 0.5, 86_400_000, "NaN", "Infinity"]) {
    for (const now of [0, 1, 1.5, "NaN", "Infinity"])
      requests.push({ op: "validateUuidTimestamp", input: first.uuid, now, window });
  }
  const instant = Number.parseInt(ordinary.uuid.slice(0, 8) + ordinary.uuid.slice(9, 13), 16);
  for (const distance of [-1.5, -1, 0, 1, 1.5]) {
    requests.push({
      op: "validateUuidTimestamp",
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
  for (const input of [ordinary.direct, first.direct, "AAAAAAAAQACAAAAAAAAAAA"])
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
    requests.push({ op: "unplain", input });
  for (const input of ["é" + "0".repeat(26), "😀" + "0".repeat(25)]) {
    requests.push({ op: "unmask", input }, { op: "candidates", input });
  }
  return requests;
}

export function compare(requests: Request[], actual: unknown): void {
  if (!Array.isArray(actual) || !requests.length || actual.length !== requests.length)
    throw new Error("Native adapter returned an incomplete observation set");
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
      throw new Error(`${bridge.transport} direct plain conversion diverged from its wire vector`);
    console.log(`${bridge.transport}: ${requests.length} shared contract observations passed`);
  } finally {
    bridge.close();
  }
}
