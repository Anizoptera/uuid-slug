// SPDX-License-Identifier: Apache-2.0

/**
 * A consumer who never masks must not carry the masking machinery.
 *
 * This is gated because it is invisible everywhere else: routing one shortcut through an eager
 * masked codec restores the old cost in full, and every other test
 * in this suite, every type, and every lint rule stays green — the values are identical, only the
 * bundle changes. Measured 2026-08-12, that spelling cost 13,082 bytes to import `uuidToSlug`
 * alone against 2,229 after; the same regression is one plausible refactor away at any time.
 *
 * Bun's bundler rather than a hand-written import walk: it is a real bundler doing real
 * tree-shaking, and it is the STRICTER of the two measured here — rolldown dropped an unused eager
 * singleton that Bun kept, so a budget that holds under Bun holds under both. Measuring with a
 * proxy would answer an adjacent question while passing.
 *
 * Runs against `dist/`, not `src/`, because the shipped artifact is what a consumer installs and
 * the two disagreed: through the BUNDLED artifact this same package tree-shook to nothing at all,
 * which is why `tsdown.config.ts` emits one file per module.
 */
import { tmpdir } from "node:os";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "bun:test";

/**
 * The seed `UUID_V7_TEST_MASK` derives its key from. Frozen by the wire format — changing it
 * orphans every masked slug ever issued — which is what makes it a stable witness rather than a
 * string that drifts. Its presence in a keyless bundle means the cipher, the schema and the
 * sentinel table came with it.
 */
const MASKING_WITNESS = "anizoptera.uuid-slug.default-mask.v1";

const bundle = async (name: string) => {
  // Outside the repository, and with an ABSOLUTE import for that reason. A probe written into the
  // working tree survives a hard crash of this process, where the cleanup below never runs, and is
  // then left for the next person to lint, stage or commit.
  const root = await mkdtemp(path.join(tmpdir(), "uuid-slug-probe-"));
  const entry = path.join(root, "entry.ts");
  try {
    await Bun.write(
      entry,
      `import { ${name} } from "${import.meta.dir}/../dist/index.js";\nglobalThis.__probe = [${name}];\n`,
    );
    const built = await Bun.build({ entrypoints: [entry], minify: true, target: "browser" });
    // An unbuilt tree would otherwise fail as an unreadable import several frames away from the
    // cause; every lane that runs this builds first.
    if (!built.success)
      throw new Error(
        `Bundle probe failed (run "bun run build" first):\n${built.logs.map(String).join("\n")}`,
      );
    const output = built.outputs[0];
    if (!output) throw new Error("Bundle probe emitted no output.");
    return await output.text();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
};

test.each([
  // A CEILING, not a target: roughly twice what each measures today, so ordinary growth never
  // touches it and a re-coupling to the codec (which more than doubles both) always does.
  ["uuidToSlug", 5_000],
  ["generateUuidV7Slug", 9_000],
])("importing %s alone carries no masking machinery", async (name, ceiling) => {
  const code = await bundle(name);
  // Thrown rather than asserted: `expect(code).not.toInclude(...)` prints the WHOLE minified
  // bundle on failure, and the reader needs the cause, not twelve kilobytes of it.
  if (code.includes(MASKING_WITNESS))
    throw new Error(
      `Importing "${name}" alone now pulls in the masking machinery (${code.length} bytes).\n` +
        `Cause: something on its path evaluates a codec at MODULE SCOPE -- a construction call, or\n` +
        `a property read from one. Keep the keyless exports\n` +
        `sourced from src/keyless.ts, which builds them from a bare generator. See that file.`,
    );
  expect(code.length).toBeLessThan(ceiling);
});

test("the witness is present when the codec IS imported", async () => {
  // Without this the case above could pass because the witness stopped being reachable at all --
  // a renamed seed, a changed build, an entry that resolves to nothing. It fails for a reason.
  expect(await bundle("createUuidV7SlugCodec")).toInclude(MASKING_WITNESS);
});
