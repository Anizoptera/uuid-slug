import { mkdir, mkdtemp, readFile, rm, symlink, writeFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import GithubSlugger from "github-slugger";
import { fromMarkdown } from "mdast-util-from-markdown";
import type { Code, Nodes } from "mdast";
import { command } from "./command";
import { runBunInScratch, verificationTimeoutMs } from "./test-bun";

const root = resolve(import.meta.dir, "..");

function visit(node: Nodes, act: (node: Nodes) => void): void {
  act(node);
  if ("children" in node) for (const child of node.children) visit(child, act);
}

function text(node: Nodes): string {
  if ("value" in node) return node.value;
  return "children" in node ? node.children.map(text).join("") : "";
}

/** Read examples from the document so a separate fixture cannot hide broken consumer code. */
export async function checkReadme(file = join(root, "README.md")): Promise<void> {
  const tree = fromMarkdown(await readFile(file, "utf8"));
  const examples: Code[] = [];
  const links = new Set<string>();
  visit(tree, (node) => {
    if (node.type === "code" && (node.lang === "ts" || node.lang === "typescript"))
      examples.push(node);
    if (node.type === "link" || node.type === "definition" || node.type === "image")
      links.add(node.url);
  });
  if (!examples.length)
    throw new Error(`${file}: no TypeScript examples found; refusing an empty check.`);

  const headings = new Map<string, Promise<Set<string>>>();
  async function headingIds(target: string): Promise<Set<string>> {
    let pending = headings.get(target);
    if (!pending) {
      pending = readFile(target, "utf8").then((source) => {
        const ids = new Set<string>();
        // GitHub's punctuation, Unicode and duplicate-heading rules belong to the slugger.
        const slugger = new GithubSlugger();
        visit(fromMarkdown(source), (node) => {
          if (node.type === "heading") ids.add(slugger.slug(text(node)));
        });
        return ids;
      });
      headings.set(target, pending);
    }
    return pending;
  }
  const localLinks = [...links].filter((url) => !/^[a-z][a-z0-9+.-]*:/i.test(url));
  await Promise.all(
    localLinks.map(async (url) => {
      const [path, fragment] = url.split("#");
      const target = path ? resolve(root, decodeURIComponent(path)) : file;
      try {
        await stat(target);
        if (fragment && !(await headingIds(target)).has(decodeURIComponent(fragment))) {
          throw new Error(`Heading #${fragment} does not exist in ${target}.`);
        }
      } catch (cause) {
        throw new Error(`${file}: broken link ${JSON.stringify(url)}. Fix its path or heading.`, {
          cause,
        });
      }
    }),
  );

  const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-readme-"));
  try {
    const modules = join(scratch, "node_modules/@anizoptera");
    await mkdir(modules, { recursive: true });
    await symlink(root, join(modules, "uuid-slug"), "dir");
    const entrypoints = await Promise.all(
      examples.map(async (example, index) => {
        const entry = join(
          scratch,
          `example-${index + 1}-readme-line-${example.position?.start.line}.mts`,
        );
        await writeFile(entry, example.value + "\n");
        return entry;
      }),
    );
    const config = join(scratch, "tsconfig.json");
    await writeFile(
      config,
      JSON.stringify({
        compilerOptions: {
          strict: true,
          noEmit: true,
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          types: [],
          paths: { "@anizoptera/uuid-slug": [join(root, "dist/index.d.ts")] },
        },
        files: entrypoints,
      }),
    );
    // One compiler program checks every standalone module against the shipped declaration graph.
    await command(
      process.execPath,
      [join(root, "node_modules/typescript/bin/tsc"), "-p", config],
      root,
    );
    const built = await Bun.build({
      entrypoints,
      outdir: scratch,
      target: "node",
      format: "esm",
      packages: "external",
      naming: "[name].mjs",
      check: true,
    });
    if (!built.success)
      throw new Error(
        `README examples failed to build:\n${built.logs.map((log) => log.message).join("\n")}`,
      );
    const executions = await Promise.allSettled(
      built.outputs.flatMap((output) =>
        ["node", process.execPath].map(async (host) => {
          const child = Bun.spawn([host, output.path], {
            cwd: root,
            stdout: "ignore",
            stderr: "pipe",
            timeout: verificationTimeoutMs(5000),
            killSignal: "SIGKILL",
          });
          // Examples report error values on stderr without necessarily setting a failing exit code.
          const [stderr, exit] = await Promise.all([
            new Response(child.stderr).text(),
            child.exited,
          ]);
          if (exit !== 0 || stderr)
            throw new Error(`${host}: ${output.path} failed (${exit}).\n${stderr}`);
        }),
      ),
    );
    // Drain every child before removing files another example may still be loading.
    const failures = executions.filter((result) => result.status === "rejected");
    if (failures.length)
      throw new AggregateError(
        failures.map((result) => result.reason),
        "README example failures",
      );
    console.log(
      `README: ${examples.length} standalone TS examples compiled and ran on Node/Bun; ${localLinks.length} local links passed.`,
    );
  } catch (cause) {
    throw new Error(
      `README verification failed. Fix the named example, then rerun bun scripts/check-readme.ts after building.`,
      { cause },
    );
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  // The existing parent supervisor removes scratch even if the checker is interrupted.
  if (process.argv[2] === "--worker") await checkReadme(process.argv[3]);
  else
    process.exitCode = await runBunInScratch([
      import.meta.path,
      "--worker",
      ...process.argv.slice(2),
    ]);
}
