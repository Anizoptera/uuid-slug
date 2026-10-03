// SPDX-License-Identifier: Apache-2.0

export type ProfileValue = string | number | boolean | Uint8Array | Error | object;
export type ProfileCase = (index: number) => ProfileValue;

/** Read identifier fields so timing retains pair strings and immutable UUID construction. */
export function uuidObjectChecksum(value: object, index: number): number | undefined {
  if (
    "uuid" in value &&
    typeof value.uuid === "string" &&
    "slug" in value &&
    typeof value.slug === "string"
  )
    return (
      value.uuid.charCodeAt(index % value.uuid.length) ^
      value.slug.charCodeAt(index % value.slug.length)
    );
  if ("version" in value) {
    const version: unknown = value.version;
    if (typeof version === "number") return version;
  }
  return undefined;
}

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

// Normalization must preserve the fixture UUID, rather than return another valid value or type.
export function assertNormalizedUuidProfileOutcome(
  name: string,
  value: ProfileValue,
  ids: readonly string[],
  index: number,
): void {
  if (
    (name.startsWith("uuid.toString.") || name === "codec.toString.mixed") &&
    value !== ids[index & 255]
  )
    throw new Error(
      `${name} returned a different UUID; check its input and conversion before timing`,
    );
}

/** Select comma-separated substrings or exact names prefixed with `=`; fail when none match. */
export function selectProfileCases<Case>(
  cases: Record<string, Case>,
  filter: string | null | undefined,
): [string, Case][] {
  const terms = filter ? filter.split(",").filter(Boolean) : [];
  const selected = Object.entries(cases).filter(
    ([name]) =>
      terms.length === 0 ||
      terms.some((term) => (term.startsWith("=") ? name === term.slice(1) : name.includes(term))),
  );
  if (selected.length === 0) throw new Error("Profile filter selected no cases");
  return selected;
}
