import { expect, test } from "bun:test";
import {
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import {
  archiveReportBundles,
  archiveAndRemoveGeneratedFiles,
  compactReports,
  deduplicateCapturedPackage,
} from "../archive-scratch";
import { command } from "../command";

const project = resolve(import.meta.dir, "../..");

test("loose bundles remain byte-recoverable without losing measurements or earlier index entries", async () => {
  const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-cleanup-"));
  try {
    const reports = join(scratch, "reports");
    const recovered = join(scratch, "recovered");
    await Promise.all([
      mkdir(join(reports, "first"), { recursive: true }),
      mkdir(join(reports, "second"), { recursive: true }),
      mkdir(recovered),
    ]);
    const bundles = {
      "first/worker.mjs": "export default 1;",
      "second/worker.mjs": "export default 2;",
    };
    for (const [member, bytes] of Object.entries(bundles))
      await writeFile(join(reports, member), bytes);
    const indexPath = join(reports, "retained-artifact-index.json");
    await writeFile(indexPath, JSON.stringify({ earlier: { evidence: "keep extra metadata" } }));
    await writeFile(join(reports, "measurement.jsonl"), "raw measurement");
    await symlink(join(reports, "first/worker.mjs"), join(reports, "borrowed.mjs"));
    expect(await archiveReportBundles(reports)).toBe(2);
    const index = (await Bun.file(indexPath).json()) as Record<
      string,
      { archive: string; member: string; sha256: string; bytes: number } | { evidence: string }
    >;
    expect(index.earlier).toEqual({ evidence: "keep extra metadata" });
    const first = index["first/worker.mjs"];
    const archive = first && "archive" in first ? first.archive : undefined;
    if (!archive) throw new Error("Archived bundles have no recovery archive");
    await command("tar", ["-xzf", join(reports, archive), "-C", recovered], scratch);
    for (const [member, bytes] of Object.entries(bundles)) {
      expect(await Bun.file(join(reports, member)).exists()).toBe(false);
      expect(await Bun.file(join(recovered, member)).text()).toBe(bytes);
      expect(index[member]).toEqual({
        archive,
        member,
        sha256: new Bun.CryptoHasher("sha256").update(bytes).digest("hex"),
        bytes: bytes.length,
      });
    }
    expect(await Bun.file(join(reports, "measurement.jsonl")).text()).toBe("raw measurement");
    expect((await lstat(join(reports, "borrowed.mjs"))).isSymbolicLink()).toBe(true);
    expect(await archiveReportBundles(reports)).toBe(0);
    await writeFile(join(reports, "first/worker.mjs"), "replacement capture");
    const collision = await archiveReportBundles(reports).catch((error: unknown) => error);
    if (!(collision instanceof Error)) throw new Error("Indexed capture was replaced");
    expect(collision.message).toContain("Artifact is already indexed");
    expect(await Bun.file(join(reports, "first/worker.mjs")).text()).toBe("replacement capture");
    await rm(join(reports, "first/worker.mjs"));
    // An unreadable index must stop deletion rather than replacing earlier recovery information.
    await writeFile(join(reports, "unfinished.mjs"), "export default 3;");
    await writeFile(indexPath, "[]");
    const invalid = await archiveReportBundles(reports).catch((error: unknown) => error);
    if (!(invalid instanceof Error)) throw new Error("Invalid artifact index was replaced");
    expect(invalid.message).toContain("Invalid artifact index");
    expect(await Bun.file(join(reports, "unfinished.mjs")).text()).toBe("export default 3;");
    expect((await readdir(reports)).some((name) => name.startsWith("bundle-archive-"))).toBe(false);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test("identical captured packages share storage without losing paths or replacing damaged history", async () => {
  const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-cleanup-"));
  try {
    const reports = join(scratch, "reports");
    await mkdir(reports);
    const first = join(scratch, "first.tgz");
    const second = join(scratch, "second.tgz");
    const distinct = join(scratch, "distinct.tgz");
    await writeFile(first, "exact measured package");
    await copyFile(first, second);
    await writeFile(distinct, "another measured package");
    expect((await stat(first)).ino).not.toBe((await stat(second)).ino);
    await Promise.all(
      [first, second, distinct].map((path) => deduplicateCapturedPackage(path, reports)),
    );
    expect(await Bun.file(first).text()).toBe("exact measured package");
    expect(await Bun.file(second).text()).toBe("exact measured package");
    expect(await Bun.file(distinct).text()).toBe("another measured package");
    const [firstState, secondState, distinctState] = await Promise.all([
      stat(first),
      stat(second),
      stat(distinct),
    ]);
    expect(firstState.ino).toBe(secondState.ino);
    expect(firstState.ino).not.toBe(distinctState.ino);
    const retained = await Promise.all(
      (await readdir(reports)).map((name) => stat(join(reports, name))),
    );
    expect(retained).toHaveLength(2);
    expect(new Set(retained.map((file) => file.ino))).toEqual(
      new Set([firstState.ino, distinctState.ino]),
    );
    // Corruption must stop reuse while the independent incoming capture remains recoverable.
    await writeFile(first, "damaged history");
    const incoming = join(scratch, "incoming.tgz");
    await writeFile(incoming, "exact measured package");
    let failure: unknown;
    try {
      await deduplicateCapturedPackage(incoming, reports);
    } catch (error) {
      failure = error;
    }
    if (!(failure instanceof Error))
      throw new Error("Damaged capture was accepted without an error");
    expect(failure.message).toContain("damaged archive");
    expect(await Bun.file(incoming).text()).toBe("exact measured package");
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test.skipIf(process.platform !== "darwin")(
  "report compression saves blocks without changing bytes or following symlinks",
  async () => {
    const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-cleanup-"));
    try {
      const reports = join(scratch, "reports");
      await mkdir(reports);
      const report = join(reports, "profile.json");
      const bytes = "retained profile\n".repeat(32768);
      await writeFile(report, bytes);
      await symlink(report, join(reports, "alias"));
      const before = await stat(report);
      expect(await compactReports(reports)).toBeGreaterThan(0);
      expect(await Bun.file(report).text()).toBe(bytes);
      expect((await stat(report)).blocks).toBeLessThan(before.blocks);
      expect(await compactReports(reports)).toBe(0);
      expect((await lstat(join(reports, "alias"))).isSymbolicLink()).toBe(true);
      expect(new Set(await readdir(reports))).toEqual(new Set(["profile.json", "alias"]));
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  },
);

async function expectOnlyArchives(reports: string): Promise<void> {
  const names = await readdir(reports);
  expect(names.every((name) => name.endsWith(".tar.gz"))).toBe(true);
  const latest = await stat(join(reports, "build-inputs.tar.gz"));
  const captures = await Promise.all(
    names.filter((name) => name !== "build-inputs.tar.gz").map((name) => stat(join(reports, name))),
  );
  // The compatibility name must share stored bytes, not keep another physical copy.
  expect(captures.some((capture) => capture.ino === latest.ino && capture.dev === latest.dev)).toBe(
    true,
  );
}

for (const target of ["runner", "SIGINT", "SIGTERM"] as const) {
  test(`${target} interruption removes test fixture scratch`, async () => {
    const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-runner-cleanup-"));
    const files = join(scratch, "files");
    try {
      await mkdir(files);
      const fixture = join(scratch, "interrupted.test.ts");
      await writeFile(
        fixture,
        [
          'import { test } from "bun:test";',
          'import { mkdtemp, writeFile } from "node:fs/promises";',
          'import { tmpdir } from "node:os";',
          'import { join } from "node:path";',
          'test("interrupted", async () => {',
          '  const root = await mkdtemp(join(tmpdir(), "fixture-"));',
          '  await writeFile(join(root, "diagnostic"), "interrupted scratch");',
          '  await writeFile(process.env.UUID_SLUG_INTERRUPT_WITNESS!, "fixture reached");',
          target === "runner"
            ? '  process.kill(process.pid, "SIGTERM");'
            : '  console.log("ready");',
          "  await new Promise(() => {});",
          "});",
        ].join("\n"),
      );
      const child = Bun.spawn([process.execPath, "scripts/test-bun.ts", fixture], {
        cwd: project,
        env: {
          ...process.env,
          TMPDIR: files,
          UUID_SLUG_INTERRUPT_WITNESS: join(scratch, "witness"),
        },
        stdout: "pipe",
        stderr: "ignore",
        timeout: 2000,
      });
      try {
        if (target !== "runner") {
          const reader = child.stdout.getReader();
          let output = "";
          while (!output.split("\n").includes("ready")) {
            const chunk = await reader.read();
            if (chunk.done) throw new Error(`Fixture exited before readiness: ${output}`);
            output += new TextDecoder().decode(chunk.value);
          }
          child.kill(target);
          await reader.cancel();
        }
        expect(await child.exited).not.toBe(0);
        expect(await Bun.file(join(scratch, "witness")).text()).toBe("fixture reached");
        expect(await readdir(files)).toEqual([]);
      } finally {
        child.kill();
        await child.exited;
      }
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  test(
    `generation benchmark ${signal} removes its built scratch`,
    async () => {
      const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-cleanup-"));
      const child = Bun.spawn([process.execPath, "scripts/generation-matrix.ts", "--smoke"], {
        cwd: project,
        env: {
          ...process.env,
          TMPDIR: scratch,
          UUID_SLUG_GENERATION_FORKS: "1",
          UUID_SLUG_GENERATION_FILTER: "package.v4.text.native",
        },
        stdout: "pipe",
        stderr: "ignore",
        timeout: process.env.CI ? 30000 : 3000,
      });
      try {
        const reader = child.stdout.getReader();
        let output = "";
        while (!output.includes('"name":"package.v4.text.native"')) {
          const chunk = await reader.read();
          if (chunk.done) throw new Error("Generation benchmark exited before producing a result.");
          output += new TextDecoder().decode(chunk.value);
        }
        // Real benchmark output witnesses completed builds; cleanup must belong to the parent.
        expect((await readdir(scratch)).length).toBeGreaterThan(0);
        child.kill(signal);
        await reader.cancel();
        expect(await child.exited).not.toBe(0);
        expect(await readdir(scratch)).toEqual([]);
      } finally {
        child.kill();
        await child.exited;
        await rm(scratch, { recursive: true, force: true });
      }
    },
    process.env.CI ? 30000 : 5000,
  );
}

test("generated-file cleanup preserves source and exact executable bytes in the archive", async () => {
  const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-cleanup-"));
  const reports = join(scratch, "reports");
  const recovered = join(scratch, "recovered");
  try {
    await Promise.all([mkdir(reports), mkdir(recovered)]);
    await Promise.all([
      copyFile(join(project, "src/index.ts"), join(scratch, "input.ts")),
      copyFile(join(project, "dist/index.js"), join(reports, "worker.mjs")),
    ]);
    const source = await Bun.file(join(scratch, "input.ts")).bytes();
    const bundle = await Bun.file(join(reports, "worker.mjs")).bytes();
    await archiveAndRemoveGeneratedFiles(scratch, reports, ["input.ts"], ["worker.mjs"]);
    await command("tar", ["-xf", join(reports, "build-inputs.tar.gz"), "-C", recovered], scratch);
    expect(await Bun.file(join(recovered, "input.ts")).bytes()).toEqual(source);
    expect(await Bun.file(join(recovered, "worker.mjs")).bytes()).toEqual(bundle);
    expect(await Bun.file(join(scratch, "input.ts")).bytes()).toEqual(source);
    await expectOnlyArchives(reports);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test("successful recapture preserves older sources, reuses identical archives and rejects corrupt history", async () => {
  const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-cleanup-"));
  const reports = join(scratch, "reports");
  const recovered = join(scratch, "recovered");
  const latest = join(reports, "build-inputs.tar.gz");
  const worker = join(reports, "worker.mjs");
  try {
    await Promise.all([mkdir(reports), mkdir(recovered)]);
    await writeFile(join(scratch, "input.ts"), "first source");
    await writeFile(worker, "first bundle");
    await archiveAndRemoveGeneratedFiles(scratch, reports, ["input.ts"], ["worker.mjs"]);
    const first = await Bun.file(latest).bytes();
    // Simulate a pre-existing latest-only capture; retaining new captures alone cannot protect it.
    for (const name of await readdir(reports))
      if (name !== "build-inputs.tar.gz") await rm(join(reports, name));
    await writeFile(join(scratch, "input.ts"), "second source");
    await writeFile(worker, "second bundle");
    await archiveAndRemoveGeneratedFiles(scratch, reports, ["input.ts"], ["worker.mjs"]);
    const names = await readdir(reports);
    const historical = names.filter((name) => name !== "build-inputs.tar.gz");
    let historyName: string | undefined;
    for (const name of historical)
      if (Buffer.from(await Bun.file(join(reports, name)).bytes()).equals(first))
        historyName = name;
    if (!historyName) throw new Error("The earlier capture has no recovery archive.");
    const history = join(reports, historyName);
    expect(await Bun.file(history).bytes()).toEqual(first);
    await command("tar", ["-xf", history, "-C", recovered], scratch);
    expect(await Bun.file(join(recovered, "input.ts")).text()).toBe("first source");
    expect(await Bun.file(join(recovered, "worker.mjs")).text()).toBe("first bundle");
    await command("tar", ["-xf", latest, "-C", recovered], scratch);
    expect(await Bun.file(join(recovered, "input.ts")).text()).toBe("second source");
    expect(await Bun.file(join(recovered, "worker.mjs")).text()).toBe("second bundle");
    const historyStat = await stat(history);
    await rm(latest);
    await writeFile(latest, first);
    await writeFile(worker, "third bundle");
    await archiveAndRemoveGeneratedFiles(scratch, reports, ["input.ts"], ["worker.mjs"]);
    expect((await stat(history)).ino).toBe(historyStat.ino);
    await expectOnlyArchives(reports);
    const retainedNames = await readdir(reports);
    await rm(latest);
    await writeFile(latest, first);
    await writeFile(history, "corrupt archive");
    await writeFile(worker, "pending bundle");
    const failure = await archiveAndRemoveGeneratedFiles(
      scratch,
      reports,
      ["input.ts"],
      ["worker.mjs"],
    ).catch((error: Error) => error);
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toContain("damaged archive");
    expect(await Bun.file(latest).bytes()).toEqual(first);
    expect(await Bun.file(worker).text()).toBe("pending bundle");
    expect(new Set(await readdir(reports))).toEqual(new Set([...retainedNames, "worker.mjs"]));
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test("profile builds archive their compiler inputs and remove every generated bundle", async () => {
  const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-cleanup-"));
  const reports = join(scratch, "reports");
  const recovered = join(scratch, "recovered");
  const bundles = ["profile-async.browser.mjs", "profile-browser.browser.mjs"];
  try {
    await Promise.all([mkdir(reports), mkdir(recovered)]);
    await command(
      process.execPath,
      [
        "-e",
        'import { buildProfile, cleanupProfileBuilds } from "./bench/profile-all"; import { basename, join } from "node:path"; const paths = await Promise.all([buildProfile("profile-async", "browser"), buildProfile("profile-browser", "browser")]); for (const path of paths) await Bun.write(join(process.argv[1], basename(path) + ".expected"), await Bun.file(path).bytes()); await cleanupProfileBuilds(); await cleanupProfileBuilds();',
        scratch,
      ],
      project,
      { UUID_SLUG_PROFILE_NATIVE_DIR: reports, UUID_SLUG_PROFILE_MODULE: "" },
    );
    await command("tar", ["-xf", join(reports, "build-inputs.tar.gz"), "-C", recovered], scratch);
    for (const name of bundles)
      expect(await Bun.file(join(recovered, name)).bytes()).toEqual(
        await Bun.file(join(scratch, `${name}.expected`)).bytes(),
      );
    expect(await Bun.file(join(recovered, "src/index.ts")).bytes()).toEqual(
      await Bun.file(join(project, "src/index.ts")).bytes(),
    );
    await expectOnlyArchives(reports);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test("Bun async profiling calls the selected package instead of working-tree source", async () => {
  const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-cleanup-"));
  try {
    const selected = join(scratch, "selected.mjs");
    // A distinct failing implementation proves the call crosses the requested package boundary;
    // ordinary package behavior could pass even if the profiler ignored its selection.
    await writeFile(
      selected,
      'export function deriveUuidV7MaskAsync() { throw new Error("Selected async package reached"); } export function isUuidSlugError() { return false; }',
    );
    const child = Bun.spawn([process.execPath, "bench/profile-async.ts"], {
      cwd: project,
      env: { ...process.env, UUID_SLUG_PROFILE_MODULE: selected },
      stdout: "pipe",
      stderr: "pipe",
      timeout: 2000,
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("Selected async package reached");
    expect(stdout).toBe("");
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test("failed source capture preserves the generated file and previous archive", async () => {
  const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-cleanup-"));
  const reports = join(scratch, "reports");
  try {
    await mkdir(reports);
    await copyFile(join(project, "dist/index.js"), join(reports, "worker.mjs"));
    await archiveAndRemoveGeneratedFiles(scratch, reports, [], ["worker.mjs"]);
    const archive = await Bun.file(join(reports, "build-inputs.tar.gz")).bytes();
    const retainedNames = await readdir(reports);
    await copyFile(join(project, "dist/index.js"), join(reports, "worker.mjs"));
    const bundle = await Bun.file(join(reports, "worker.mjs")).bytes();
    const failure = await archiveAndRemoveGeneratedFiles(
      scratch,
      reports,
      ["missing.ts"],
      ["worker.mjs"],
    ).catch((error: Error) => error);
    expect(failure).toBeInstanceOf(Error);
    expect(failure?.message).toContain("Command failed");
    expect(await Bun.file(join(reports, "worker.mjs")).bytes()).toEqual(bundle);
    expect(await Bun.file(join(reports, "build-inputs.tar.gz")).bytes()).toEqual(archive);
    expect(new Set(await readdir(reports))).toEqual(new Set([...retainedNames, "worker.mjs"]));
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

for (const [name, args, env, diagnostic] of [
  ["invalid argument", ["--invalid"], {}, "Usage: bun bench/profile-workerd.ts"],
  ["invalid calls", [], { UUID_SLUG_PROFILE_CALLS: "0" }, "Use positive bounded"],
  ["invalid samples", [], { UUID_SLUG_PROFILE_SAMPLES: "0" }, "Use positive bounded"],
  ["failed build", [], {}, "Could not resolve"],
] as const) {
  test(`workerd ${name} creates no report artifacts`, async () => {
    const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-cleanup-"));
    const bench = join(scratch, "bench");
    try {
      await mkdir(bench);
      await Promise.all([
        copyFile(join(project, "bench/profile-workerd.ts"), join(bench, "profile-workerd.ts")),
        symlink(join(project, "scripts"), join(scratch, "scripts"), "dir"),
        symlink(join(project, "node_modules"), join(scratch, "node_modules"), "dir"),
      ]);
      // Real CLI and builder failures must leave no report directory, even before cleanup runs.
      const child = Bun.spawn([process.execPath, join(bench, "profile-workerd.ts"), ...args], {
        cwd: scratch,
        env: {
          ...process.env,
          UUID_SLUG_PROFILE_CALLS: "1",
          UUID_SLUG_PROFILE_SAMPLES: "1",
          ...env,
        },
        stdout: "ignore",
        stderr: "pipe",
      });
      const [stderr, code] = await Promise.all([new Response(child.stderr).text(), child.exited]);
      expect(stderr).toContain(diagnostic);
      expect(code).not.toBe(0);
      expect(await readdir(bench)).toEqual(["profile-workerd.ts"]);
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });
}

test("browser launch failure releases the profiling server", async () => {
  const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-cleanup-"));
  const entry = join(scratch, "input.mjs");
  try {
    await writeFile(entry, "export {};\n");
    // An absent real browser fails before profiling; a leaked listener prevents normal exit.
    let loaded = false;
    const child = Bun.spawn(
      [
        process.execPath,
        "-e",
        'import { runBrowser } from "./bench/profile-all"; process.send("loaded"); try { await runBrowser(process.argv[1]); process.exitCode = 1; } catch (error) { console.error(error.message); }',
        entry,
      ],
      {
        cwd: project,
        env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: scratch },
        stdout: "ignore",
        stderr: "pipe",
        ipc(message) {
          if (message === "loaded") {
            loaded = true;
            clearTimeout(deadline);
            deadline = setTimeout(() => child.kill(), 2000);
          }
        },
      },
    );
    // Import time is not listener settlement; measure the leak only after the child loads.
    let deadline = setTimeout(() => child.kill(), 2000);
    try {
      const [stderr, code] = await Promise.all([new Response(child.stderr).text(), child.exited]);
      if (!loaded)
        throw new Error("Browser cleanup child did not load before the startup watchdog");
      expect(stderr).toContain("Executable doesn't exist");
      expect(code).toBe(0);
    } finally {
      clearTimeout(deadline);
      child.kill();
      await child.exited;
    }
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test("failed comparisons preserve diagnostics without leaving temporary checkouts", async () => {
  const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-cleanup-"));
  let archive: string | undefined;
  try {
    // A valid baseline followed by an invalid candidate fails before measurement but leaves
    // real source to preserve. Isolated TMPDIR makes this proof independent of other jobs.
    const child = Bun.spawn(
      [process.execPath, "bench/compare.ts", "HEAD", "refs/invalid/cleanup"],
      {
        cwd: project,
        env: { ...process.env, TMPDIR: scratch, UUID_SLUG_COMPARE_RUNTIMES: "bun" },
        stdout: "ignore",
        stderr: "pipe",
      },
    );
    const [stderr, exitCode] = await Promise.all([new Response(child.stderr).text(), child.exited]);
    archive = /artifacts are in (.+\.tar\.gz)\./.exec(stderr)?.[1];
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("refs/invalid/cleanup");
    expect(await readdir(scratch)).toEqual([]);
    if (!archive) throw new Error("Missing failure archive diagnostic");
    const [retained, original] = await Promise.all([
      command("tar", ["-xOzf", archive, "./baseline/src/index.ts"], project),
      command("git", ["show", "HEAD:src/index.ts"], project),
    ]);
    expect(retained).toBe(original);
  } finally {
    if (archive) await rm(dirname(archive), { recursive: true, force: true });
    await rm(scratch, { recursive: true, force: true });
  }
});

test("packed artifact failures retain their inputs and remove executable scratch", async () => {
  const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-cleanup-"));
  let archive: string | undefined;
  try {
    const manifest = JSON.stringify({ dependencies: { unexpected: "1" } });
    const tarball = join(scratch, "invalid.tgz");
    await Bun.write(tarball, new Bun.Archive({ "package/package.json": manifest }));
    const child = Bun.spawn([process.execPath, "scripts/check-artifact.ts", tarball], {
      cwd: project,
      env: { ...process.env, TMPDIR: scratch },
      stdout: "ignore",
      stderr: "pipe",
    });
    const [stderr, exitCode] = await Promise.all([new Response(child.stderr).text(), child.exited]);
    archive = /artifacts are in (.+\.tar\.gz)\./.exec(stderr)?.[1];
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("dependencies must be empty in the artifact");
    if (!archive) throw new Error("Missing packed failure archive diagnostic");
    const entries = await new Bun.Archive(await Bun.file(archive).bytes()).files();
    expect(await entries.get("./package/package.json")?.text()).toBe(manifest);
    expect(await readdir(scratch)).toEqual(["invalid.tgz"]);
    // The inner graph must survive too; an actual setup failure reaches its cleanup boundary
    // without starting unrelated compilers or inventing their responses.
    const graph = Bun.spawn(
      [
        process.execPath,
        "-e",
        'import { inspectConsumerGraph } from "./scripts/consumer-graph"; await inspectConsumerGraph(process.argv[1], "@anizoptera/uuid-slug");',
        scratch,
      ],
      {
        cwd: project,
        env: { ...process.env, UUID_SLUG_DECODER_BUNDLE_DIR: tarball },
        stdout: "ignore",
        stderr: "pipe",
      },
    );
    const [graphError, graphExit] = await Promise.all([
      new Response(graph.stderr).text(),
      graph.exited,
    ]);
    expect(graphExit).not.toBe(0);
    expect(graphError).toContain("EEXIST");
    expect((await stat(join(scratch, "consumer-graph"))).isDirectory()).toBe(true);
  } finally {
    if (archive) await rm(dirname(archive), { recursive: true, force: true });
    await rm(scratch, { recursive: true, force: true });
  }
});

test("archive failure keeps original evidence and removes incomplete archives", async () => {
  const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-cleanup-"));
  const reports = join(scratch, "reports");
  const evidence = join(scratch, "evidence");
  try {
    await writeFile(evidence, "retain this diagnostic");
    // Remove only the real archiver's lookup path; the same filesystem operation must fail
    // without erasing its input or leaving an incomplete archive that could look valid.
    const child = Bun.spawn(
      [
        process.execPath,
        "-e",
        'import { archiveAndRemoveScratch } from "./scripts/archive-scratch"; await archiveAndRemoveScratch(process.argv[1], process.argv[2]);',
        scratch,
        reports,
      ],
      { cwd: project, env: { ...process.env, PATH: "" }, stdout: "ignore", stderr: "pipe" },
    );
    const [stderr, exitCode] = await Promise.all([new Response(child.stderr).text(), child.exited]);
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("ENOENT");
    expect(await Bun.file(evidence).text()).toBe("retain this diagnostic");
    expect(await readdir(reports)).toEqual([]);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test("scratch archival resolves relative paths before changing the archiver directory", async () => {
  const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-cleanup-"));
  const reports = join(scratch, "reports");
  const input = join(scratch, "input");
  try {
    await mkdir(input);
    await writeFile(join(input, "evidence"), "exact relative input");
    const { archiveAndRemoveScratch } = await import("../archive-scratch");
    await archiveAndRemoveScratch(relative(project, input), relative(project, reports));
    const [capture] = await readdir(reports);
    if (!capture) throw new Error("Relative input was not archived");
    const entries = await new Bun.Archive(
      await Bun.file(join(reports, capture, "artifacts.tar.gz")).bytes(),
    ).files();
    expect(await entries.get("./evidence")?.text()).toBe("exact relative input");
    expect(await readdir(scratch)).toEqual(["reports"]);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});
