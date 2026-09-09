import { command } from "./command";

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  const entries = Object.entries(value as Record<string, unknown>);
  // oxlint-disable-next-line unicorn/no-array-sort
  entries.sort(([left], [right]) => left.localeCompare(right));
  return Object.fromEntries(entries.map(([key, entry]) => [key, stable(entry)]));
}

export function typescriptManifest(manifest: Record<string, unknown>): Record<string, unknown> {
  return stable({
    engines: manifest.engines,
    exports: manifest.exports,
    files: manifest.files,
    imports: manifest.imports,
    main: manifest.main,
    module: manifest.module,
    name: manifest.name,
    sideEffects: manifest.sideEffects,
    type: manifest.type,
    types: manifest.types,
  }) as Record<string, unknown>;
}

export async function rustManifest(
  cwd: string,
  manifest: string,
): Promise<Record<string, unknown>> {
  const metadata = JSON.parse(
    await command(
      "cargo",
      ["metadata", "--manifest-path", manifest, "--format-version", "1", "--locked"],
      cwd,
    ),
  ) as {
    packages: Array<{
      name: string;
      edition: string;
      rust_version: string | null;
      features: Record<string, string[]>;
      dependencies: Array<{
        name: string;
        req: string;
        kind: string | null;
        optional: boolean;
        uses_default_features: boolean;
        features: string[];
        target: string | null;
      }>;
      targets: Array<{ kind: string[]; crate_types: string[] }>;
    }>;
  };
  const product = metadata.packages.find((entry) => entry.name === "uuid-slug");
  if (!product) throw new Error("Cargo metadata has no uuid-slug product.");
  return stable({
    name: product.name,
    edition: product.edition,
    rustVersion: product.rust_version,
    features: product.features,
    dependencies: product.dependencies.map((dependency) => ({
      name: dependency.name,
      requirement: dependency.req,
      kind: dependency.kind,
      optional: dependency.optional,
      defaultFeatures: dependency.uses_default_features,
      features: dependency.features,
      target: dependency.target,
    })),
    targets: product.targets.map(({ kind, crate_types: crateTypes }) => ({ kind, crateTypes })),
  }) as Record<string, unknown>;
}
