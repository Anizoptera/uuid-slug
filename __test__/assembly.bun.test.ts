// SPDX-License-Identifier: Apache-2.0

import { expect, test } from "bun:test";
import { functionTexts, parseAssembly } from "../bench/assembly";

// Each case is a defect the codegen diff had: a "identical" verdict that hid changed code, or a
// difference that only per-build names produced. Names stand in for demangled symbols.
const build = (...files: [name: string, source: string][]) =>
  functionTexts(
    files.map(([name, source]) => parseAssembly(name, source)),
    (symbol) => symbol,
  );
const elf = (name: string, body: string[], after: string[] = []) =>
  [
    `\t.type\t${name},@function`,
    `${name}:`,
    "\t.cfi_startproc",
    ...body,
    "\t.cfi_endproc",
    ...after,
  ].join("\n");
const macho = (name: string, body: string[]) =>
  [`${name}:`, "\t.cfi_startproc", ...body, "\t.cfi_endproc", ".subsections_via_symbols"].join(
    "\n",
  );

// `fn` is LLVM's per-module function number inside label names; `value` is the constant used.
const loop = (fn: number, value: number) =>
  elf(
    "uuid_slug_f",
    [`.LBB${fn}_1:`, `\tmovdqa\t.LCPI${fn}_0(%rip), %xmm0`, `\tjne\t.LBB${fn}_1`],
    [`.LCPI${fn}_0:`, `\t.quad\t${value}`],
  );
const load = (mnemonic: string) => macho("_uuid_slug_f", [`\t${mnemonic}\tx0, [x1]`, "\tret"]);
const anonUser = (hash: string) => elf("uuid_slug_f", [`\tleaq\tanon.${hash}.1(%rip), %rax`]);
const anonOwner = (hash: string, value: number) => `anon.${hash}.1:\n\t.quad\t${value}`;
const alias = (target: string) => `uuid_slug_g = ${target}`;

test("per-build label ordinals compare equal, a changed constant they reach does not", () => {
  expect(build(["uuid_slug-1.s", loop(3, 7)])).toEqual(build(["uuid_slug-1.s", loop(9, 7)]));
  expect(build(["uuid_slug-1.s", loop(3, 7)])).not.toEqual(build(["uuid_slug-1.s", loop(3, 8)]));
});

test("Mach-O instructions sharing the local-label prefix are never renamed", () => {
  expect(build(["uuid_slug-1.s", load("ldr")])).not.toEqual(build(["uuid_slug-1.s", load("ldp")]));
});

test("an anonymous constant promoted into another file resolves to its value", () => {
  const original = build(
    ["uuid_slug-1.s", anonUser("abc")],
    ["uuid_slug-2.s", anonOwner("abc", 1)],
  );
  expect(original).toEqual(
    build(["uuid_slug-1.s", anonUser("def")], ["uuid_slug-2.s", anonOwner("def", 1)]),
  );
  expect(original).not.toEqual(
    build(["uuid_slug-1.s", anonUser("abc")], ["uuid_slug-2.s", anonOwner("abc", 2)]),
  );
});

test("a merged function compares by its alias target", () => {
  const merged = build(["uuid_slug-1.s", alias("uuid_slug_f")]);
  expect(merged.get("uuid_slug_g (in uuid_slug)")).toBe("= uuid_slug_f");
  expect(merged).not.toEqual(build(["uuid_slug-1.s", alias("uuid_slug_h")]));
});

test("copies that demangle alike pair by content, not file order", () => {
  const a = elf("uuid_slug_f", ["\tnop"]);
  const b = elf("uuid_slug_f", ["\tret"]);
  expect(build(["uuid_slug-1.s", a], ["uuid_slug-2.s", b])).toEqual(
    build(["uuid_slug-1.s", b], ["uuid_slug-2.s", a]),
  );
});

test("a defined function outside every recognised bracket fails instead of dropping out", () => {
  const unbracketed = ["\t.type\tuuid_slug_f,@function", "uuid_slug_f:", "\tret"].join("\n");
  expect(() => parseAssembly("uuid_slug-1.s", unbracketed)).toThrow("uuid_slug_f");
});
