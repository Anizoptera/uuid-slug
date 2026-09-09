import { expect, test } from "bun:test";
import { cargoProductSurface, npmReleaseSurface } from "./release-surface";
import type { CargoProduct } from "./release-surface";

test("release surfaces change for every retained manifest contract", () => {
  const npm = {
    engines: { node: ">=20" },
    exports: { ".": "./index.js" },
    main: "./index.js",
    module: "./index.js",
    sideEffects: false,
    type: "module",
    types: "./index.d.ts",
  };
  const npmSurface = npmReleaseSurface(npm);
  for (const field of Object.keys(npm))
    expect(npmReleaseSurface({ ...npm, [field]: undefined })).not.toBe(npmSurface);

  const libTarget = {
    name: "uuid_slug",
    kind: ["lib"],
    crate_types: ["lib"],
    src_path: "/current",
  } as const;
  const cargo: CargoProduct = {
    rust_version: "1.97",
    targets: [libTarget],
  };
  const cargoSurface = cargoProductSurface(cargo);
  for (const changed of [
    { ...cargo, rust_version: null },
    { ...cargo, targets: [] },
  ])
    expect(cargoProductSurface(changed)).not.toBe(cargoSurface);

  expect(
    cargoProductSurface({
      ...cargo,
      targets: [{ name: "example", kind: ["example"], crate_types: ["bin"] }, ...cargo.targets],
    }),
  ).toBe(cargoSurface);
  const movedTarget = { ...libTarget, src_path: "/previous" };
  expect(cargoProductSurface({ ...cargo, targets: [movedTarget] })).toBe(cargoSurface);
});
