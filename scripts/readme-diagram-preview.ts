// Local review page for README diagram changes: the working-tree build next to a committed
// version, switchable in place, in GitHub's dark or light theme, at README width or full size.
//
//   bun scripts/readme-diagram-preview.ts [ref] [extra.svg ...]
//
// `ref` (default HEAD) names the committed diagram to compare against; extra SVG paths add
// more variants, e.g. a DIAGRAM_OUT build of an experiment. Keys: 0-9 or arrows switch,
// hold Space for the previously shown variant, B toggles dark/light, M toggles README width.
//
// Why a page and not screenshots: hover and motion are the diagram's main rulings and only a
// live document shows them; switching in place without reload makes small shifts visible.
// The build goes through scripts/readme-diagram.ts with DIAGRAM_OUT, so the preview runs the
// same generator and hover checks as the README asset and never overwrites it.
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const ASSET = "docs/assets/uuid-representations.svg";
const root = resolve(import.meta.dir, "..");
const [ref = "HEAD", ...extras] = Bun.argv.slice(2);
const dir = await mkdtemp(join(tmpdir(), "uuid-slug-diagram-"));
const cleanup = async () => {
  await rm(dir, { recursive: true, force: true });
  process.exit(0);
};
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

const files = new Map<string, string>();
const variants: [string, string, string][] = [];

const working = join(dir, "working.svg");
const build = Bun.spawnSync(["bun", "scripts/readme-diagram.ts"], {
  cwd: root,
  env: { ...process.env, DIAGRAM_OUT: working },
  stdout: "inherit",
  stderr: "inherit",
});
// A failed hover check still writes the SVG; show it, because seeing the break is the point.
if (await Bun.file(working).exists()) {
  files.set("working.svg", working);
  variants.push([
    "working tree",
    "working.svg",
    build.success ? "current source" : "current source, CHECKS FAILED (see terminal)",
  ]);
} else console.error("The generator produced no SVG; showing committed versions only.");

const committed = Bun.spawnSync(["git", "show", `${ref}:${ASSET}`], { cwd: root });
if (committed.success) {
  const path = join(dir, "committed.svg");
  await Bun.write(path, committed.stdout);
  files.set("committed.svg", path);
  variants.push([ref, "committed.svg", `${ASSET} at ${ref}`]);
} else console.error(`git show ${ref}:${ASSET} failed; no committed variant.`);

extras.forEach((p, i) => {
  const name = `extra-${i}.svg`;
  files.set(name, resolve(p));
  variants.push([basename(p), name, resolve(p)]);
});
if (variants.length === 0) await cleanup();

const page = (await Bun.file(join(import.meta.dir, "readme-diagram-preview.html")).text()).replace(
  "__VARIANTS__",
  () => JSON.stringify(variants),
);
const server = Bun.serve({
  port: 0,
  fetch(req) {
    const name = new URL(req.url).pathname.slice(1);
    if (!name) return new Response(page, { headers: { "content-type": "text/html" } });
    const path = files.get(name);
    return path ? new Response(Bun.file(path)) : new Response("not found", { status: 404 });
  },
});
console.log(`Diagram preview: ${server.url}  (Ctrl-C stops it and deletes ${dir})`);
