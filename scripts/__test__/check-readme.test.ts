import { test, expect } from "bun:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkReadme } from "../check-readme";

const call = 'uuidStringToPlainSlug("0198abcd-1234-7abc-9def-0123456789ab")';
const valid = `import { uuidStringToPlainSlug } from "@anizoptera/uuid-slug";\nconsole.log(${call});`;
const document = (code: string) =>
  `# Example\n\n[Example](#example)\n\n\`\`\`ts\n${code}\n\`\`\`\n`;

function diagnostic(cause: unknown): string {
  if (!(cause instanceof Error)) return "";
  const stdout = "stdout" in cause && typeof cause.stdout === "string" ? cause.stdout : "";
  const children = cause instanceof AggregateError ? cause.errors.map(diagnostic).join("\n") : "";
  return [cause.message, stdout, children, diagnostic(cause.cause)].join("\n");
}

async function verify(source: string): Promise<string> {
  const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-readme-test-"));
  try {
    const file = join(scratch, "README.md");
    await writeFile(file, source);
    try {
      await checkReadme(file);
      return "";
    } catch (cause) {
      return diagnostic(cause);
    }
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

test("README check compiles and executes a standalone consumer", async () => {
  expect(await verify(document(valid))).toBe("");
});

test("README check rejects an unresolved local heading", async () => {
  expect(await verify(document(valid).replace("#example)", "#missing)"))).toContain("broken link");
});

test("README check rejects a helper call without its import", async () => {
  expect(await verify(document(`console.log(${call});`))).toContain(
    "Cannot find name 'uuidStringToPlainSlug'",
  );
});

test("README check rejects an error reported with a successful process exit", async () => {
  expect(await verify(document('console.error("reported-error-control");'))).toContain(
    "reported-error-control",
  );
});
