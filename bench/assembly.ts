// Normalise rustc assembly so two builds of the same code compare equal and any code change still
// differs. Pure functions over assembly text, kept apart from the build driver in
// rust-codegen-diff.ts so __test__/assembly.bun.test.ts can falsify them without compiling.
import { basename } from "node:path";

// Assembly is a flat token language, so a lexer pattern is enough: symbols are runs of these
// characters; registers (`%eax`), immediates (`$4`) and relocation operators (`:lo12:`, `@GOTOFF`)
// stay outside a token or are not symbols.
const token = /[A-Za-z_.$][\w.$]*/g;
// rustc's anonymous constants (`anon.<hash>.<n>`, Mach-O `_anon.…`/`l_anon.…`): with several
// codegen units LLVM promotes them to globals defined in another unit's file, so they are
// resolved through a definition map shared by the whole build, never compared by name.
const anonymous = (name: string) => /^(?:_|l_)?anon\./.test(name);
// Names renamed in first-use order: assembler-local labels (ELF `.L…`; Mach-O `L…`/`l…`, which no
// global can start with because Mach-O prefixes every global with `_`) and anonymous constants.
const local = (name: string, macho: boolean) =>
  anonymous(name) || (macho ? /^[Ll]/.test(name) : name.startsWith(".L"));
// Global symbols are compared demangled with hashes removed (legacy `::h<hex>`, v0 `[hex]`
// disambiguators, LLVM's `(.llvm.<N>)` local-copy suffix). Editing the mangled form instead is
// wrong: v0 back-references are byte offsets into the mangled string, so dropping a
// variable-length hash corrupts every later part.
const mangled = (name: string) => /^_{1,2}(?:R|ZN)/.test(name);
export const unhash = (name: string) =>
  name.replace(/::h[0-9a-f]{16}\b|\[[0-9a-f]+\]| \(\.llvm\.\d+\)/g, () => "");

export function parseAssembly(file: string, source: string) {
  const lines = source.split("\n");
  // LLVM ends every Mach-O assembly file with this directive and never writes it for ELF.
  const macho = lines.includes(".subsections_via_symbols");
  // Pass 1: function bodies and data definitions. A function is named by the last global
  // label and sits between unwind directives on ELF and Mach-O (`.cfi_startproc` …
  // `.cfi_endproc`) or, in WebAssembly, which has none, between its `.functype` signature
  // (kept: a changed signature is a change) and `end_function`. Any other label starts a data
  // definition, which runs to the next label or to a directive that starts another item.
  const types = new Set<string>();
  const labelled = new Set<string>();
  const bodies = new Map<string, string[]>();
  const data = new Map<string, string[]>();
  let owner: string | undefined;
  let body: string[] | undefined;
  let block: string[] | undefined;
  for (const line of lines) {
    const type = /^\t\.type\t([^,]+),@function$/.exec(line)?.[1];
    if (type) types.add(type);
    const label = /^([^\s:#]+):/.exec(line)?.[1];
    if (label) labelled.add(label);
    if (body) {
      if (line === "\t.cfi_endproc" || line === "\tend_function") body = undefined;
      else body.push(line);
      continue;
    }
    // LLVM merges identical functions into `name = target` (Mach-O: `.set name, target`,
    // a directive it also uses for local temporaries); the target is that function's code.
    const [, aliased = "", original = ""] =
      /^(\S+) = (\S+)$/.exec(line) ?? /^\t\.set\t(\S+), (\S+)$/.exec(line) ?? [];
    if (aliased && !local(aliased, macho)) {
      bodies.set(aliased, [`= ${original}`]);
      block = undefined;
    } else if (
      owner &&
      (line === "\t.cfi_startproc" || line.startsWith(`\t.functype\t${owner} `))
    ) {
      data.delete(owner);
      bodies.set(owner, (body = line.startsWith("\t.functype") ? [line] : []));
      block = undefined;
    } else if (label) {
      if (!local(label, macho)) owner = label;
      data.set(label, (block = data.get(label) ?? block ?? []));
    } else if (/^\t\.(?:section|text|data|type|size|globl|private_extern|hidden|weak)\b/.test(line))
      block = undefined;
    else block?.push(line);
  }
  // `.type` (ELF and WebAssembly) names each function independently of the brackets; with a
  // label it is defined here (without one it is an import). A defined function the brackets
  // missed would otherwise drop out of both builds silently.
  const missed = [...types].filter((name) => labelled.has(name) && !bodies.has(name));
  if (missed.length > 0)
    throw new Error(
      `${file}: defined functions without a recognised start/end bracket (extend pass 1): ${missed.join(", ")}`,
    );
  // The crate whose file defines a function tells apart instances that demangle alike
  // (the same generic instantiated in both crates).
  return {
    crate: basename(file).split("-")[0] ?? "",
    macho,
    labelled,
    bodies,
    data,
    symbols: new Set(source.match(token)?.filter(mangled)),
  };
}

// Pass 2 over all parsed files of one build. `global` maps each mangled symbol to its comparable
// name (demangled, hashes removed); demangling needs an external tool, so the caller supplies it.
export function functionTexts(
  parsed: ReturnType<typeof parseAssembly>[],
  global: (symbol: string) => string,
) {
  const shared = new Map(
    parsed.flatMap((file) => [...file.data].filter(([name]) => anonymous(name))),
  );
  const map = new Map<string, string[]>();
  for (const { crate, macho, labelled, bodies, data } of parsed) {
    // Local labels resolve in their own file; anonymous constants anywhere in the build.
    const definition = (symbol: string) => data.get(symbol) ?? shared.get(symbol);
    // Per `uuid_slug` function, rename its local labels in first-use order and append
    // the definitions of local data it reaches, so the text has no per-build name left in it.
    for (const [name, lines] of bodies) {
      const rustName = global(name);
      if (!rustName.includes("uuid_slug") || rustName.includes("uuid_simd")) continue;
      const labels = new Map<string, string>();
      const reached: string[] = [];
      const rename = (line: string) =>
        line.replace(token, (symbol) => {
          // Only a defined label is one: Mach-O's `L`/`l` prefix also starts instructions
          // (`ldr`, `lsl`), and renaming those in first-use order would equate code that differs
          // only in which instruction it uses.
          if (!anonymous(symbol) && !(labelled.has(symbol) && local(symbol, macho)))
            return global(symbol);
          let renamed = labels.get(symbol);
          if (!renamed) {
            labels.set(symbol, (renamed = `.L${labels.size}`));
            if (definition(symbol)) reached.push(symbol);
          }
          return renamed;
        });
      const text = lines.map(rename);
      for (let index = 0; index < reached.length; index++) {
        const symbol = reached[index] ?? "";
        text.push(`${labels.get(symbol)}:`, ...(definition(symbol) ?? []).map(rename));
      }
      // Copies that demangle alike (generic instances whose hashes were removed) compare as a
      // set, sorted below, so neither file order nor codegen-unit partitioning pairs them.
      const key = `${rustName} (in ${crate})`;
      map.set(key, [...(map.get(key) ?? []), text.join("\n")]);
    }
  }
  if (map.size === 0)
    throw new Error(
      `No uuid_slug functions in ${parsed.length} assembly files: wrong build or emit path.`,
    );
  return new Map(
    [...map].map(([key, texts]) => {
      // eslint-disable-next-line unicorn/no-array-sort -- Private list; ES2022 has no toSorted.
      texts.sort();
      return [key, texts.join("\n\n")];
    }),
  );
}
