// Generates docs/assets/uuid-representations.svg, the README's opening diagram.
// Run `bun scripts/readme-diagram.ts` after changing this file; never edit the SVG by hand.
//
// Why a generator: every slug, byte and bit count below comes from the library, so the picture
// cannot drift from what the code produces, and a layout change edits a few constants instead
// of hundreds of hand-placed coordinates.
//
// Layout constraints:
// - GitHub shows README images about 880 CSS px wide. Text renders at its SVG size × 880 / W,
//   so W = 1100 keeps the smallest text (15) near 12 px. A wider canvas shrinks everything.
// - One column: each form's facts sit under its specimen, so no side table steals width.
// - Every colour has one meaning. Field colours mark which UUIDv7 field a bit belongs to, and
//   orange marks masked bits. Mint marks headings and labels, slate marks "Sort"/"Case" keys,
//   and the package name is dimmed title ink. White outlines appear only on hover matches.
// - System fonts only: GitHub serves the SVG as an image, so web fonts and links do not load.
// - Hover works only where the SVG is a document, such as the raw file the README image links
//   to. GitHub's raw host allows inline CSS but no scripts, so hover is pure CSS `:has()`.
//   The README <img> itself is static, so nothing may depend on hover.
// - Dark background in both GitHub themes: an <img> SVG follows the browser's colour scheme,
//   not GitHub's theme toggle, so a single dark design is the predictable choice.
import {
  BASE32HEX,
  createUuidV7MaskingCodec,
  isUuidSlugError,
  UUID_V7_TEST_MASK,
  uuidStringToPlainSlug,
} from "../src/index.ts";

const OUT = new URL("../docs/assets/uuid-representations.svg", import.meta.url);

// ---------- data, all derived from the library ----------
const UUID = "0198abcd-1234-7abc-9def-0123456789ab";
// The same UUID with its last bit flipped, for the masking avalanche example.
const FLIPPED = "0198abcd-1234-7abc-9def-0123456789aa";
const must = (v: string | { message: string }): string => {
  if (typeof v !== "string") throw new Error(v.message);
  return v;
};
const codec64 = createUuidV7MaskingCodec({ mask: UUID_V7_TEST_MASK });
const codec32 = createUuidV7MaskingCodec({
  mask: UUID_V7_TEST_MASK,
  maskedSlugAlphabet: BASE32HEX,
});
if (isUuidSlugError(codec64)) throw new Error(codec64.message);
if (isUuidSlugError(codec32)) throw new Error(codec32.message);
const P64 = must(uuidStringToPlainSlug(UUID));
const P32 = must(uuidStringToPlainSlug(UUID, BASE32HEX));
const M64 = must(codec64.uuidToMaskedSlug(UUID));
const M64_AFTER = must(codec64.uuidToMaskedSlug(FLIPPED));
const M32 = must(codec32.uuidToMaskedSlug(UUID));

const ALPHA64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const ALPHA32 = "0123456789abcdefghijklmnopqrstuv";
const HEX = UUID.replaceAll("-", "");
const hexBits = (hex: string) =>
  hex
    .split("")
    .map((c) => parseInt(c, 16).toString(2).padStart(4, "0"))
    .join("");
const bits64 = (slug: string) =>
  slug
    .split("")
    .map((c) => ALPHA64.indexOf(c).toString(2).padStart(6, "0"))
    .join("");
const IN_BITS = hexBits(HEX);
const IN_AFTER = hexBits(FLIPPED.replaceAll("-", ""));
// A masked slug's first 128 bits are the mixed 16-byte block; the last 4 are check bits.
const OUT_BITS = bits64(M64);
const OUT_AFTER = bits64(M64_AFTER);
const byteAt = (bits: string, i: number) => bits.slice(i * 8, i * 8 + 8);
const CHANGED_BYTES = Array.from(
  { length: 16 },
  (_, i) => byteAt(OUT_BITS, i) !== byteAt(OUT_AFTER, i),
);
const BLOCK_FLIPS = OUT_BITS.slice(0, 128)
  .split("")
  .filter((b, i) => b !== OUT_AFTER[i]).length;
const CHAR_FLIPS = M64.split("").filter((c, i) => c !== M64_AFTER[i]).length;
const MS = parseInt(HEX.slice(0, 12), 16);
const WHEN = new Date(MS).toISOString().replace("T", " ").replace("Z", " UTC");

type Field = "time" | "version" | "variant" | "payload" | "masked" | "pad";
// RFC 9562 UUIDv7 layout; bits past 128 are encoding padding.
const plainField = (b: number): Field =>
  b < 48
    ? "time"
    : b < 52
      ? "version"
      : b < 64
        ? "payload"
        : b < 66
          ? "variant"
          : b < 128
            ? "payload"
            : "pad";
// Masked slugs carry 132 bits (docs/design.md); only base32hex's last 3 bits are padding.
const maskedField = (b: number): Field => (b < 132 ? "masked" : "pad");
const SEGMENTS: [number, number, Field][] = [
  [0, 48, "time"],
  [48, 52, "version"],
  [52, 64, "payload"],
  [64, 66, "variant"],
  [66, 128, "payload"],
];

interface Form {
  name: string;
  text: string;
  bitsPerChar: number;
  field: (b: number) => Field;
  masked: boolean;
  facts: string;
  sort: string;
  caseRule: string;
  job: string;
  detail: string;
}
const FORMS = {
  uuid: {
    name: "Text",
    text: UUID,
    bitsPerChar: 4,
    field: plainField,
    masked: false,
    facts: "",
    sort: "by time¹",
    caseRule: "any accepted",
    job: "For UUID columns and UUID-only APIs.",
    detail: "Time-range queries on UUIDv7 keys.",
  },
  bytes: {
    name: "Bytes",
    text: HEX,
    bitsPerChar: 4,
    field: plainField,
    masked: false,
    facts: "",
    sort: "by time¹ (byte order)",
    caseRule: "none (binary)",
    job: "For binary storage and transport.",
    detail: "Generate or decode straight into your buffer; errors leave it unchanged.",
  },
  p64: {
    name: "Plain base64url",
    text: P64,
    bitsPerChar: 6,
    field: plainField,
    masked: false,
    facts: "22 chars · A–Z a–z 0–9 - _ · 6 bits each",
    sort: "roughly by time²",
    caseRule: "must match",
    job: "For short URLs, logs and JSON.",
    detail: "14 characters shorter than UUID text; standard base64url tools decode it.",
  },
  p32: {
    name: "Plain base32hex",
    text: P32,
    bitsPerChar: 5,
    field: plainField,
    masked: false,
    facts: "26 chars · 0–9 a–v · 5 bits each · lowercase",
    sort: "by time¹",
    caseRule: "any accepted",
    job: "For case-insensitive filenames and text keys.",
    detail: "Time-range queries on the ID itself; 4 characters longer than base64url.",
  },
  m64: {
    name: "Masked base64url",
    text: M64,
    bitsPerChar: 6,
    field: maskedField,
    masked: true,
    facts: "22 chars · A–Z a–z 0–9 - _ · 6 bits each",
    sort: "none: decode first",
    caseRule: "must match",
    job: "For public IDs that hide the UUID's time and fields.",
    detail:
      "Your database keeps UUIDs. Only the matching key and settings decode it; keep old keys for old links.",
  },
  m32: {
    name: "Masked base32hex",
    text: M32,
    bitsPerChar: 5,
    field: maskedField,
    masked: true,
    facts: "27 chars · 0–9 a–v · 5 bits each · lowercase",
    sort: "none: decode first",
    caseRule: "any accepted",
    job: "For masked IDs in case-insensitive filenames.",
    detail:
      "5 characters longer. The same UUID, key and settings always give the same slug; one codec reads both masked alphabets.",
  },
} satisfies Record<string, Form>;

const COPY = {
  title: "One UUIDv7, six representations",
  pkg: "@anizoptera/uuid-slug",
  subtitle:
    "Store one UUID. Every form below converts back to it losslessly (masked ones with your key). No mapping table.",
  urlSafe: "All text forms are URL-safe.",
  masking:
    "A keyed scramble hides the time and every UUID field, and decodes back to the exact UUID. 132 bits = 42-bit time offset (~139 years from a start you set) + 74 payload bits + 16-bit check.",
  overlap:
    "Plain and masked base64url can look identical. Choose the reader for the format you issued.",
  notes: [
    "¹ UUIDv7: sorts by creation millisecond if all IDs share one case and alphabet; not event order within a millisecond.",
    "² Nearby times share prefixes, but ASCII order can swap adjacent milliseconds.",
    "Compare decoded UUIDs, not spellings: one UUID has many valid spellings. A wrong key passes the 16-bit check about once in 65,536 tries and returns another UUID. Masking is not strong encryption.",
  ],
};
const LEGEND: [Field, string][] = [
  ["time", "Timestamp"],
  ["version", "Version"],
  ["variant", "Variant"],
  ["payload", "Payload (random or counter)"],
  ["masked", "Masked"],
  ["pad", "Padding (zeros)"],
];

// ---------- drawing primitives ----------
const SANS = `-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif`;
const MONO = `ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace`;
// Two hover gestures, one question each:
// - a legend item asks "where is this field?": every other field's cells fade and the field's
//   ribbons brighten;
// - a character or byte asks "where do these bits go?" (see linkRules).
// Cells themselves do not trigger the field view, so the two gestures never fire together.
const FIELD_HOVER = LEGEND.map(([f]) => {
  const ribbon =
    f === "masked" || f === "pad"
      ? ""
      : ` svg:has(.lg-${f}:hover) .ghost.${f}{fill-opacity:.22;stroke-opacity:.7}`;
  return `svg:has(.lg-${f}:hover) .cell:not(.${f}){opacity:.3}${ribbon}`;
}).join("\n");
// Slow auto-highlight: each field's ribbons brighten in turn, so the static README <img> (which
// never receives the mouse) still shows how the fields travel between rows. Pointing at the
// image stops it so the hover links take over; without scripts the stop cannot persist, so it
// resumes when the pointer leaves. Reduced-motion users get the still image.
const AUTO_FIELDS = ["time", "version", "variant", "payload"] as const;
// Each field gets a 4 s turn of the 16 s cycle: ~2 s ease-in, a short hold, then a ~2.5 s
// ease-out that overlaps the next field's rise, so the light hands over instead of blinking.
const AUTO_STEP_S = 4;
const AUTO_HIGHLIGHT = `@keyframes glow{0%,38%,100%{fill-opacity:.035;stroke-opacity:.1}12%,22%{fill-opacity:.14;stroke-opacity:.42}}
${AUTO_FIELDS.map((f, i) => `.ghost.${f}{animation:glow ${AUTO_FIELDS.length * AUTO_STEP_S}s ease-in-out ${i * AUTO_STEP_S}s infinite both}`).join("")}
svg:hover .ghost{animation:none}@media (prefers-reduced-motion:reduce){.ghost{animation:none}}`;
const STYLE = `
.bg{fill:#0B1423}.ink{fill:#F5F7FC}.muted{fill:#C6D0E1}.box{fill:#15243A}.same{fill:#24344D}.chg{fill:#F5F7FC}
.pkg{fill:#F5F7FC;fill-opacity:.6}.accent{fill:#7ED8B3}.key{fill:#8797AE}.rule{stroke:#34465F;fill:none}
.time{color:#00C8FF}.version{color:#FF49CD}.variant{color:#4D50FF}.payload{color:#FFE83F}
.masked{color:#FF921C}.pad{color:#8C9DB6}.f{fill:currentColor}.fg{fill:#08111F}.fw{fill:#FFFFFF}
.sans{font-family:${SANS}}.mono{font-family:${MONO};font-variant-ligatures:none}
.ghost{fill:currentColor;fill-opacity:.035;stroke:currentColor;stroke-opacity:.1;stroke-width:1}.lead{color:#C6D0E1}
text,.hl,.ghost{pointer-events:none}.hl{fill:none;stroke:#F5F7FC;stroke-width:2.5;opacity:0}
.lg{pointer-events:auto}.cell{transition:opacity .15s}
${FIELD_HOVER}
${AUTO_HIGHLIGHT}`;
const esc = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
const r1 = (n: number) => Math.round(n * 10) / 10;
// System fonts differ, so widths are estimates; layouts keep slack instead of measuring.
const textWidth = (s: string, size: number, bold = false) => s.length * size * (bold ? 0.58 : 0.52);
const wrap = (s: string, maxW: number, size: number): string[] => {
  const lines: string[] = [];
  let cur = "";
  for (const word of s.split(" ")) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && textWidth(next, size) > maxW) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
};

interface TextOpts {
  cls?: string;
  weight?: number;
  anchor?: "middle" | "end";
  mono?: boolean;
}
const out: string[] = [];
const text = (x: number, y: number, s: string, size: number, o: TextOpts = {}) => {
  const anchor = o.anchor ? ` text-anchor="${o.anchor}"` : "";
  const weight = o.weight ? ` font-weight="${o.weight}"` : "";
  out.push(
    `<text x="${r1(x)}" y="${r1(y)}" class="${o.cls ?? "ink"} ${o.mono ? "mono" : "sans"}" font-size="${size}"${weight}${anchor}>${esc(s)}</text>`,
  );
};
const rect = (x: number, y: number, w: number, h: number, cls: string, extra = "") =>
  out.push(
    `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" class="${cls}"${extra}/>`,
  );
const path = (d: string, cls: string, width: number) =>
  out.push(
    `<path d="${d}" class="${cls}" fill="none" stroke="currentColor" stroke-width="${width}"/>`,
  );

// A glyph cell spans the bits it encodes; hyphens encode none.
interface Cell {
  ch: string;
  start: number;
  bits: number;
  x: number;
  w: number;
}
const cellsOf = (f: Form, x0: number, cw: number): Cell[] => {
  let x = x0,
    bit = 0;
  return f.text.split("").map((ch) => {
    const bits = ch === "-" ? 0 : f.bitsPerChar;
    const w = bits ? cw : cw * 0.62;
    const c = { ch, start: bit, bits, x, w };
    x += w;
    bit += bits;
    return c;
  });
};
const bitX = (cells: Cell[], bit: number) => {
  const c = cells.find((cell) => cell.bits && bit >= cell.start && bit <= cell.start + cell.bits);
  if (!c) throw new Error(`bit ${bit} outside the row`);
  return c.x + ((bit - c.start) / c.bits) * c.w;
};
// Only the dark variant blue needs white ink.
const inkFor = (f: Field) => (f === "variant" ? "fw" : "fg");

// Hover linking for the raw view (GitHub's README <img> is static). Each plain character or byte
// records its bit range; hovering it reveals the outline of every linked piece holding any of
// those bits. Masked rows are left out on purpose: masking scrambles bit positions, so no
// masked character corresponds to particular UUID bits.
interface Link {
  id: string;
  start: number;
  bits: number;
}
const links: Link[] = [];
const linked = (
  id: string,
  start: number,
  bits: number,
  x: number,
  y: number,
  w: number,
  h: number,
) => {
  links.push({ id, start, bits });
  out.push(`<g id="g${id}">`);
  return () =>
    out.push(
      `<rect id="o${id}" class="hl" x="${r1(x)}" y="${r1(y - 2)}" width="${r1(w)}" height="${r1(h + 4)}" rx="2"/></g>`,
    );
};
const linkRules = () =>
  links
    .map((a) => {
      const hits = links.filter((b) => a.start < b.start + b.bits && b.start < a.start + a.bits);
      return `svg:has(#g${a.id}:hover) :is(${hits.map((b) => `#o${b.id}`).join(",")}){opacity:1}`;
    })
    .join("\n");

let clipId = 0;
const drawSpecimen = (
  f: Form,
  cells: Cell[],
  y: number,
  h: number,
  size: number,
  linkKey?: string,
) => {
  const baseline = y + h / 2 + size * 0.35;
  let index = 0;
  for (const c of cells) {
    if (!c.bits) {
      rect(c.x + 2, y + h / 2 - 1.5, c.w - 4, 3, "muted");
      continue;
    }
    const close = linkKey
      ? linked(`${linkKey}${index++}`, c.start, c.bits, c.x, y, c.w, h)
      : undefined;
    drawGlyph(f, c, y, h, size, baseline);
    close?.();
  }
};
const drawGlyph = (f: Form, c: Cell, y: number, h: number, size: number, baseline: number) => {
  // A character can hold bits of two fields; paint each share and keep its glyph legible on both.
  const runs: [Field, number][] = [];
  for (let b = c.start; b < c.start + c.bits; b++) {
    const field = f.field(b),
      last = runs.at(-1);
    if (last && last[0] === field) last[1]++;
    else runs.push([field, 1]);
  }
  let x = c.x + 0.75;
  const parts: [string, number, number][] = [];
  for (const [field, n] of runs) {
    const w = (n / c.bits) * (c.w - 1.5);
    rect(x, y, w, h, `${field} f cell`);
    if (field === "pad") rect(x, y, w, h, "", ` fill="url(#hatch)"`);
    parts.push([inkFor(field), x, w]);
    x += w;
  }
  const gx = c.x + c.w / 2;
  if (parts.every((p) => p[0] === parts[0]![0])) {
    text(gx, baseline, c.ch, size, { cls: parts[0]![0], anchor: "middle", mono: true });
    return;
  }
  for (const [cls, px, pw] of parts) {
    const id = `k${++clipId}`;
    out.push(
      `<clipPath id="${id}"><rect x="${r1(px)}" y="${r1(y)}" width="${r1(pw)}" height="${h}"/></clipPath><g clip-path="url(#${id})">`,
    );
    text(gx, baseline, c.ch, size, { cls, anchor: "middle", mono: true });
    out.push("</g>");
  }
};

// Faint field ribbons that run under the text between rows, so the eye can follow each field's bits.
const ribbons = (upper: Cell[], yTop: number, lower: Cell[], yBottom: number) => {
  const ym = r1((yTop + yBottom) / 2);
  return SEGMENTS.map(([a, b, f]) => {
    const ua = r1(bitX(upper, a)),
      ub = r1(bitX(upper, b)),
      la = r1(bitX(lower, a)),
      lb = r1(bitX(lower, b));
    return `<path class="ghost ${f}" d="M${ua} ${yTop}C${ua} ${ym} ${la} ${ym} ${la} ${yBottom}L${lb} ${yBottom}C${lb} ${ym} ${ub} ${ym} ${ub} ${yTop}Z"/>`;
  });
};

// ---------- layout ----------
const W = 1100,
  M = 36,
  CW = 19.4,
  CELL_H = 44,
  MONO_SIZE = 30;
const SIDE_X = 790,
  SIDE_W = W - M - SIDE_X,
  FACTS_X = M + 250,
  CASE_X = M + 394,
  TEXT_W = 712;
const FS = { title: 34, sub: 18, head: 16, name: 24, small: 16, meta: 17, note: 15 };
// Vertical rhythm: LINE between text lines, GAP between a specimen and what follows it,
// ROW between two forms (and before a section rule). Every vertical step uses one of these.
const LINE = 24,
  GAP = 12,
  ROW = 24;
let y = 0;

const section = (label: string, cls = "accent", right?: string) => {
  path(`M${M} ${y}H${W - M}`, "rule", 1.2);
  text(M, y + 28, label, FS.head, { cls, weight: 700 });
  if (right) text(W - M, y + 28, right, FS.head - 1, { cls: "muted", anchor: "end" });
  y += 44;
};
const head = (name: string, facts: string, masked = false) => {
  text(M, y + 22, name, FS.name, { cls: masked ? "masked f" : "ink", weight: 600 });
  text(FACTS_X, y + 22, facts, FS.small, { cls: "muted" });
  y += 36;
};
// What the form is for comes first; sort order, case rule and details follow.
// Every line sits on the M edge with one line height; a prefix such as "Text" joins the job
// line as a run of the same <text>, so the font, not an estimate, spaces it.
const meta = (f: Form, prefix?: string) => {
  const lead = prefix
    ? `<tspan class="accent" font-weight="700">${prefix}</tspan><tspan dx="10">`
    : "<tspan>";
  out.push(
    `<text x="${M}" y="${y + 18}" class="ink sans" font-size="${FS.meta}" font-weight="600">${lead}${esc(f.job)}</tspan></text>`,
  );
  y += LINE;
  text(M, y + 18, "Sort", FS.meta - 1, { cls: "key" });
  text(M + 42, y + 18, f.sort, FS.meta, { weight: 600 });
  text(CASE_X, y + 18, "Case", FS.meta - 1, { cls: "key" });
  text(CASE_X + 46, y + 18, f.caseRule, FS.meta, { weight: 600 });
  y += LINE;
  for (const l of wrap(f.detail, TEXT_W, FS.meta)) {
    text(M, y + 18, l, FS.meta, { cls: "muted" });
    y += LINE;
  }
};

// Header.
text(M, 50, COPY.title, FS.title, { weight: 600 });
text(W - M, 50, COPY.pkg, 20, { cls: "pkg", weight: 600, anchor: "end" });
text(M, 82, COPY.subtitle, FS.sub, { cls: "muted" });
{
  // One text run, so the viewer's own font spaces the items evenly; separate elements would need
  // width estimates, which drift with each system font. Swatches are glyphs (▨ for padding, to
  // echo the hatch), and each item is a hover target for the field view.
  const items = LEGEND.map(
    ([f, label], i) =>
      `<tspan class="lg lg-${f}"${i ? ' dx="22"' : ""}><tspan class="${f} f">${f === "pad" ? "▨" : "■"}</tspan> ${esc(label)}</tspan>`,
  );
  out.push(
    `<text x="${M}" y="117" class="ink sans" font-size="${FS.small}" font-weight="500">${items.join("")}</text>`,
  );
  text(W - M, 117, COPY.urlSafe, FS.small, { cls: "muted", anchor: "end" });
}
y = 136;

// The UUID: one value, written as 36-character text and stored as 16 bytes.
section("THE UUID · any version · 128 bits");
head("UUID", "36 characters as text · 16 bytes in binary");
const uuidCells = cellsOf(FORMS.uuid, M, CW);
const digitCells = uuidCells.filter((c) => c.bits);
text(SIDE_X, y + 18, "Text", FS.meta, { cls: "accent", weight: 700 });
text(SIDE_X, y + 40, "36 chars · lowercase", FS.small, { cls: "muted" });
const textTop = y;
drawSpecimen(FORMS.uuid, uuidCells, y, CELL_H, MONO_SIZE, "u");
y += CELL_H + GAP;
// Bytes sit under their own two hex digits: dark tiles, so they read as a different thing
// than the text, with each bit's field shown only as a thin bar.
const bytesTop = y,
  BYTES_H = 40;
text(SIDE_X, y + 18, "Bytes", FS.meta, { cls: "accent", weight: 700 });
text(SIDE_X, y + 40, "16 bytes, binary, same order", FS.small, { cls: "muted" });
for (let i = 0; i < 16; i++) {
  const a = digitCells[i * 2]!,
    b = digitCells[i * 2 + 1]!,
    w = b.x + b.w - a.x;
  const close = linked(`b${i}`, i * 8, 8, a.x, y, w, BYTES_H);
  rect(a.x + 1, y, w - 2, BYTES_H, "box", ` stroke="#667D99" stroke-width="1.2" rx="3"`);
  text(a.x + w / 2, y + BYTES_H / 2 + 6, HEX.slice(i * 2, i * 2 + 2), 21, {
    anchor: "middle",
    mono: true,
  });
  for (let k = 0; k < 8; k++)
    rect(
      a.x + 1 + ((w - 2) * k) / 8,
      y + BYTES_H - 6,
      (w - 2) / 8,
      6,
      `${plainField(i * 8 + k)} f cell`,
    );
  close();
}
y += BYTES_H + GAP / 2;
{
  const x1 = bitX(uuidCells, 0),
    x2 = bitX(uuidCells, 48);
  path(`M${r1(x1)} ${y}v6H${r1(x2)}v-6`, "time", 2);
  text(x1, y + 26, `UUIDv7 48-bit timestamp: ${MS} ms = ${WHEN}`, FS.small, {
    cls: "time f",
    weight: 600,
  });
  y += 26 + GAP;
}
meta(FORMS.uuid, "Text");
y += GAP;
meta(FORMS.bytes, "Bytes");
y += ROW;

// Plain slugs, with a callout for one character that holds bits of two fields.
section("PLAIN SLUGS · any UUID · no key · the same 128 bits in fewer characters");
text(SIDE_X, y + 22, "One character, two fields", FS.meta, { cls: "accent", weight: 700 });
const plainRows: Record<"p64" | "p32", { cells: Cell[]; top: number }> = {
  p64: { cells: [], top: 0 },
  p32: { cells: [], top: 0 },
};
for (const [id, idx, label] of [
  ["p64", 10, "4 payload + 2 variant bits"],
  ["p32", 9, "3 timestamp + 2 version bits"],
] as const) {
  const f = FORMS[id];
  head(f.name, f.facts);
  const cells = cellsOf(f, M, CW),
    top = y;
  plainRows[id] = { cells, top };
  drawSpecimen(f, cells, top, CELL_H, MONO_SIZE, id === "p64" ? "p" : "q");
  const c = cells[idx]!;
  rect(
    c.x,
    top - 3,
    c.w,
    CELL_H + 6,
    "",
    ` fill="none" stroke="#C6D0E1" stroke-width="1.4" rx="2"`,
  );
  path(
    `M${r1(c.x + c.w / 2)} ${top + CELL_H + 3}V${top + CELL_H + 8}H${SIDE_X - 14}V${top + 20}H${SIDE_X - 4}`,
    "lead",
    1.4,
  );
  // The callout: glyph, its bits coloured by field, and what they hold.
  const bs = 21,
    value = (f.bitsPerChar === 6 ? ALPHA64 : ALPHA32)
      .indexOf(c.ch)
      .toString(2)
      .padStart(c.bits, "0");
  rect(SIDE_X, top + 10, bs, bs, "box", ` stroke="#C6D0E1" stroke-width="1.2"`);
  text(SIDE_X + bs / 2, top + 10 + bs * 0.78, c.ch, FS.meta, { anchor: "middle", mono: true });
  for (let i = 0; i < c.bits; i++) {
    const field = f.field(c.start + i),
      bx = SIDE_X + bs + 10 + i * (bs * 0.78 + 1.5);
    rect(bx, top + 10, bs * 0.78, bs, `${field} f cell`);
    text(bx + bs * 0.39, top + 10 + bs * 0.75, value[i]!, FS.small - 1, {
      cls: inkFor(field),
      anchor: "middle",
      mono: true,
    });
  }
  text(SIDE_X, top + 10 + bs + 22, label, FS.small, { cls: "muted" });
  y += CELL_H + GAP;
  meta(f);
  y += ROW;
}

// Masked slugs, with the avalanche example beside them.
section(
  "MASKED SLUGS · UUIDv7 only · need the matching key",
  "masked f",
  "Examples use the public demo key",
);
for (const l of wrap(COPY.masking, W - 2 * M, FS.meta)) {
  text(M, y + 6, l, FS.meta, { cls: "muted" });
  y += LINE;
}
y += GAP / 2;
for (const l of wrap(COPY.overlap, W - 2 * M, FS.meta)) {
  text(M, y + 10, l, FS.meta, { weight: 700 });
  y += LINE;
}
y += GAP;
const maskedTop = y;
for (const id of ["m64", "m32"] as const) {
  const f = FORMS[id];
  head(f.name, f.facts, true);
  drawSpecimen(f, cellsOf(f, M, CW), y, CELL_H, MONO_SIZE);
  y += CELL_H + GAP;
  meta(f);
  y += ROW;
}
{
  // One flipped input bit fans out to every masked byte; then the slug a reader actually sees.
  const x0 = SIDE_X,
    bs = 24,
    bx = x0 + 58;
  let ay = maskedTop + 4;
  text(x0, ay + 16, "Masking: avalanche effect", FS.meta, { cls: "accent", weight: 700 });
  text(x0, ay + 40, "Last UUID byte · flip one bit", FS.small, { cls: "muted" });
  ay += 56;
  const lastByte = [IN_BITS.slice(120), IN_AFTER.slice(120)] as const;
  lastByte.forEach((bits, row) => {
    const ry = ay + row * (bs + 6);
    text(x0, ry + bs * 0.7, row ? "After" : "Before", FS.small, { cls: "muted" });
    bits.split("").forEach((b, i) => {
      const changed = row === 1 && b !== lastByte[0][i];
      rect(bx + i * (bs + 2), ry, bs, bs, changed ? "chg" : "same", ` rx="2"`);
      text(bx + i * (bs + 2) + bs / 2, ry + bs * 0.72, b, FS.small, {
        cls: changed ? "fg" : "ink",
        anchor: "middle",
        mono: true,
      });
    });
  });
  ay += 2 * (bs + 6) + 4;
  const boxW = 220,
    boxX = x0 + (SIDE_W - boxW) / 2,
    boxH = 48,
    mid = boxX + boxW / 2;
  path(`M${r1(bx + 7 * (bs + 2) + bs / 2)} ${ay - 4}V${ay + 8}H${r1(mid)}V${ay + 18}`, "masked", 2);
  ay += 18;
  rect(boxX, ay, boxW, boxH, "box", ` stroke="#FF921C" stroke-width="2" rx="4"`);
  text(mid, ay + 21, "Mask", FS.meta, { weight: 700, anchor: "middle" });
  text(mid, ay + 40, "same key and settings", FS.small - 1, { cls: "muted", anchor: "middle" });
  const outY = ay + boxH + 54,
    ow = 13,
    og = (SIDE_W - 16 * ow) / 15;
  for (let i = 0; i < 16; i++) {
    const ox = x0 + i * (ow + og) + ow / 2;
    path(
      `M${r1(mid)} ${ay + boxH}C${r1(mid)} ${ay + boxH + 30} ${r1(ox)} ${outY - 26} ${r1(ox)} ${outY - 2}`,
      "masked",
      1.6,
    );
    rect(x0 + i * (ow + og), outY, ow, 22, CHANGED_BYTES[i] ? "chg" : "same", ` rx="2"`);
  }
  let ty = outY + 48;
  text(x0, ty, `${CHANGED_BYTES.filter(Boolean).length} of 16 masked bytes change`, FS.meta, {
    weight: 700,
  });
  text(x0, ty + 22, `${BLOCK_FLIPS} of 128 bits flip (this example)`, FS.small - 1, {
    cls: "muted",
  });
  text(x0, ty + 46, "Similar UUIDs, unrelated slugs", FS.small, { weight: 600 });
  text(x0, ty + 76, "Before", FS.small, { cls: "muted" });
  text(bx, ty + 76, M64, 15, { cls: "masked f", mono: true });
  text(x0, ty + 98, "After", FS.small, { cls: "muted" });
  text(bx, ty + 98, M64_AFTER, 15, { cls: "masked f", mono: true });
  text(x0, ty + 120, `${CHAR_FLIPS} of 22 characters differ`, FS.small - 1, { cls: "muted" });
  ty += 134;
  y = Math.max(y, ty);
}

// Footnotes.
path(`M${M} ${y}H${W - M}`, "rule", 1);
y += 8;
for (const n of COPY.notes) {
  for (const l of wrap(n, W - 2 * M, FS.note)) {
    y += 22;
    text(M, y, l, FS.note, { cls: "muted" });
  }
}
const H = Math.ceil(y + 18);

// Ribbons go behind everything: UUID text → bytes → base64url → base32hex.
const background = [
  ...ribbons(uuidCells, textTop + CELL_H, digitCells, bytesTop),
  ...ribbons(digitCells, bytesTop + BYTES_H, plainRows.p64.cells, plainRows.p64.top),
  ...ribbons(
    plainRows.p64.cells,
    plainRows.p64.top + CELL_H,
    plainRows.p32.cells,
    plainRows.p32.top,
  ),
];
const desc = `The UUIDv7 ${UUID} as UUID text, 16 bytes, plain base64url ${P64}, plain base32hex ${P32}, masked base64url ${M64} and masked base32hex ${M32}, with what each form is for, how it sorts and whether case matters. Flipping the last UUID bit changes ${CHAR_FLIPS} of 22 masked base64url characters (${M64_AFTER}).`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d">
<!-- Generated by scripts/readme-diagram.ts; edit that script, not this file. -->
<title id="t">${esc(COPY.title)}</title>
<desc id="d">${esc(desc)}</desc>
<style>${STYLE}
${linkRules()}</style>
<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M-1 1L1-1M0 6L6 0M5 7L7 5" stroke="#08111F" opacity=".55"/></pattern></defs>
<rect width="100%" height="100%" class="bg"/>
${[...background, ...out].join("\n")}
</svg>
`;
await Bun.write(OUT, svg);
console.log(`${OUT.pathname}: ${W}x${H}, ${svg.length} bytes`);
