// The wrapper owns JavaScript identity; all UUID fields and spellings are read by Rust.
import {
  failure,
  invoke,
  isUuidSlugError,
  parsedBytes,
  payload,
  record,
  returnedBytes,
  write,
} from "./rust-test-api";

type Codec = { uuidToMaskedSlug: (value: unknown) => unknown };
export const valueOptions = new WeakMap<object, Record<string, unknown>>();
export function parsedValue(value: unknown, options: Record<string, unknown> = {}): unknown {
  if (isUuidSlugError(value)) return value;
  const bytes = returnedBytes(invoke("bytes", value));
  if (bytes instanceof Error) return bytes;
  const inspection = record(invoke("inspect", bytes));
  const previous =
    value !== null && typeof value === "object" ? valueOptions.get(value) : undefined;
  const retained = (options.maskingCodec ?? previous?.maskingCodec) as Codec | undefined;
  const layout = options.payloadLayout ?? previous?.payloadLayout;
  const result = {
    version: inspection.version,
    inspect: () =>
      Object.freeze({
        ...record(invoke("inspect", bytes)),
        unixMs: inspection.unixMs ?? undefined,
      }),
    toString: (textCase?: unknown) => invoke("text", bytes, textCase),
    toJSON: () => invoke("text", bytes),
    toBytes: (output?: unknown, offset?: unknown) => write(invoke("bytes", bytes), output, offset),
    toPlainSlug: (alphabet?: unknown) => invoke("plain", bytes, alphabet),
    toMaskedSlug: (codec?: Codec) => {
      const selected = codec ?? retained;
      return selected ? selected.uuidToMaskedSlug(bytes.slice()) : failure("invalid_options");
    },
    extractV7Payload: (selected: unknown = layout) =>
      selected ? payload(invoke("payload", bytes, selected)) : failure("invalid_options"),
    presets: Object.freeze({ maskingCodec: !!retained, payloadLayout: !!layout }),
  };
  parsedBytes.set(result, bytes);
  valueOptions.set(result, { maskingCodec: retained, payloadLayout: layout });
  return Object.freeze(result);
}
