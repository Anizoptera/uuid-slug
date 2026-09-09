import { describe, expect, test } from "bun:test";
import { selectReleaseComparisons } from "./release-history";

describe("release comparison selection", () => {
  test.each([
    ["v0.4.1", ["v0.2.0", "v0.3.0", "v0.4.0"], { immediate: "v0.4.0", releaseLine: "v0.3.0" }],
    ["v0.4.0", ["v0.2.0", "v0.3.0", "v0.4.0"], { immediate: "v0.3.0", releaseLine: "v0.2.0" }],
    ["v2.0.0", ["v0.9.0", "v1.8.0", "v2.0.0"], { immediate: "v1.8.0", releaseLine: "v0.9.0" }],
    ["v1.2.0", ["v0.8.0", "v1.0.0", "v1.1.0"], { immediate: "v1.1.0", releaseLine: "v0.8.0" }],
    ["v0.1.0", [], {}],
    ["v0.2.0", ["v0.1.0"], { immediate: "v0.1.0" }],
    ["v0.4.0", ["v0.3.2", "v0.3.1", "v0.2.9"], { immediate: "v0.3.2", releaseLine: "v0.2.9" }],
    ["v2.0.0", ["v1.8.0", "v1.7.0", "v0.9.0"], { immediate: "v1.8.0", releaseLine: "v0.9.0" }],
    ["v0.4.0", ["v0.3.2", "v0.3.1"], { immediate: "v0.3.2" }],
  ] as const)("selects distinct history for %s", (candidate, tags, expected) => {
    expect(selectReleaseComparisons(candidate, tags)).toEqual(expected);
  });

  test("orders prereleases and excludes the candidate during retries", () => {
    expect(
      selectReleaseComparisons("v1.0.0-rc.2", [
        "v0.9.0",
        "v1.0.0-beta.2",
        "v1.0.0-rc.1",
        "v1.0.0-rc.2",
      ]),
    ).toEqual({ immediate: "v1.0.0-rc.1", releaseLine: "v0.9.0" });
  });

  test("accepts SemVer build metadata without treating it as precedence", () => {
    expect(selectReleaseComparisons("v1.1.0+build.7", ["v1.0.0+build.2"])).toEqual({
      immediate: "v1.0.0+build.2",
    });
  });

  test("keeps release lines distinct beyond JavaScript's safe integer range", () => {
    expect(
      selectReleaseComparisons("v9007199254740993.2.0", [
        "v9007199254740992.9.0",
        "v9007199254740993.1.0",
      ]),
    ).toEqual({
      immediate: "v9007199254740993.1.0",
      releaseLine: "v9007199254740992.9.0",
    });
  });

  test.each(["v1", "v1.0", "v01.0.0", "v1.0.0.0", "v1.0.0-01", "v1.0.0+"])(
    "rejects malformed release tag %s",
    (tag) => {
      expect(() => selectReleaseComparisons(tag, [])).toThrow("strict SemVer");
    },
  );

  test("rejects two spellings of one semantic version", () => {
    expect(() => selectReleaseComparisons("v2.0.0", ["v1.0.0+one", "v1.0.0+two"])).toThrow(
      "duplicate",
    );
  });
});
