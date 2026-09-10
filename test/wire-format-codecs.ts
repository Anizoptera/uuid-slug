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
import { createCustomMaskSchema, createUuidSlugCodec, PUBLIC_MASK_SCHEMA } from "../src/index";
import { unwrap } from "../dev/unwrap";

/**
 * A caller-supplied mixing step, standing in for a consumer who brings their own cipher. It is
 * here because `MaskSchema` is the package's only extension point, so the golden vectors are what
 * prove an outside scheme survives a change to the encoder or the tag layout.
 *
 * It doubles as the whole cost of that extension point: a permute-and-XOR scheme, the shape the
 * package used to wrap in a constructor of its own, is these nine lines in user code.
 *
 * Synthetic and formula-derived so it cannot be mistaken for real key material. `(i * 5 + 3) mod
 * 16` is a bijection because 5 is invertible modulo 16, and is deliberately neither the identity
 * nor self-inverse — a self-inverse table hides a forward/inverse mix-up, since the wrong
 * direction still gives the right answer.
 */
const permute = Uint8Array.from({ length: 16 }, (_, i) => (i * 5 + 3) % 16);
const xor = Uint8Array.from({ length: 16 }, (_, i) => i * 0x11);
const inverse = new Uint8Array(16);
permute.forEach((target, i) => (inverse[target] = i));

const customMix = unwrap(
  createCustomMaskSchema({
    id: "custom-mix",
    forward(input) {
      const output = new Uint8Array(16);
      for (let i = 0; i < 16; i += 1) {
        const source = permute[i] as number;
        output[i] = (input[source] as number) ^ (xor[i] as number);
      }
      return output;
    },
    reverse(input) {
      const output = new Uint8Array(16);
      for (let i = 0; i < 16; i += 1) {
        const source = inverse[i] as number;
        output[i] = (input[source] as number) ^ (xor[source] as number);
      }
      return output;
    },
  }),
);

export const WIRE_FORMAT_CODECS = {
  "custom-mix": unwrap(createUuidSlugCodec({ mask: customMix })),
  default: unwrap(createUuidSlugCodec({ mask: PUBLIC_MASK_SCHEMA })),
  "seeded-v2": unwrap(createUuidSlugCodec({ mask: { seed: "golden-vector-seed-v3" } })),
};
