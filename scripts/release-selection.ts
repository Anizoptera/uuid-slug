import { appendFile } from "node:fs/promises";

export const RELEASE_SELECTIONS = ["both", "npm", "crate"] as const;
export type ReleaseSelection = (typeof RELEASE_SELECTIONS)[number];

function isReleaseSelection(value: unknown): value is ReleaseSelection {
  return RELEASE_SELECTIONS.some((selection) => selection === value);
}

export function releaseSelection(value: string | undefined): ReleaseSelection {
  const selected = value || "both";
  if (isReleaseSelection(selected)) return selected;
  throw new Error(
    `Release package selection must be one of ${RELEASE_SELECTIONS.join(", ")}; got ${JSON.stringify(selected)}.`,
  );
}

export function retainedReleaseSelection(
  original: unknown,
  requested: string | undefined,
): ReleaseSelection {
  // Registry state cannot reconstruct intent: a missing destination may be the failed half.
  if (!isReleaseSelection(original))
    throw new Error(
      "Retained release inputs lack the original package selection. Restore that evidence before retrying; do not infer it from published packages.",
    );
  if (requested && releaseSelection(requested) !== original)
    throw new Error(
      `This release selected ${original}; retry with ${original}, not ${requested}. Restore the original selection and keep its verified archives.`,
    );
  return original;
}

if (import.meta.main) {
  const output = process.env.GITHUB_OUTPUT;
  if (!output) throw new Error("GITHUB_OUTPUT is required.");
  const retained = Bun.file("release-artifacts/history/release-inputs.json");
  const selected = (await retained.exists())
    ? retainedReleaseSelection((await retained.json()).packages, process.argv[2])
    : releaseSelection(process.argv[2]);
  await appendFile(output, `selected=${selected}\n`);
}
