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
// global symbols are demangled and stripped of hashes, and local labels and anonymous constants
// are renamed in first-use order. Renaming is one-to-one, so a changed constant, callee or branch
// still differs. A function's text includes the definitions of the local data it reaches (constant
// pools, jump tables, strings), so a changed constant counts as a change of the function using it;
// a merged function compares as `= <target>`. ELF and Mach-O targets are read; on ELF every
// `.type` function must be found, so a parser gap fails instead of shrinking both sides.
// The run fails when either build yields no `uuid_slug` function: an empty map would otherwise
// compare "identical" and certify nothing. The link step runs the no-op `true`, so no cross linker
// is needed on any target.
//
// Output: one line per differing or one-sided function, then the identical count; `--show <name>`
// prints both normalised texts of matching differing functions. Needs LLVM's `llvm-cxxfilt` (PATH
// or Homebrew's llvm): names are demangled before their hashes are removed.
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { rustToolchain } from "../scripts/rust-toolchain";
import { functionTexts, parseAssembly, unhash } from "./assembly";
import { codecTargetRustflags } from "./codec-targets";

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
      CARGO_ENCODED_RUSTFLAGS: [
        ...flags.filter(Boolean),
        ...codecTargetRustflags(target),
        "--emit=asm,link",
      ].join("\x1f"),
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
      files.map(async (file) => parseAssembly(file, await Bun.file(file).text())),
    );
    const symbols = [...new Set(parsed.flatMap((file) => [...file.symbols]))];
    // `-n` keeps leading underscores; Mach-O's extra `_` before the Rust prefix is dropped here.
    const unprefixed = symbols.map((symbol) => symbol.replace(/^__/, () => "_"));
    const rust = (await output([demangler, "-n"], process.env, unprefixed.join("\n"))).split("\n");
    const names = new Map(symbols.map((symbol, index) => [symbol, unhash(rust[index] ?? symbol)]));
    const global = (symbol: string) => names.get(symbol) ?? symbol;

    return functionTexts(parsed, global);
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
