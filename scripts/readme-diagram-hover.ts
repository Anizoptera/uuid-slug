// Checks the README diagram's hover and motion rulings (header of scripts/readme-diagram.ts) with a
// real mouse in Chromium. The generator runs it after every build, so an edit that breaks a ruling
// fails at the moment it is made. Hover is pure CSS and only a real pointer triggers `:hover`;
// reading the CSS text cannot prove it fires.
//
// Each check names the ruling it protects. When one fails, restore the behaviour; if the
// maintainer dropped that ruling, delete the check together with the ruling text.
import { browserEngines } from "./browser-engines.ts";

// [selector, CSS property, expected computed value]
type Probe = [string, string, string];
const CHECKS: { ruling: string; point: string; probes: Probe[] }[] = [
  {
    ruling: "a legend item lights itself and its field everywhere and fades every other field",
    point: ".lg-time",
    probes: [
      [".lg-time", "stroke-opacity", "0.45"],
      [".ghost.time", "fill-opacity", "0.22"],
      [".payload.cell", "opacity", "0.3"],
      [".lg-payload", "fill-opacity", "0.45"],
    ],
  },
  {
    ruling:
      "a character outlines the same bits in other rows, brightens its field's ribbons and lights its legend item",
    point: "#gu0 .cell",
    probes: [
      [".lg-time", "stroke-opacity", "0.45"],
      [".ghost.time", "fill-opacity", "0.22"],
      ["#ob0", "opacity", "1"],
      ["#op0", "opacity", "1"],
      // Pieces do not fade other fields; only legend items do.
      [".payload.cell", "opacity", "1"],
    ],
  },
  {
    ruling: "a byte's field bar lights its field's ribbons and legend item",
    point: "#gb15 .payload.cell",
    probes: [
      [".lg-payload", "stroke-opacity", "0.45"],
      [".ghost.payload", "fill-opacity", "0.22"],
    ],
  },
  {
    ruling: "the Masked legend item lights masked rows and their ribbon",
    point: ".lg-masked",
    probes: [
      [".lg-masked", "stroke-opacity", "0.45"],
      [".ghost.masked", "fill-opacity", "0.22"],
      [".time.cell", "opacity", "0.3"],
      [".masked.cell", "opacity", "1"],
    ],
  },
  {
    ruling:
      "a masked character outlines its bits in the other masked row only, and lights Masked and its ribbon",
    point: "#gm0 .cell",
    probes: [
      [".lg-masked", "stroke-opacity", "0.45"],
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
// Longer than the 0.15 s hover transitions, so computed values have settled.
const SETTLE_MS = 400;

/** Returns one line per broken ruling; empty when every ruling holds. */
export const checkDiagramHover = async (svgPath: string): Promise<string[]> => {
  const browser = await browserEngines.chromium.launch();
  const failures: string[] = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 1800 } });
    await page.goto(`file://${svgPath}`);
    const away = () => page.mouse.move(0, 1799);
    const animations = () => page.evaluate(() => document.getAnimations().length);
    if ((await animations()) === 0)
      failures.push("idle motion: no animation runs while nothing is hovered");
    for (const { ruling, point, probes } of CHECKS) {
      const at = await page.evaluate((s) => {
        const r = document.querySelector(s)?.getBoundingClientRect();
        // The right end of a legend item is its label, the part the swatch-only bug missed.
        return r && { x: r.right - Math.min(10, r.width / 3), y: r.top + r.height / 2 };
      }, point);
      if (!at) {
        failures.push(`${ruling}: hover target ${point} is missing`);
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
        if (got !== want)
          failures.push(`${ruling}: hovering ${point} gives ${sel} ${prop} ${got}, want ${want}`);
      }
      await away();
      await page.waitForTimeout(SETTLE_MS);
    }
    await page.mouse.move(500, 300);
    if ((await animations()) !== 0)
      failures.push("idle motion stops while the pointer is on the image: animations still run");
  } finally {
    await browser.close();
  }
  return failures;
};
