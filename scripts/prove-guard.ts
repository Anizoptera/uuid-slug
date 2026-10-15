// Proves that a regression test depends on a guard: removes the guard once, runs the test, and
// always puts the file back byte for byte.
//
//   bun scripts/prove-guard.ts <file> <exact guard text> <replacement> -- <test command...>
//
// Exit 0: the test failed without the guard, so it protects the guard.
// Exit 1: the test still passed (it does not reach the guard), or the input was unusable.
//
// Why a script: a hand edit (`sed`, a search-and-replace) that matches nothing leaves the guard in
// place, and the test's green run then reads as "this test does not need the guard". Formatters
// rewrap lines, so a pattern copied from memory often matches nothing. This script refuses to run
// unless the guard text occurs exactly once, and restores the original bytes even when the test
// crashes or the run is interrupted. A backup outside the repository survives a hard kill.
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

const separator = Bun.argv.indexOf("--");
const [file, guard, replacement] = separator < 0 ? [] : Bun.argv.slice(2, separator);
const command = separator < 0 ? [] : Bun.argv.slice(separator + 1);
if (!file || !guard || replacement === undefined || replacement === guard || !command.length) {
  console.error(
    "Use: bun scripts/prove-guard.ts <file> <exact guard text> <replacement> -- <test command...>\n" +
      "The guard text must be non-empty and differ from its replacement.",
  );
  process.exit(1);
}

const original = readFileSync(file);
const text = original.toString("utf8");
const matches = text.split(guard).length - 1;
if (matches !== 1) {
  console.error(
    `${file} contains the guard text ${matches} times; it must occur exactly once. Copy the text ` +
      "from the file as it is now (formatting may have rewrapped it) and extend it until it is unique.",
  );
  process.exit(1);
}

const backupDirectory = mkdtempSync(join(tmpdir(), "prove-guard-"));
const backup = join(backupDirectory, basename(file));
copyFileSync(file, backup);
const restore = () => {
  writeFileSync(file, original);
  if (!readFileSync(file).equals(original))
    throw new Error(`${file} was not restored; copy it back from ${backup}.`);
  rmSync(backupDirectory, { recursive: true, force: true });
};
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    restore();
    process.exit(130);
  });

console.error(`Guard removed from ${file}; backup at ${backup} until the run ends.`);
let passed: boolean;
try {
  // A replacer function keeps `$&`-style patterns in the replacement literal.
  writeFileSync(
    file,
    text.replace(guard, () => replacement),
  );
  passed = Bun.spawnSync(command, { stdout: "inherit", stderr: "inherit" }).success;
} finally {
  restore();
}
if (passed) {
  console.error(
    "The test PASSED without the guard: it does not reach this guard. Make its inputs pass every " +
      "earlier check so they arrive at the guard, then run this again.",
  );
  process.exit(1);
}
console.error("The test FAILED without the guard, so it protects the guard. File restored.");
