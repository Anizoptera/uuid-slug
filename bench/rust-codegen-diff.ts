// Compare the machine code (x86_64 Linux by default, `--target <triple>` for another) of every `uuid_slug` function in the codec bench binary between
// default features and default + one opt-in feature (default `uuid-simd`).
//
// Why this exists: on some CPUs (AMD Zen 4/5) identical code moves up to about ±20% between two
// builds, so timing cannot show that a feature leaves an unrelated path unchanged. Identical
// instructions can. Two builds with one codegen unit are compared by default: with rustc's default
// 16 units, adding any code reshuffles partitioning and inlining in unrelated functions, which
// would report differences no feature-specific code causes (pass `--codegen-units 16` to see them).
//
// Output: one line per differing or one-sided function, then the identical count. Addresses,
// symbol hashes, `.llvm.N` suffixes and RIP-relative offsets are normalised away first. The run
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
const target = option("--target", "x86_64-unknown-linux-gnu");
const repo = join(import.meta.dir, "..");

async function output(argv: string[], env: Record<string, string | undefined> = process.env) {
  const child = Bun.spawn(argv, { cwd: repo, env, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (code !== 0) throw new Error(`${argv.join(" ")} exited ${code}:\n${stderr.slice(-4000)}`);
  return stdout;
}

const objdump =
  Bun.which("llvm-objdump") ??
  ["/opt/homebrew/opt/llvm/bin/llvm-objdump", "/usr/local/opt/llvm/bin/llvm-objdump"].find(
    (path) => Bun.file(path).size > 0,
  );
if (!objdump)
  throw new Error("llvm-objdump not found: install LLVM (brew install llvm, apt install llvm).");

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
    if (!zig)
      throw new Error("Cross-linking for x86_64 Linux needs zig; set UUID_SLUG_ZIG to its binary.");
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
    const flush = () => {
      if (!name?.includes("uuid_slug") || name.includes("uuid_simd")) return;
      let key = name;
      // Distinct monomorphizations can demangle to one name; keep each under its own key.
      for (let copy = 2; map.has(key); copy++) key = `${name} #${copy}`;
      map.set(key, body.join("\n"));
    };
    for (const line of disassembly.split("\n")) {
      const header = /^[0-9a-f]+ <(.+)>:$/.exec(line);
      if (header) {
        flush();
        name = header[1]!.replace(/ \(\.llvm\.\d+\)$/, "").replace(/::h[0-9a-f]{16}$/, "");
        body = [];
        continue;
      }
      const instruction = /^\s*[0-9a-f]+:\s+(.*)$/.exec(line);
      if (instruction)
        body.push(instruction[1]!.replace(/-?0x[0-9a-f]+|<[^>]*>|\.llvm\.\d+/g, () => "@"));
    }
    flush();
    if (map.size === 0)
      throw new Error(`No uuid_slug functions in ${executable}: symbols missing or wrong binary.`);
    return map;
  };

  const base = await functions([]);
  const candidate = await functions(["--features", feature]);
  let identical = 0;
  for (const [name, body] of base) {
    const other = candidate.get(name);
    if (other === undefined) console.log(`only default: ${name}`);
    else if (other !== body) console.log(`differs: ${name}`);
    else identical++;
  }
  for (const name of candidate.keys()) if (!base.has(name)) console.log(`only ${feature}: ${name}`);
  console.log(
    `${identical} identical uuid_slug functions (${base.size} default, ${candidate.size} ${feature}; codegen units ${codegenUnits}, ${target})`,
  );
} finally {
  await rm(scratch, { recursive: true, force: true });
}
