// Every TypeScript checker consumers may compile this package with, as commands that type-check the
// `tsconfig.json` in their working directory and print `file(line,col): error TSnnnn` lines.
// Checks that judge consumer code run all of them and fail if any one rejects: checking rules and
// bundled libraries change between releases, so one compiler's verdict does not cover the others.
// TypeScript 6 and 7+ are the primary targets; TypeScript 5 is kept for compatibility only.
// - `typescript-floor`: the newest TypeScript 5 release, the oldest supported line.
// - `typescript-checker`: TypeScript 6, the last JavaScript-built release line.
// - `typescript`: the newest release (the native compiler since 7).
// - `bun check`: Bun's embedded compiler, which upgrades with Bun rather than with `typescript`.
import { join } from "node:path";

const tsc = (name: string): [string, ...string[]] => [
  "node",
  join(import.meta.dir, "../node_modules", name, "bin/tsc"),
  "-p",
  ".",
  "--pretty",
  "false",
];

export const typeScriptCheckers: readonly [string, ...string[]][] = [
  tsc("typescript-floor"),
  tsc("typescript-checker"),
  tsc("typescript"),
  ["bun", "check", "--pretty", "false"],
];
