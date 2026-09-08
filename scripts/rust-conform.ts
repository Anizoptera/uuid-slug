// Compare every requested result, including failures, through the real native development transport.
import { deepStrictEqual } from "node:assert";
import { readFile } from "node:fs/promises";
import * as ts from "../src/index";
import type { MaskSchema, MaskSchemaOptions, MigrationFormat, SlugAlphabet } from "../src/index";
import { loadRustBridge } from "./rust-bridge";

type Request = Record<string, unknown> & { op: string; input?: string };
type Outcome = { value: unknown } | { error: string };
const custom: MaskSchema = {
  id: "custom-mix",
  mix(input, output, forward) {
    for (let index = 0; index < 16; index++) {
      const target = (index * 5 + 3) % 16;
      if (forward) output[index] = (input[target] as number) ^ (index * 17);
      else output[target] = (input[index] as number) ^ (index * 17);
    }
  },
};

function mask(value: unknown): MaskSchema | MaskSchemaOptions | undefined {
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
    ...(options.iterations === undefined ? {} : { keyIterations: Number(options.iterations) }),
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
        const generator = ts.createUuidV7Generator({
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
                step.at === undefined ? generator.uuidV7() : generator.uuidV7At(Number(step.at)),
              );
            } catch (error) {
              if (error instanceof ts.UuidSlugError) return result(error);
              throw error;
            }
          }),
        );
      }
      case "parse":
        return result(ts.parseUuid(input));
      case "byteOperations": {
        const bytes = Uint8Array.from(request.bytes as number[]);
        const offset = request.offset as number;
        return result({
          uuid: result(ts.formatUuid(bytes, offset)),
          base64: result(ts.formatUuidSlug(bytes, offset, "base64url")),
          base32: result(ts.formatUuidSlug(bytes, offset, "base32hex")),
          timestamp: result(ts.extractUuidV7Timestamp(bytes, offset)),
          entropy: ts.hasUuidV7Entropy(bytes, offset),
          v7: ts.isUuidV7Bytes(bytes),
        });
      }
      case "plain":
        return result(ts.uuidToSlug(input, request.alphabet as SlugAlphabet | undefined));
      case "unplain":
        return result(ts.slugToUuid(input));
      case "timestamp": {
        const bytes = ts.parseUuid(input);
        return result(bytes instanceof Error ? bytes : ts.extractUuidV7Timestamp(bytes));
      }
      case "entropy": {
        const bytes = ts.parseUuid(input);
        return result(bytes instanceof Error ? bytes : ts.hasUuidV7Entropy(bytes));
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
      case "base64Encode":
        return result(ts.encodeBase64Url(Uint8Array.from(request.bytes as number[])));
      case "base64Decode":
        return result(ts.decodeBase64Url(input));
      case "base64DecodeTo": {
        const out = new Uint8Array(request.capacity as number).fill(165);
        const decoded = ts.decodeBase64Url(input, out, request.offset as number);
        return decoded instanceof Error
          ? result(decoded)
          : result({ bytes: Array.from(decoded), storage: Array.from(out) });
      }
      case "fresh":
        return result(
          ts.validateUuidV7Fresh(input, {
            now: () => Number(request.now),
            windowMs: Number(request.window),
          }),
        );
    }
    const selectedMask = mask(request.mask);
    const codec = ts.createUuidSlugCodec({
      ...(selectedMask === undefined ? {} : { mask: selectedMask }),
      ...(request.previous === undefined
        ? {}
        : {
            previousMasks: (request.previous as unknown[]).map(
              (value) => mask(value) as MaskSchemaOptions,
            ),
          }),
      ...(request.alphabet === undefined ? {} : { slugAlphabet: request.alphabet as SlugAlphabet }),
      ...(request.maskedAlphabet === undefined
        ? {}
        : { maskedSlugAlphabet: request.maskedAlphabet as SlugAlphabet }),
      acceptUnmaskedSlugs: request.acceptPlain === true,
      ...(request.sentinels === undefined
        ? {}
        : { sentinels: request.sentinels as ts.UuidV7SentinelDefinition[] }),
    });
    switch (request.op) {
      case "mask":
        return result(codec.uuidV7ToMaskedSlug(input));
      case "unmask":
        return result(codec.maskedSlugToUuid(input));
      case "unmaskV7":
        return result(codec.maskedSlugToUuidV7(input));
      case "sentinels":
        return result(codec.sentinels);
      case "freshMasked":
        return result(
          codec.validateMaskedSlugFresh(input, {
            now: () => Number(request.now),
            windowMs: Number(request.window),
          }),
        );
      case "migration":
        return result(
          codec
            .migration({ original: request.original === true, plain: request.plain === true })
            .decode(input, request.format as MigrationFormat | undefined),
        );
      case "candidates":
        return result(
          codec
            .migration({ original: request.original === true, plain: request.plain === true })
            .candidates(input, request.format as MigrationFormat | undefined),
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
  for (let version = 0; version < 16; version++)
    for (const variant of ["0", "4", "8", "c"])
      for (const op of ["parse", "timestamp", "guards"])
        requests.push({
          op,
          input: `0190a1b2-c3d4-${version.toString(16)}e5f-${variant}a9b-0c1d2e3f4051`,
        });
  const first = wire[0];
  const ordinary = wire[3];
  if (!first || !ordinary)
    throw new Error("Wire fixtures must include sentinel and ordinary UUIDs");
  for (const text of [ordinary.uuid, first.uuid, "ffffffff-ffff-ffff-ffff-ffffffffffff"]) {
    const uuid = ts.parseUuid(text);
    if (uuid instanceof Error) throw uuid;
    for (const bytes of [[], [...uuid].slice(0, 15), [...uuid], [165, ...uuid, 165]])
      for (const offset of [0, 1, 2, 16, Number.MAX_SAFE_INTEGER])
        requests.push({ op: "byteOperations", bytes, offset });
  }
  for (const sentinels of [
    [],
    [{ name: "reserved", uuid: ordinary.uuid }],
    [{ name: "reserved", uuid: "ffffffff-ffff-7fff-bfff-ffffffffffff" }],
    [{ name: "wrong-version", uuid: "00000000-0000-4000-8000-000000000000" }],
    [{ name: "malformed", uuid: "invalid" }],
    [
      { name: "first", uuid: first.uuid },
      { name: "duplicate", uuid: first.uuid },
    ],
  ])
    for (const maskedAlphabet of ["base64url", "base32hex"])
      for (const op of ["sentinels", "mask", "unmask", "migration", "candidates"])
        requests.push({
          op,
          sentinels,
          maskedAlphabet,
          input: op === "mask" ? ordinary.uuid : ordinary.direct,
        });
  for (const vector of wire) {
    const key =
      vector.schema === "custom-mix"
        ? "custom-mix"
        : vector.schema === "default"
          ? undefined
          : { seed: "golden-vector-seed-v3" };
    const encode: Request = { op: "mask", input: vector.uuid, mask: key };
    // Retained producer bytes constrain both implementations; mutual agreement alone cannot.
    deepStrictEqual(evaluate(encode), { value: vector.masked });
    deepStrictEqual(evaluate({ op: "plain", input: vector.uuid }), { value: vector.direct });
    requests.push(encode, { op: "unmask", input: vector.masked, mask: key });
    for (const maskedAlphabet of ["base64url", "base32hex"]) {
      const options = { mask: key, maskedAlphabet };
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
    for (const op of ["parse", "timestamp", "entropy", "guards"]) requests.push({ op, input });
    for (const alphabet of ["base64url", "base32hex"]) {
      requests.push({ op: "plain", input, alphabet });
      const encoded = evaluate({ op: "plain", input, alphabet });
      if ("value" in encoded && typeof encoded.value === "string")
        for (const op of ["unplain", "guards"]) requests.push({ op, input: encoded.value });
    }
  }
  for (const input of ["", "A", "Zg", "Zh", "Zg=", "Zg\n", "é", ...wire.map((v) => v.direct)]) {
    for (const op of ["base64Decode", "unplain", "guards"]) requests.push({ op, input });
  }
  for (let length = 0; length <= 64; length++)
    requests.push({
      op: "base64Encode",
      bytes: Array.from({ length }, (_, i) => (i * 19 + length) & 255),
    });
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
  for (const input of ["", "A", "Zg", "Zh", "Zg=", "Zm9vYmFy", "Zm9v!mFy", "é"])
    for (const capacity of [0, 1, 6, 9])
      for (const offset of [0, 1, 9, 2 ** 32, Number.MAX_SAFE_INTEGER])
        requests.push({ op: "base64DecodeTo", input, capacity, offset });
  for (const vector of original.issued) {
    for (const input of [vector.slug, vector.raw])
      for (const op of ["migration", "candidates"]) {
        for (const plain of [false, true])
          for (const enabled of [false, true])
            for (const format of [undefined, "plain", "current", "original"])
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
      requests.push({ op: "fresh", input: first.uuid, now, window });
  }
  const instant = Number.parseInt(ordinary.uuid.slice(0, 8) + ordinary.uuid.slice(9, 13), 16);
  for (const distance of [-1.5, -1, 0, 1, 1.5]) {
    requests.push({ op: "fresh", input: ordinary.uuid, now: instant + distance, window: 1 });
    for (const maskedAlphabet of ["base64url", "base32hex"]) {
      const key = { seed: "freshness-private-test-key" };
      const encoded = evaluate({ op: "mask", input: ordinary.uuid, mask: key, maskedAlphabet });
      if (!("value" in encoded) || typeof encoded.value !== "string")
        throw new Error("Freshness fixture failed to encode");
      for (const previous of [false, true])
        requests.push({
          op: "freshMasked",
          input: encoded.value,
          maskedAlphabet,
          mask: previous ? { seed: "freshness-new-test-key" } : key,
          previous: previous ? [key] : [],
          now: instant + distance,
          window: 1,
        });
    }
  }
  for (const input of [ordinary.direct, first.direct, "AAAAAAAAQACAAAAAAAAAAA"])
    for (const acceptPlain of [false, true])
      for (const op of ["unmask", "unmaskV7", "freshMasked"])
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
  return requests;
}

export function compare(requests: Request[], actual: unknown): void {
  if (!Array.isArray(actual) || !requests.length || actual.length !== requests.length)
    throw new Error("Native adapter returned an incomplete observation set");
  requests.forEach((request, index) =>
    deepStrictEqual(actual[index], evaluate(request), JSON.stringify(request)),
  );
}

if (import.meta.main) {
  const requests = await contractRequests();
  const bridge = await loadRustBridge();
  try {
    compare(requests, JSON.parse(bridge.evaluate(JSON.stringify(requests))));
    console.log(
      `${typeof Bun === "undefined" ? "Node N-API" : "Bun FFI"}: ${requests.length} shared contract observations passed`,
    );
  } finally {
    bridge.close();
  }
}
