// SPDX-License-Identifier: Apache-2.0

/** A complete source replacement used only in an isolated benchmark checkout. */
export interface SourceCandidate {
  readonly name: string;
  readonly source: string;
  /** Replace the formatter owner too when a generator experiment shares its storage. */
  readonly uuidSource?: string;
  /** Replace the plain-slug owner too when generation shares its native writer. */
  readonly slugSource?: string;
}

export function replaceOnce(source: string, from: string, to: string): string {
  // An old experiment must fail after its mechanism moves, never time an unchanged replacement.
  if (source.split(from).length !== 2)
    throw new Error(
      "Candidate source anchor changed. Update the experiment against its owning function before comparing it.",
    );
  return source.replace(from, to);
}
