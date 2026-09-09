import { expect, test } from "bun:test";
import { apiDiff, minimumRelease, satisfiesMinimum, sizeDelta } from "./release-report";

test("release API diff exposes removals and additions without restating unchanged lines", () => {
  expect(
    apiDiff("export declare function old(): void;\nshared", "shared\nexport type New = 1;\n"),
  ).toBe("- `export declare function old(): void;`\n- `export type New = 1;` (added)");
  expect(apiDiff("same\n", "same\n")).toBe("No packaged TypeScript declaration changes.");
});

test("stable version distance must satisfy the derived release level", () => {
  expect(satisfiesMinimum("0.3.0", "0.4.0", "minor")).toBe(true);
  expect(satisfiesMinimum("1.3.0", "1.3.1", "minor")).toBe(false);
  expect(satisfiesMinimum("1.3.0", "2.0.0", "major")).toBe(true);
  expect(satisfiesMinimum("2.0.0-beta.1", "2.0.0", "major")).toBe(true);
  expect(satisfiesMinimum("1.3.0", "2.0.0-beta.1", "prerelease")).toBe(true);
});

test("release size deltas never invent a percentage for zero or missing denominators", () => {
  expect(sizeDelta(12, 0)).toBe("12 B (+12 B)");
  expect(sizeDelta(12, undefined)).toBe("unavailable");
  expect(sizeDelta(12, 8)).toBe("12 B (+4 B, +50.0%)");
});

test("the strongest structural or maintainer-classified change sets the minimum release", () => {
  expect(minimumRelease("0.4.0", "### Breaking changes\n", ["patch"])).toBe("minor");
  expect(minimumRelease("1.4.0", "### Fixed\n", ["major", "minor"])).toBe("major");
  expect(minimumRelease("1.4.1", "### Added\n", ["patch"])).toBe("minor");
  expect(minimumRelease("1.4.1", "### Fixed\n", ["patch"])).toBe("patch");
  expect(minimumRelease("2.0.0-beta.2", "### Breaking changes\n", ["major"])).toBe("prerelease");
});
