import { expect, test } from "bun:test";
import { annotateRustApi, rustDeprecations } from "../rust-deprecations";
import type { Rustdoc } from "../rust-deprecations";

const item = (name: string | null, deprecated = false, inner = {}) => ({
  name,
  deprecation: deprecated ? {} : null,
  inner,
});

test("Rust API annotations stay attached to their declarations", () => {
  const source = "pub fn uuid_slug::old()\npub fn uuid_slug::current()";
  expect(annotateRustApi(source, new Set(["function uuid_slug::old"]))).toBe(
    "#[deprecated] pub fn uuid_slug::old()\npub fn uuid_slug::current()",
  );
});

test("Rust API annotations distinguish declarations that share a path", () => {
  const source = "pub type uuid_slug::Same = u8\npub fn uuid_slug::Same()";
  expect(annotateRustApi(source, new Set(["type uuid_slug::Same"]))).toBe(
    "#[deprecated] pub type uuid_slug::Same = u8\npub fn uuid_slug::Same()",
  );
});

test("Rust API annotations normalize generic owners", () => {
  const source = "pub fn uuid_slug::Migration<Result<T, E>>::decode(&self)";
  expect(annotateRustApi(source, new Set(["function uuid_slug::Migration::decode"]))).toBe(
    "#[deprecated] pub fn uuid_slug::Migration<Result<T, E>>::decode(&self)",
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
      "4": item("decode", true, { function: {} }),
      "5": item("Error", false, { enum: { variants: [6], impls: [] } }),
      "6": item("Legacy", true),
      "7": item("Decode", false, { trait: { items: [8] } }),
      "8": item("decode", true, { function: {} }),
      "9": item("old", true, { function: {} }),
    },
  };
  expect(new Set(rustDeprecations(rustdoc))).toEqual(
    new Set([
      "value uuid_slug::Codec::seed",
      "function uuid_slug::Codec::decode",
      "value uuid_slug::Error::Legacy",
      "function uuid_slug::Decode::decode",
      "function uuid_slug::old",
    ]),
  );
});
