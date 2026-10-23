// Toolchain selection must reach child processes, including tools they launch themselves.
import { expect, test } from "bun:test";
import { delimiter, dirname, join } from "node:path";
import { command } from "../command";

test("commands preserve explicit PATH while keeping local binaries first", async () => {
  const cwd = process.cwd();
  const selectedPath = dirname(process.execPath);
  const readPath = ["-e", "process.stdout.write(process.env.PATH ?? '')"];
  expect(await command(process.execPath, readPath, cwd, { PATH: selectedPath })).toBe(
    `${join(cwd, "node_modules/.bin")}${delimiter}${selectedPath}`,
  );
  expect(await command(process.execPath, readPath, cwd)).toBe(
    `${join(cwd, "node_modules/.bin")}${delimiter}${process.env.PATH ?? ""}`,
  );
});
