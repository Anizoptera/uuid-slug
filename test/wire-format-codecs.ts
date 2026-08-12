// SPDX-License-Identifier: Apache-2.0

/**
 * The codecs the golden vectors in `fixtures-wire-format.json` were produced by, keyed by that
 * file's `schema` field.
 *
 * They live here rather than in each suite because the Bun and Node suites exist ONLY to run the
 * same comparison on two runtimes. If each declared its own map and the two drifted to
 * differently-configured codecs, both suites would stay green while comparing different things —
 * a total, silent loss of the cross-runtime guarantee, with nothing in either file looking wrong.
 * The assertions stay in the suites: an assertion that drifts merely narrows coverage, and it is
 * visible on the page.
 */
import { createUuidSlugCodec, defineMaskSchema } from "../src/index";

/**
 * A substitution schema built through the public `defineMaskSchema`, standing in for the mask
 * tables a consumer supplies for slugs their old system already issued. This package deliberately
 * ships none of its own — a mask table published on npm is a published key.
 *
 * The tables are synthetic and derived from a formula so they cannot be mistaken for real key
 * material. The permutation `(i * 5 + 3) mod 16` is a bijection because 5 is invertible modulo 16,
 * and is chosen to be neither the identity nor self-inverse: a self-inverse table hides a
 * forward/inverse mix-up in the mask layer, because the wrong direction still gives the right
 * answer. `tagBits` is 4 rather than the default 6 so the narrower tag stays exercised.
 */
const substitution = defineMaskSchema({
  id: "explicit-substitution",
  permute: Uint8Array.from({ length: 16 }, (_, i) => (i * 5 + 3) % 16),
  tagBits: 4,
  xor: Uint8Array.from({ length: 16 }, (_, i) => i * 0x11),
});
if (substitution instanceof Error) throw substitution;

export const WIRE_FORMAT_CODECS = {
  default: createUuidSlugCodec({}),
  "explicit-substitution": createUuidSlugCodec({ mask: substitution }),
  "seeded-v2": createUuidSlugCodec({ mask: { seed: "golden-vector-seed" } }),
};
