// Select real implementations without copying cases; a missing resolver alias must never pass as Rust.
if ((process.env.UUID_SLUG_TEST_BACKEND ?? "typescript") !== "typescript")
  throw new Error(
    "TypeScript loaded in a Rust test lane; repair the test-implementation alias in vitest.config.ts.",
  );
export { BASE32HEX, BASE64URL, decodeInto, encode } from "../src/alphabet";
export {
  uuidBytesToPlainSlug,
  isPlainUuidSlug,
  plainSlugToUuidBytes,
  uuidStringToPlainSlug,
} from "../src/index";
export { WIRE_FORMAT_CODECS as codecs } from "./wire-format-codecs";

export const detailedDiagnostics = true;
export { halfSipHash } from "../src/siphash";
