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
export async function identicalArtifacts(baseline: string, candidate: string): Promise<boolean> {
  // Source-capable hosts and compiled hosts use different files. Compare the whole shipped graph,
  // including its manifest and any future assets; a source-only check misses build-tool changes.
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
  if (before.length !== after.length || before.some((name, index) => name !== after[index]))
    return false;
  const equal = await Promise.all(
    before.map(async (name) => {
      const [left, right] = await Promise.all([
        readFile(join(baseline, name)),
        readFile(join(candidate, name)),
      ]);
      return left.equals(right);
    }),
  );
  return equal.every(Boolean);
}
