import { expect, test } from "bun:test";
import { rejects } from "node:assert/strict";
import { fromMarkdown } from "mdast-util-from-markdown";
import {
  minimumRelease,
  normalizeDeclarations,
  binarySize,
  satisfiesMinimum,
  typeScriptApiSections,
} from "../release-comparison";
import { incompatibleExports } from "../api-compatibility";
import {
  consumerReleaseNotes,
  npmContents,
  verifyCrateIdentity,
  verifyNpmIdentity,
} from "../release-report";
import { declaredRenames } from "../release-notes";
import type { ReleaseReport } from "../release-report";

// Every row the notes would show, whatever its section.
const shownRows = (before: string, after: string) =>
  Object.values(typeScriptApiSections(before, after, new Set()))
    .filter(Boolean)
    .join("\n");
const apiDiff = (before: string, after: string) =>
  shownRows(normalizeDeclarations(before), normalizeDeclarations(after));

// `generate` uses the unexported `Options`, so a change there reaches callers only through it.
const optionsApi = (field: string) =>
  `declare interface Options { ${field} } export declare function generate(options: Options): string; declare type Helper = 1;`;

const codecApi = (method: string) =>
  `export interface Codec { ${method} } export declare function create(): Codec;`;

const notesSections = (breaking: string, added: string) => ({ breaking, changed: "", added });

test("compatibility follows unexported types an export uses", async () => {
  const before = optionsApi("at?: number;");
  const sections = async (after: string) =>
    typeScriptApiSections(
      normalizeDeclarations(before),
      normalizeDeclarations(after),
      await incompatibleExports(before, after),
    );
  const wide = codecApi("encode(value: string, strict?: boolean): string;");
  const narrow = codecApi("encode(value: string): string;");
  // Each verdict starts every supported compiler; independent verdicts run together.
  const [required, extra, dropped, restored, unresolved, library, removed] = await Promise.all([
    sections(optionsApi("at: number;")),
    sections(optionsApi("at?: number; extra?: string;")),
    incompatibleExports(wide, narrow),
    incompatibleExports(narrow, wide),
    incompatibleExports(
      "export declare function wait(signal: Missing): void;",
      "export declare function wait(signal: string): void;",
    ),
    incompatibleExports(
      "export declare function read(bytes: Uint8Array<ArrayBuffer>): void;",
      "export declare function read(bytes: Uint8Array<ArrayBuffer>, offset?: number): void;",
    ),
    sections(
      optionsApi("at?: number;").replace(
        "export declare function generate",
        "export declare function create",
      ),
    ),
  ]);
  // `generate` prints identically, yet `generate({})` stops compiling. Callers cannot import the
  // unexported `Options`, so the export that uses it stands in for the change.
  const generate =
    "```diff\n@@ generate (uses a changed private type) @@\n  function generate(options: Options): string;\n```";
  expect(required).toEqual({ breaking: generate, changed: "", added: "" });
  expect(extra).toEqual({ breaking: "", changed: "", added: generate });
  // Assignability accepts a dropped optional parameter, yet `codec.encode(x, true)` stops compiling.
  expect([...dropped]).toEqual(["create"]);
  expect([...restored]).toEqual([]);
  // An unresolved name is an error type that accepts anything, so it cannot prove compatibility.
  expect([...unresolved]).toEqual(["wait"]);
  // Released declarations use current library types; a compiler that cannot read them would turn
  // every compatible change into a breaking one.
  expect([...library]).toEqual([]);
  // A removed export shows its own row, never its members or private helpers it used.
  expect(removed).toEqual({
    breaking: "```diff\n- function generate(options: Options): string;\n```",
    changed: "",
    added: "```diff\n+ function create(options: Options): string;\n```",
  });
});

test("a compatible change to a branded export stays compatible", async () => {
  // Each file's `unique symbol` is a distinct type, so without shared brands every branded result
  // would look unrelated across versions and any touched export would read as breaking.
  const source = await Bun.file(`${import.meta.dir}/../../api/typescript.api.d.ts`).text();
  const widened = source.replace(
    "export declare function isUuidString(value: unknown): value is UuidString;",
    "export declare function isUuidString(value: unknown, strict?: boolean): value is UuidString;",
  );
  expect(widened).not.toBe(source);
  expect([...(await incompatibleExports(source, widened))]).toEqual([]);
});

test("a declared rename shows the old declarations above the new one under breaking changes", () => {
  const sections = typeScriptApiSections(
    normalizeDeclarations(
      "export declare function uuidV7(): string; export declare function uuidV7At(at: number): string; export declare function kept(): 1;",
    ),
    normalizeDeclarations(
      "export declare function generateUuidV7(options?: { at?: number }): string; export declare function kept(): 2; export declare function fresh(): void;",
    ),
    new Set(["uuidV7", "uuidV7At", "kept"]),
    // `kept` still exists, so it was changed, not renamed; `missing` names nothing.
    new Map([
      ["uuidV7", "generateUuidV7"],
      ["uuidV7At", "generateUuidV7"],
      ["kept", "fresh"],
      ["missing", "fresh"],
    ]),
  );
  expect(sections).toEqual({
    breaking:
      "```diff\n@@ uuidV7, uuidV7At → generateUuidV7 @@\n- function uuidV7(): string;\n- function uuidV7At(at: number): string;\n+ function generateUuidV7(options?: {\n+     at?: number;\n+ }): string;\n@@ kept @@\n- function kept(): 1;\n+ function kept(): 2;\n```",
    changed: "",
    added: "```diff\n+ function fresh(): void;\n```",
  });
});

test("renames come only from arrows between adjacent code spans of equal-length lists", () => {
  expect(
    declaredRenames(
      "- Renamed: `a()` → `b()`, `c` → `d<T>`.\n- Types: `E`, `F` and `G` → `X`, `Y` and `Z`.\n- `codec.migration` → `codec.decoder`; `H` and `I` → `J`; plain a → b; `K` → **`L`**.\n",
    ),
  ).toEqual(
    new Map([
      ["a", "b"],
      ["c", "d"],
      ["E", "X"],
      ["F", "Y"],
      ["G", "Z"],
    ]),
  );
});

test("release API diff exposes removals and additions without restating unchanged lines", () => {
  expect(
    apiDiff(
      "export declare function old(): void;\nexport declare function shared(): void;",
      "export declare function shared(): void;\nexport type New = 1;\n",
    ),
  ).toBe("```diff\n- function old(): void;\n```\n```diff\n+ type New = 1;\n```");
});

test("public release diff omits private helpers while retaining changed exported members", () => {
  const before = normalizeDeclarations(
    "declare type Helper = 1; declare const brand: unique symbol; export interface Value { x: string; unchanged: boolean; readonly [brand]: 1; readonly [Symbol.toStringTag]: 'before'; }",
  );
  const after = normalizeDeclarations(
    "declare type Helper = 2; declare const brand: unique symbol; export interface Value { x: number; unchanged: boolean; readonly [brand]: 2; readonly [Symbol.toStringTag]: 'after'; }",
  );
  // Each member's old form sits directly above its new one, under its owner's name.
  expect(shownRows(before, after)).toBe(
    "```diff\n@@ Value @@\n- x: string;\n+ x: number;\n- readonly [Symbol.toStringTag]: 'before';\n+ readonly [Symbol.toStringTag]: 'after';\n```",
  );
  expect(shownRows(before, before)).toBe("");
});

test.each(["Value$", "Ω"])("public changes retain compiler-valid owner %s", (name) => {
  const before = normalizeDeclarations(`export interface ${name} { x: string; }`);
  const after = normalizeDeclarations(`export interface ${name} { x: number; }`);
  expect(shownRows(before, after)).toBe(
    `\`\`\`diff\n@@ ${name} @@\n- x: string;\n+ x: number;\n\`\`\``,
  );
});

test("named exports retain alias changes and callable symbol members", () => {
  const before = normalizeDeclarations(
    "declare const key: unique symbol; declare interface Value { [key](): string; } export { key, Value as Public };",
  );
  const after = normalizeDeclarations(
    "declare const key: unique symbol; declare interface Value { [key](): number; } export { key, Value as Renamed };",
  );
  // A nameless statement gets no header (its key is a syntax kind) and so comes first: below the
  // `Value` header it would read as a member of `Value`.
  expect(shownRows(before, after)).toBe(
    "```diff\n- export { key, Value as Public };\n+ export { key, Value as Renamed };\n@@ Value @@\n- [key](): string;\n+ [key](): number;\n```",
  );
});

test("public diffs isolate named variables and retain default exports", () => {
  const before = normalizeDeclarations(
    "declare const selected: string, internal: boolean; export { selected }; export default selected;",
  );
  const after = normalizeDeclarations(
    "declare const selected: number, internal: boolean; export { selected }; export default 1;",
  );
  const report = shownRows(before, after);
  expect(report).toContain("- declare const selected: string;");
  expect(report).toContain("+ declare const selected: number;");
  expect(report).toContain("- export default selected;");
  expect(report).toContain("+ export default 1;");
  expect(report).not.toContain("internal");
});

test("default-only exports retain changes to their underlying value", () => {
  const before = normalizeDeclarations("declare const selected: string; export default selected;");
  const after = normalizeDeclarations("declare const selected: number; export default selected;");
  const report = shownRows(before, after);
  expect(report).toContain("- declare const selected: string;");
  expect(report).toContain("+ declare const selected: number;");
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
    expect(shownRows(before, after)).toBe(
      `\`\`\`diff\n@@ Value @@\n- ${first}\n- ${second}\n+ ${second}\n+ ${first}\n\`\`\``,
    );
  },
);

test("publication notes put each API diff at the end of its section, then size and links", async () => {
  const report: ReleaseReport = {
    release: {
      name: "@scope/pkg",
      crate: "pkg",
      version: "0.4.0",
      repository: "https://github.com/owner/pkg",
    },
    current: { npm: 223_590, crate: 30_720, native: 999, wasm: 888 },
    comparisons: [
      {
        role: "releaseLine",
        tag: "v0.1.0",
        minimum: "minor",
        previous: {},
        npmApi: notesSections("old npm inventory", ""),
        crateApi: notesSections("old crate inventory", ""),
      },
      {
        role: "immediate",
        tag: "v0.3.0",
        minimum: "minor",
        previous: { npm: 132_198, crate: 30_720 },
        npmApi: notesSections("```diff\n- old()\n```", "```diff\n+ fresh()\n```"),
        crateApi: notesSections("crate break", ""),
      },
    ],
  };
  const changelog = "### Breaking changes\n\n- Rename `old`.\n\n### Fixed\n\n- A fix.\n";
  expect(consumerReleaseNotes(changelog, report, "npm")).toBe(
    [
      "### Breaking changes\n\n- Rename `old`.\n\n```diff\n- old()\n```",
      "### Fixed\n\n- A fix.",
      "### Added\n\n```diff\n+ fresh()\n```",
      "**Package size**: 218.3 KB compressed, up 89.3 KB (+69.1%) from v0.3.0\n**NPM Package**: [`@scope/pkg v0.4.0`](https://www.npmjs.com/package/@scope/pkg/v/0.4.0)\n**Full Commit History**: https://github.com/owner/pkg/compare/v0.3.0...v0.4.0\n",
    ].join("\n\n"),
  );
  const both = consumerReleaseNotes(changelog, report, "both");
  expect(both).toContain(
    "**npm package**\n\n```diff\n- old()\n```\n\n**Rust crate**\n\ncrate break",
  );
  expect(both).toContain("**Rust crate size**: 30.0 KB compressed, unchanged from v0.3.0");
  expect(both).toContain("**Rust Crate**: [`pkg v0.4.0`](https://crates.io/crates/pkg/0.4.0)");
  for (const omitted of ["inventory", "999", "888"]) expect(both).not.toContain(omitted);
  expect(consumerReleaseNotes(changelog, report, "crate")).not.toContain("old()");
  // Only prose can tell callers how to upgrade, so a break without that heading stops the release.
  expect(() => consumerReleaseNotes("### Fixed\n\n- A fix.\n", report, "npm")).toThrow(
    "Breaking changes",
  );
  expect(
    consumerReleaseNotes(
      "First release.\n",
      { ...report, current: { npm: 512 }, comparisons: [] },
      "npm",
    ),
  ).toBe(
    "First release.\n\n**Package size**: 512 bytes compressed\n**NPM Package**: [`@scope/pkg v0.4.0`](https://www.npmjs.com/package/@scope/pkg/v/0.4.0)\n**Full Commit History**: https://github.com/owner/pkg/commits/v0.4.0\n",
  );
  // Declaration maps are maps and nested compiled adapters are JavaScript; anything else is other.
  for (const [path, role] of Object.entries({
    "package/dist/index.js": "javascript",
    "package/dist/node/runtime.js": "javascript",
    "package/dist/index.d.ts": "declarations",
    "package/dist/index.d.ts.map": "sourceMaps",
    "package/dist/index.js.map": "sourceMaps",
    "package/src/index.ts": "typescript",
    "package/README.md": "other",
  })) {
    const contents = await npmContents(new Map([[path, new Blob(["export const x = 1;\n"])]]));
    expect(Object.entries(contents).filter(([, size]) => size > 0)).toEqual([
      [role, expect.any(Number)],
    ]);
  }
  expect(
    consumerReleaseNotes(
      "First release.\n",
      {
        ...report,
        current: {
          npm: 3072,
          npmContents: {
            javascript: 1024,
            declarations: 512,
            sourceMaps: 512,
            typescript: 900,
            other: 124,
          },
        },
        comparisons: [],
      },
      "npm",
    ),
  ).toContain(
    "**Package size**: 3.0 KB compressed (1.0 KB tree-shakable compiled JavaScript, 512 bytes type declarations, 512 bytes source maps, 900 bytes TypeScript source, 124 bytes README, license and manifest)\n",
  );
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
  const document = fromMarkdown(report);
  expect(document.children).toHaveLength(1);
  const block = document.children[0];
  expect(block?.type).toBe("code");
  if (block?.type === "code") {
    expect(block.lang).toBe("diff");
    expect(block.value).toBe(
      '@@ Text @@\n- type Text = `old`;\n+ interface Text { … }\n+ value: "```";',
    );
  }
});

test("API comparison detects moved members and changed overload priority", () => {
  const before = "export interface A {\n x: string;\n}\nexport interface B {\n y: number;\n}";
  const after = "export interface A {\n y: number;\n}\nexport interface B {\n x: string;\n}";
  expect(apiDiff(before, after)).toBe(
    "```diff\n@@ A @@\n- x: string;\n+ y: number;\n@@ B @@\n- y: number;\n+ x: string;\n```",
  );
  const narrow = "function f(x: string): 1;";
  const broad = "function f(x: unknown): 2;";
  const unchanged = "export function unrelated(): boolean;";
  expect(
    apiDiff(
      `export ${narrow}\nexport ${broad}\n${unchanged}`,
      `export ${broad}\nexport ${narrow}\n${unchanged}`,
    ),
  ).toBe(`\`\`\`diff\n@@ f @@\n- ${narrow}\n- ${broad}\n+ ${broad}\n+ ${narrow}\n\`\`\``);
  expect(apiDiff(`export ${narrow}\nexport ${narrow}`, `export ${narrow}`)).toBe(
    `\`\`\`diff\n@@ f @@\n- ${narrow}\n- ${narrow}\n+ ${narrow}\n\`\`\``,
  );
});

test("hyphens in build metadata do not waive stable compatibility", () => {
  expect(minimumRelease("1.4.1+build-fix", "### Breaking changes\n", [])).toBe("major");
  expect(satisfiesMinimum("1.4.0+build-old", "1.4.1", "major")).toBe(false);
});

test("release sizes use binary units, where 1 KB is 1024 bytes", () => {
  expect(binarySize(1023)).toBe("1023 bytes");
  expect(binarySize(1024)).toBe("1.0 KB");
  expect(binarySize(-89_242)).toBe("87.2 KB");
  expect(binarySize(1024 ** 2 * 1.5)).toBe("1.5 MB");
  expect(binarySize(1024 ** 4)).toBe("1024.0 GB");
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
  expect(await verifyNpmIdentity(npm, "pkg", "1.2.3")).toMatchObject({
    version: "1.2.3",
  });
  await verifyCrateIdentity(crate, "1.2.3", "abc");
  await rejects(verifyNpmIdentity(npm, "pkg", "1.2.4"), /does not identify/);
  await rejects(verifyNpmIdentity(npm, "other-package", "1.2.3"), /does not identify/);
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
