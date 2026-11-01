// Node-only cases remain registered but skipped; reaching one must never simulate success.
function unavailable(): never {
  throw new Error(
    "A Node-only operation reached a browser case. Classify its host contract beside the case, or implement the actual portable operation; do not substitute a successful stub.",
  );
}
export {
  unavailable as command,
  unavailable as archiveAndRemoveScratch,
  unavailable as mkdtemp,
  unavailable as rm,
  unavailable as tmpdir,
  unavailable as join,
  unavailable as fileURLToPath,
  unavailable as spawnSync,
  unavailable as runInNewContext,
};
export const runtime = new Proxy({}, { get: () => unavailable });
export default new Proxy({}, { get: () => unavailable });
