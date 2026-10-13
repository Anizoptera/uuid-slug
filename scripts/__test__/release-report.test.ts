import { expect, test } from "bun:test";
import { rejects } from "node:assert/strict";
import {
  apiDiff,
  minimumRelease,
  normalizeDeclarations,
  publicApiDifference,
  satisfiesMinimum,
  sizeDelta,
} from "../release-comparison";
import { consumerReleaseNotes, verifyCrateIdentity, verifyNpmIdentity } from "../release-report";
import type { ReleaseReport } from "../release-report";

test("release API diff exposes removals and additions without restating unchanged lines", () => {
  expect(
    apiDiff("export declare function old(): void;\nshared", "shared\nexport type New = 1;\n"),
  ).toBe("```diff\n- export declare function old(): void;\n+ export type New = 1;\n```");
  expect(apiDiff("same\n", "same\n")).toBe("No packaged TypeScript declaration changes.");
});

test("public release diff omits private helpers while retaining changed exported members", () => {
  const before = normalizeDeclarations(
    "declare type Helper = 1; declare const brand: unique symbol; export interface Value { x: string; unchanged: boolean; readonly [brand]: 1; readonly [Symbol.toStringTag]: 'before'; }",
  );
  const after = normalizeDeclarations(
    "declare type Helper = 2; declare const brand: unique symbol; export interface Value { x: number; unchanged: boolean; readonly [brand]: 2; readonly [Symbol.toStringTag]: 'after'; }",
  );
  const report = publicApiDifference(before, after);
  expect(report).toContain("- Value: x: string;");
  expect(report).toContain("+ Value: x: number;");
  expect(report).not.toContain("Helper");
  expect(report).not.toContain("unchanged");
  expect(report).not.toContain("[brand]");
  expect(report).toContain("[Symbol.toStringTag]");
  expect(publicApiDifference(before, before)).toBe("");
});

test.each(["Value$", "Ω"])("public changes retain compiler-valid owner %s", (name) => {
  const before = normalizeDeclarations(`export interface ${name} { x: string; }`);
  const after = normalizeDeclarations(`export interface ${name} { x: number; }`);
  const report = publicApiDifference(before, after);
  expect(report).toContain(`- ${name}: x: string;`);
  expect(report).toContain(`+ ${name}: x: number;`);
});

test("named exports retain alias changes and callable symbol members", () => {
  const before = normalizeDeclarations(
    "declare const key: unique symbol; declare interface Value { [key](): string; } export { key, Value as Public };",
  );
  const after = normalizeDeclarations(
    "declare const key: unique symbol; declare interface Value { [key](): number; } export { key, Value as Renamed };",
  );
  const report = publicApiDifference(before, after);
  expect(report).toContain("- export { key, Value as Public };");
  expect(report).toContain("+ export { key, Value as Renamed };");
  expect(report).toContain("- Value: [key](): string;");
  expect(report).toContain("+ Value: [key](): number;");
});

test("public diffs isolate named variables and retain default exports", () => {
  const before = normalizeDeclarations(
    "declare const selected: string, internal: boolean; export { selected }; export default selected;",
  );
  const after = normalizeDeclarations(
    "declare const selected: number, internal: boolean; export { selected }; export default 1;",
  );
  const report = publicApiDifference(before, after);
  expect(report).toContain("- declare const selected: string;");
  expect(report).toContain("+ declare const selected: number;");
  expect(report).toContain("- export default selected;");
  expect(report).toContain("+ export default 1;");
  expect(report).not.toContain("internal");
});

test.each(['"read value"', "[Symbol.iterator]", "read$"])(
  "reordered overloads retain compiler member %s",
  (name) => {
    const first = `${name}(x: string): 1;`;
    const second = `${name}(x: unknown): 2;`;
    const before = normalizeDeclarations(
      `export interface Value { ${first} ${second} stable: boolean; }`,
    );
    const after = normalizeDeclarations(
      `export interface Value { ${second} ${first} stable: boolean; }`,
    );
    const report = publicApiDifference(before, after);
    expect(report).toContain("- Value: " + first);
    expect(report).toContain("+ Value: " + second);
    expect(report).not.toContain("stable");
  },
);

test("publication notes use only the latest comparison and selected package", () => {
  const report: ReleaseReport = {
    current: { npm: 12, crate: 30, native: 999, wasm: 888 },
    comparisons: [
      {
        role: "releaseLine",
        tag: "v0.1.0",
        minimum: "minor",
        previous: {},
        npmApi: "old npm inventory",
        crateApi: "old crate inventory",
      },
      {
        role: "immediate",
        tag: "v0.3.0",
        minimum: "minor",
        previous: { npm: 8, crate: 20 },
        npmApi: "```diff\n- old()\n+ replacement()\n```",
        crateApi: "crate change",
      },
    ],
  };
  const npm = consumerReleaseNotes("Upgrade instructions.\n", report, "npm");
  expect(npm).toContain("- old()\n+ replacement()");
  expect(npm).toContain("12 B (+4 B, +50.0%)");
  for (const omitted of ["crate", "v0.1.0", "inventory", "999", "888"])
    expect(npm).not.toContain(omitted);
  const crate = consumerReleaseNotes("Upgrade instructions.\n", report, "crate");
  expect(crate).toContain("crate change");
  expect(crate).not.toContain("replacement()");
  const both = consumerReleaseNotes("Upgrade instructions.\n", report, "both");
  expect(both).toContain("crate change");
  expect(both).toContain("replacement()");
});
test("stable version distance must satisfy the derived release level", () => {
  expect(satisfiesMinimum("0.3.0", "0.4.0", "minor")).toBe(true);
  expect(satisfiesMinimum("1.3.0", "1.3.1", "minor")).toBe(false);
  expect(satisfiesMinimum("1.3.0", "2.0.0", "major")).toBe(true);
  expect(satisfiesMinimum("2.0.0-beta.1", "2.0.0", "major")).toBe(true);
  expect(satisfiesMinimum("1.3.0", "2.0.0-beta.1", "prerelease")).toBe(true);
  expect(satisfiesMinimum("9007199254740992.0.0", "9007199254740993.0.0", "major")).toBe(true);
});

test("multiline declaration diffs preserve content and cannot close their own fence", () => {
  const before = "export type Text = `old`;";
  const after = 'export interface Text {\n value: "```";\n}';
  const report = apiDiff(before, after);
  expect(report).toContain("- export type Text = `old`;");
  expect(report).toContain('+ Text: value: "```";');
  expect(report.startsWith("````diff\n")).toBe(true);
  expect(report.endsWith("\n````")).toBe(true);
  expect(report).not.toContain("(added)");
});

test("API comparison detects moved members and changed overload priority", () => {
  const before = "export interface A {\n x: string;\n}\nexport interface B {\n y: number;\n}";
  const after = "export interface A {\n y: number;\n}\nexport interface B {\n x: string;\n}";
  expect(apiDiff(before, after)).not.toContain("No packaged");
  const narrow = "export declare function f(x: string): 1;";
  const broad = "export declare function f(x: unknown): 2;";
  const unchanged = "export declare function unrelated(): boolean;";
  const moved = apiDiff(`${narrow}\n${broad}\n${unchanged}`, `${broad}\n${narrow}\n${unchanged}`);
  expect(moved).toContain("- " + narrow);
  expect(moved).toContain("+ " + broad);
  expect(moved).not.toContain("unrelated");
  expect(apiDiff(`${narrow}\n${narrow}`, narrow)).not.toContain("No packaged");
});

test("hyphens in build metadata do not waive stable compatibility", () => {
  expect(minimumRelease("1.4.1+build-fix", "### Breaking changes\n", [])).toBe("major");
  expect(satisfiesMinimum("1.4.0+build-old", "1.4.1", "major")).toBe(false);
});

test("release size deltas never invent a percentage for zero or missing denominators", () => {
  expect(sizeDelta(12, 0)).toBe("12 B (+12 B)");
  expect(sizeDelta(12, undefined)).toBe("12 B");
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
