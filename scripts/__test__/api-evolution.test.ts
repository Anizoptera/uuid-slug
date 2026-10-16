import { expect, test } from "bun:test";
import { rejects } from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { command } from "../command";
import {
  checkReleasedApi,
  selectReleaseTag,
  typescriptDeclarations,
  validateVersion,
  verifyEvolution,
} from "../api-evolution";

test("pending development work uses the tagged HEAD as its release baseline", async () => {
  const root = await mkdtemp(join(tmpdir(), "uuid-slug-post-release-"));
  const current = reports("export declare function published(): void;", "");
  const writeVersion = async (version: string) => {
    await Promise.all([
      Bun.write(join(root, "package.json"), JSON.stringify({ name: "fixture", version })),
      Bun.write(join(root, "rust/Cargo.toml"), `[workspace.package]\nversion = "${version}"\n`),
      Bun.write(
        join(root, "rust/Cargo.lock"),
        ["uuid-slug", "uuid-slug-bridge"]
          .map((name) => `[[package]]\nname = "${name}"\nversion = "${version}"\n`)
          .join("\n"),
      ),
    ]);
  };
  try {
    await writeVersion("0.4.0");
    await Promise.all([
      Bun.write(join(root, "rust/uuid-slug/Cargo.toml"), '[package]\nname = "uuid-slug"\n'),
      Bun.write(join(root, "api/typescript.api.d.ts"), current.typescript),
      Bun.write(join(root, "api/rust.api.md"), current.rust),
      Bun.write(join(root, "CHANGELOG.md"), "## [0.4.0]\n\n- Release.\n"),
    ]);
    await command("git", ["init", "--quiet"], root);
    await command("git", ["config", "user.name", "Release fixture"], root);
    await command("git", ["config", "user.email", "fixture@example.invalid"], root);
    await command("git", ["add", "."], root);
    await command("git", ["commit", "--quiet", "-m", "release"], root);
    await command("git", ["-c", "tag.gpgSign=false", "tag", "-a", "v0.4.0", "-m", "release"], root);
    await checkReleasedApi(root, current);
    await writeVersion("0.4.1-dev");
    await checkReleasedApi(root, current);
    await rejects(
      checkReleasedApi(root, {
        ...current,
        typescript: `${current.typescript}\nexport declare function added(): void;`,
      }),
      /does not satisfy the minor API change/,
    );
    await command("git", ["tag", "-d", "v0.4.0"], root);
    await command(
      "git",
      ["-c", "tag.gpgSign=false", "tag", "-a", "v0.9.0", "-m", "wrong version"],
      root,
    );
    await rejects(checkReleasedApi(root, current), /does not match package.json 0.4.0/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function reports(ts: string, rust: string, rustDeprecated = "(none)", minimalRust = rust) {
  return {
    typescript: ts,
    rust: `## All features\n\n\`\`\`text\n${rust}\n\`\`\`\n\n## No default features\n\n\`\`\`text\n${minimalRust}\n\`\`\`\n\n## Deprecations\n\n${rustDeprecated}\n`,
  };
}

test("released API rejects removal without prior deprecation", async () => {
  const before = reports("export declare function old(): void;", "pub fn uuid_slug::old()");
  const after = reports("", "");
  await rejects(
    verifyEvolution("0.4.0", "0.5.0", before, after),
    /TypeScript removes API.*Restore the listed API/s,
  );
});

test("same-cycle deprecation cannot authorize removal", async () => {
  const before = reports("/** @deprecated */ export declare function old(): void;", "");
  const after = reports("", "");
  await rejects(
    verifyEvolution("0.4.0", "0.4.1", before, after),
    /requires the next major release.*Option 1: keep the API.*Option 2:.*version:set.*recreate the release/s,
  );
  await verifyEvolution("0.4.0", "0.5.0", before, after);
});

test("TypeScript declarations retain only deprecation documentation", () => {
  const source = `/** Useful prose. */\nexport declare function current(): void;\n/** @deprecated Use current. */\nexport declare function old(): void;\nexport {};`;
  expect(typescriptDeclarations(source)).toBe(
    `export declare function current(): void;\n/** @deprecated Use current. */\nexport declare function old(): void;`,
  );
});

test("inline deprecation stays bound to a TypeScript member", async () => {
  const before = reports(
    "export interface Options {\n/** @deprecated */\nold?: boolean;\ncurrent?: boolean;\n}",
    "",
  );
  const after = reports("export interface Options { current?: boolean; }", "");
  await verifyEvolution("0.4.0", "0.5.0", before, after);
});

test("deprecating a TypeScript container covers its owned members", async () => {
  const before = reports("/** @deprecated */ export interface Legacy { value(): void; }", "");
  const after = reports("", "");
  await verifyEvolution("0.4.0", "0.5.0", before, after);
});

test("Rust removal requires the exact released item to be deprecated", async () => {
  const before = reports("", "pub fn uuid_slug::old()\n#[deprecated] pub fn uuid_slug::other()");
  const after = reports("", "");
  await rejects(
    verifyEvolution("0.4.0", "0.5.0", before, after),
    /Rust removes API that was not deprecated/,
  );
});

test("inline Rust deprecation authorizes only a later removal", async () => {
  const before = reports("", "#[deprecated] pub fn uuid_slug::old()");
  const after = reports("", "");
  await verifyEvolution("0.4.0", "0.5.0", before, after);
});

test("inline Rust deprecation authorizes only its feature surface and declaration", async () => {
  const before = reports(
    "",
    "#[deprecated] pub type uuid_slug::Same = u8\npub fn uuid_slug::Same()",
    "(none)",
    "pub fn uuid_slug::Same()",
  );
  const after = reports("", "#[deprecated] pub type uuid_slug::Same = u8");
  await rejects(
    verifyEvolution("0.4.0", "0.5.0", before, after),
    /Rust removes API that was not deprecated/,
  );
});

test("Rust feature-surface removal remains visible", async () => {
  const item = "pub fn uuid_slug::decode()";
  const before = reports("", item, "(none)", item);
  const after = reports("", item, "(none)", "");
  await rejects(
    verifyEvolution("0.4.0", "0.5.0", before, after),
    /Rust removes API that was not deprecated/,
  );
});

test("removal boundaries stay exact beyond safe integers", async () => {
  const before = reports("/** @deprecated */ export declare function old(): void;", "");
  const after = reports("", "");
  await verifyEvolution("9007199254740992.0.0", "9007199254740993.0.0", before, after);
});

test("public additions require a minor version", async () => {
  const before = reports("", "");
  const after = reports("export declare function added(): void;", "");
  await rejects(
    verifyEvolution("0.4.0", "0.4.1", before, after),
    /does not satisfy the minor API change.*Option 1: restore the public surface.*Option 2:.*version:set.*recreate the release/s,
  );
  await verifyEvolution("0.4.0", "0.5.0", before, after);
  await rejects(
    verifyEvolution("0.4.0", "0.4.1-dev", before, after, [], false),
    /does not satisfy the minor API change.*Option 1: restore the public surface.*Option 2:.*bun run version:set/s,
  );
  await verifyEvolution("0.4.0", "0.5.0-dev", before, after, [], false);
});

test("an added interface member is not misclassified as a removal", async () => {
  const before = reports("export interface Options { current?: boolean; }", "");
  const after = reports("export interface Options { current?: boolean; added?: boolean; }", "");
  await rejects(
    verifyEvolution("0.4.0", "0.4.1", before, after),
    /does not satisfy the minor API change/,
  );
  await verifyEvolution("0.4.0", "0.5.0", before, after);
  await verifyEvolution("1.0.0", "1.1.0", before, after);
});

test("member removals remain bound to their owner", async () => {
  const before = reports(
    "export interface First { value(): void; } export interface Second { value(): void; }",
    "",
  );
  const after = reports("export interface Second { value(): void; }", "");
  await rejects(
    verifyEvolution("0.4.0", "0.5.0", before, after),
    /TypeScript removes API that was not deprecated/,
  );
});

test("routine compatibility detects declaration shape and overload order", async () => {
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
  await rejects(verifyEvolution("1.0.0", "1.1.0", before, changedHeritage), /major API change/);
  await rejects(verifyEvolution("1.0.0", "1.1.0", overloads, changedOverloads), /major API change/);
});

test("Rust additions require a minor version", async () => {
  const before = reports("", "");
  const after = reports("", "pub fn uuid_slug::added()");
  await rejects(
    verifyEvolution("0.4.0", "0.4.1", before, after),
    /does not satisfy the minor API change/,
  );
  await verifyEvolution("0.4.0", "0.5.0", before, after);
});

test("development and release versions use distinct forms", async () => {
  const unchanged = reports("", "");
  await verifyEvolution("0.4.0", "0.4.1-dev", unchanged, unchanged, [], false);
  await rejects(
    verifyEvolution("0.4.0", "0.4.1", unchanged, unchanged, [], false),
    /must use X\.Y\.Z-dev/,
  );
  await verifyEvolution("0.4.0", "0.4.1", unchanged, unchanged, [], false, "0.4.1");
  await rejects(
    verifyEvolution("0.4.0", "0.4.1", unchanged, unchanged, ["minor"], false, "0.4.1"),
    /does not satisfy the minor API change/,
  );
  await rejects(
    verifyEvolution("0.4.0", "0.4.1-dev", unchanged, unchanged),
    /must use stable.*bun run release/s,
  );
});

test("a release tag must match the stable manifest version", () => {
  expect(() => validateVersion("0.5.0", "v0.5.0")).not.toThrow();
  expect(() => validateVersion("0.5.0-dev", "v0.5.0-dev")).toThrow(
    /without -dev.*bun run release/s,
  );
  expect(() => validateVersion("0.5.0", "v0.5.1")).toThrow(
    /does not match package\.json.*bun run release/s,
  );
});

test("only the exact pending release can use a stable version before its tag exists", () => {
  expect(() => validateVersion("0.5.0", undefined, "0.5.0")).not.toThrow();
  expect(() => validateVersion("0.5.0")).toThrow("must use X.Y.Z-dev");
  expect(() => validateVersion("0.5.0", undefined, "0.5.1")).toThrow("must use X.Y.Z-dev");
  expect(() => validateVersion("0.5.0", "v0.5.1", "0.5.0")).toThrow("does not match");
});

test("tagged verification compares the predecessor, not the candidate", () => {
  const tags = "v0.5.0\nv0.4.0\nv0.3.0\n";
  expect(selectReleaseTag(tags, "v0.5.0")).toBe("v0.4.0");
  expect(selectReleaseTag(tags, "")).toBe("v0.5.0");
});
