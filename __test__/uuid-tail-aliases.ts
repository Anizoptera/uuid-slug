// SPDX-License-Identifier: Apache-2.0

import { BASE64URL } from "../src/alphabet";

/** Enumerate every stored spelling whose ignored low nibble carries no UUID data. */
export function* uuidTailAliases(slug: string): Generator<string> {
  const last = BASE64URL.decode[slug.charCodeAt(21)] as number;
  for (let tail = 0; tail < 16; tail += 1)
    yield slug.slice(0, 21) + BASE64URL.chars[(last & ~15) | tail];
}
