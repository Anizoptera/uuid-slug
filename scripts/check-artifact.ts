import { mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import { isBuiltin } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { command } from "./command";
import { archiveAndRemoveScratch } from "./archive-scratch";
import { formatConsumerGraph, inspectConsumerGraph } from "./consumer-graph";

// Scan all shipped files: extensions must not hide machine paths or development material.
const BUILD_PATH_LEAK = /(?:\/Users\/|\/home\/[a-z]|[A-Z]:\\Users\\)/;
const FORBIDDEN_PATHS = new Set(["bench", "test", ".github", "scripts", "AGENTS.md", "NOTICE"]);
// Exact spellings distinguish source-owned promises from annotations the optimizer may add itself.
const OPTIMIZER_ANNOTATIONS = [
  "/*#__PURE__*/",
  "/*@__PURE__*/",
  "/*#__NO_SIDE_EFFECTS__*/",
  "/*@__NO_SIDE_EFFECTS__*/",
] as const;
const project = path.resolve(import.meta.dir, "..");
const typescriptScanner = new Bun.Transpiler({ loader: "ts" });

/** Source-loaded runtimes need specifiers that name the files actually shipped. */
function validateTypeScriptSpecifiers(name: string, text: string): void {
  if (!name.startsWith("package/src/") || !name.endsWith(".ts")) return;
  for (const imported of typescriptScanner.scanImports(text))
    if (/^\.\.?\//.test(imported.path) && !imported.path.endsWith(".ts"))
      throw new Error(
        `Published TypeScript relative import must end in .ts: ${name} -> ${imported.path}`,
      );
}

/** Require every source-map input to be supplied by the archive rather than a build machine. */
async function validateSourceMap(
  name: string,
  text: string,
  entries: ReadonlyMap<string, Blob>,
): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (cause) {
    throw new Error(`Invalid source map: ${name}`, { cause });
  }
  if (typeof parsed !== "object" || parsed === null)
    throw new Error(`Source map root must be an object: ${name}`);
  const map = parsed as {
    mappings?: unknown;
    sourceRoot?: unknown;
    sources?: unknown;
    sourcesContent?: unknown;
    version?: unknown;
  };
  const root = map.sourceRoot ?? "";
  if (
    map.version !== 3 ||
    typeof map.mappings !== "string" ||
    typeof root !== "string" ||
    !Array.isArray(map.sources)
  )
    throw new Error(
      `Source map ${name} must use version 3 with string mappings, string sourceRoot, and a sources array.`,
    );
  const embedded = Array.isArray(map.sourcesContent) ? map.sourcesContent : [];
  if (embedded.length > 0)
    throw new Error(
      `Source map duplicates source already shipped in the package: ${name}. Exclude sourcesContent from the build.`,
    );
  const sourceAnnotations = new Map<string, number>();
  for (const [index, source] of map.sources.entries()) {
    if (typeof source !== "string")
      throw new Error(`Source map ${name} has a non-string source at index ${index}.`);
    const input = path.posix.join(root, source);
    if (
      /^(?:[a-z][a-z\d+.-]*:|\/|\\|[a-z]:)/i.test(root) ||
      /^(?:[a-z][a-z\d+.-]*:|\/|\\|[a-z]:)/i.test(source)
    )
      throw new Error(`Source map input must stay inside the package: ${name} -> ${input}`);
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(name), input));
    if (
      !resolved.startsWith("package/") ||
      (!entries.has(resolved) && typeof embedded[index] !== "string")
    )
      throw new Error(`Source map input must stay inside the package: ${name} -> ${input}`);
    if (name.endsWith(".js.map")) {
      const sourceText = (await entries.get(resolved)?.text()) ?? "";
      for (const annotation of OPTIMIZER_ANNOTATIONS)
        sourceAnnotations.set(
          annotation,
          (sourceAnnotations.get(annotation) ?? 0) + sourceText.split(annotation).length - 1,
        );
    }
  }
  if (name.endsWith(".js.map")) {
    const output = name.slice(0, -4);
    const outputText = (await entries.get(output)?.text()) ?? "";
    for (const [annotation, count] of sourceAnnotations)
      if (outputText.split(annotation).length - 1 < count)
        throw new Error(`Optimizer annotation ${annotation} was stripped from ${output}.`);
  }
}

/** Validate the archive itself; callers supplying a tarball never invoke the packer. */
export async function inspectArtifact(
  tarball: string,
  web = false,
  edge = false,
  failureReports = path.join(project, "bench/reports"),
): Promise<void> {
  const expected = process.env.UUID_SLUG_EXPECTED_ARCHIVE;
  if (expected) {
    const [actualBytes, expectedBytes] = await Promise.all([
      Bun.file(tarball).bytes(),
      Bun.file(expected).bytes(),
    ]);
    if (
      actualBytes.length !== expectedBytes.length ||
      actualBytes.some((byte, index) => byte !== expectedBytes[index])
    )
      throw new Error(
        "Final npm archive differs from the credentials-free reviewed archive. Publish the reviewed bytes, or return to development and verify the replacement archive before publishing.",
      );
    // Preparation already ran every artifact probe on these exact bytes. The credential-bearing
    // repack needs only this identity check; repeating deterministic probes cannot add evidence.
    return;
  }
  const root = await mkdtemp(path.join(tmpdir(), "uuid-slug-consumer-"));
  let failed = false;
  try {
    // Version managers resolve from cwd; temporary consumers must use the project's toolchain.
    await symlink(path.join(project, ".tool-versions"), path.join(root, ".tool-versions"));
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
        if (
          name.startsWith("package/dist/node/") &&
          !/^package\/dist\/node\/runtime\.js(?:\.map)?$/.test(name)
        )
          throw new Error(`Only the Node runtime adapter belongs in dist/node: ${name}`);
        // Module graphs cannot see unreferenced native build outputs in an allowed directory.
        if (/\.(?:node|wasm|dll|dylib|so(?:\.\d+)*|a|lib|rlib|o|obj|exe)$/i.test(name))
          throw new Error(`Native payload is forbidden in the npm package: ${name}`);
        const text = await file.text();
        if (BUILD_PATH_LEAK.test(text)) throw new Error(`Build-machine path leaked in ${name}`);
        validateTypeScriptSpecifiers(name, text);
        if (name.endsWith(".map")) await validateSourceMap(name, text, entries);
      }),
    );
    await archive.extract(root);
    const extracted = path.join(root, "package");
    const foreignRoot = path.join(root, "foreign");
    await mkdir(foreignRoot);
    await archive.extract(foreignRoot);
    const manifest = await Bun.file(path.join(extracted, "package.json")).json();
    for (const field of [
      "dependencies",
      "optionalDependencies",
      "peerDependencies",
      "devDependencies",
    ])
      if (Object.keys(manifest[field] ?? {}).length)
        throw new Error(`${field} must be empty in the artifact.`);
    const repositoryManifest = await Bun.file(path.join(project, "package.json")).json();
    const conditionOrder = Object.keys(repositoryManifest.exports["."]);
    for (const [subpath, target] of Object.entries(manifest.exports ?? {})) {
      if (subpath === "./package.json" || typeof target !== "object" || target === null) continue;
      if (JSON.stringify(Object.keys(target)) !== JSON.stringify(conditionOrder))
        throw new Error(
          `${subpath} export conditions must be ordered ${conditionOrder
            .slice(0, -1)
            .map((condition: string) => JSON.stringify(condition))
            .join(", ")}, then ${JSON.stringify(conditionOrder.at(-1))}.`,
        );
    }
    if (JSON.stringify(manifest.exports) !== JSON.stringify(repositoryManifest.exports))
      throw new Error(
        `Packed exports are wrong.\nExpected: ${JSON.stringify(repositoryManifest.exports)}\nReceived: ${JSON.stringify(manifest.exports)}`,
      );
    if (JSON.stringify(manifest.imports) !== JSON.stringify(repositoryManifest.imports))
      throw new Error(
        `Packed imports are wrong.\nExpected: ${JSON.stringify(repositoryManifest.imports)}\nReceived: ${JSON.stringify(manifest.imports)}`,
      );
    if (manifest.name !== "@anizoptera/uuid-slug")
      throw new Error(
        `Packed package name must be @anizoptera/uuid-slug; got ${JSON.stringify(manifest.name)}.`,
      );
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
        const prefix = target === "bun" ? "package/src/" : "package/dist/";
        const entrypoints = [...entries.keys()]
          .filter(
            (name) =>
              name.startsWith(prefix) &&
              /\.[cm]?[jt]sx?$/.test(name) &&
              !/\.d\.[cm]?ts$/.test(name) &&
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

    const runtimeProbe = path.join(extracted, "runtime-route.mjs");
    await Bun.write(
      runtimeProbe,
      'await import("./dist/index.js");\nconsole.log(import.meta.resolve("#runtime"));\n',
    );
    const expectRuntimeRoute = async (runtime: "bun" | "deno" | "node", expectedSuffix: string) => {
      const args = runtime === "deno" ? ["run", "--cached-only", runtimeProbe] : [runtimeProbe];
      const resolved = (await command(runtime, args, extracted)).trim();
      if (!resolved.endsWith(expectedSuffix))
        throw new Error(`${runtime} resolved #runtime to ${resolved}; expected ${expectedSuffix}.`);
    };
    await Promise.all([
      expectRuntimeRoute("node", "/dist/node/runtime.js"),
      expectRuntimeRoute("bun", "/src/runtime/bun.ts"),
      expectRuntimeRoute("deno", "/src/runtime/portable.ts"),
    ]);

    const probe = await Bun.build({
      entrypoints: [path.join(project, "__test__/consumer-probe.ts")],
      target: "browser",
      outdir: root,
      naming: "probe.mjs",
    });
    if (!probe.success) throw new AggregateError(probe.logs, "Consumer probe compilation failed.");
    const developmentEntry = path.join(root, "development.ts");
    await Bun.write(developmentEntry, `import "${manifest.name}";\n`);
    let loadedDevelopmentSource = false;
    const development = await Bun.build({
      entrypoints: [developmentEntry],
      target: "browser",
      conditions: ["development"],
      plugins: [
        {
          name: "observe-development-source",
          setup(builder) {
            builder.onLoad({ filter: /src\/index\.ts$/ }, () => {
              loadedDevelopmentSource = true;
              return undefined;
            });
          },
        },
      ],
    });
    if (!development.success)
      throw new AggregateError(development.logs, "Development-source consumer failed.");
    if (!loadedDevelopmentSource)
      throw new Error(
        'The "development" condition did not resolve the published TypeScript entry.',
      );
    await Bun.write(
      path.join(root, "consumer.ts"),
      Bun.file(path.join(project, "__test__/consumer-types.fixture.ts")),
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
      'import * as api from "@anizoptera/uuid-slug";\nimport * as foreign from "./foreign/package/dist/index.js";\nimport { probeConsumer } from "./probe.mjs";\nawait probeConsumer(api);\nconst mask = foreign.deriveUuidV7Mask({ seed: "same-version-foreign-mask" });\nif (mask instanceof Error) throw mask;\nconst codec = api.createUuidV7MaskingCodec({ mask });\nif (codec instanceof Error) throw codec;\nconst uuid = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4051";\nconst slug = codec.uuidToMaskedSlug(uuid);\nif (slug instanceof Error) throw slug;\nif (codec.uuidToString(slug) !== uuid) throw new Error("A same-version schema from another loaded copy did not round-trip.");\nconst foreignUuid = foreign.parseUuid(uuid);\nif (foreignUuid instanceof Error) throw foreignUuid;\nif (api.uuidToString(foreignUuid) !== uuid) throw new Error("A parsed UUID from another loaded copy was not accepted.");\nif (codec.uuidToMaskedSlug(foreignUuid) instanceof Error) throw new Error("A masking codec rejected a parsed UUID from another loaded copy.");\n',
    );
    const builtRunner = path.join(root, "built-consumer.mjs");
    await Bun.write(
      builtRunner,
      'import * as api from "./package/dist/index.js";\nimport { probeConsumer } from "./probe.mjs";\nawait probeConsumer(api);\n',
    );
    const consumers = await Promise.allSettled([
      command(
        "node",
        [path.join(project, "node_modules/typescript-floor/bin/tsc"), "-p", root],
        project,
      ),
      command("node", [path.join(project, "node_modules/typescript/bin/tsc"), "-p", root], project),
      command("node", [runner], root),
      command("bun", [runner], root),
      command("bun", [builtRunner], root),
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
      inspectConsumerGraph(root, manifest.name).then((results) =>
        console.log(formatConsumerGraph(results)),
      ),
    ]);
    const failures = consumers
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason);
    if (failures.length) throw new AggregateError(failures, "Packed consumers failed.");
    if (web) {
      const denoOptions = ["--node-modules-dir=manual", "--cached-only", "--allow-read"];
      await Promise.all([
        command("deno", ["run", ...denoOptions, runner], root),
        command("deno", ["run", "--conditions", "development", ...denoOptions, runner], root),
        command("deno", ["run", ...denoOptions, builtRunner], root),
      ]);
    }
    if (web || edge) {
      const built = await Bun.build({ entrypoints: [runner], target: "browser" });
      const output = built.outputs[0];
      if (!built.success || !output)
        throw new AggregateError(built.logs, "Browser consumer compilation failed.");
      const browserBundle = path.join(root, "browser-consumer.mjs");
      await Bun.write(browserBundle, output);
      const checks = [
        ...(web ? ["check-browser-consumer.ts"] : []),
        ...(edge ? ["check-workerd-consumer.ts"] : []),
      ];
      const results = await Promise.allSettled(
        checks.map((check) =>
          command("bun", [path.join(project, "scripts", check), browserBundle], project),
        ),
      );
      const errors = results.filter((result) => result.status === "rejected");
      if (errors.length)
        throw new AggregateError(
          errors.map((result) => result.reason),
          `Packed web consumers failed; rerun bun scripts/check-artifact.ts${web ? " --web" : ""}${edge ? " --edge" : ""} ${JSON.stringify(tarball)}.`,
        );
      for (const result of results)
        if (result.status === "fulfilled") console.log(result.value.trim());
    }
    console.log(
      `Validated ${path.basename(tarball)} through extracted package exports${web ? " on Node, Bun, Deno, Chromium, Firefox and WebKit" : " on Node and Bun"}${edge ? " and local workerd (web-only and nodejs_compat)" : ""}.`,
    );
  } catch (cause) {
    failed = true;
    // Real failures use retained reports; expected rejection tests supply their cleanup scope.
    // If archival fails, retain the originals: deleting them would destroy the only reproduction.
    await archiveAndRemoveScratch(root, failureReports);
    throw cause;
  } finally {
    if (!failed) await rm(root, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  // Git ignores do not exclude captures from compiler or test discovery. Check their location,
  // rather than hiding them with compiler exclusions, so retained evidence stays inert.
  const captures = Array.from(
    new Bun.Glob("bench/reports/**/*.{ts,tsx,mts,cts,rs}").scanSync({
      cwd: project,
      dot: true,
    }),
  );
  if (captures.length)
    throw new Error(
      `Executable source in bench/reports: ${captures.join(", ")}. Move reusable drivers to bench/ or scripts/; rename retained captures to .txt or archive them. Git ignores do not stop compiler discovery.`,
    );
  const args = process.argv.slice(2);
  const web = args.includes("--web") || process.env.UUID_SLUG_ARTIFACT_WEB === "1";
  const edge = args.includes("--edge") || process.env.UUID_SLUG_ARTIFACT_EDGE === "1";
  const files = args.filter((arg) => arg !== "--web" && arg !== "--edge");
  if (files.length > 1) throw new Error("Usage: check-artifact.ts [--web] [--edge] [final.tgz]");
  if (files[0]) return inspectArtifact(path.resolve(files[0]), web, edge);
  // The configured hook receives the final path; that branch never packs or invokes this one.
  // Propagate optional web coverage through the child without retaining or checking twice.
  if (web) process.env.UUID_SLUG_ARTIFACT_WEB = "1";
  if (edge) process.env.UUID_SLUG_ARTIFACT_EDGE = "1";
  await command(
    "bun",
    [path.join(project, "node_modules/.bin/publish-clean"), "verify", "--no-git-checks"],
    project,
  );
}

if (import.meta.main)
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
