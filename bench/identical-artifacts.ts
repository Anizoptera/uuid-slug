// SPDX-License-Identifier: Apache-2.0

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

async function shippedFiles(root: string, relative = ""): Promise<string[]> {
  const groups = await Promise.all(
    (await readdir(join(root, relative), { withFileTypes: true })).map(async (entry) => {
      const filename = relative ? `${relative}/${entry.name}` : entry.name;
      if (filename === "README.md" && entry.isFile()) return [];
      if (entry.isDirectory()) return shippedFiles(root, filename);
      if (!entry.isFile()) throw new Error(`Unsupported packed file kind: ${filename}`);
      return [filename];
    }),
  );
  // eslint-disable-next-line unicorn/no-array-sort -- Sort this private array without copying it; toSorted exceeds the compiler library floor.
  return groups.flat().sort();
}

/** Compare real packed outputs before spending time measuring an unchanged implementation. */
export async function compareArtifacts(
  baseline: string,
  candidate: string,
): Promise<{ readonly all: boolean; readonly compiled: boolean }> {
  // Normal Node calls load compiled code, not source or declarations. Compare both views once;
  // source hosts and custom Node options need the full graph. Keep manifests and assets in both.
  // Remove the compiled exemption if built code starts reading source or declaration files.
  // Bun.Transpiler drops PURE and NO_SIDE_EFFECTS annotations. A source normalizer must prove
  // it preserves those hints before its output can replace this byte comparison.
  // The root README is documentation and is not read by the measured package calls.
  // Remove that exemption if runtime code starts reading the README.
  const [before, after] = await Promise.all([shippedFiles(baseline), shippedFiles(candidate)]);
  for (const files of [before, after]) {
    if (
      !files.includes("package.json") ||
      !files.some((name) => name.startsWith("src/")) ||
      !files.some((name) => name.startsWith("dist/"))
    )
      throw new Error("Packed identity requires a manifest, source and compiled files");
  }
  const beforeFiles = new Set(before);
  const afterFiles = new Set(after);
  const files = [...new Set([...before, ...after])];
  const equal = await Promise.all(
    files.map(async (name) => {
      if (!beforeFiles.has(name) || !afterFiles.has(name)) return false;
      const [left, right] = await Promise.all([
        readFile(join(baseline, name)),
        readFile(join(candidate, name)),
      ]);
      return left.equals(right);
    }),
  );
  return {
    all: equal.every(Boolean),
    compiled: equal.every(
      (same, index) =>
        same ||
        files[index]?.endsWith(".d.ts") ||
        (files[index]?.startsWith("src/") && files[index]?.endsWith(".ts")),
    ),
  };
}
