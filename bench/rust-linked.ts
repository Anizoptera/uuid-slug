// Isolate consumer reachability; broad bridge exports cannot answer what an application links.
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { Browser } from "playwright";
import { browserEngines } from "../scripts/browser-engines";
import { command } from "../scripts/command";
import { buildLinkedConsumer, maskingConsumer } from "../scripts/rust-linked";
import type { LinkedRustConsumer } from "../scripts/rust-linked";
import { rustToolchain } from "../scripts/rust-toolchain";
import { runLinkedWasm } from "./rust-linked-browser";

const crate = process.argv[2];
if (!crate)
  throw new Error("Usage: bun bench/rust-linked.ts <extracted-crate-directory> [consumer ...]");
const root = process.cwd();
const nm = Bun.which(process.env.LLVM_NM ?? "llvm-nm");
if (!nm) throw new Error("Set LLVM_NM to llvm-nm to inspect the linked native programs.");
const toolchain = await rustToolchain();
console.log(JSON.stringify({ compiler: (await command(toolchain.rustc, ["-vV"], root)).trim() }));

function consumer(body: string, generation = false): LinkedRustConsumer {
  return {
    source: `use std::hint::black_box;\nuse uuid_slug::*;\nfn main() { ${body} }\n`,
    defaultFeatures: generation,
    // Browser entropy needs explicit host integration; this does not add JS dependencies natively.
    features: generation ? ["wasm-js"] : [],
  };
}

const consumers: Record<string, LinkedRustConsumer> = {
  empty: { source: "fn main() {}\n" },
  v4: consumer(
    "let id = generate_uuid_v4().unwrap(); assert!(id.is_uuid_v4()); black_box(id);",
    true,
  ),
  v7: consumer(
    "let id = generate_uuid_v7().unwrap(); assert!(id.is_uuid_v7()); black_box(id);",
    true,
  ),
  parse: consumer(
    'black_box(Uuid::parse_uuid(black_box("01890f3e-93b8-7cc6-a76b-b2a67b746c2a")).unwrap());',
  ),
  format: consumer(
    'let id = Uuid::from_uuid_bytes_array(black_box([0; 16])); assert_eq!(id.to_string(), "00000000-0000-0000-0000-000000000000");',
  ),
  "encode-base64": consumer(
    'let id = Uuid::from_uuid_bytes_array(black_box([0; 16])); assert_eq!(id.to_plain_uuid_slug(UuidSlugAlphabet::Base64Url).as_str(), "AAAAAAAAAAAAAAAAAAAAAA");',
  ),
  "decode-base64": consumer(
    'assert_eq!(UuidSlugAlphabet::Base64Url.plain_slug_to_uuid_bytes(black_box("AAAAAAAAAAAAAAAAAAAAAA")).unwrap(), [0; 16]);',
  ),
  "encode-base32": consumer(
    'let id = Uuid::from_uuid_bytes_array(black_box([0; 16])); assert_eq!(id.to_plain_uuid_slug(UuidSlugAlphabet::Base32Hex).as_str(), "00000000000000000000000000");',
  ),
  "decode-base32": consumer(
    'assert_eq!(UuidSlugAlphabet::Base32Hex.plain_slug_to_uuid_bytes(black_box("00000000000000000000000000")).unwrap(), [0; 16]);',
  ),
  masking: maskingConsumer,
};

const selected = process.argv.slice(3);
for (const name of selected)
  if (!(name in consumers))
    throw new Error(`Unknown consumer ${name}: choose ${Object.keys(consumers).join(", ")}`);

const work = await mkdtemp(join(tmpdir(), "uuid-slug-consumers-"));
const browsers: { name: string; browser: Browser }[] = [];
try {
  for (const [name, engine] of Object.entries(browserEngines))
    browsers.push({ name, browser: await engine.launch({ headless: true }) });
  for (const thinLto of [false, true]) {
    for (const defaultFeatures of [false, true]) {
      for (const [name, source] of Object.entries(consumers)) {
        if (selected.length && !selected.includes(name)) continue;
        // Reuse dependency artifacts; each executable is inspected before the next source replaces it.
        const paths = await buildLinkedConsumer(
          root,
          resolve(crate),
          work,
          `${defaultFeatures}-${thinLto}`,
          {
            ...source,
            defaultFeatures,
            // getrandom needs a browser backend even when linking later discards every entropy call.
            features: defaultFeatures ? ["wasm-js"] : (source.features ?? []),
          },
          thinLto,
        );
        await command(paths.native, [], root);
        const symbols = await command(nm, ["--demangle", "--defined-only", paths.native], root);
        const wasm = await runLinkedWasm(paths.wasm, join(work, "browser"), browsers);
        console.log(
          JSON.stringify({
            name,
            thinLto,
            defaultFeatures,
            native: (await stat(paths.native)).size,
            nativeExecuted: true,
            ...wasm,
            symbols: symbols.split("\n").filter((line) => line.includes("uuid_slug::")),
          }),
        );
      }
    }
  }
} finally {
  try {
    await Promise.all(browsers.map(({ browser }) => browser.close()));
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}
