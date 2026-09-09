import { expect, test } from "bun:test";
import { apiDiff, sizeDelta } from "./release-report";

test("release API diff exposes removals and additions without restating unchanged lines", () => {
  expect(
    apiDiff("export declare function old(): void;\nshared", "shared\nexport type New = 1;\n"),
  ).toBe("- `export declare function old(): void;`\n- `export type New = 1;` (added)");
  expect(apiDiff("same\n", "same\n")).toBe("No packaged TypeScript declaration changes.");
});

test("release size deltas never invent a percentage for zero or missing denominators", () => {
  expect(sizeDelta(12, 0)).toBe("12 B (+12 B)");
  expect(sizeDelta(12, undefined)).toBe("unavailable");
  expect(sizeDelta(12, 8)).toBe("12 B (+4 B, +50.0%)");
});
