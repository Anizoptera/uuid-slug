// SPDX-License-Identifier: Apache-2.0

export type ProfileValue = string | number | boolean | Uint8Array | Error | object;
export type ProfileCase = (index: number) => ProfileValue;

/** Reject a corpus witness that does not reach its named success or failure path. */
export function assertProfileOutcome(name: string, value: ProfileValue): boolean {
  const expectedError = name.startsWith("invalid.");
  if (expectedError !== value instanceof Error)
    throw new Error(`Unexpected success/failure outcome for ${name}`, { cause: value });
  const expectedGuard = name.startsWith("guard.invalid.")
    ? false
    : name.startsWith("guard.") || undefined;
  if (expectedGuard !== undefined && value !== expectedGuard)
    throw new Error(`Guard corpus did not reach its named path: ${name}`);
  return expectedError;
}

/** Select cases whose names contain any comma-separated filter substring; fail when none match. */
export function selectProfileCases<Case>(
  cases: Record<string, Case>,
  filter: string | null | undefined,
): [string, Case][] {
  const terms = filter ? filter.split(",").filter(Boolean) : [];
  const selected = Object.entries(cases).filter(
    ([name]) => terms.length === 0 || terms.some((term) => name.includes(term)),
  );
  if (selected.length === 0) throw new Error("Profile filter selected no cases");
  return selected;
}
