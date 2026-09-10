import { expect, test } from "bun:test";
import { rejects } from "node:assert/strict";
import { apiDiff, minimumRelease, satisfiesMinimum, sizeDelta } from "./release-comparison";
import { verifyCrateIdentity, verifyNpmIdentity } from "./release-report";

test("release API diff exposes removals and additions without restating unchanged lines", () => {
  expect(
    apiDiff("export declare function old(): void;\nshared", "shared\nexport type New = 1;\n"),
  ).toBe("- `export declare function old(): void;`\n- `export type New = 1;` (added)");
  expect(apiDiff("same\n", "same\n")).toBe("No packaged TypeScript declaration changes.");
});

test("stable version distance must satisfy the derived release level", () => {
  expect(satisfiesMinimum("0.3.0", "0.4.0", "minor")).toBe(true);
  expect(satisfiesMinimum("1.3.0", "1.3.1", "minor")).toBe(false);
  expect(satisfiesMinimum("1.3.0", "2.0.0", "major")).toBe(true);
  expect(satisfiesMinimum("2.0.0-beta.1", "2.0.0", "major")).toBe(true);
  expect(satisfiesMinimum("1.3.0", "2.0.0-beta.1", "prerelease")).toBe(true);
  expect(satisfiesMinimum("9007199254740992.0.0", "9007199254740993.0.0", "major")).toBe(true);
});

test("API comparison detects moved members and changed overload priority", () => {
  const before = "export interface A {\n x: string;\n}\nexport interface B {\n y: number;\n}";
  const after = "export interface A {\n y: number;\n}\nexport interface B {\n x: string;\n}";
  expect(apiDiff(before, after)).not.toContain("No packaged");
  const narrow = "export declare function f(x: string): 1;";
  const broad = "export declare function f(x: unknown): 2;";
  expect(apiDiff(`${narrow}\n${broad}`, `${broad}\n${narrow}`)).not.toContain("No packaged");
  expect(apiDiff(`${narrow}\n${narrow}`, narrow)).not.toContain("No packaged");
});

test("hyphens in build metadata do not waive stable compatibility", () => {
  expect(minimumRelease("1.4.1+build-fix", "### Breaking changes\n", [])).toBe("major");
  expect(satisfiesMinimum("1.4.0+build-old", "1.4.1", "major")).toBe(false);
});

test("release size deltas never invent a percentage for zero or missing denominators", () => {
  expect(sizeDelta(12, 0)).toBe("12 B (+12 B)");
  expect(sizeDelta(12, undefined)).toBe("unavailable");
  expect(sizeDelta(12, 8)).toBe("12 B (+4 B, +50.0%)");
});

test("the strongest structural or maintainer-classified change sets the minimum release", () => {
  expect(minimumRelease("0.4.0", "### Breaking changes\n", ["patch"])).toBe("minor");
  expect(minimumRelease("1.4.0", "### Fixed\n", ["major", "minor"])).toBe("major");
  expect(minimumRelease("1.4.1", "### Added\n", ["patch"])).toBe("minor");
  expect(minimumRelease("1.4.1", "### Fixed\n", ["patch"])).toBe("patch");
  expect(minimumRelease("2.0.0-beta.2", "### Breaking changes\n", ["major"])).toBe("prerelease");
});

test("release classification ignores changelog headings inside examples", () => {
  expect(minimumRelease("1.2.4", "```md\n### Breaking changes\n### Added\n```", [])).toBe("patch");
  expect(minimumRelease("1.3.0", "### Added\n\n- Public behavior.\n", [])).toBe("minor");
  expect(minimumRelease("2.0.0", "### Breaking changes\n\n- Public behavior.\n", [])).toBe("major");
});

test("retained archives identify the selected package version and Git source", async () => {
  const npm = new Map([
    ["package/package.json", new Blob([JSON.stringify({ name: "pkg", version: "1.2.3" })])],
  ]);
  const crate = new Map([
    ["uuid-slug-1.2.3/Cargo.toml", new Blob(['[package]\nversion = "1.2.3"\n'])],
    ["uuid-slug-1.2.3/.cargo_vcs_info.json", new Blob([JSON.stringify({ git: { sha1: "abc" } })])],
  ]);
  expect(await verifyNpmIdentity(npm, "pkg", "1.2.3")).toMatchObject({ version: "1.2.3" });
  await verifyCrateIdentity(crate, "1.2.3", "abc");
  await rejects(verifyNpmIdentity(npm, "pkg", "1.2.4"), /does not identify/);
  await rejects(verifyCrateIdentity(crate, "1.2.3", "def"), /does not identify/);
  await rejects(
    verifyCrateIdentity(
      new Map([...crate, ["uuid-slug-1.2.3/../escape", new Blob()]]),
      "1.2.3",
      "abc",
    ),
    /outside/,
  );
});
