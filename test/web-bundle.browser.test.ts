import { expect, test } from "vitest";
import * as api from "@anizoptera/uuid-slug";
import { probeConsumer } from "./consumer-probe";

// Package self-reference exercises the browser export condition through Vite.
test("public calls work in a browser without Node globals", () => {
  expect(typeof process).toBe("undefined");
  probeConsumer(api);
});
