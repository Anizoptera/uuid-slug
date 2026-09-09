import { command } from "./command";

export interface CargoProduct {
  readonly rust_version: string | null;
  readonly targets: readonly CargoTarget[];
}

interface CargoTarget {
  readonly name: string;
  readonly kind: readonly string[];
  readonly crate_types: readonly string[];
}

function sorted(values: readonly string[]): string[] {
  // oxlint-disable-next-line unicorn/no-array-sort
  return [...values].sort();
}

export function npmReleaseSurface(manifest: Record<string, unknown>): string {
  return JSON.stringify({
    engines: manifest.engines,
    exports: manifest.exports,
    main: manifest.main,
    module: manifest.module,
    sideEffects: manifest.sideEffects,
    type: manifest.type,
    types: manifest.types,
  });
}

export function cargoProductSurface(product: CargoProduct): string {
  const targets = product.targets
    .filter(({ kind }) => kind.includes("lib"))
    .map(({ name, kind, crate_types }) => ({
      name,
      kind: sorted(kind),
      crateTypes: sorted(crate_types),
    }));
  // Cargo targets and their classifications are sets; source ordering is not compatibility.
  // oxlint-disable-next-line unicorn/no-array-sort
  targets.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  return JSON.stringify({ rustVersion: product.rust_version, targets });
}

export async function rustReleaseSurface(cwd: string, manifest: string): Promise<string> {
  const metadata = JSON.parse(
    await command(
      "cargo",
      ["metadata", "--manifest-path", manifest, "--no-deps", "--format-version", "1", "--locked"],
      cwd,
    ),
  ) as { packages: Array<CargoProduct & { name: string }> };
  const product = metadata.packages.find(({ name }) => name === "uuid-slug");
  if (!product) throw new Error("Cargo metadata has no uuid-slug product.");
  return cargoProductSurface(product);
}
