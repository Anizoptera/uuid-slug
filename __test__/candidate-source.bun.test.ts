import { test } from "bun:test";
import { strictEqual } from "node:assert";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyCandidateCompanions } from "../bench/candidate-source";
import type { SourceCandidate, CandidateCompanionCache } from "../bench/candidate-source";

test("runtime policies cannot leak into another archived comparison", async () => {
  // A contaminated baseline can reverse a performance decision while its runtime tests pass.
  // Exercise omitted owners and repeated edits against distinct archived bytes, not current edits.
  const tree = await mkdtemp(join(tmpdir(), "uuid-slug-companions-"));
  const originals = {
    "src/runtime/bun.ts": "// Bun archive\n",
    "src/runtime/node.ts": "// Node archive\n",
    "src/runtime/portable.ts": "// Portable archive\n",
  } satisfies Record<keyof NonNullable<SourceCandidate["companionEdits"]>, string>;
  try {
    await mkdir(join(tree, "src/runtime"), { recursive: true });
    await Promise.all(
      Object.entries(originals).map(([file, text]) => writeFile(join(tree, file), text)),
    );
    const cache: CandidateCompanionCache = new Map();
    const first: SourceCandidate = {
      name: "first",
      source: "",
      companionEdits: {
        "src/runtime/bun.ts": (text) => text + "first\n",
        "src/runtime/node.ts": (text) => text + "first\n",
        "src/runtime/portable.ts": (text) => text + "first\n",
      },
    };
    await applyCandidateCompanions(first, tree, join(tree, "first"), cache);
    await applyCandidateCompanions(
      {
        name: "second",
        source: "",
        companionEdits: { "src/runtime/node.ts": (text) => text + "second\n" },
      },
      tree,
      join(tree, "second"),
      cache,
    );
    await Promise.all(
      Object.entries(originals).map(async ([file, text]) =>
        strictEqual(
          await readFile(join(tree, file), "utf8"),
          text + (file === "src/runtime/node.ts" ? "second\n" : ""),
        ),
      ),
    );
    await applyCandidateCompanions(
      { name: "baseline", source: "" },
      tree,
      join(tree, "baseline"),
      cache,
    );
    await Promise.all(
      Object.entries(originals).map(async ([file, text]) =>
        strictEqual(await readFile(join(tree, file), "utf8"), text),
      ),
    );
    await applyCandidateCompanions(first, tree, join(tree, "repeat"), cache);
    await Promise.all(
      Object.entries(originals).map(async ([file, text]) =>
        strictEqual(await readFile(join(tree, file), "utf8"), text + "first\n"),
      ),
    );
  } finally {
    await rm(tree, { recursive: true, force: true });
  }
});
