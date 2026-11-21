// Compare the machine code (x86_64 Linux by default, `--target <triple>` for another) of every `uuid_slug` function in the codec bench binary between
// default features and default + one opt-in feature (default `uuid-simd`).
//
// Why this exists: on some CPUs (AMD Zen 4/5) identical code moves up to about ±20% between two
// builds, so timing cannot show that a feature leaves an unrelated path unchanged. Identical
// instructions can. Two builds with one codegen unit are compared by default: with rustc's default
// 16 units, adding any code reshuffles partitioning and inlining in unrelated functions, which
// would report differences no feature-specific code causes (pass `--codegen-units 16` to see them).
//
// Output: one line per differing or one-sided function, then the identical count. Only what
// linking moves is normalised away: absolute addresses, x86 RIP-relative displacements, aarch64
// `adrp` pages with their one `#lo12` use, symbol hashes and `.llvm.N` suffixes. Immediates and
// call/jump targets (by symbol name) stay, so a changed constant or callee reports a difference;
// a reference moved to different data does not, the price of ignoring data layout. The run
// fails when either build yields no `uuid_slug` function: an empty disassembly would otherwise
// compare "identical" and certify nothing.
//
// Needs `llvm-objdump` (PATH or Homebrew's llvm). Off x86_64 Linux it cross-links with
// `zig cc` (UUID_SLUG_ZIG overrides the path); any other target must be the host's own.
import { arch, platform } from "node:os";
import { mkdtemp, rm, writeFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

async function output(argv: string[], env: Record<string, string | undefined> = process.env) {
  const child = Bun.spawn(argv, { cwd: repo, env, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (code !== 0) {
    // `--message-format=json` sends compiler and linker errors to stdout; show their text too.
    const rendered = stdout
      .split("\n")
      .filter((line) => line.startsWith("{"))
      .map((line) => JSON.parse(line))
      .filter((entry) => entry.reason === "compiler-message")
      .map((entry) => entry.message.rendered)
      .join("");
    throw new Error(`${argv.join(" ")} exited ${code}:\n${(rendered + stderr).slice(-4000)}`);
  }
  return stdout;
}

const objdump =
  Bun.which("llvm-objdump") ??
  ["/opt/homebrew/opt/llvm/bin/llvm-objdump", "/usr/local/opt/llvm/bin/llvm-objdump"].find(
    (path) => Bun.file(path).size > 0,
  );
if (!objdump)
  throw new Error("llvm-objdump not found: install LLVM (brew install llvm, apt install llvm).");

// Link-time noise in a symbol: the per-build hash and LLVM's local-copy suffix.
const symbol = (name: string) =>
  name.replace(/ \(\.llvm\.\d+\)|\.llvm\.\d+/g, "").replace(/::h[0-9a-f]{16}/g, "");

const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-codegen-diff-"));
try {
  const toolchain = await rustToolchain(repo);
  const env: Record<string, string> = {
    ...toolchain.env,
    // Symbols are needed to name functions; stripping removes only the table, never moves code.
    CARGO_PROFILE_RELEASE_STRIP: "none",
    CARGO_PROFILE_BENCH_STRIP: "none",
    CARGO_PROFILE_RELEASE_CODEGEN_UNITS: codegenUnits,
    CARGO_PROFILE_BENCH_CODEGEN_UNITS: codegenUnits,
  };
  if (target === "x86_64-unknown-linux-gnu" && !(platform() === "linux" && arch() === "x64")) {
    const zig = process.env.UUID_SLUG_ZIG ?? Bun.which("zig");
    // An asdf shim is found on PATH yet fails here, because this repository pins no zig; the
    // link would then fail as an unexplained `cc` error deep in Cargo's output.
    const runs = zig && Bun.spawnSync([zig, "version"], { cwd: repo }).exitCode === 0;
    if (!runs)
      throw new Error(
        `Cross-linking for x86_64 Linux needs a zig that runs in this repository (${zig ?? "none found"} does not); set UUID_SLUG_ZIG to the zig binary itself, e.g. ~/.asdf/installs/zig/<version>/bin/zig.`,
      );
    const linker = join(scratch, "cc");
    await writeFile(linker, `#!/bin/sh\nexec "${zig}" cc -target x86_64-linux-gnu "$@"\n`);
    await chmod(linker, 0o755);
    env.CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_LINKER = linker;
  }

  const functions = async (features: string[]) => {
    const build = await output(
      [
        toolchain.cargo,
        ...toolchain.cargoArgs,
        "bench",
        "--manifest-path",
        "rust/Cargo.toml",
        "-p",
        "uuid-slug",
        "--bench",
        "codec",
        "--no-run",
        "--locked",
        "--target",
        target,
        "--message-format=json",
        ...features,
      ],
      env,
    );
    const executable = build
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line))
      .find(
        (entry) =>
          entry.reason === "compiler-artifact" &&
          entry.target?.name === "codec" &&
          entry.executable,
      )?.executable;
    if (!executable) throw new Error("Cargo reported no codec executable.");
    const disassembly = await output([
      objdump,
      "-d",
      "--no-show-raw-insn",
      "--demangle",
      executable,
    ]);
    const map = new Map<string, string>();
    let name: string | undefined;
    let body: string[] = [];
    let pages = new Set<string>();
    const flush = () => {
      if (!name?.includes("uuid_slug") || name.includes("uuid_simd")) return;
      let key = name;
      // Distinct monomorphizations can demangle to one name; keep each under its own key.
      for (let copy = 2; map.has(key); copy++) key = `${name} #${copy}`;
      // Alignment filler after a function's last instruction belongs to the layout, not the code.
      while (body.length > 0 && /^(?:nop\b|udf\s+#0x0$|int3$)/.test(body.at(-1)!)) body.pop();
      map.set(key, body.join("\n"));
    };
    for (const line of disassembly.split("\n")) {
      const header = /^[0-9a-f]+ <(.+)>:$/.exec(line);
      if (header) {
        flush();
        name = symbol(header[1]!);
        body = [];
        pages = new Set();
        continue;
      }
      const instruction = /^\s*[0-9a-f]+:\s+(.*)$/.exec(line);
      if (!instruction) continue;
      let text = instruction[1]!
        .replace(/\s+# (?:0x)?[0-9a-f]+ <[^>]*>$/, "")
        .replace(/-?0x[0-9a-f]+(?=\(%rip\))/g, () => "@")
        // The target annotation always ends the line, which takes nested names such as
        // `<<T as Display>::fmt+0x8c>` whole. An offset is code only inside this function (a
        // branch); elsewhere it locates data or a Mach-O stub by its nearest symbol, i.e. layout.
        .replace(/(?:0x)?[0-9a-f]+ <(.*)>$/, (_, annotation: string) => {
          const named = symbol(annotation);
          const owner = named.replace(/\+0x[0-9a-f]+$/, () => "");
          return `<${owner === name ? named : owner}>`;
        });
      // aarch64 addresses data as `adrp xN, page` plus one `#lo12` use of xN; both move with
      // layout (the page is labelled by whatever symbol precedes it), like x86 RIP offsets.
      const page = /^adrp\s+(\w+),/.exec(text);
      if (page) {
        pages.add(page[1]!);
        text = text.replace(/<.*>$/, () => "<page>");
      } else
        for (const register of pages) {
          const lo12 = new RegExp(`((?:\\b|\\[)${register}, #)0x[0-9a-f]+`);
          if (!lo12.test(text)) continue;
          text = text.replace(lo12, (_, prefix: string) => `${prefix}@`);
          pages.delete(register);
          break;
        }
      body.push(text);
    }
    flush();
    if (map.size === 0)
      throw new Error(`No uuid_slug functions in ${executable}: symbols missing or wrong binary.`);
    return map;
  };

  const baseline = await functions(base);
  const candidate = await functions([...base, "--features", feature]);
  let identical = 0;
  for (const [name, body] of baseline) {
    const other = candidate.get(name);
    if (other === undefined) console.log(`only default: ${name}`);
    else if (other !== body) {
      console.log(`differs: ${name}`);
      // The normalised bodies, so a reader can tell real change from layout this script missed.
      if (show && name.includes(show))
        console.log(`--- default\n${body}\n--- ${feature}\n${other}\n---`);
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
