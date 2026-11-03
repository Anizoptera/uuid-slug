// Observe actual worker results without replacing the constructors or entropy provider.
import { run } from "../bench/implementation-worker";
import type { ProfileValue } from "../bench/profile-case";
import { isMaskHandle } from "../src/mask-handle";
import { createUuidV7MaskingCodec } from "../src/index";

const key = "uuidSlugBenchmarkResult";
const previous = Object.getOwnPropertyDescriptor(globalThis, key);
let writes = 0;
let first: ProfileValue = false;
let last: ProfileValue = false;
Object.defineProperty(globalThis, key, {
  configurable: true,
  set(value: ProfileValue) {
    if (writes++ === 0) first = value;
    last = value;
  },
});
try {
  const result = await run({
    samples: 1,
    duration: 1,
    warmup: 2,
    filter: "=construct.mask,=async.mask.derive",
    batchTicks: 40,
  });
  const calls = result.rows.reduce(
    (total, row) =>
      total + row.operations + (row.calibration ?? []).reduce((sum, batch) => sum + batch.count, 0),
    0,
  );
  if (writes !== calls)
    throw new Error(`Results did not escape: ${writes} writes for ${calls} calls`);
  const uuid = "018bcfe5-6800-7000-8000-000000000001";
  const slugs = [first, last].map((value) => {
    if (!isMaskHandle(value)) throw new Error("Worker lost the derived mask's hidden state");
    const codec = createUuidV7MaskingCodec({ mask: value });
    if (codec instanceof Error) throw codec;
    const slug = codec.uuidToMaskedSlug(uuid);
    if (slug instanceof Error) throw slug;
    if (codec.uuidToString(slug) !== uuid) throw new Error("Escaped mask changed UUID identity");
    return slug;
  });
  if (slugs[0] === slugs[1])
    throw new Error("Distinct derivation inputs lost their hidden key state");
  console.log(JSON.stringify({ writes, calls, jobs: result.rows.map((row) => row.name), slugs }));
} finally {
  if (previous) Object.defineProperty(globalThis, key, previous);
  else Reflect.deleteProperty(globalThis, key);
}
