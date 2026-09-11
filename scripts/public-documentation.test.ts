import { expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { publicDocumentationIssues } from "./public-documentation";

test("reports undocumented exports and public members", async () => {
  const directory = await mkdtemp(join(tmpdir(), "uuid-slug-public-docs-"));
  const entry = join(directory, "index.d.ts");
  try {
    await writeFile(
      entry,
      [
        "/** Documented interface. */",
        "export interface Documented {",
        "  /** Documented member. */",
        "  kept(): void;",
        "  missing(): void;",
        "}",
        "export declare function missingExport(): void;",
      ].join("\n"),
    );
    const issues = publicDocumentationIssues(entry);
    expect(issues).toHaveLength(2);
    expect(issues).toContain("Documented.missing");
    expect(issues).toContain("missingExport");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
