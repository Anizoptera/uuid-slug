import { appendFile } from "node:fs/promises";

export const RELEASE_SELECTIONS = ["both", "npm", "crate"] as const;
export type ReleaseSelection = (typeof RELEASE_SELECTIONS)[number];

export function releaseSelection(value: string | undefined): ReleaseSelection {
  const selected = value || "both";
  if (selected === "both" || selected === "npm" || selected === "crate") return selected;
  throw new Error(`Release packages must be one of: ${RELEASE_SELECTIONS.join(", ")}.`);
}

if (import.meta.main) {
  const output = process.env.GITHUB_OUTPUT;
  if (!output) throw new Error("GITHUB_OUTPUT is required.");
  const selected = releaseSelection(process.argv[2]);
  await appendFile(output, `selected=${selected}\n`);
}
