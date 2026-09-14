import { basename } from "node:path";

const BUILD_PATH_LEAK = /(?:\/Users\/|\/home\/[a-z]|[A-Z]:\\Users\\)/;
const FORBIDDEN_PARTS = new Set([".git", ".github", "node_modules", "scripts", "target"]);

interface PackageManifest {
  readonly package?: Record<string, unknown>;
  readonly lib?: Record<string, unknown>;
  readonly bin?: unknown;
}

/** Validate the exact source archive that Cargo will upload. */
export async function inspectCrate(crate: string, version: string): Promise<void> {
  const root = `uuid-slug-${version}/`;
  const files = await new Bun.Archive(await Bun.file(crate).bytes()).files();
  for (const [name, file] of files) {
    const relative = name.startsWith(root) ? name.slice(root.length) : "";
    if (
      !relative ||
      relative.includes("\\") ||
      relative
        .split("/")
        .some((part) => !part || part === "." || part === ".." || FORBIDDEN_PARTS.has(part))
    )
      throw new Error(`Forbidden crate path: ${name}`);
    if (/\.(?:a|dll|dylib|exe|lib|node|o|obj|rlib|so(?:\.\d+)*|wasm)$/i.test(relative))
      throw new Error(`Compiled payload is forbidden in the crate: ${name}`);
    if (BUILD_PATH_LEAK.test(await file.text()))
      throw new Error(`Build-machine path leaked in ${name}`);
  }

  const required = [
    ".cargo_vcs_info.json",
    "Cargo.lock",
    "Cargo.toml",
    "Cargo.toml.orig",
    "LICENSE",
    "README.md",
    "src/lib.rs",
  ];
  for (const name of required)
    if (!files.has(`${root}${name}`)) throw new Error(`Crate has no ${name}.`);

  const manifestFile = files.get(`${root}Cargo.toml`);
  if (!manifestFile) throw new Error("Crate has no Cargo.toml.");
  const manifest = Bun.TOML.parse(await manifestFile.text()) as PackageManifest;
  const pkg = manifest.package;
  if (pkg?.name !== "uuid-slug" || pkg.version !== version)
    throw new Error(
      `${basename(crate)} must identify uuid-slug ${version}; got ${String(pkg?.name)} ${String(pkg?.version)}.`,
    );
  if (pkg.build !== false || pkg.autobins !== false || manifest.bin !== undefined)
    throw new Error("The published crate must remain a library without build or binary targets.");
  if (manifest.lib?.name !== "uuid_slug" || manifest.lib.path !== "src/lib.rs")
    throw new Error(
      `The crate library target must be uuid_slug at src/lib.rs; got ${String(manifest.lib?.name)} at ${String(manifest.lib?.path)}.`,
    );
}

if (import.meta.main) {
  const [crate, version] = process.argv.slice(2);
  if (!crate || !version) throw new Error("Usage: check-crate.ts ARCHIVE VERSION");
  inspectCrate(crate, version).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
