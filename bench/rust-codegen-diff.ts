// Compare the machine code (x86_64 Linux by default, `--target <triple>` for another) of every
// `uuid_slug` function in the codec bench between default features and default + one opt-in
// feature (default `uuid-simd`).
//
// Why this exists: on some CPUs (AMD Zen 4/5) identical code moves up to about ±20% between two
// builds, so timing cannot show that a feature leaves an unrelated path unchanged. Identical
// instructions can. Two builds with one codegen unit are compared by default: with rustc's default
// 16 units, adding any code reshuffles partitioning and inlining in unrelated functions, which
// would report differences no feature-specific code causes (pass `--codegen-units 16` to see them).
//
// It compares rustc's assembly (`--emit=asm`), the last fully symbolic form of the code: every
// callee, constant and jump table is a name, and constants are defined as text beside the code.
// Linked binaries and object files were rejected: addresses, section offsets and relocation
// addends (REL targets such as i686 store them inside instructions and data) encode placement, so
// erasing it needs per-architecture rules that either miss placement or erase real differences.
// In assembly only names vary per build, and two renamings erase them without losing anything:
// crate hashes are stripped from global symbols, and local labels (`.L…`, `anon.…`) are renamed
// in first-use order. Renaming is one-to-one, so a changed constant, callee or branch still
// differs. A function's text includes the definitions of the local data it reaches (constant
// pools, jump tables, strings), so a changed constant counts as a change of the function using it.
// The run fails when either build yields no `uuid_slug` function: an empty map would otherwise
// compare "identical" and certify nothing. The link step runs the no-op `true`, so no cross linker
// is needed on any target.
//
// Output: one line per differing or one-sided function, then the identical count; `--show <name>`
// prints both normalised texts of matching differing functions. Needs LLVM's `llvm-cxxfilt` (PATH
// or Homebrew's llvm) to print Rust names.
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { rustToolchain } from "../scripts/rust-toolchain";

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : (args[index + 1] ?? fallback);
};
const feature = option("--feature", "uuid-simd");
const codegenUnits = option("--codegen-units", "1");
// `--no-default` compares the reduced builds (no `std`), where a feature can select other kernels.
const base = args.includes("--no-default") ? ["--no-default-features"] : [];
const target = option("--target", "x86_64-unknown-linux-gnu");
const show = option("--show", "");
const repo = join(import.meta.dir, "..");

async function output(argv: string[], env: Record<string, string | undefined>, stdin?: string) {
  const child = Bun.spawn(argv, {
    cwd: repo,
    env,
    stdin: stdin === undefined ? "ignore" : Buffer.from(stdin),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (code !== 0) throw new Error(`${argv.join(" ")} exited ${code}:\n${stderr.slice(-4000)}`);
  return stdout;
}

const demangler =
  Bun.which("llvm-cxxfilt") ??
  ["/opt/homebrew/opt/llvm/bin/llvm-cxxfilt", "/usr/local/opt/llvm/bin/llvm-cxxfilt"].find(
    (path) => Bun.file(path).size > 0,
  );
if (!demangler)
  throw new Error("llvm-cxxfilt not found: install LLVM (brew install llvm, apt install llvm).");

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
// disambiguators, LLVM's `(.llvm.<N>)` local-copy suffix). Editing the mangled form instead is wrong: v0 back-references are byte
// offsets into the mangled string, so dropping a variable-length hash corrupts every later part.
const mangled = (name: string) => /^_{1,2}(?:R|ZN)/.test(name);
const unhash = (name: string) =>
  name.replace(/::h[0-9a-f]{16}\b|\[[0-9a-f]+\]| \(\.llvm\.\d+\)/g, () => "");

const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-codegen-diff-"));
try {
  const toolchain = await rustToolchain(repo);

  const functions = async (features: string[], build: string) => {
    const root = join(scratch, build);
    const flags =
      process.env.CARGO_ENCODED_RUSTFLAGS?.split("\x1f") ??
      process.env.RUSTFLAGS?.split(/\s+/) ??
      [];
    const env = {
      ...toolchain.env,
      // Own build directories, so both builds never share artifacts and every `.s` found belongs
      // to this build. `--emit=asm` in RUSTFLAGS reaches the library too; `cargo rustc` arguments
      // reach only the bench crate.
      CARGO_TARGET_DIR: join(root, "target"),
      CARGO_BUILD_BUILD_DIR: join(root, "build"),
      CARGO_ENCODED_RUSTFLAGS: [...flags.filter(Boolean), "--emit=asm,link"].join("\x1f"),
      CARGO_PROFILE_BENCH_CODEGEN_UNITS: codegenUnits,
    };
    await output(
      [
        toolchain.cargo,
        ...toolchain.cargoArgs,
        "rustc",
        "--manifest-path",
        "rust/Cargo.toml",
        "-p",
        "uuid-slug",
        "--bench",
        "codec",
        "--profile",
        "bench",
        "--locked",
        "--target",
        target,
        "--quiet",
        ...features,
        "--",
        "-C",
        "linker=true",
      ],
      env,
    );
    const files = (await readdir(root, { recursive: true }))
      .filter((path) => /^(?:uuid_slug|codec)-[0-9a-f]+(?:\..+)?\.s$/.test(basename(path)))
      .map((path) => join(root, path));

    const parsed = await Promise.all(
      files.map(async (file) => {
        const lines = (await Bun.file(file).text()).split("\n");
        // LLVM ends every Mach-O assembly file with this directive and never writes it for ELF.
        const macho = lines.includes(".subsections_via_symbols");
        // Pass 1: function bodies and data definitions. On ELF and Mach-O every function sits
        // between unwind directives (`.cfi_startproc` … `.cfi_endproc`) and is named by the last
        // global label before them; any other label starts a data definition, which runs to the
        // next label or to a directive that starts another item.
        const types = new Set<string>();
        const bodies = new Map<string, string[]>();
        const data = new Map<string, string[]>();
        let owner: string | undefined;
        let body: string[] | undefined;
        let block: string[] | undefined;
        for (const line of lines) {
          const type = /^\t\.type\t([^,]+),@function$/.exec(line)?.[1];
          if (type) types.add(type);
          if (body) {
            if (line === "\t.cfi_endproc") body = undefined;
            else body.push(line);
            continue;
          }
          const label = /^([^\s:#]+):/.exec(line)?.[1];
          // LLVM merges identical functions into `name = target` (Mach-O: `.set name, target`,
          // a directive it also uses for local temporaries); the target is that function's code.
          const [, aliased = "", original = ""] =
            /^(\S+) = (\S+)$/.exec(line) ?? /^\t\.set\t(\S+), (\S+)$/.exec(line) ?? [];
          if (aliased && !local(aliased, macho)) {
            bodies.set(aliased, [`= ${original}`]);
            block = undefined;
          } else if (line === "\t.cfi_startproc" && owner) {
            data.delete(owner);
            bodies.set(owner, (body = []));
            block = undefined;
          } else if (label) {
            if (!local(label, macho)) owner = label;
            data.set(label, (block = data.get(label) ?? block ?? []));
          } else if (
            /^\t\.(?:section|text|data|type|size|globl|private_extern|hidden|weak)\b/.test(line)
          )
            block = undefined;
          else block?.push(line);
        }
        // ELF names each function in `.type`, independently of the brackets: a function the
        // brackets missed would otherwise drop out of both builds silently.
        const missed = [...types].filter((name) => !bodies.has(name));
        if (missed.length > 0)
          throw new Error(`${file}: functions without unwind brackets: ${missed.join(", ")}`);
        // The crate whose file defines a function tells apart instances that demangle alike
        // (the same generic instantiated in both crates).
        return {
          crate: basename(file).split("-")[0] ?? "",
          macho,
          bodies,
          data,
          symbols: new Set(lines.join("\n").match(token)?.filter(mangled)),
        };
      }),
    );
    const symbols = [...new Set(parsed.flatMap((file) => [...file.symbols]))];
    // `-n` keeps leading underscores; Mach-O's extra `_` before the Rust prefix is dropped here.
    const unprefixed = symbols.map((symbol) => symbol.replace(/^__/, () => "_"));
    const rust = (await output([demangler, "-n"], process.env, unprefixed.join("\n"))).split("\n");
    const names = new Map(symbols.map((symbol, index) => [symbol, unhash(rust[index] ?? symbol)]));
    const global = (symbol: string) => names.get(symbol) ?? symbol;

    const shared = new Map(
      parsed.flatMap((file) => [...file.data].filter(([name]) => anonymous(name))),
    );
    const map = new Map<string, string[]>();
    for (const { crate, macho, bodies, data: own } of parsed) {
      // Local labels resolve in their own file; anonymous constants anywhere in the build.
      const data = { get: (symbol: string) => own.get(symbol) ?? shared.get(symbol) };
      // Pass 2: per function, rename its local labels in first-use order and append the
      // definitions of local data it reaches, so the text has no per-build name left in it.
      for (const [name, lines] of bodies) {
        const labels = new Map<string, string>();
        const reached: string[] = [];
        const rename = (line: string) =>
          line.replace(token, (symbol) => {
            if (!local(symbol, macho)) return global(symbol);
            let renamed = labels.get(symbol);
            if (!renamed) {
              labels.set(symbol, (renamed = `.L${labels.size}`));
              if (data.get(symbol)) reached.push(symbol);
            }
            return renamed;
          });
        const text = lines.map(rename);
        for (let index = 0; index < reached.length; index++) {
          const symbol = reached[index] ?? "";
          text.push(`${labels.get(symbol)}:`, ...(data.get(symbol) ?? []).map(rename));
        }
        const rustName = global(name);
        if (!rustName.includes("uuid_slug") || rustName.includes("uuid_simd")) continue;
        // Copies that demangle alike (generic instances whose hashes were removed) compare as a
        // set, sorted below, so neither file order nor codegen-unit partitioning pairs them.
        const key = `${rustName} (in ${crate})`;
        map.set(key, [...(map.get(key) ?? []), text.join("\n")]);
      }
    }
    if (map.size === 0)
      throw new Error(
        `No uuid_slug functions in ${files.length} assembly files: wrong build or emit path.`,
      );
    return new Map(
      [...map].map(([key, texts]) => {
        // eslint-disable-next-line unicorn/no-array-sort -- Private list; ES2022 has no toSorted.
        texts.sort();
        return [key, texts.join("\n\n")];
      }),
    );
  };

  // Separate build directories let both builds run at once; both settle before cleanup removes
  // their directories, so a failing build never leaves the other writing into deleted scratch.
  const [first, second] = await Promise.allSettled([
    functions(base, "base"),
    functions([...base, "--features", feature], "feature"),
  ]);
  if (first.status === "rejected") throw first.reason;
  if (second.status === "rejected") throw second.reason;
  const [baseline, candidate] = [first.value, second.value];
  let identical = 0;
  for (const [name, text] of baseline) {
    const other = candidate.get(name);
    if (other === undefined) console.log(`only default: ${name}`);
    else if (other !== text) {
      console.log(`differs: ${name}`);
      // The normalised texts, so a reader can check a difference against the source change.
      if (show && name.includes(show))
        console.log(`--- default\n${text}\n--- ${feature}\n${other}\n---`);
    } else identical++;
  }
  for (const name of candidate.keys())
    if (!baseline.has(name)) console.log(`only ${feature}: ${name}`);
  console.log(
    `${identical} identical uuid_slug functions (${baseline.size} base, ${candidate.size} ${feature}; codegen units ${codegenUnits}, ${target})`,
  );
} finally {
  await rm(scratch, { recursive: true, force: true });
}
