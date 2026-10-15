// Generates docs/assets/uuid-representations.svg, the README's opening diagram.
// Run `bun scripts/readme-diagram.ts` after changing this file; never edit the SVG by hand.
//
// Why a generator: every slug, byte and bit count below comes from the library, so the picture
// cannot drift from what the code produces, and a layout change edits a few constants instead
// of hundreds of hand-placed coordinates.
//
// Maintainer rulings. Keep each one unless the maintainer drops it, and record new ones here
// when made: a ruling kept only in a chat is lost, and the next edit deletes it.
// - UUID text and bytes must look different: 36 characters as text, 16 bytes in binary.
// - Sections sit on tinted panels, not between rules.
// - Under each specimen: Sort/Case first, then the "For …" line in lighter ink weight, then the
//   details. These lines are indented from the specimen's left edge: the ribbons draw a vertical
//   line there, and text starting on it looks unpadded.
// - Faint field ribbons run under the rows: UUID text → bytes → base64url → base32hex, and
//   masked base64url → masked base32hex (one band: the same 132 masked bits).
// - Hover, every piece the same way:
//   - a legend item and a piece focus the same way: their fields' cells, ribbons and legend
//     items light up and every other field fades; a piece holding two fields keeps both;
//   - a character, byte or bit also outlines the same bits in every other row of its kind;
//   - masked rows too: both masked spellings carry the same 132 bits, so a masked character
//     outlines its bits in the other masked row and lights the Masked legend item;
//   - no dead zones: moving along a row never drops the highlight, so gaps and hyphens belong
//     to the nearest piece, and leaving a piece waits a moment before un-highlighting;
//   - a lit legend item shows as a crisp chip: a rounded pill with a faint field-colour fill
//     and border behind its white label (a blurred glow read as tacky neon).
// - Idle motion, slow and gentle: fields light in turn (with their legend items). It stops as
//   soon as the pointer enters the image, anywhere on it, and resumes when it leaves: motion
//   that keeps running under a reader who is looking feels broken.
// - The avalanche is drawn, not only counted: flipped input bit → mask → 16 output bytes. It
//   animates constantly, never stops, on one clock: the input bit flips, irregular dashes stream
//   down every wire, the changed bytes and After characters turn over in shuffled order, hold,
//   then turn back. A reader must see it move without waiting for it.
// - Reduced-motion users get the still image.
// - README: the image links to the raw SVG, and a text link under it says the raw view is
//   interactive.
//
// Layout constraints:
// - GitHub shows README images about 880 CSS px wide. Text renders at its SVG size × 880 / W,
//   so W = 1100 keeps the smallest text (15) near 12 px. A wider canvas shrinks everything.
// - One column: each form's facts sit under its specimen, so no side table steals width.
// - Every colour has one meaning. Field colours mark which UUIDv7 field a bit belongs to, and
//   orange marks masked bits. Mint marks headings and labels, slate marks "Sort"/"Case" keys,
//   and the package name is dimmed title ink. White outlines appear only on hover matches.
//   Violet marks top selling points only (maintainer ruling: the most important claims must
//   stand out, first "39% shorter than UUID text"): bold white text on a violet highlighter band.
//   Violet is the one free hue that no field uses; a solid fill was rejected because solid
//   tiles with dark text already mean "a field's bits" (cells) and "a changed byte" (avalanche).
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
import { browserEngines } from "./browser-engines.ts";
import { checkDiagramHover } from "./readme-diagram-hover.ts";

const OUT = new URL("../docs/assets/uuid-representations.svg", import.meta.url);
// TEMPORARY switches that rebuild earlier layouts for comparison (DIAGRAM_LAYOUT=a,b): "rules"
// separates sections with rules instead of panels, "jobfirst" puts what a form is for first,
// "nocall" drops the one-character callout leaders and the avalanche slug lines. Delete them
// once the maintainer has no further use for the comparison.
const LAYOUT = new Set((process.env["DIAGRAM_LAYOUT"] ?? "").split(","));
const panels: [number, string][] = [];

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
// Readers judge length as a saving against the UUID text they already store, not as a character
// count; computed from the library's output so the figure follows any format change.
const shorter = (slug: string) =>
  `${Math.round((1 - slug.length / UUID.length) * 100)}% shorter than UUID text`;
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
  // A top selling point, drawn highlighted at the start of the details. Reserved for the few
  // claims that decide adoption; highlighting more dilutes it.
  win?: string;
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
    detail: "The standard form: every database and UUID library accepts it.",
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
    detail: "Writes into your buffer; on error the buffer stays unchanged.",
  },
  p64: {
    name: "Plain base64url",
    text: P64,
    bitsPerChar: 6,
    field: plainField,
    masked: false,
    facts: "22 chars · A–Z a–z 0–9 - _",
    sort: "roughly by time²",
    caseRule: "must match",
    job: "For short URLs, logs and JSON.",
    win: shorter(P64),
    detail: "Any base64url decoder returns its 16 UUID bytes.",
  },
  p32: {
    name: "Plain base32hex",
    text: P32,
    bitsPerChar: 5,
    field: plainField,
    masked: false,
    facts: "26 chars · 0–9 a–v · lowercase",
    sort: "by time¹",
    caseRule: "any accepted",
    job: "For case-insensitive filenames and text keys.",
    detail: `${shorter(P32)}; time-range queries work on the ID itself.`,
  },
  m64: {
    name: "Masked base64url",
    text: M64,
    bitsPerChar: 6,
    field: maskedField,
    masked: true,
    facts: "22 chars · A–Z a–z 0–9 - _",
    sort: "none: decode first",
    caseRule: "must match",
    job: "For public IDs that hide the UUID's time and fields.",
    win: shorter(M64),
    detail: `Decoding needs the key that made it: keep old keys, or old links break.`,
  },
  m32: {
    name: "Masked base32hex",
    text: M32,
    bitsPerChar: 5,
    field: maskedField,
    masked: true,
    facts: "27 chars · 0–9 a–v · lowercase",
    sort: "none: decode first",
    caseRule: "any accepted",
    job: "For masked IDs in case-insensitive filenames.",
    detail: `${shorter(M32)}. Same UUID + same key = same slug. One codec decodes both masked forms.`,
  },
} satisfies Record<string, Form>;

const COPY = {
  title: "One UUIDv7, six representations",
  pkg: "@anizoptera/uuid-slug",
  subtitle:
    "Store the UUID. Every form below converts back to it exactly; masked forms need your key. No lookup table.",
  urlSafe: "All text forms are URL-safe.",
  masking:
    "Your key scrambles all UUID bits, so the slug shows no time or fields. The key turns it back into the same UUID. Inside: 42-bit time since your start date (~139 years) + 74 payload bits + 16-bit check.",
  overlap:
    "Plain and masked base64url look alike. Decode each with the function for the form you issued.",
  notes: [
    "¹ UUIDv7: sorts by creation millisecond if all IDs share one case and alphabet; not event order within a millisecond.",
    "² Nearby times share prefixes, but ASCII order can swap adjacent milliseconds.",
    "Compare decoded UUIDs, not strings: one UUID has many valid spellings. A wrong key passes the check about 1 time in 65,536 and returns a wrong UUID. Masking is not proven-secure encryption.",
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
// Field hover, per the rulings above: pointing at a legend item or a piece focuses the same way.
// A piece's hit area (`.hit`) carries the class of every field the piece holds. Hovering it, or
// f's legend item, fades every cell and legend item, then restores f's cells, legend item, glow
// (`.chip-f`, the pill behind the legend item) and ribbons. Fade-all-then-restore makes a piece holding
// two fields keep both: per-field "fade the others" rules would fade each other's cells.
// Pieces add outlines on top (linkRules). Every lit state sets transition-delay 0 so it appears
// at once; base styles delay the return, so crossing a gap never flashes the image.
const LIT_NOW = "transition-delay:0s";
// A lit legend chip: faint enough that the white label keeps full contrast on every field
// colour, with a firmer border that draws the pill.
const CHIP = "fill-opacity:.16;stroke-opacity:.75";
const FIELD_HOVER = `svg:has(.hit:hover,.lg:hover) .cell{opacity:.3;${LIT_NOW}}svg:has(.hit:hover,.lg:hover) .lg{opacity:.45;${LIT_NOW}}
${LEGEND.map(([f]) => {
  const either = `svg:has(.lg-${f}:hover,.${f}.hit:hover)`;
  const ribbon =
    f === "pad" ? "" : `${either} .ghost.${f}{fill-opacity:.22;stroke-opacity:.7;${LIT_NOW}}`;
  return `${either} .cell.${f}{opacity:1}${either} .lg.lg-${f}{opacity:1}${either} .chip-${f}{${CHIP};${LIT_NOW}}${ribbon}`;
}).join("\n")}`;
// Slow auto-highlight: each field's ribbons and legend glow brighten in turn, so the static
// README <img> (which never receives the mouse) still shows how the fields travel between rows.
// The pointer anywhere on the image stops it (STILL): the reader is looking, and a hover focus
// must be the only one lit.
const AUTO_FIELDS = ["time", "version", "variant", "payload", "masked"] as const;
// Each field gets a 4 s turn of the 20 s cycle: ~2 s ease-in, a short hold, then a ~2.5 s
// ease-out that overlaps the next field's rise, so the light hands over instead of blinking.
const AUTO_STEP_S = 4;
// The legend glow follows the same clock as its ribbons, so the reader can name the moving colour.
const AUTO_HIGHLIGHT = `@keyframes glow{0%,30%,100%{fill-opacity:.035;stroke-opacity:.1}10%,18%{fill-opacity:.14;stroke-opacity:.42}}
@keyframes chiplit{0%,30%,100%{fill-opacity:0;stroke-opacity:0}10%,18%{${CHIP}}}
${AUTO_FIELDS.map((f, i) => {
  const timing = `${AUTO_FIELDS.length * AUTO_STEP_S}s ease-in-out ${i * AUTO_STEP_S}s infinite both`;
  return `.ghost.${f}{animation:glow ${timing}}.chip-${f}{animation:chiplit ${timing}}`;
}).join("")}`;
// Avalanche motion: one constant 6 s loop, never paused by hover, because nothing hovers there and
// a reader must see it move without waiting. On that clock: the input bit flips; dashes stream
// down the wires all the time and surge as the bit flips; the changed bytes and After characters
// turn over in shuffled order, hold, then turn back the same way. The drawing marks moving parts
// with `av` classes (see the avalanche block). Each part's --r is a fixed shuffled position in
// [0, 1) (spread), so the order looks random yet every build emits the same SVG.
// Static styles are the finished state (bit flipped, bytes white, After slug shown), which
// reduced-motion users see. Every loop starts 3 s in, inside its hold: a snapshot at time 0
// (thumbnail, preview, print) must show the change that the text below states.
const DIM = "#24344D",
  LIT = "#F5F7FC",
  DARK = "#08111F";
const AV_S = 6;
const AV_START = `-${AV_S / 2}s`;
// Shuffled parts start up to 20% of the loop apart, so the turnover reads as a spreading wave.
const AV_SPREAD = `calc(var(--r) * ${AV_S * 0.2}s - ${AV_S / 2}s)`;
const AVALANCHE = `@keyframes avin{0%,6%{fill:${DIM}}10%,76%{fill:${LIT}}80%,100%{fill:${DIM}}}
@keyframes avint{0%,6%{fill:${LIT}}10%,76%{fill:${DARK}}80%,100%{fill:${LIT}}}
@keyframes avo{0%,14%{fill:${DIM}}20%,76%{fill:${LIT}}82%,100%{fill:${DIM}}}
@keyframes avc{0%,16%{fill-opacity:0}22%,76%{fill-opacity:1}82%,100%{fill-opacity:0}}
@keyframes avb{0%,16%{fill-opacity:1}22%,76%{fill-opacity:0}82%,100%{fill-opacity:1}}
@keyframes avflow{to{stroke-dashoffset:-20}}
@keyframes avsurge{0%,6%{opacity:.4}12%{opacity:1}26%,100%{opacity:.4}}
.av.in{animation:avin ${AV_S}s ease-in-out ${AV_START} infinite both}
.av.int{animation:avint ${AV_S}s ease-in-out ${AV_START} infinite both}
.av.o{animation:avo ${AV_S}s ease-in-out infinite both;animation-delay:${AV_SPREAD}}
.av.c{animation:avc ${AV_S}s ease-in-out infinite both;animation-delay:${AV_SPREAD}}
.av.b{animation:avb ${AV_S}s ease-in-out infinite both;animation-delay:${AV_SPREAD}}
.av.cm{animation:avflow linear infinite,avsurge ${AV_S}s ease-in-out infinite both;animation-duration:calc(.8s + var(--r) * 1.4s),${AV_S}s;animation-delay:0s,${AV_START}}`;
// Dash patterns for the wires, one per wire in turn. Each period divides avflow's 20-unit shift
// (wires use pathLength 100), so every wire loops without a jump; mixed patterns and speeds keep
// the streams from marching in step.
const WIRE_DASHES = ["2 8", "4 6", "1 4 3 2", "6 14", "3 7", "1 9", "5 5", "2 3 1 4"];
// Fixed shuffle of 0..n-1 scaled to [0, 1): 37 is prime and divides none of the part counts.
const spread = (i: number, n: number) => ((i * 37 + 11) % n) / n;
// The pointer on the image stops the field cycle. `none`, not `paused`: an animated value beats
// the hover rules, so a paused cycle would keep its field lit beside the hover focus.
// The avalanche keeps running: no hover state touches it.
// "On the image" means over the drawing (the background rect takes the pointer for this), not
// `svg:hover`: opened as its own document, the root <svg> is hovered anywhere in the browser
// tab, so the cycle would stop for good.
const STILL = `svg:has(.bg:hover,.hit:hover,.lg:hover) :is(.ghost,.chip){animation:none}@media (prefers-reduced-motion:reduce){:is(.ghost,.chip,.av){animation:none}}`;
// Highlights wait this long before fading, so a pointer crossing a gap or moving to the next piece
// never drops them for a frame. Lit states override it with LIT_NOW.
const UNLIT_AFTER = ".12s";
// Only hit areas (`.hit`) and legend items (`.lg`) take the pointer: any other shape drawn later
// (a hyphen bar, a byte box) would sit on top of a hit area and open a dead zone.
const STYLE = `
.bg{fill:#0B1423;pointer-events:all}.ink{fill:#F5F7FC}.muted{fill:#C6D0E1}.box{fill:#15243A}.same{fill:#24344D}.chg{fill:#F5F7FC}
.pkg{fill:#F5F7FC;fill-opacity:.6}.win{fill:#A78BFA;fill-opacity:.42}.accent{fill:#7ED8B3}.key{fill:#8797AE}.rule{stroke:#34465F;fill:none}
.time{color:#00C8FF}.version{color:#FF49CD}.variant{color:#4D50FF}.payload{color:#FFE83F}
.masked{color:#FF921C}.pad{color:#8C9DB6}.f{fill:currentColor}.fg{fill:#08111F}.fw{fill:#FFFFFF}
.sans{font-family:${SANS}}.mono{font-family:${MONO};font-variant-ligatures:none}
.ghost{fill:currentColor;fill-opacity:.035;stroke:currentColor;stroke-opacity:.1;stroke-width:1;transition:fill-opacity .2s ease ${UNLIT_AFTER},stroke-opacity .2s ease ${UNLIT_AFTER}}.lead{color:#C6D0E1}
text,rect,path{pointer-events:none}.hl{fill:none;stroke:#F5F7FC;stroke-width:2.5;opacity:0;transition:opacity .12s ease ${UNLIT_AFTER}}
.hit{fill:none;pointer-events:all}.lg{transition:opacity .2s ease ${UNLIT_AFTER}}.lghit{fill:none;pointer-events:all}.cell{transition:opacity .2s ease ${UNLIT_AFTER}}
.chip{fill:currentColor;stroke:currentColor;stroke-width:1.2;fill-opacity:0;stroke-opacity:0;transition:fill-opacity .2s ease ${UNLIT_AFTER},stroke-opacity .2s ease ${UNLIT_AFTER}}
.x,.av.b{fill-opacity:0}.av.cm{opacity:0}
${FIELD_HOVER}
${AUTO_HIGHLIGHT}
${AVALANCHE}
${STILL}`;
const esc = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
const r1 = (n: number) => Math.round(n * 10) / 10;
// Real widths of sans text, measured in Chromium at build time. Used where a shape must fit text
// exactly (legend chips); the text then gets this width through `textLength`, so viewers with
// another system font keep the same width and only letter spacing adjusts.
const measureSans = async (strings: string[], size: number, weight: number) => {
  const browser = await browserEngines.chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(
      `<svg xmlns="http://www.w3.org/2000/svg">${strings.map((s, i) => `<text id="m${i}" font-family='${SANS}' font-size="${size}" font-weight="${weight}">${esc(s)}</text>`).join("")}</svg>`,
    );
    return await page.evaluate(
      (n) =>
        Array.from({ length: n }, (_, i) =>
          (document.getElementById(`m${i}`) as unknown as SVGTextElement).getComputedTextLength(),
        ),
      strings.length,
    );
  } finally {
    await browser.close();
  }
};
// Elsewhere system fonts differ, so widths are estimates; layouts keep slack instead of measuring.
const textWidth = (s: string, size: number, bold = false) => s.length * size * (bold ? 0.58 : 0.52);
// Typography for every rendered string. SVG collapses runs of ASCII spaces, so wider gaps use
// Unicode spaces it keeps:
// - an en space each side of "·" separates facts more clearly than a word space;
// - a no-break space plus a space after a sentence end gives the double sentence gap, and keeps
//   the period with its sentence when wrapping;
// - a no-break space binds a number to its unit, so "22 chars" never splits across lines.
const typo = (s: string) =>
  s
    .replaceAll(" · ", () => "\u2002·\u2002")
    .replace(/([.?!]) (?=[A-Z0-9])/g, (_, p: string) => `${p}\u00A0 `)
    .replace(
      /(\d) (?=(?:chars?|characters|bits?|bytes?|years|time)\b)/g,
      (_, d: string) => `${d}\u00A0`,
    );
// `firstW` narrows the first line when something (a highlighted claim) already starts it.
// A line that must wrap breaks after its last full sentence when that sentence fills at least
// half the line: a new sentence then starts at the left edge, where the eye finds it.
const wrap = (raw: string, maxW: number, size: number, firstW = maxW): string[] => {
  const lines: string[] = [];
  let words: string[] = [];
  for (const word of typo(raw).split(" ")) {
    const limit = lines.length ? maxW : firstW;
    if (words.length && textWidth([...words, word].join(" "), size) > limit) {
      const end = words.map((w) => w.endsWith("\u00A0")).lastIndexOf(true);
      const head = words.slice(0, end + 1).join(" ");
      if (end >= 0 && end < words.length - 1 && textWidth(head, size) >= limit / 2) {
        lines.push(head);
        words = words.slice(end + 1);
      } else {
        lines.push(words.join(" "));
        words = [];
      }
    }
    words.push(word);
  }
  if (words.length) lines.push(words.join(" "));
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
    `<text x="${r1(x)}" y="${r1(y)}" class="${o.cls ?? "ink"} ${o.mono ? "mono" : "sans"}" font-size="${size}"${weight}${anchor}>${esc(o.mono ? s : typo(s))}</text>`,
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

// Hover linking for the raw view (GitHub's README <img> is static). Each character or byte
// records its bit range; hovering it reveals the outline of every linked piece holding any of
// those bits. Bit numbers mean different things in two spaces, so links never cross them:
// "uuid" bits are the UUID's own, "masked" bits are the 132 masked bits that both masked
// spellings carry. Masking scrambles positions, so no masked bit maps to a UUID bit.
interface Link {
  id: string;
  space: "uuid" | "masked";
  start: number;
  bits: number;
}
const links: Link[] = [];
const linked = (
  id: string,
  space: Link["space"],
  start: number,
  bits: number,
  x: number,
  y: number,
  w: number,
  h: number,
) => {
  links.push({ id, space, start, bits });
  out.push(`<g id="g${id}">`);
  return () =>
    out.push(
      `<rect id="o${id}" class="hl" x="${r1(x)}" y="${r1(y - 2)}" width="${r1(w)}" height="${r1(h + 4)}" rx="2"/></g>`,
    );
};
const linkRules = () =>
  links
    .map((a) => {
      const hits = links.filter(
        (b) => a.space === b.space && a.start < b.start + b.bits && b.start < a.start + a.bits,
      );
      return `svg:has(#g${a.id}:hover) :is(${hits.map((b) => `#o${b.id}`).join(",")}){opacity:1;${LIT_NOW}}`;
    })
    .join("\n");

// A piece's invisible hover area. It reaches halfway to each neighbour (so half of a hyphen or
// gap belongs to each side) and GAP/2 above and below (so the UUID text and byte rows meet):
// moving the pointer along or between rows never crosses a dead zone that would drop the
// highlight. It carries every field the piece holds, which is what field hover keys on.
const pieceHit = (x0: number, x1: number, y: number, h: number, fields: Field[]) =>
  rect(x0, y - GAP / 2, x1 - x0, h + GAP, `hit ${fields.join(" ")}`);
const fieldsOf = (field: (b: number) => Field, start: number, bits: number) => [
  ...new Set(Array.from({ length: bits }, (_, i) => field(start + i))),
];
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
  const pieces = cells.filter((c) => c.bits);
  let index = 0;
  for (const c of cells) {
    if (!c.bits) {
      rect(c.x + 2, y + h / 2 - 1.5, c.w - 4, 3, "muted");
      continue;
    }
    const k = pieces.indexOf(c),
      prev = pieces[k - 1],
      next = pieces[k + 1];
    const close = linkKey
      ? linked(
          `${linkKey}${index++}`,
          f.masked ? "masked" : "uuid",
          c.start,
          c.bits,
          c.x,
          y,
          c.w,
          h,
        )
      : undefined;
    drawGlyph(f, c, y, h, size, baseline);
    pieceHit(
      prev ? (prev.x + prev.w + c.x) / 2 : c.x,
      next ? (c.x + c.w + next.x) / 2 : c.x + c.w,
      y,
      h,
      fieldsOf(f.field, c.start, c.bits),
    );
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
const ribbons = (
  upper: Cell[],
  yTop: number,
  lower: Cell[],
  yBottom: number,
  segments = SEGMENTS,
) => {
  const ym = r1((yTop + yBottom) / 2);
  return segments.map(([a, b, f]) => {
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
  if (!LAYOUT.has("rules")) panels.push([y, cls]);
  else path(`M${M} ${y}H${W - M}`, "rule", 1.2);
  text(M, y + 28, label, FS.head, { cls, weight: 700 });
  if (right) text(W - M, y + 28, right, FS.head - 1, { cls: "muted", anchor: "end" });
  y += 44;
};
const head = (name: string, facts: string, masked = false) => {
  text(M, y + 22, name, FS.name, { cls: masked ? "masked f" : "ink", weight: 600 });
  text(FACTS_X, y + 22, facts, FS.small, { cls: "muted" });
  y += 36;
};
// Lines under a specimen start this far right of its left edge, where the ribbons draw a line.
const INDENT = 16;
const wins = [...new Set(Object.values(FORMS).flatMap((f: Form) => (f.win ? [f.win] : [])))];
const WIN_W = new Map((await measureSans(wins, FS.meta, 700)).map((w, i) => [wins[i]!, w]));
// Under each specimen: Sort and Case first (the facts a reader compares across forms), then what
// the form is for in lighter ink, then the details. A prefix such as "Text" takes its own column
// so the lines after it align.
const meta = (f: Form, prefix?: string) => {
  if (!LAYOUT.has("jobfirst")) {
    const x0 = M + INDENT,
      x = x0 + (prefix ? 64 : 0);
    if (prefix) text(x0, y + 18, prefix, FS.meta, { cls: "accent", weight: 700 });
    text(x, y + 18, "Sort", FS.meta - 1, { cls: "key" });
    text(x + 42, y + 18, f.sort, FS.meta, { weight: 600 });
    text(CASE_X + INDENT, y + 18, "Case", FS.meta - 1, { cls: "key" });
    text(CASE_X + INDENT + 46, y + 18, f.caseRule, FS.meta, { weight: 600 });
    y += LINE;
    text(x, y + 18, f.job, FS.meta, { weight: 400 });
    y += LINE;
    // Lines may run up to the side column (SIDE_X), keeping a gap before it.
    let lead = 0;
    if (f.win) {
      // Highlighter band over the lower part of the text, measured so it fits the claim exactly;
      // `textLength` holds that width in viewers with another system font.
      const w = WIN_W.get(f.win)!;
      rect(x - 5, y + 18 - 13, w + 10, 18, "win", ` rx="4"`);
      out.push(
        `<text x="${x}" y="${y + 18}" class="ink sans" font-size="${FS.meta}" font-weight="700" textLength="${r1(w)}" lengthAdjust="spacing">${esc(f.win)}</text>`,
      );
      lead = w + 14;
    }
    wrap(f.detail, SIDE_X - 24 - x, FS.meta, SIDE_X - 24 - x - lead).forEach((l, i) => {
      text(x + (i ? 0 : lead), y + 18, l, FS.meta, { cls: "muted" });
      y += LINE;
    });
    return;
  }
  // Earlier layout, kept for comparison: what the form is for first, on the M edge.
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
  // Each item is a group: its chip (hidden until lit), a square swatch and its label, laid out
  // from measured widths (measureSans) so the chip fits the label exactly in every font. Its
  // hover area (`.lghit`) spans the chip plus half the gap on each side, so the pointer never
  // falls between two items.
  const BASE = 117,
    CHIP_TOP = BASE - 17,
    CHIP_H = 24,
    PAD_L = 7,
    SWATCH = 11,
    SWATCH_GAP = 6,
    PAD_R = 9,
    ITEM_GAP = 4;
  const [urlSafeW, ...labelW] = await measureSans(
    [COPY.urlSafe, ...LEGEND.map(([, label]) => label)],
    FS.small,
    500,
  );
  let x = M;
  LEGEND.forEach(([f, label], i) => {
    const w = labelW[i]!,
      chipW = PAD_L + SWATCH + SWATCH_GAP + w + PAD_R,
      left = i ? x - ITEM_GAP / 2 : x,
      right = i < LEGEND.length - 1 ? x + chipW + ITEM_GAP / 2 : x + chipW;
    out.push(`<g class="lg lg-${f} ${f}">`);
    rect(x, CHIP_TOP, chipW, CHIP_H, `chip chip-${f}`, ` rx="${CHIP_H / 2}"`);
    // Centred on the label's x-height band, about 5.5 px above the baseline at 16 px.
    const sy = BASE - 5.5 - SWATCH / 2;
    rect(x + PAD_L, sy, SWATCH, SWATCH, `${f} f`, ` rx="2"`);
    if (f === "pad") rect(x + PAD_L, sy, SWATCH, SWATCH, "", ` fill="url(#hatch)" rx="2"`);
    out.push(
      `<text x="${r1(x + PAD_L + SWATCH + SWATCH_GAP)}" y="${BASE}" class="ink sans" font-size="${FS.small}" font-weight="500" textLength="${r1(w)}" lengthAdjust="spacing">${esc(label)}</text>`,
    );
    rect(left, CHIP_TOP - 4, right - left, CHIP_H + 8, "lghit");
    out.push("</g>");
    x += chipW + ITEM_GAP;
  });
  // The legend and the URL-safe note share one line; fail the build rather than overlap them.
  if (x > W - M - urlSafeW! - 16)
    throw new Error(`legend (${r1(x)} px) runs into the URL-safe note; shorten a label`);
  text(W - M, BASE, COPY.urlSafe, FS.small, { cls: "muted", anchor: "end" });
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
  const close = linked(`b${i}`, "uuid", i * 8, 8, a.x, y, w, BYTES_H);
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
  const before = digitCells[i * 2 - 1],
    after = digitCells[i * 2 + 2];
  pieceHit(
    before ? (before.x + before.w + a.x) / 2 : a.x,
    after ? (a.x + w + after.x) / 2 : a.x + w,
    y,
    BYTES_H,
    fieldsOf(plainField, i * 8, 8),
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
  if (!LAYOUT.has("nocall")) {
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
  }
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
    pieceHit(bx, bx + bs * 0.78 + 1.5, top + 10, bs, [field]);
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
const maskedRows: { cells: Cell[]; top: number }[] = [];
for (const id of ["m64", "m32"] as const) {
  const f = FORMS[id];
  head(f.name, f.facts, true);
  const cells = cellsOf(f, M, CW);
  maskedRows.push({ cells, top: y });
  drawSpecimen(f, cells, y, CELL_H, MONO_SIZE, id === "m64" ? "m" : "n");
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
      rect(bx + i * (bs + 2), ry, bs, bs, changed ? "chg av in" : "same", ` rx="2"`);
      text(bx + i * (bs + 2) + bs / 2, ry + bs * 0.72, b, FS.small, {
        cls: changed ? "fg av int" : "ink",
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
    og = (SIDE_W - 16 * ow) / 15,
    oh = 22;
  for (let i = 0; i < 16; i++) {
    const ox = x0 + i * (ow + og) + ow / 2,
      wire = `M${r1(mid)} ${ay + boxH}C${r1(mid)} ${ay + boxH + 30} ${r1(ox)} ${outY - 26} ${r1(ox)} ${outY - 2}`;
    path(wire, "masked", 1.6);
    // Dash stream over the wire; invisible at rest (reduced motion). Its own pattern and speed
    // (--r) keep the 16 streams out of step.
    const r = ` style="--r:${spread(i, 16)}"`;
    out.push(
      `<path d="${wire}" class="av cm" fill="none" stroke="#FFD9A8" stroke-width="2.4" pathLength="100" stroke-dasharray="${WIRE_DASHES[i % WIRE_DASHES.length]}"${r}/>`,
    );
    const changed = CHANGED_BYTES[i];
    rect(
      x0 + i * (ow + og),
      outY,
      ow,
      oh,
      changed ? "chg av o" : "same",
      ` rx="2"${changed ? r : ""}`,
    );
  }
  let ty = outY + 48;
  text(x0, ty, `${CHANGED_BYTES.filter(Boolean).length} of 16 masked bytes change`, FS.meta, {
    weight: 700,
  });
  text(x0, ty + 22, `${BLOCK_FLIPS} of 128 bits flip (this example)`, FS.small - 1, {
    cls: "muted",
  });
  text(x0, ty + 46, "Similar UUIDs, unrelated slugs", FS.small, { weight: 600 });
  if (LAYOUT.has("nocall")) ty += 60;
  else {
    text(x0, ty + 76, "Before", FS.small, { cls: "muted" });
    text(bx, ty + 76, M64, 15, { cls: "masked f", mono: true });
    text(x0, ty + 98, "After", FS.small, { cls: "muted" });
    // The After slug is a stack of same-position lines, one tspan per character; monospace keeps
    // every line's characters aligned. Layers: the After slug itself (changed characters `.c`) and
    // the Before characters (`.b`, only changed positions visible), which is invisible at rest.
    const layer = (s: string, cls: string, onlyChanged: boolean) =>
      out.push(
        `<text x="${r1(bx)}" y="${r1(ty + 98)}" class="masked f mono" font-size="15">${s
          .split("")
          .map((ch, i) => {
            if (M64_AFTER[i] !== M64[i])
              return `<tspan class="av ${cls}" style="--r:${spread(i, 22)}">${esc(ch)}</tspan>`;
            return onlyChanged
              ? `<tspan class="x">${esc(ch)}</tspan>`
              : `<tspan>${esc(ch)}</tspan>`;
          })
          .join("")}</text>`,
      );
    layer(M64_AFTER, "c", false);
    layer(M64, "b", true);
    text(x0, ty + 120, `${CHAR_FLIPS} of 22 characters differ`, FS.small - 1, { cls: "muted" });
    ty += 134;
  }
  y = Math.max(y, ty);
}

const footY = y;
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

// Ribbons go behind everything: UUID text → bytes → base64url → base32hex, then masked base64url →
// masked base32hex.
const panelRects = panels.map(([top, cls], i) => {
  const bottom = (panels[i + 1]?.[0] ?? footY) - 8;
  const fill = cls.includes("masked") ? "#17140F" : "#0F1B2D";
  return `<rect x="${M - 14}" y="${top + 2}" width="${W - 2 * M + 28}" height="${bottom - top}" rx="10" fill="${fill}"/>`;
});
const background = [
  ...panelRects,
  ...ribbons(uuidCells, textTop + CELL_H, digitCells, bytesTop),
  ...ribbons(digitCells, bytesTop + BYTES_H, plainRows.p64.cells, plainRows.p64.top),
  ...ribbons(
    plainRows.p64.cells,
    plainRows.p64.top + CELL_H,
    plainRows.p32.cells,
    plainRows.p32.top,
  ),
  ...ribbons(
    maskedRows[0]!.cells,
    maskedRows[0]!.top + CELL_H,
    maskedRows[1]!.cells,
    maskedRows[1]!.top,
    [[0, 132, "masked"]],
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
// Prove the hover and motion rulings in a real browser on every build.
const broken = await checkDiagramHover(OUT.pathname);
if (broken.length)
  throw new Error(
    `Diagram breaks maintainer rulings (see this file's header):\n${broken.join("\n")}`,
  );
