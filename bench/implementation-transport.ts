// Compare the full text-to-owned-string job, including the selected host's actual crossing.
import { measureImplementationCases } from "./implementation-timing";
import type { Settings } from "./implementation-timing";
import { selectProfileCases } from "./profile-case";

export const TRANSPORT_REFERENCE_ID = "transport/typescript/node";

export function measureUuidStringToPlainSlug(
  settings: Settings,
  plain: (uuidString: string) => string | Error,
) {
  const inputs = Array.from(
    { length: 64 },
    (_, index) => `0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f${index.toString(16).padStart(4, "0")}`,
  );
  for (const uuid of inputs) {
    // The host's independent base64 primitive checks the UUID bits before any timing.
    const hex = uuid.replaceAll("-", "");
    const bytes = Array.from({ length: 16 }, (_, index) =>
      Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16),
    );
    const expected = btoa(String.fromCharCode(...bytes))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replaceAll("=", "");
    if (plain(uuid) !== expected) throw new Error("Transport changed UUID bits or output spelling");
  }
  const cases = {
    "transport/plain/base64": (index: number) => plain(inputs[index % inputs.length] as string),
  };
  return measureImplementationCases(
    settings,
    Object.fromEntries(selectProfileCases(cases, settings.filter)),
  ).rows;
}
