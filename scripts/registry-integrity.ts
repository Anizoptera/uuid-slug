import { createHash } from "node:crypto";

/** A release retry must match the registry's archive, not an assumed deterministic repack. */
export function verifyIntegrity(bytes: Uint8Array, integrity: string): void {
  const actual = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
  if (integrity !== actual)
    throw new Error(
      "Archive differs from registry integrity; refuse attestation or release-asset replacement.",
    );
}

/** Only an explicit 404 means unpublished; outages and malformed metadata must stop release. */
export async function registryIntegrity(url: string): Promise<string | undefined> {
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`Registry lookup failed: HTTP ${response.status}.`);
  const metadata = await response.json();
  const integrity = metadata?.dist?.integrity;
  if (typeof integrity !== "string" || !integrity.startsWith("sha512-"))
    throw new Error("Registry has no SHA-512 archive integrity.");
  return integrity;
}

if (import.meta.main) {
  const [tarball, url] = process.argv.slice(2);
  if (!tarball || !url)
    throw new Error("Usage: registry-integrity.ts archive.tgz registry-version-url");
  try {
    const integrity = await registryIntegrity(url);
    if (!integrity)
      throw new Error("Version is missing from the registry; no published bytes to attest.");
    verifyIntegrity(await Bun.file(tarball).bytes(), integrity);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
