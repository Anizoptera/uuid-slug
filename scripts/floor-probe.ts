// Run the package-only consumer probe on each declared runtime floor, from a real consumer install.
//
// Why this exists: a floor nobody executes rots silently. `scripts/runtime-probe.ts` cannot serve
// here: it imports rival libraries through `bench/candidates`, and they fail on old runtimes before
// this package runs. `__test__/consumer-probe.ts` imports only the package. `scripts/check-artifact.ts`
// proves packaging on the installed current runtimes; this probe downloads the floor releases instead.
//
// Why real installs: Deno rejects TypeScript inside npm packages, both from its npm cache and from
// a node_modules directory. A symlinked or path-imported package hides that rejection, so Node and
// Bun load a real node_modules directory, and Deno resolves `npm:` from a local registry that
// serves the same tarball.
//
// Bun and Deno floors come from package.json `engines`. The Node engines floor is not repeated here:
// the `runtimes` CI matrix already runs that exact release with the full shared-contract probe.
// `docs/cross-language.md` §Runtime floors owns why each floor holds.
// Usage: bun scripts/floor-probe.ts [package.tgz]
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { command } from "./command";

const project = path.resolve(import.meta.dir, "..");
const manifest = await Bun.file(path.join(project, "package.json")).json();
const NAME: string = manifest.name;

// README and docs state Node "works from 16.20" beside the supported engines floor; keep it run.
const NODE_WORKS_FROM = "16.20.2";

function floorVersion(key: "bun" | "deno"): string {
  const range: unknown = manifest.engines?.[key];
  const match = typeof range === "string" ? /^>=(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec(range) : null;
  if (!match)
    throw new Error(
      `package.json engines.${key} must be ">=MAJOR[.MINOR[.PATCH]]" so this probe can run that exact floor; got ${JSON.stringify(range)}.`,
    );
  return `${match[1]}.${match[2] ?? 0}.${match[3] ?? 0}`;
}

type Runtime = "node" | "bun" | "deno";

// Release asset names per host; floors run where CI runs (Linux x64) and on maintainer Macs.
function download(runtime: Runtime, version: string): { url: string; exe: string } {
  const linux = process.platform === "linux";
  const arm = process.arch === "arm64";
  if (!linux && process.platform !== "darwin")
    throw new Error(`floor-probe supports Linux and macOS hosts, not ${process.platform}.`);
  if (runtime === "node") {
    const target = `${linux ? "linux" : "darwin"}-${arm ? "arm64" : "x64"}`;
    return {
      url: `https://nodejs.org/dist/v${version}/node-v${version}-${target}.tar.gz`,
      exe: "bin/node",
    };
  }
  if (runtime === "bun") {
    const target = `${linux ? "linux" : "darwin"}-${arm ? "aarch64" : "x64"}`;
    return {
      url: `https://github.com/oven-sh/bun/releases/download/bun-v${version}/bun-${target}.zip`,
      exe: "bun",
    };
  }
  const target = `${arm ? "aarch64" : "x86_64"}-${linux ? "unknown-linux-gnu" : "apple-darwin"}`;
  return {
    url: `https://github.com/denoland/deno/releases/download/v${version}/deno-${target}.zip`,
    exe: "deno",
  };
}

async function fetchRuntime(root: string, runtime: Runtime, version: string): Promise<string> {
  const { url, exe } = download(runtime, version);
  const dir = path.join(root, "bin", `${runtime}-${version}`);
  await mkdir(dir, { recursive: true });
  const archive = path.join(dir, path.basename(url));
  await command("curl", ["-fsSL", "-o", archive, url], dir, undefined, { timeoutMs: 300_000 });
  if (archive.endsWith(".zip")) await command("unzip", ["-q", "-o", "-j", archive], dir);
  else await command("tar", ["-xzf", archive, "--strip-components=1"], dir);
  await command("chmod", ["+x", path.join(dir, exe)], dir);
  return path.join(dir, exe);
}

// `command` wraps a failed child in an Error whose cause carries its stderr. Deno prints a
// "Download …" line per fetched module; drop them so the failure reason leads.
function reason(error: unknown): string {
  const stderr = error instanceof Error ? (error.cause as { stderr?: unknown })?.stderr : undefined;
  const text = typeof stderr === "string" ? stderr : String(error);
  return text
    .split("\n")
    .filter((line) => !line.startsWith("Download "))
    .join("\n");
}

const root = await mkdtemp(path.join(tmpdir(), "uuid-slug-floors-"));
let failed = false;
try {
  let tarball = process.argv[2] ? path.resolve(process.argv[2]) : "";
  if (!tarball) {
    const packed = await command("bun", ["pm", "pack", "--destination", root, "--quiet"], project);
    tarball = packed.trim().split("\n").at(-1) ?? "";
  }
  const bytes = await Bun.file(tarball).bytes();

  // One bundle per run: the probe body plus its fixtures, with the package left as the only import.
  const entry = path.join(root, "entry.ts");
  await Bun.write(
    entry,
    `import * as api from ${JSON.stringify(NAME)};\nimport { probeConsumer } from ${JSON.stringify(path.join(project, "__test__/consumer-probe.ts"))};\nawait probeConsumer(api);\nconsole.log("floor probe passed");\n`,
  );
  const built = await Bun.build({ entrypoints: [entry], target: "node", external: [NAME] });
  if (!built.success) throw new AggregateError(built.logs, "Floor probe bundle failed.");
  const probe = await built.outputs[0]!.text();

  const consumer = path.join(root, "consumer");
  const installed = path.join(consumer, "node_modules", ...NAME.split("/"));
  await mkdir(installed, { recursive: true });
  await command("tar", ["-xzf", tarball, "-C", installed, "--strip-components=1"], root);
  await Bun.write(path.join(consumer, "package.json"), '{"type":"module"}');
  await Bun.write(path.join(consumer, "probe.mjs"), probe);

  // Deno needs a registry for `npm:`; serve only this tarball under its packed version.
  const packedVersion: string = (await Bun.file(path.join(installed, "package.json")).json())
    .version;
  const registry = Bun.serve({
    port: 0,
    fetch(request): Response {
      const url = new URL(request.url);
      if (url.pathname === "/package.tgz") return new Response(bytes);
      if (decodeURIComponent(url.pathname.slice(1)) !== NAME)
        return new Response("{}", { status: 404 });
      const dist = {
        tarball: new URL("/package.tgz", url).href,
        shasum: createHash("sha1").update(bytes).digest("hex"),
        integrity: `sha512-${createHash("sha512").update(bytes).digest("base64")}`,
      };
      return Response.json({
        name: NAME,
        "dist-tags": { latest: packedVersion },
        versions: {
          [packedVersion]: { name: NAME, version: packedVersion, dependencies: {}, dist },
        },
      });
    },
  });
  const denoDir = path.join(root, "deno");
  await mkdir(denoDir);
  await Bun.write(
    path.join(denoDir, "probe.mjs"),
    probe.replace(`from "${NAME}"`, () => `from "npm:${NAME}@${packedVersion}"`),
  );

  const lanes: [Runtime, string][] = [
    ["node", NODE_WORKS_FROM],
    ["bun", floorVersion("bun")],
    ["deno", floorVersion("deno")],
  ];
  const results = await Promise.allSettled(
    lanes.map(async ([runtime, version]) => {
      const exe = await fetchRuntime(root, runtime, version);
      const output =
        runtime === "deno"
          ? await command(exe, ["run", "-A", "probe.mjs"], denoDir, {
              NPM_CONFIG_REGISTRY: `http://localhost:${registry.port}/`,
              DENO_DIR: path.join(denoDir, `cache-${version}`),
              NO_COLOR: "1",
            })
          : await command(exe, ["probe.mjs"], consumer, { NO_COLOR: "1" });
      if (!output.includes("floor probe passed"))
        throw new Error(`${runtime} ${version} exited without the probe's success line.`);
      return `${runtime} ${version}`;
    }),
  );
  await registry.stop(true);
  const failures = results.flatMap((result, index) =>
    result.status === "rejected" ? [`${lanes[index]!.join(" ")}: ${reason(result.reason)}`] : [],
  );
  if (failures.length) {
    failed = true;
    throw new Error(
      `Runtime floor probe failed:\n${failures.join("\n\n")}\n\nA declared floor no longer runs the package. Fix the package, or raise the floor in package.json engines and record the reason in docs/cross-language.md §Runtime floors.`,
    );
  }
  console.log(
    `Runtime floors passed: ${results.map((r) => (r.status === "fulfilled" ? r.value : "")).join(", ")}.`,
  );
} finally {
  if (!failed) await rm(root, { recursive: true, force: true });
  else console.error(`Floor probe files kept in ${root}`);
}
