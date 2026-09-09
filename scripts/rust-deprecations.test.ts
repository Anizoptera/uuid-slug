import { expect, test } from "bun:test";
import { annotateRustApi, rustDeprecations } from "./rust-deprecations";
import type { Rustdoc } from "./rust-deprecations";

const item = (name: string | null, deprecated = false, inner = {}) => ({
  name,
  deprecation: deprecated ? {} : null,
  inner,
});

test("Rust API annotations stay attached to their declarations", () => {
  const source = "pub fn uuid_slug::old()\npub fn uuid_slug::current()";
  expect(annotateRustApi(source, new Set(["uuid_slug::old"]))).toBe(
    "#[deprecated] pub fn uuid_slug::old()\npub fn uuid_slug::current()",
  );
});

test("deprecated members inherit the public path of their owner", () => {
  const rustdoc: Rustdoc = {
    paths: {
      "1": { crate_id: 0, path: ["uuid_slug", "Codec"] },
      "5": { crate_id: 0, path: ["uuid_slug", "Error"] },
      "7": { crate_id: 0, path: ["uuid_slug", "Decode"] },
      "9": { crate_id: 0, path: ["uuid_slug", "old"] },
    },
    index: {
      "1": item("Codec", false, { struct: { kind: { plain: { fields: [2] } }, impls: [3] } }),
      "2": item("seed", true),
      "3": item(null, false, { impl: { trait: null, items: [4] } }),
      "4": item("decode", true),
      "5": item("Error", false, { enum: { variants: [6], impls: [] } }),
      "6": item("Legacy", true),
      "7": item("Decode", false, { trait: { items: [8] } }),
      "8": item("decode", true),
      "9": item("old", true),
    },
  };
  expect(new Set(rustDeprecations(rustdoc))).toEqual(
    new Set([
      "uuid_slug::Codec::seed",
      "uuid_slug::Codec::decode",
      "uuid_slug::Error::Legacy",
      "uuid_slug::Decode::decode",
      "uuid_slug::old",
    ]),
  );
});
