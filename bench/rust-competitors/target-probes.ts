// SPDX-License-Identifier: Apache-2.0

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

interface Probe {
  readonly name: string;
  readonly dependency: string;
  readonly wasmDependency?: string;
  readonly source: string;
  readonly wasmSource?: string;
}

const probes: readonly Probe[] = [
  {
    name: "package",
    dependency: `uuid-slug = { path = "${join(import.meta.dir, "../../rust/uuid-slug")}" }`,
    wasmDependency: `uuid-slug = { path = "${join(import.meta.dir, "../../rust/uuid-slug")}", features = ["wasm-js"] }`,
    source: "let _ = uuid_slug::generate_uuid_v4();",
  },
  {
    name: "uuid",
    dependency: 'uuid = { version = "=1.26.1", features = ["v4", "v7"] }',
    wasmDependency: 'uuid = { version = "=1.26.1", features = ["v4", "v7", "js"] }',
    source: "let _ = uuid::Uuid::now_v7();",
  },
  {
    name: "uuid-lite",
    dependency: 'uuid-lite = "=1.10.8"',
    source: "let _ = uuid_lite::Uuid::new_v4();",
  },
  {
    name: "uuid-lite2",
    dependency: 'uuid-lite2 = "=1.10.1"',
    source: "let _ = uuid_lite2::Uuid::new_v4();",
  },
  {
    name: "uuid7",
    dependency: 'uuid7 = { version = "=1.8.0", features = ["uuid"] }',
    source: "let _ = uuid7::new_v7();",
  },
  {
    name: "fast-uuid-v7",
    dependency: 'fast-uuid-v7 = "=0.1.9"',
    source: "let _ = fast_uuid_v7::gen_id_u128();",
  },
  {
    name: "hyperuuid",
    dependency: 'hyperuuid = "=0.3.0"',
    source: "let _ = hyperuuid::v7::now_v7();",
    wasmSource: "let _ = hyperuuid::v7::new_v7(1_700_000_000_000);",
  },
  { name: "uuidv7", dependency: 'uuidv7 = "=0.1.7"', source: "let _ = uuidv7::create_raw();" },
  {
    name: "leachuuid7",
    dependency: 'leachuuid7 = "=0.1.0"',
    source: "let _ = leachuuid7::Uuid7::new();",
  },
  {
    name: "nativelite-uid",
    dependency: 'nativelite-uid = "=0.1.0"',
    source: "let _ = uid::uuid7();",
  },
  {
    name: "nexus-id",
    dependency: 'nexus-id = "=1.1.5"',
    source: "let _ = nexus_id::UuidV4::from_entropy();",
  },
  {
    name: "rivid-core",
    dependency: 'rivid-core = "=1.1.0"',
    source: "let _ = rivid_core::uuidv7::generate_bytes16();",
  },
  {
    name: "id-forge",
    dependency: 'id-forge = "=1.0.0"',
    source: "let _ = id_forge::uuid::Uuid::v7();",
  },
  {
    name: "philiprehberger-id-gen",
    dependency: 'philiprehberger-id-gen = "=0.3.0"',
    source: "let _ = philiprehberger_id_gen::Uuid7::new();",
  },
  {
    name: "rok-ids",
    dependency: 'rok-ids = "=0.1.0"',
    wasmDependency: 'rok-ids = "=0.1.0"\nuuid = { version = "=1.26.1", features = ["js"] }',
    source: "let _ = rok_ids::UuidV7::generate();",
  },
  {
    name: "qubit-id",
    dependency: 'qubit-id = { version = "=0.6.0", default-features = false, features = ["uuid"] }',
    source: "let _ = qubit_id::uuid::UuidV4Generator::new();",
  },
  { name: "uuidv4", dependency: 'uuidv4 = "=1.0.0"', source: "let _ = uuidv4::uuid::v4();" },
  {
    name: "uniqer-rs",
    dependency: 'uniqer_rs = "=0.0.4"',
    wasmDependency: 'uniqer_rs = "=0.0.4"\nuuid = { version = "=1.26.1", features = ["js"] }',
    source: "let _ = uniqer_rs::Uniqer::new().uuidv7();",
  },
  {
    name: "uuid64rs",
    dependency: 'uuid64rs = "=0.0.14"',
    source: "use uuid64rs::Uuid as _; let _ = uuid64rs::Uuid4::new(None);",
  },
  {
    name: "uuid-extra",
    dependency: 'uuid-extra = "=0.0.2"',
    wasmDependency: 'uuid-extra = "=0.0.2"\nuuid = { version = "=1.26.1", features = ["js"] }',
    source: "let _ = uuid_extra::new_v7_b64url_nopad();",
  },
];

const root = await mkdtemp(join(tmpdir(), "uuid-slug-rust-targets-"));

async function run(
  command: readonly string[],
  cwd: string,
): Promise<{ readonly status: number; readonly stderr: string; readonly stdout: string }> {
  const child = Bun.spawn([...command], { cwd, stderr: "pipe", stdout: "pipe" });
  const [stdout, stderr, status] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { status, stderr, stdout };
}

function diagnosticText(stderr: string): string {
  const line = stderr
    .trim()
    .split("\n")
    .find((entry) => entry.includes("error"));
  return /error(?:\[E\d+\])?: (.+)$/.exec(line ?? "")?.[1] ?? "cargo check failed";
}

const rustc = await run(["rustc", "-vV"], import.meta.dir);
if (rustc.status !== 0) throw new Error(rustc.stderr);
const host = /^host: (.+)$/m.exec(rustc.stdout)?.[1];
if (host === undefined) throw new Error("rustc -vV did not report its host target");
const targets = [host, "wasm32-unknown-unknown"] as const;
const wasmEntropyBackends = [
  'getrandom02 = { package = "getrandom", version = "0.2", features = ["js"] }',
  'getrandom03 = { package = "getrandom", version = "0.3", features = ["wasm_js"] }',
  'getrandom04 = { package = "getrandom", version = "0.4", features = ["wasm_js"] }',
].join("\n");

try {
  const jobs = probes.flatMap((probe) => targets.map((target) => ({ probe, target })));
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, jobs.length) }, async () => {
      while (next < jobs.length) {
        const job = jobs[next++];
        if (job === undefined) break;
        const directory = join(root, `${job.probe.name}-${job.target}`);
        await Bun.write(
          join(directory, "Cargo.toml"),
          `[package]\nname = "target-probe"\nversion = "0.0.0"\nedition = "2024"\npublish = false\n\n[dependencies]\n${job.target === host ? job.probe.dependency : (job.probe.wasmDependency ?? job.probe.dependency)}\n${job.target === host ? "" : wasmEntropyBackends}\n\n[workspace]\n`,
        );
        const source =
          job.target === host ? job.probe.source : (job.probe.wasmSource ?? job.probe.source);
        await Bun.write(join(directory, "src/main.rs"), `fn main() { ${source} }\n`);
        const result = await run(
          ["cargo", "check", "--quiet", "--message-format=short", "--target", job.target],
          directory,
        );
        console.log(
          JSON.stringify({
            kind: "target",
            name: job.probe.name,
            target: job.target === host ? "native" : job.target,
            supported: result.status === 0,
            ...(result.status === 0 ? {} : { diagnostic: diagnosticText(result.stderr) }),
          }),
        );
      }
    }),
  );
  console.log(JSON.stringify({ complete: true, kind: "target-complete" }));
} finally {
  await rm(root, { recursive: true, force: true });
}
