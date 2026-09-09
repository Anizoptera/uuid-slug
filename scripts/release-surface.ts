import { command } from "./command";
import type { ApiDifference, ReleaseLevel } from "./release-comparison";

export interface CargoReleaseSurface {
  readonly rust_version: string | null;
  readonly targets: readonly CargoTarget[];
}

export interface NpmReleaseSurface {
  readonly node_engine: unknown;
  readonly exports: unknown;
  readonly main: unknown;
  readonly module: unknown;
  readonly sideEffects: unknown;
  readonly type: unknown;
  readonly types: unknown;
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

export function npmReleaseSurface(manifest: Record<string, unknown>): NpmReleaseSurface {
  return {
    node_engine: (manifest.engines as { node?: unknown } | undefined)?.node,
    exports: manifest.exports,
    main: manifest.main,
    module: manifest.module,
    sideEffects: manifest.sideEffects,
    type: manifest.type,
    types: manifest.types,
  };
}

export function cargoProductSurface(product: CargoReleaseSurface): CargoReleaseSurface {
  const targets = product.targets
    .filter(({ kind }) => kind.includes("lib"))
    .map(({ name, kind, crate_types }) => ({
      name,
      kind: sorted(kind),
      crate_types: sorted(crate_types),
    }));
  // Cargo targets and their classifications are sets; source ordering is not compatibility.
  // oxlint-disable-next-line unicorn/no-array-sort
  targets.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  return { rust_version: product.rust_version, targets };
}

export function cargoManifestSurface(
  workspaceSource: string,
  packageSource: string,
): CargoReleaseSurface {
  const workspace = Bun.TOML.parse(workspaceSource) as {
    workspace?: { package?: { "rust-version"?: string } };
  };
  const manifest = Bun.TOML.parse(packageSource) as {
    package?: { name?: string; autolib?: boolean; "rust-version"?: unknown };
    lib?: { name?: string; "crate-type"?: string[] };
  };
  const packageName = manifest.package?.name;
  if (!packageName) throw new Error("Cargo package manifest has no package name.");
  const packageRustVersion = manifest.package?.["rust-version"];
  const targets =
    manifest.package?.autolib === false && !manifest.lib
      ? []
      : [
          {
            name: manifest.lib?.name ?? packageName.replaceAll("-", "_"),
            kind: ["lib"],
            crate_types: manifest.lib?.["crate-type"] ?? ["lib"],
          },
        ];
  return cargoProductSurface({
    rust_version:
      typeof packageRustVersion === "string"
        ? packageRustVersion
        : (workspace.workspace?.package?.["rust-version"] ?? null),
    targets,
  });
}

export async function rustReleaseSurface(
  cwd: string,
  manifest: string,
): Promise<CargoReleaseSurface> {
  const metadata = JSON.parse(
    await command(
      "cargo",
      ["metadata", "--manifest-path", manifest, "--no-deps", "--format-version", "1", "--locked"],
      cwd,
    ),
  ) as { packages: Array<CargoReleaseSurface & { name: string }> };
  const product = metadata.packages.find(({ name }) => name === "uuid-slug");
  if (!product) throw new Error("Cargo metadata has no uuid-slug product.");
  return cargoProductSurface(product);
}

function floor(value: unknown, field: string, prefix = ""): readonly bigint[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new Error(`${field} must be a minimum version string.`);
  const match = new RegExp(`^${prefix}(\\d+)(?:\\.(\\d+))?(?:\\.(\\d+))?$`).exec(value);
  if (!match) throw new Error(`${field} uses an unsupported version range: ${value}`);
  return match.slice(1).map((part) => BigInt(part ?? 0));
}

function compareFloor(
  before: readonly bigint[] | undefined,
  after: readonly bigint[] | undefined,
): ReleaseLevel {
  if (!before) return after ? "major" : "patch";
  if (!after) return "patch";
  for (let index = 0; index < Math.max(before.length, after.length); index++) {
    const change = (after[index] ?? 0n) - (before[index] ?? 0n);
    if (change !== 0n) return change > 0n ? "major" : "patch";
  }
  return "patch";
}

function strongest(levels: readonly ReleaseLevel[]): ReleaseLevel {
  return levels.includes("major") ? "major" : levels.includes("minor") ? "minor" : "patch";
}

function exportsLevel(before: unknown, after: unknown): ReleaseLevel {
  if (!before || !after || typeof before !== "object" || typeof after !== "object") return "major";
  const oldEntries = Object.entries(before);
  const newExports = after as Record<string, unknown>;
  if (
    oldEntries.some(([name, target]) => JSON.stringify(target) !== JSON.stringify(newExports[name]))
  )
    return "major";
  return Object.keys(after).length > oldEntries.length ? "minor" : "patch";
}

export function npmSurfaceDifference(
  before: NpmReleaseSurface,
  after: NpmReleaseSurface,
): ApiDifference {
  const changes: string[] = [];
  const levels: ReleaseLevel[] = [];
  if (before.node_engine !== after.node_engine) {
    const oldNode = before.node_engine;
    const newNode = after.node_engine;
    levels.push(
      compareFloor(floor(oldNode, "engines.node", ">="), floor(newNode, "engines.node", ">=")),
    );
    changes.push(`Node support changed from ${String(oldNode)} to ${String(newNode)}.`);
  }
  if (JSON.stringify(before.exports) !== JSON.stringify(after.exports)) {
    levels.push(exportsLevel(before.exports, after.exports));
    changes.push("exports changed.");
  }
  for (const field of ["main", "module", "sideEffects", "type", "types"] as const) {
    if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
      levels.push("major");
      changes.push(`${field} changed.`);
    }
  }
  return changes.length
    ? { report: changes.join("\n"), level: strongest(levels) }
    : { report: "No npm package metadata changes.", level: "patch" };
}

export function cargoSurfaceDifference(
  before: CargoReleaseSurface,
  after: CargoReleaseSurface,
): ApiDifference {
  const changes: string[] = [];
  const levels: ReleaseLevel[] = [];
  if (before.rust_version !== after.rust_version) {
    levels.push(
      compareFloor(
        floor(before.rust_version, "rust-version"),
        floor(after.rust_version, "rust-version"),
      ),
    );
    changes.push(`Rust support changed from ${before.rust_version} to ${after.rust_version}.`);
  }
  const oldTargets = new Set(before.targets.map((target) => JSON.stringify(target)));
  const newTargets = new Set(after.targets.map((target) => JSON.stringify(target)));
  if ([...oldTargets].some((target) => !newTargets.has(target))) {
    levels.push("major");
    changes.push("A library target changed or was removed.");
  } else if ([...newTargets].some((target) => !oldTargets.has(target))) {
    levels.push("minor");
    changes.push("A library target was added.");
  }
  return changes.length
    ? { report: changes.join("\n"), level: strongest(levels) }
    : { report: "No Cargo package metadata changes.", level: "patch" };
}
