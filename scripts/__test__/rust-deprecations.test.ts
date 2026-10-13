import { expect, test } from "bun:test";
import { annotateRustApi } from "../rust-deprecations";

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
