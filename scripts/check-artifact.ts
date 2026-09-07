import { mkdir, mkdtemp, readdir, rm, symlink } from "node:fs/promises";
import { isBuiltin } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { command } from "./command";

// Scan all shipped files: extensions must not hide machine paths or development material.
const BUILD_PATH_LEAK = /(?:\/Users\/|\/home\/[a-z]|[A-Z]:\\Users\\)/;
const FORBIDDEN_PATHS = new Set(["bench", "test", ".github", "scripts", "AGENTS.md", "NOTICE"]);
const project = path.resolve(import.meta.dir, "..");

/** Validate the archive itself; callers supplying a tarball never invoke the packer. */
export async function inspectArtifact(tarball: string, web = false): Promise<void> {
  const root = await mkdtemp(path.join(tmpdir(), "uuid-slug-consumer-"));
  try {
    const archive = new Bun.Archive(await Bun.file(tarball).bytes());
    const entries = await archive.files();
    if (!entries.has("package/package.json"))
      throw new Error("Archive has no package/package.json.");
    await Promise.all(
      [...entries].map(async ([name, file]) => {
        if (
          !name.startsWith("package/") ||
          name.split("/").some((part) => part === ".." || FORBIDDEN_PATHS.has(part))
        )
          throw new Error(`Forbidden artifact path: ${name}`);
        if (BUILD_PATH_LEAK.test(await file.text()))
          throw new Error(`Build-machine path leaked in ${name}`);
      }),
    );
    await archive.extract(root);
    const extracted = path.join(root, "package");
    const manifest = await Bun.file(path.join(extracted, "package.json")).json();
    for (const field of [
      "dependencies",
      "optionalDependencies",
      "peerDependencies",
      "devDependencies",
    ])
      if (Object.keys(manifest[field] ?? {}).length)
        throw new Error(`${field} must be empty in the artifact.`);
    const keys = new Set(Object.keys(manifest.exports ?? {}));
    if (keys.size !== 2 || !keys.has(".") || !keys.has("./package.json"))
      throw new Error('Packed exports must expose only "." and "./package.json".');
    if (manifest.name !== "@anizoptera/uuid-slug") throw new Error("Unexpected package name.");
    await Bun.write(
      path.join(root, "package.json"),
      JSON.stringify({ type: "module", dependencies: { [manifest.name]: manifest.version } }),
    );
    const modules = path.join(root, "node_modules", "@anizoptera");
    await mkdir(modules, { recursive: true });
    await symlink(extracted, path.join(modules, "uuid-slug"), "dir");

    // Each target resolves its actual export condition. Checking every shipped module also
    // catches a dependency in a currently unreferenced module, without parsing JS by regex.
    const graphs = await Promise.allSettled(
      (["browser", "node", "bun"] as const).map(async (target) => {
        const prefix =
          target === "bun"
            ? "package/src/"
            : target === "node"
              ? "package/dist/node/"
              : "package/dist/";
        const extension = target === "bun" ? ".ts" : ".js";
        const entrypoints = [...entries.keys()]
          .filter(
            (name) =>
              name.startsWith(prefix) &&
              name.endsWith(extension) &&
              !name.endsWith(".d.ts") &&
              (target !== "browser" || !name.startsWith("package/dist/node/")),
          )
          .map((name) => path.join(root, name));
        if (!entrypoints.length) throw new Error(`No ${target} modules in the archive.`);
        const result = await Bun.build({
          entrypoints,
          target,
          throw: false,
          plugins: [
            {
              name: "no-runtime-dependencies",
              setup(builder) {
                builder.onResolve({ filter: /^[^./]/ }, (args) => {
                  if (
                    args.path === "#runtime" ||
                    (target !== "browser" && (isBuiltin(args.path) || args.path === "bun"))
                  )
                    return;
                  throw new Error(`Runtime dependency in ${args.importer}: ${args.path}`);
                });
              },
            },
          ],
        });
        if (!result.success)
          throw new AggregateError(result.logs, `${target} artifact module graph failed.`);
      }),
    );

    for (const graph of graphs) if (graph.status === "rejected") throw graph.reason;

    const probe = await Bun.build({
      entrypoints: [path.join(project, "test/consumer-probe.ts")],
      target: "browser",
      outdir: root,
      naming: "probe.mjs",
    });
    if (!probe.success) throw new AggregateError(probe.logs, "Consumer probe compilation failed.");
    await Bun.write(
      path.join(root, "consumer.ts"),
      Bun.file(path.join(project, "test/consumer-types.fixture.ts")),
    );
    await Bun.write(
      path.join(root, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          strict: true,
          noEmit: true,
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          types: [],
          skipLibCheck: false,
        },
        files: ["consumer.ts"],
      }),
    );
    const runner = path.join(root, "consumer.mjs");
    await Bun.write(
      runner,
      'import * as api from "@anizoptera/uuid-slug";\nimport { probeConsumer } from "./probe.mjs";\nprobeConsumer(api);\n',
    );
    const consumers = await Promise.allSettled([
      command(
        "node",
        [path.join(project, "node_modules/typescript-floor/bin/tsc"), "-p", root],
        project,
      ),
      command("node", [runner], root),
      command("bun", [runner], root),
      command(
        path.join(project, "node_modules/.bin/publint"),
        [extracted, "--pack", "false"],
        project,
      ),
      command(
        path.join(project, "node_modules/.bin/attw"),
        [tarball, "--profile", "esm-only"],
        project,
      ),
    ]);
    const failures = consumers
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason);
    if (failures.length) throw new AggregateError(failures, "Packed consumers failed.");
    if (web) {
      await command(
        "deno",
        ["run", "--node-modules-dir=manual", "--cached-only", "--allow-read", runner],
        root,
      );
      const built = await Bun.build({ entrypoints: [runner], target: "browser" });
      const output = built.outputs[0];
      if (!built.success || !output)
        throw new AggregateError(built.logs, "Browser consumer compilation failed.");
      const { chromium } = await import("playwright");
      const server = Bun.serve({
        port: 0,
        fetch: () =>
          new Response("<!doctype html><title>Consumer probe</title>", {
            headers: { "content-type": "text/html" },
          }),
      });
      try {
        const browser = await chromium.launch({ headless: true });
        try {
          const page = await browser.newPage();
          await page.goto(server.url.href);
          await page.evaluate(
            (code) => {
              if (typeof globalThis.process !== "undefined")
                throw new Error("Expected a real browser without process.");
              // Await module completion, including any future asynchronous consumer assertions.
              return import(URL.createObjectURL(new Blob([code], { type: "text/javascript" })));
            },
            await output.text(),
          );
        } finally {
          await browser.close();
        }
      } finally {
        await server.stop(true);
      }
    }
    console.log(
      `Validated ${path.basename(tarball)} through extracted package exports${web ? " on Node, Bun, Deno and Chromium" : " on Node and Bun"}.`,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const web = args.includes("--web");
  const files = args.filter((arg) => arg !== "--web");
  if (files.length > 1) throw new Error("Usage: check-artifact.ts [--web] [final.tgz]");
  if (files[0]) return inspectArtifact(path.resolve(files[0]), web);
  const root = await mkdtemp(path.join(tmpdir(), "uuid-slug-artifact-"));
  try {
    await command(
      "bun",
      [
        path.join(project, "node_modules/.bin/publish-clean"),
        "--dry-run",
        "--no-git-checks",
        "--tarball-out",
        root,
      ],
      project,
    );
    const packed = (await readdir(root)).filter((entry) => entry.endsWith(".tgz"));
    if (packed.length !== 1 || !packed[0])
      throw new Error(`Expected one tarball, found ${packed.length}.`);
    await inspectArtifact(path.join(root, packed[0]), web);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

if (import.meta.main)
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
