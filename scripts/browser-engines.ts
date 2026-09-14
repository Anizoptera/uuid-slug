import { chromium, firefox, webkit } from "playwright";

/** Browser engines with independent JavaScript and WebAssembly implementations. */
export const browserEngines = { chromium, firefox, webkit } as const;

if (import.meta.main) {
  const names = process.argv.slice(2);
  const selected = names.length ? names : Object.keys(browserEngines);
  if (selected.some((name) => !(name in browserEngines)))
    throw new Error(
      `Browser must be one of ${Object.keys(browserEngines).join(", ")}; got ${selected.join(", ")}.`,
    );
  const child = Bun.spawn(["bunx", "playwright", "install", "--with-deps", ...selected], {
    stdout: "inherit",
    stderr: "inherit",
  });
  const status = await child.exited;
  if (status !== 0)
    throw new Error(
      `Playwright failed to install ${selected.join(", ")} with exit code ${status}.`,
    );
}
