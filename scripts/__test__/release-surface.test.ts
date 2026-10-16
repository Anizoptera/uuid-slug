import { expect, test } from "bun:test";
import {
  cargoProductSurface,
  cargoManifestSurface,
  cargoSurfaceDifference,
  npmReleaseSurface,
  npmSurfaceDifference,
} from "../release-surface";
import type { CargoReleaseSurface } from "../release-surface";

test("Cargo release comparison excludes extraction-local metadata", () => {
  const libTarget = {
    name: "uuid_slug",
    kind: ["lib"],
    crate_types: ["lib"],
    src_path: "/current",
  } as const;
  const cargo: CargoReleaseSurface = {
    rust_version: "1.97",
    targets: [libTarget],
  };
  const cargoSurface = cargoProductSurface(cargo);
  expect(
    cargoProductSurface({
      ...cargo,
      targets: [{ name: "example", kind: ["example"], crate_types: ["bin"] }, ...cargo.targets],
    }),
  ).toEqual(cargoSurface);
  const movedTarget = { ...libTarget, src_path: "/previous" };
  expect(cargoProductSurface({ ...cargo, targets: [movedTarget] })).toEqual(cargoSurface);
  expect(
    cargoProductSurface({
      ...cargo,
      targets: [{ ...libTarget, kind: ["lib", "rlib"], crate_types: ["lib", "rlib"] }],
    }),
  ).toEqual(
    cargoProductSurface({
      ...cargo,
      targets: [{ ...libTarget, kind: ["rlib", "lib"], crate_types: ["rlib", "lib"] }],
    }),
  );
});

test("runtime floors distinguish lost support from wider support", () => {
  const npm = npmReleaseSurface({ engines: { node: ">=20" } });
  expect(npmSurfaceDifference(npm, npmReleaseSurface({ engines: { node: ">=22" } })).level).toBe(
    "major",
  );
  expect(npmSurfaceDifference(npm, npmReleaseSurface({ engines: { node: ">=18" } })).level).toBe(
    "patch",
  );

  const cargo = { rust_version: "1.97", targets: [] };
  expect(cargoSurfaceDifference(cargo, { ...cargo, rust_version: "1.98" }).level).toBe("major");
  expect(cargoSurfaceDifference(cargo, { ...cargo, rust_version: "1.96" }).level).toBe("patch");
});

test("Cargo manifests expose default and explicit library targets", () => {
  const workspace = '[workspace.package]\nrust-version = "1.97"';
  expect(
    cargoManifestSurface(workspace, '[package]\nname = "uuid-slug"\nrust-version.workspace = true'),
  ).toEqual({
    rust_version: "1.97",
    targets: [{ name: "uuid_slug", kind: ["lib"], crate_types: ["lib"] }],
  });
  expect(
    cargoManifestSurface(
      workspace,
      '[package]\nname = "uuid-slug"\nautolib = false\n\n[lib]\nname = "slug"\ncrate-type = ["rlib", "cdylib"]',
    ),
  ).toEqual({
    rust_version: "1.97",
    targets: [{ name: "slug", kind: ["lib"], crate_types: ["cdylib", "rlib"] }],
  });
  expect(cargoManifestSurface(workspace, '[package]\nname = "uuid-slug"\nautolib = false')).toEqual(
    { rust_version: "1.97", targets: [] },
  );
});

test("unrelated engine metadata does not masquerade as Node support", () => {
  const before = npmReleaseSurface({ engines: { node: ">=20", editor: ">=1" } });
  const after = npmReleaseSurface({ engines: { node: ">=20", editor: ">=2" } });
  expect(npmSurfaceDifference(before, after)).toEqual({
    report: "No npm package metadata changes.",
    level: "patch",
  });
});

test("runtime floors remain exact beyond safe integers", () => {
  const before = npmReleaseSurface({ engines: { node: ">=9007199254740992" } });
  const after = npmReleaseSurface({ engines: { node: ">=9007199254740993" } });
  expect(npmSurfaceDifference(before, after).level).toBe("major");
});

test("entrypoint and library target changes require compatible versions", () => {
  const npm = npmReleaseSurface({ main: "./index.js" });
  expect(npmSurfaceDifference(npm, npmReleaseSurface({ main: "./dist/index.js" })).level).toBe(
    "major",
  );

  const target = { name: "uuid_slug", kind: ["lib"], crate_types: ["lib"] };
  const cargo = { rust_version: "1.97", targets: [target] };
  expect(cargoSurfaceDifference(cargo, { ...cargo, targets: [] }).level).toBe("major");
});

test("a new npm subpath is additive; a moved target is not breaking but a lost condition is", () => {
  const before = npmReleaseSurface({ exports: { ".": "./index.js" } });
  expect(
    npmSurfaceDifference(
      before,
      npmReleaseSurface({ exports: { ".": "./index.js", "./extra": "./extra.js" } }),
    ).level,
  ).toBe("minor");
  expect(
    npmSurfaceDifference(before, npmReleaseSurface({ exports: { ".": "./other.js" } })).level,
  ).toBe("patch");
  const conditions = npmReleaseSurface({
    exports: { ".": { deno: "./src/index.ts", default: "./index.js" } },
  });
  const level = (exports: unknown) =>
    npmSurfaceDifference(conditions, npmReleaseSurface({ exports })).level;
  expect(level({ ".": { deno: "./dist/index.js", default: "./index.js" } })).toBe("patch");
  expect(
    npmSurfaceDifference(
      conditions,
      npmReleaseSurface({ exports: { ".": { deno: "./dist/index.js", default: "./index.js" } } }),
    ).report,
  ).toBe(
    'Package export conditions:\n\n- `exports["."].deno`: `./src/index.ts` → `./dist/index.js`',
  );
  expect(level({ ".": { default: "./index.js" } })).toBe("major");
  expect(level({ ".": "./index.js" })).toBe("major");
  expect(level({ ".": { deno: "./d.js", node: "./n.js", default: "./index.js" } })).toBe("minor");
});

test("export-condition priority changes show only the reordered conditions", () => {
  const before = npmReleaseSurface({
    exports: {
      ".": { bun: "./bun.ts", default: "./index.js", types: "./index.d.ts" },
      "./other": "./other.js",
    },
  });
  const after = npmReleaseSurface({
    exports: {
      ".": { default: "./index.js", bun: "./bun.ts", types: "./index.d.ts" },
      "./other": "./other.js",
    },
  });
  const { level, report } = npmSurfaceDifference(before, after);
  expect(level).toBe("major");
  expect(report).toBe(
    'Package export conditions:\n\n- `exports["."]` condition order: bun, default, types → default, bun, types',
  );
  const conditional = npmSurfaceDifference(
    npmReleaseSurface({
      exports: { bun: "./bun.ts", default: "./index.js", types: "./index.d.ts" },
    }),
    npmReleaseSurface({
      exports: { default: "./index.js", bun: "./bun.ts", types: "./index.d.ts" },
    }),
  );
  expect(conditional.report).toBe(
    "Package export conditions:\n\n- `exports` condition order: bun, default, types → default, bun, types",
  );
  expect(conditional.level).toBe("major");
  expect(
    npmSurfaceDifference(
      npmReleaseSurface({ exports: { ".": "./index.js", "./other": "./other.js" } }),
      npmReleaseSurface({ exports: { "./other": "./other.js", ".": "./index.js" } }),
    ).level,
  ).toBe("patch");
});
