// SPDX-License-Identifier: Apache-2.0

import { replaceOnce } from "./candidate-source";
import type { SourceCandidate } from "./candidate-source";

export function slugCandidates(source: string): readonly SourceCandidate[] {
  // The Bun profile attributes the conversion gap to Latin-1 writing and text construction.
  // Test native output at the validated conversion boundary instead of adding another branch
  // to the shared encoder, whose earlier native candidates lost complete-call comparisons.
  const capability = [
    "const plainNativeBase64 = (globalThis as { Bun?: { version?: string } }).Bun",
    "  ? (Uint8Array.prototype as {",
    "      toBase64?: (options: { alphabet: typeof BASE64URL_NAME; omitPadding: boolean }) => string;",
    "    }).toBase64",
    "  : undefined;",
    "const plainBase64Options = { alphabet: BASE64URL_NAME, omitPadding: true } as const;",
    "",
    "const UUID_V7_TIMESTAMP_ONLY =",
  ].join("\n");
  const result = [
    "  if (plainNativeBase64 && view.length === 16 && alpha === BASE64URL) {",
    "    try {",
    "      return plainNativeBase64.call(view, plainBase64Options) as PlainUuidSlug;",
    "    } catch {",
    "      // A failed optional native encoder leaves the existing portable result available.",
    "    }",
    "  }",
    "  return encode(",
    "    view.length === 16 ? view : view.subarray(offset, offset + 16),",
    "    alpha,",
    "  ) as PlainUuidSlug;",
  ].join("\n");
  const native = replaceOnce(
    replaceOnce(source, "const UUID_V7_TIMESTAMP_ONLY =", capability),
    [
      "  return encode(",
      "    view.length === 16 ? view : view.subarray(offset, offset + 16),",
      "    alpha,",
      "  ) as PlainUuidSlug;",
    ].join("\n"),
    result,
  );
  return [
    { name: "baseline", source },
    { name: "native-plain-result", source: native },
  ];
}
