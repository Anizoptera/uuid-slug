// Checks the README diagram's hover and motion rulings (header of scripts/readme-diagram.ts) with a
// real mouse in Chromium. The generator runs it after every build, so an edit that breaks a ruling
// fails at the moment it is made. Hover is pure CSS and only a real pointer triggers `:hover`;
// reading the CSS text cannot prove it fires.
//
// Each check names the ruling it protects. When one fails, restore the behaviour; if the
// maintainer dropped that ruling, delete the check together with the ruling text.
import { browserEngines } from "./browser-engines.ts";

// [selector, CSS property, expected computed value]; ">x" means a number above x, for values that
// are tuned per field (glow strength), so the check asserts "lit" rather than one tuning.
type Probe = [string, string, string];
// Where to put the pointer: the centre of an element, or just inside its right edge, which for
// a hit area is the gap or half-hyphen it covers and for a legend item is the half gap after it.
type Point = { sel: string; edge?: boolean };
const CHECKS: { ruling: string; point: Point; probes: Probe[] }[] = [
  {
    ruling: "a legend item lights itself and its field everywhere and fades every other field",
    point: { sel: ".lg-time" },
    probes: [
      [".chip-time", "fill-opacity", ">0.05"],
      [".lg-time", "opacity", "1"],
      [".lg-payload", "opacity", "0.45"],
      [".ghost.time", "fill-opacity", "0.22"],
      [".time.cell", "opacity", "1"],
      [".payload.cell", "opacity", "0.3"],
    ],
  },
  {
    ruling: "a piece focuses like a legend item and outlines the same bits in other rows",
    point: { sel: "#gu0 .hit" },
    probes: [
      [".chip-time", "fill-opacity", ">0.05"],
      [".ghost.time", "fill-opacity", "0.22"],
      [".payload.cell", "opacity", "0.3"],
      ["#ob0", "opacity", "1"],
      ["#op0", "opacity", "1"],
    ],
  },
  {
    ruling: "a piece holding two fields lights only the smaller one",
    // Byte 6 holds 4 version bits and 4 payload bits.
    point: { sel: "#gb6 .hit" },
    probes: [
      [".chip-version", "fill-opacity", ">0.05"],
      [".chip-payload", "fill-opacity", "0"],
      [".version.cell", "opacity", "1"],
      [".payload.cell", "opacity", "0.3"],
      [".time.cell", "opacity", "0.3"],
    ],
  },
  {
    ruling: "no dead zones: the gap between two characters belongs to a piece",
    point: { sel: "#gu0 .hit", edge: true },
    probes: [["#ou0", "opacity", "1"]],
  },
  {
    ruling: "no dead zones: half of a hyphen belongs to the character before it",
    // UUID character 7 is the last digit before the first hyphen.
    point: { sel: "#gu7 .hit", edge: true },
    probes: [
      ["#ou7", "opacity", "1"],
      [".chip-time", "fill-opacity", ">0.05"],
    ],
  },
  {
    ruling: "no dead zones: the gap after a legend item still hovers it",
    point: { sel: ".lg-time", edge: true },
    probes: [[".chip-time", "fill-opacity", ">0.05"]],
  },
  {
    ruling: "the Masked legend item lights masked rows and their ribbon",
    point: { sel: ".lg-masked" },
    probes: [
      [".chip-masked", "fill-opacity", ">0.05"],
      [".ghost.masked", "fill-opacity", "0.22"],
      [".time.cell", "opacity", "0.3"],
      [".masked.cell", "opacity", "1"],
    ],
  },
  {
    ruling:
      "a masked character outlines its bits in the other masked row only, and lights Masked and its ribbon",
    point: { sel: "#gm0 .hit" },
    probes: [
      [".chip-masked", "fill-opacity", ">0.05"],
      [".ghost.masked", "fill-opacity", "0.22"],
      // Masked bits 0–5 lie in base32hex characters 0 (bits 0–4) and 1 (bits 5–9).
      ["#on0", "opacity", "1"],
      ["#on1", "opacity", "1"],
      ["#on2", "opacity", "0"],
      // Masked bits never map to UUID bits.
      ["#ou0", "opacity", "0"],
    ],
  },
];
// Longer than the hover transitions and their un-highlight delay, so values have settled.
const SETTLE_MS = 500;

/** Returns one line per broken ruling; empty when every ruling holds. */
export const checkDiagramHover = async (svgPath: string): Promise<string[]> => {
  const browser = await browserEngines.chromium.launch();
  const failures: string[] = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 1800 } });
    await page.goto(`file://${svgPath}`);
    const running = (sel: string) =>
      page.evaluate(
        (s) =>
          document.getAnimations().filter((a) => (a.effect as KeyframeEffect).target?.matches(s))
            .length,
        sel,
      );
    const { rest, blank } = await page.evaluate(() => {
      const r = document.querySelector("svg")!.getBoundingClientRect();
      // Off the image, below it; and on the image but on no piece (bottom-right corner).
      return {
        rest: { x: r.left + 4, y: r.bottom + 40 },
        blank: { x: r.right - 4, y: r.bottom - 4 },
      };
    });
    await page.mouse.move(rest.x, rest.y);
    if ((await running(".ghost")) === 0)
      failures.push("idle motion: the field cycle must run while the pointer is off the image");
    if ((await running(".av")) === 0) failures.push("avalanche motion: it must run constantly");
    await page.mouse.move(blank.x, blank.y);
    await page.waitForTimeout(SETTLE_MS);
    if ((await running(".ghost")) !== 0)
      failures.push(
        "idle motion: the field cycle must stop while the pointer is anywhere on the image",
      );
    if ((await running(".av")) === 0)
      failures.push("avalanche motion: it must keep moving while the pointer is on the image");
    for (const { ruling, point, probes } of CHECKS) {
      const at = await page.evaluate(({ sel, edge }) => {
        const r = document.querySelector(sel)?.getBoundingClientRect();
        if (!r) return undefined;
        const x = edge ? r.right - 1 : r.right - Math.min(10, r.width / 3);
        return { x, y: r.top + r.height / 2 };
      }, point);
      if (!at) {
        failures.push(`${ruling}: hover target ${point.sel} is missing`);
        continue;
      }
      await page.mouse.move(at.x, at.y);
      await page.waitForTimeout(SETTLE_MS);
      for (const [sel, prop, want] of probes) {
        const got = await page.evaluate(
          ([s, p]) => {
            const el = document.querySelector(s!);
            return el ? getComputedStyle(el).getPropertyValue(p!).trim() : "missing";
          },
          [sel, prop],
        );
        const ok = want.startsWith(">") ? Number(got) > Number(want.slice(1)) : got === want;
        if (!ok)
          failures.push(
            `${ruling}: hovering ${point.sel} gives ${sel} ${prop} ${got}, want ${want}`,
          );
      }
      if (point.sel.includes(".hit")) {
        if ((await running(".ghost")) !== 0)
          failures.push(`${ruling}: the field cycle must stop while a piece is hovered`);
        if ((await running(".av")) === 0)
          failures.push(`${ruling}: the avalanche must keep moving while a piece is hovered`);
      }
      await page.mouse.move(rest.x, rest.y);
      await page.waitForTimeout(SETTLE_MS);
    }
  } finally {
    await browser.close();
  }
  return failures;
};
