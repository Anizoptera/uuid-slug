// Keep Node ambient types out of the browser-only declaration fixture while checking real hosts.
import { cp, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { command } from "./command";
import { typeScriptCheckers } from "./typescript-compilers";

export async function checkConsumerInterop(root: string, project: string): Promise<void> {
  const directory = join(root, "interop");
  await mkdir(directory);
  await Promise.all([
    cp(join(project, "node_modules/uuid"), join(root, "node_modules/uuid"), {
      recursive: true,
      dereference: true,
    }),
    cp(join(project, "__test__/consumer-interop.fixture.ts"), join(directory, "consumer.ts")),
  ]);
  await Bun.write(
    join(directory, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        noEmit: true,
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        types: ["node"],
        typeRoots: [join(project, "node_modules/@types")],
        skipLibCheck: false,
      },
      files: ["consumer.ts"],
    }),
  );
  const built = await Bun.build({
    check: true,
    tsconfig: join(directory, "tsconfig.json"),
    entrypoints: [join(directory, "consumer.ts")],
    target: "node",
    packages: "external",
    outdir: directory,
    naming: "consumer.mjs",
  });
  if (!built.success)
    throw new AggregateError(built.logs, "Packed interoperability consumer did not build");
  const runner = join(directory, "consumer.mjs");
  const checks = await Promise.allSettled([
    ...typeScriptCheckers.map(([checker, ...args]) => command(checker, args, directory)),
    command("node", [runner], directory),
    command("bun", [runner], directory),
    command(
      "deno",
      ["run", "--node-modules-dir=manual", "--cached-only", "--allow-read", runner],
      directory,
    ),
  ]);
  const errors = checks
    .filter((result) => result.status === "rejected")
    .map((result) => result.reason);
  if (errors.length) throw new AggregateError(errors, "Packed UUID interoperability failed");
}
