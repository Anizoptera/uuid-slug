import { expect, test } from "bun:test";
import { cargoProductSurface, npmReleaseSurface } from "./release-surface";
import type { CargoProduct } from "./release-surface";

test("release surfaces change for every retained manifest contract", () => {
  const npm = {
    engines: { node: ">=20" },
    exports: { ".": "./index.js" },
    files: ["dist"],
    imports: { "#runtime": "./runtime.js" },
    main: "./index.js",
    module: "./index.js",
    sideEffects: false,
    type: "module",
    types: "./index.d.ts",
  };
  const npmSurface = npmReleaseSurface(npm);
  for (const field of Object.keys(npm))
    expect(npmReleaseSurface({ ...npm, [field]: undefined })).not.toBe(npmSurface);

  const dependency = {
    name: "uuid",
    req: "^1",
    kind: null,
    optional: false,
    uses_default_features: false,
    features: [],
    target: null,
    source: "registry",
  } as const;
  const libTarget = {
    name: "uuid_slug",
    kind: ["lib"],
    crate_types: ["lib"],
    src_path: "/current",
  } as const;
  const cargo: CargoProduct = {
    edition: "2024",
    rust_version: "1.97",
    features: { default: ["os-rng"] },
    dependencies: [dependency],
    targets: [libTarget],
  };
  const cargoSurface = cargoProductSurface(cargo);
  for (const changed of [
    { ...cargo, edition: "2021" },
    { ...cargo, rust_version: null },
    { ...cargo, features: {} },
    { ...cargo, dependencies: [] },
    { ...cargo, targets: [] },
  ])
    expect(cargoProductSurface(changed)).not.toBe(cargoSurface);

  expect(
    cargoProductSurface({
      ...cargo,
      dependencies: [{ ...dependency, kind: "dev" }, ...cargo.dependencies],
      targets: [{ name: "example", kind: ["example"], crate_types: ["bin"] }, ...cargo.targets],
    }),
  ).toBe(cargoSurface);
  expect(
    cargoProductSurface({
      ...cargo,
      features: { default: ["second", "first"] },
    }),
  ).toBe(
    cargoProductSurface({
      ...cargo,
      features: { default: ["first", "second"] },
    }),
  );
  const movedDependency = { ...dependency, source: "mirror" };
  const movedTarget = { ...libTarget, src_path: "/previous" };
  expect(
    cargoProductSurface({ ...cargo, dependencies: [movedDependency], targets: [movedTarget] }),
  ).toBe(cargoSurface);
});
