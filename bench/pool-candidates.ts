// SPDX-License-Identifier: Apache-2.0

import { replaceOnce } from "./candidate-source";
import type { SourceCandidate } from "./candidate-source";

export function poolCandidates(source: string): readonly SourceCandidate[] {
  const loop =
    "for (let i = 0; i < length; i += 1) {\n      bytes[i] = pool[offset + i] as number;\n      pool[offset + i] = 0;\n    }";
  // Four-byte draws serve sequence continuations. Keep erasure and refill transactional;
  // complete v4 and v7 calls decide whether the added size branch earns its cost.
  const four = Array.from(
    { length: 4 },
    (_, i) => `bytes[${i}] = pool[offset + ${i}] as number;\n      pool[offset + ${i}] = 0;`,
  ).join("\n      ");
  const fixedStart = source.indexOf("    if (length === 4) {");
  const fixedEnd = source.indexOf("    offset += length;", fixedStart);
  // Retained production stores remain the control; preserve the old indexed alternative so
  // later engine reviews can overturn the choice through the same complete-call comparison.
  if (fixedStart >= 0 && fixedEnd < fixedStart)
    throw new Error("Pool copying boundary changed; repair the source experiment before timing.");
  const indexed =
    fixedStart < 0
      ? source
      : source.slice(0, fixedStart) + `    ${loop}\n` + source.slice(fixedEnd);
  const fixed =
    fixedStart < 0
      ? replaceOnce(source, loop, `if (length === 4) {\n      ${four}\n    } else ${loop}`)
      : source;
  // Owned UUID draws consume sixteen bytes. Compare removing their loop without adding views;
  // the existing partial-refill oracle independently checks every byte and consumed erasure.
  const fixedSixteen = () =>
    replaceOnce(
      fixed,
      "    } else\n      for (",
      "    } else if (length === 16) {\n      " +
        Array.from(
          { length: 16 },
          (_, i) => `bytes[${i}] = pool[offset + ${i}] as number;\n      pool[offset + ${i}] = 0;`,
        ).join("\n      ") +
        "\n    } else\n      for (",
    );
  // Reseeds consume ten bytes, so subsequent four-byte reads can be unaligned. A DataView
  // handles both offsets without padding or discarding entropy; compare its retained view and
  // unpacking work against the existing byte stores through complete generation calls.
  const word = replaceOnce(
    replaceOnce(
      replaceOnce(
        fixed,
        "let pool: Uint8Array<ArrayBuffer> | undefined;",
        "let pool: Uint8Array<ArrayBuffer> | undefined;\n  let poolView: DataView | undefined;",
      ),
      "pool ??= new Uint8Array(POOL_BYTES);",
      "if (pool === undefined) { pool = new Uint8Array(POOL_BYTES); poolView = new DataView(pool.buffer); }",
    ),
    four,
    "const word = (poolView as DataView).getUint32(offset, false);\n      (poolView as DataView).setUint32(offset, 0, false);\n      bytes[0] = word >>> 24;\n      bytes[1] = (word >>> 16) & 0xff;\n      bytes[2] = (word >>> 8) & 0xff;\n      bytes[3] = word & 0xff;",
  );
  return [
    { name: "baseline", source },
    { name: "indexed-loop", source: indexed },
    { name: "fixed-four", source: fixed },
    {
      name: "fixed-sixteen",
      get source() {
        return fixedSixteen();
      },
    },
    {
      name: "fixed-sixteen-lost-byte",
      get source() {
        return replaceOnce(
          fixedSixteen(),
          "bytes[15] = pool[offset + 15] as number;",
          "bytes[15] = 0;",
        );
      },
    },
    {
      name: "fixed-sixteen-lost-erasure",
      get source() {
        return replaceOnce(
          fixedSixteen(),
          "pool[offset + 15] = 0;",
          "pool[offset + 15] = pool[offset + 15] as number;",
        );
      },
    },
    { name: "word-four", source: word },
    {
      name: "word-four-lost-byte",
      source: replaceOnce(word, "bytes[3] = word & 0xff;", "bytes[3] = 0;"),
    },
    {
      name: "fixed-four-lost-byte",
      source: replaceOnce(fixed, "bytes[3] = pool[offset + 3] as number;", "bytes[3] = 0;"),
    },
    {
      name: "source-cursor",
      source: replaceOnce(
        indexed,
        loop,
        "for (let i = 0, sourceOffset = offset; i < length; i += 1, sourceOffset += 1) {\n      bytes[i] = pool[sourceOffset] as number;\n      pool[sourceOffset] = 0;\n    }",
      ),
    },
  ];
}
