import { expect, test } from "bun:test";
import { compare } from "./rust-conform";

test("parity failures identify the capability, both outcomes, input, and required repair", () => {
  expect(() => compare([{ op: "parse", input: "invalid" }], [{ value: [] }])).toThrow(
    'Parity failure in parse.\nTypeScript: {"error":"invalid_uuid"}\nRust: {"value":[]}\nInput: {"op":"parse","input":"invalid"}\nRequired fix: make both implementations satisfy the shared consumer contract.',
  );
});
