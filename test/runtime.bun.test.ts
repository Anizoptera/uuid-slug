import { describe, expect, test } from "bun:test";
import { createUuidSlugCodec, isUuidV7String } from "../src/index";

describe("bun runtime", () => {
  test("imports the source condition and generates UUIDv7", () => {
    const codec = createUuidSlugCodec();
    expect(isUuidV7String(codec.uuidV7())).toBe(true);
    expect(codec.uuidV7Slug()).toHaveLength(22);
  });
});
