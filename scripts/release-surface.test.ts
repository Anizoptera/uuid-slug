import { expect, test } from "bun:test";
import { cargoProductSurface } from "./release-surface";
import type { CargoProduct } from "./release-surface";

test("Cargo release comparison excludes extraction-local metadata", () => {
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
  expect(
    cargoProductSurface({
      ...cargo,
      targets: [{ ...libTarget, kind: ["lib", "rlib"], crate_types: ["lib", "rlib"] }],
    }),
  ).toBe(
    cargoProductSurface({
      ...cargo,
      targets: [{ ...libTarget, kind: ["rlib", "lib"], crate_types: ["rlib", "lib"] }],
    }),
  );
});
