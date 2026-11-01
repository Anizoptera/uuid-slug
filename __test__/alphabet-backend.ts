// The test body imports this seam so each host executes its selected codec, not copied cases.
export { BASE32HEX, BASE64URL, decodeInto, encode } from "../src/alphabet";
export {
  uuidBytesToPlainSlug,
  isPlainUuidSlug,
  plainSlugToUuidBytes,
  uuidStringToPlainSlug,
} from "../src/index";
export { WIRE_FORMAT_CODECS as codecs } from "./wire-format-codecs";

export const detailedDiagnostics = true;
export const backendName = "typescript";
