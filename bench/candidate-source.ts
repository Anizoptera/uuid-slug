// SPDX-License-Identifier: Apache-2.0

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

type CompanionFile = "src/runtime/bun.ts" | "src/runtime/node.ts" | "src/runtime/portable.ts";
export type CandidateCompanionCache = Map<
  CompanionFile,
  { readonly original: string; current: string }
>;

/** A complete source replacement used only in an isolated benchmark checkout. */
export interface SourceCandidate {
  readonly name: string;
  readonly source: string;
  /** Replace the formatter owner too when a generator experiment shares its storage. */
  readonly uuidSource?: string;
  /** Select a private runtime policy in the same archived graph as the generator experiment. */
  readonly companionEdits?: Partial<Record<CompanionFile, (source: string) => string>>;
}

export function replaceOnce(source: string, from: string, to: string): string {
  // An old experiment must fail after its mechanism moves, never time an unchanged replacement.
  if (source.split(from).length !== 2)
    throw new Error(
      "Candidate source anchor changed. Update the experiment against its owning function before comparing it.",
    );
  return source.replace(from, to);
}

export async function applyCandidateCompanions(
  candidate: SourceCandidate,
  tree: string,
  reportPrefix: string,
  cache: CandidateCompanionCache,
): Promise<void> {
  // Always transform archived originals, and restore owners omitted by a later candidate.
  // Otherwise selecting two experiments in one screen would silently compose their policies.
  await Promise.all(
    (Object.keys(candidate.companionEdits ?? {}) as CompanionFile[])
      .filter((filename) => !cache.has(filename))
      .map(async (filename) => {
        const original = await readFile(join(tree, filename), "utf8");
        cache.set(filename, { original, current: original });
      }),
  );
  await Promise.all(
    [...cache].map(async ([filename, entry]) => {
      const edit = candidate.companionEdits?.[filename];
      const next = edit ? edit(entry.original) : entry.original;
      if (next !== entry.current) {
        await writeFile(join(tree, filename), next);
        entry.current = next;
      }
      if (edit) await writeFile(`${reportPrefix}-${filename.replaceAll("/", "_")}.txt`, next);
    }),
  );
}
