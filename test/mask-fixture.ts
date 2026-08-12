// SPDX-License-Identifier: Apache-2.0

/**
 * A substitution schema built through the public `defineMaskSchema`, shared by every suite that
 * needs a schema this package does not define for itself. It is one module rather than a copy per
 * suite because the Bun and Node suites asserting the SAME fixture is what makes cross-runtime
 * byte-identity checkable instead of assumed.
 *
 * The tables are synthetic and derived from a formula so that nobody can mistake them for key
 * material belonging to a real deployment. A mask table published in a public repository is a
 * published key, and `defineMaskSchema` exists precisely so a consumer supplies their own.
 *
 * The permutation is `(i * 5 + 3) mod 16` — a bijection because 5 is invertible modulo 16, and
 * deliberately neither the identity nor self-inverse. A self-inverse table (a reversal, say) makes
 * a forward/inverse mix-up in the mask layer invisible, because applying the wrong direction still
 * yields the right answer.
 *
 * `tagBits` is 4 rather than the default 6, so the narrower tag stays exercised somewhere.
 */
import { defineMaskSchema } from "../src/index";
import type { MaskSchema } from "../src/index";

const schema = defineMaskSchema({
  id: "explicit-substitution",
  permute: Uint8Array.from({ length: 16 }, (_, i) => (i * 5 + 3) % 16),
  tagBits: 4,
  xor: Uint8Array.from({ length: 16 }, (_, i) => i * 0x11),
});
if (schema instanceof Error) throw schema;

export const EXPLICIT_SUBSTITUTION_SCHEMA: MaskSchema = schema;
