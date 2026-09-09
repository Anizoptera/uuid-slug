import { expect, test } from "bun:test";
import {
  selectReleaseTag,
  typescriptDeclarations,
  validateVersion,
  verifyEvolution,
} from "./api-evolution";

function reports(
  ts: string,
  rust: string,
  tsDeprecated = "(none)",
  rustDeprecated = "(none)",
  minimalRust = rust,
) {
  return {
    typescript: `## Reachable declarations\n\n\`\`\`ts\n${ts}\n\`\`\`\n\n## Deprecations\n\n${tsDeprecated}\n`,
    rust: `## All features\n\n\`\`\`text\n${rust}\n\`\`\`\n\n## No default features\n\n\`\`\`text\n${minimalRust}\n\`\`\`\n\n## Deprecations\n\n${rustDeprecated}\n`,
  };
}

test("released API rejects removal without prior deprecation", () => {
  const before = reports("export declare function old(): void;", "pub fn uuid_slug::old()");
  const after = reports("", "");
  expect(() => verifyEvolution("0.4.0", "0.5.0", before, after)).toThrow(
    "TypeScript removes API that was not deprecated",
  );
});

test("same-cycle deprecation cannot authorize removal", () => {
  const declaration = "export declare function old(): void;";
  const before = reports(declaration, "", JSON.stringify(declaration));
  const after = reports("", "");
  expect(() => verifyEvolution("0.4.0", "0.4.1", before, after)).toThrow(
    "Deprecated API removal requires the next major release, or next minor in 0.x.",
  );
  expect(() => verifyEvolution("0.4.0", "0.5.0", before, after)).not.toThrow();
});

test("TypeScript declarations retain only deprecation documentation", () => {
  const source = `/** Useful prose. */\nexport declare function current(): void;\n/** @deprecated Use current. */\nexport declare function old(): void;`;
  expect(typescriptDeclarations(source)).toBe(
    `export declare function current(): void;\n/** @deprecated Use current. */\nexport declare function old(): void;`,
  );
});

test("inline TypeScript deprecation authorizes only a later removal", () => {
  const before = reports(
    "/** @deprecated Use current. */\nexport declare function old(): void;",
    "",
  )
    .typescript.replace("Reachable declarations", "Public declarations")
    .replace(/\n\n## Deprecations[\s\S]*/, "\n");
  const after = reports("", "")
    .typescript.replace("Reachable declarations", "Public declarations")
    .replace(/\n\n## Deprecations[\s\S]*/, "\n");
  expect(() =>
    verifyEvolution(
      "0.4.0",
      "0.5.0",
      { typescript: before, rust: reports("", "").rust },
      {
        typescript: after,
        rust: reports("", "").rust,
      },
    ),
  ).not.toThrow();
});

test("inline deprecation stays bound to a TypeScript member", () => {
  const before = reports(
    "export interface Options {\n/** @deprecated */\nold?: boolean;\ncurrent?: boolean;\n}",
    "",
  );
  const after = reports("export interface Options { current?: boolean; }", "");
  expect(() => verifyEvolution("0.4.0", "0.5.0", before, after)).not.toThrow();
});

test("deprecating a TypeScript container covers its owned members", () => {
  const before = reports("/** @deprecated */ export interface Legacy { value(): void; }", "");
  const after = reports("", "");
  expect(() => verifyEvolution("0.4.0", "0.5.0", before, after)).not.toThrow();
});

test("Rust removal requires the exact released item to be deprecated", () => {
  const before = reports("", "pub fn uuid_slug::old()", "(none)", "uuid_slug::other");
  const after = reports("", "");
  expect(() => verifyEvolution("0.4.0", "0.5.0", before, after)).toThrow(
    "Rust removes API that was not deprecated",
  );
});

test("inline Rust deprecation authorizes only a later removal", () => {
  const before = reports("", "#[deprecated] pub fn uuid_slug::old()");
  const after = reports("", "");
  expect(() => verifyEvolution("0.4.0", "0.5.0", before, after)).not.toThrow();
});

test("Rust feature-surface removal remains visible", () => {
  const item = "pub fn uuid_slug::decode()";
  const before = reports("", item, "(none)", "(none)", item);
  const after = reports("", item, "(none)", "(none)", "");
  expect(() => verifyEvolution("0.4.0", "0.5.0", before, after)).toThrow(
    "Rust removes API that was not deprecated",
  );
});

test("removal boundaries stay exact beyond safe integers", () => {
  const item = "export declare function old(): void;";
  const before = reports(item, "", JSON.stringify(item));
  const after = reports("", "");
  expect(() =>
    verifyEvolution("9007199254740992.0.0", "9007199254740993.0.0", before, after),
  ).not.toThrow();
});

test("public additions require a minor version", () => {
  const before = reports("", "");
  const after = reports("export declare function added(): void;", "");
  expect(() => verifyEvolution("0.4.0", "0.4.1", before, after)).toThrow(
    "does not satisfy the minor API change",
  );
  expect(() => verifyEvolution("0.4.0", "0.5.0", before, after)).not.toThrow();
  expect(() => verifyEvolution("0.4.0", "0.4.1-dev", before, after, [], false)).toThrow(
    "minor API change",
  );
  expect(() => verifyEvolution("0.4.0", "0.5.0-dev", before, after, [], false)).not.toThrow();
});

test("an added interface member is not misclassified as a removal", () => {
  const before = reports("export interface Options { current?: boolean; }", "");
  const after = reports("export interface Options { current?: boolean; added?: boolean; }", "");
  expect(() => verifyEvolution("0.4.0", "0.4.1", before, after)).toThrow(
    "does not satisfy the minor API change",
  );
  expect(() => verifyEvolution("0.4.0", "0.5.0", before, after)).not.toThrow();
  expect(() => verifyEvolution("1.0.0", "1.1.0", before, after)).not.toThrow();
});

test("member removals remain bound to their owner", () => {
  const before = reports(
    "export interface First { value(): void; } export interface Second { value(): void; }",
    "",
  );
  const after = reports("export interface Second { value(): void; }", "");
  expect(() => verifyEvolution("0.4.0", "0.5.0", before, after)).toThrow(
    "TypeScript removes API that was not deprecated",
  );
});

test("routine compatibility detects declaration shape and overload order", () => {
  const changedHeritage = reports("export interface Value extends First { current(): void; }", "");
  const changedOverloads = reports(
    "export declare function value(input: string): string; export declare function value(input: unknown): unknown;",
    "",
  );
  const before = reports("export interface Value extends Base { current(): void; }", "");
  const overloads = reports(
    "export declare function value(input: unknown): unknown; export declare function value(input: string): string;",
    "",
  );
  expect(() => verifyEvolution("1.0.0", "1.1.0", before, changedHeritage)).toThrow(
    "major API change",
  );
  expect(() => verifyEvolution("1.0.0", "1.1.0", overloads, changedOverloads)).toThrow(
    "major API change",
  );
});

test("Rust additions require a minor version", () => {
  const before = reports("", "");
  const after = reports("", "pub fn uuid_slug::added()");
  expect(() => verifyEvolution("0.4.0", "0.4.1", before, after)).toThrow(
    "does not satisfy the minor API change",
  );
  expect(() => verifyEvolution("0.4.0", "0.5.0", before, after)).not.toThrow();
});

test("development and release versions use distinct forms", () => {
  const unchanged = reports("", "");
  expect(() =>
    verifyEvolution("0.4.0", "0.4.1-dev", unchanged, unchanged, [], false),
  ).not.toThrow();
  expect(() => verifyEvolution("0.4.0", "0.4.1", unchanged, unchanged, [], false)).toThrow(
    "must use X.Y.Z-dev",
  );
  expect(() => verifyEvolution("0.4.0", "0.4.1-dev", unchanged, unchanged)).toThrow(
    "must be stable",
  );
});

test("a release tag must match the stable manifest version", () => {
  expect(() => validateVersion("0.5.0", "v0.5.0")).not.toThrow();
  expect(() => validateVersion("0.5.0-dev", "v0.5.0-dev")).toThrow("must be stable");
  expect(() => validateVersion("0.5.0", "v0.5.1")).toThrow("does not match");
});

test("tagged verification compares the predecessor, not the candidate", () => {
  const tags = "v0.5.0\nv0.4.0\nv0.3.0\n";
  expect(selectReleaseTag(tags, "v0.5.0")).toBe("v0.4.0");
  expect(selectReleaseTag(tags, "")).toBe("v0.5.0");
});
