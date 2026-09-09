import { command } from "./command";

export interface CargoProduct {
  readonly edition: string;
  readonly rust_version: string | null;
  readonly features: Record<string, string[]>;
  readonly dependencies: readonly CargoDependency[];
  readonly targets: readonly CargoTarget[];
}

interface CargoDependency {
  readonly name: string;
  readonly req: string;
  readonly kind: string | null;
  readonly optional: boolean;
  readonly uses_default_features: boolean;
  readonly features: readonly string[];
  readonly target: string | null;
}

interface CargoTarget {
  readonly kind: readonly string[];
  readonly crate_types: readonly string[];
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  // oxlint-disable-next-line unicorn/no-array-sort
  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  return Object.fromEntries(entries.map(([key, entry]) => [key, stable(entry)]));
}

export function npmReleaseSurface(manifest: Record<string, unknown>): string {
  return JSON.stringify({
    engines: manifest.engines,
    exports: manifest.exports,
    files: manifest.files,
    imports: manifest.imports,
    main: manifest.main,
    module: manifest.module,
    sideEffects: manifest.sideEffects,
    type: manifest.type,
    types: manifest.types,
  });
}

export function cargoProductSurface(product: CargoProduct): string {
  return JSON.stringify(
    stable({
      edition: product.edition,
      rustVersion: product.rust_version,
      features: product.features,
      dependencies: product.dependencies.filter(({ kind }) => kind === null),
      targets: product.targets.filter(({ kind }) => kind.includes("lib")),
    }),
  );
}

export async function rustReleaseSurface(cwd: string, manifest: string): Promise<string> {
  const metadata = JSON.parse(
    await command(
      "cargo",
      ["metadata", "--manifest-path", manifest, "--format-version", "1", "--locked"],
      cwd,
    ),
  ) as { packages: Array<CargoProduct & { name: string }> };
  const product = metadata.packages.find(({ name }) => name === "uuid-slug");
  if (!product) throw new Error("Cargo metadata has no uuid-slug product.");
  return cargoProductSurface(product);
}
