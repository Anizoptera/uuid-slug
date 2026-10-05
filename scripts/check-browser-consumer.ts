import path from "node:path";
import { browserEngines } from "./browser-engines";

/** Run a compiled consumer in each browser engine without loading Playwright in non-browser checks. */
export async function checkBrowserConsumer(
  bundle: string,
  selectedEngine?: keyof typeof browserEngines,
  query = "",
): Promise<void> {
  const code = await Bun.file(bundle).text();
  const server = Bun.serve({
    port: 0,
    fetch: (request) => {
      if (new URL(request.url).pathname === "/consumer.mjs")
        return new Response(
          `if (typeof globalThis.process !== "undefined") throw new Error("Expected a real browser without process.");\n${code}`,
          { headers: { "content-type": "text/javascript" } },
        );
      return new Response(
        '<!doctype html><title>Consumer probe</title><script type="module">try { await import("/consumer.mjs"); document.documentElement.dataset.consumer = "passed"; } catch (error) { document.documentElement.dataset.consumer = "failed"; document.documentElement.dataset.consumerError = String(error); }</script>',
        { headers: { "content-type": "text/html" } },
      );
    },
  });
  try {
    for (const [name, engine] of Object.entries(browserEngines)) {
      if (selectedEngine && name !== selectedEngine) continue;
      const browser = await engine.launch({ headless: true });
      try {
        const page = await browser.newPage();
        const errors: Error[] = [];
        page.on("pageerror", (error) => errors.push(error));
        await page.goto(`${server.url.href}?${query}`);
        // A module can await imports after navigation completes; inspect its completion signal,
        // not the load event. Keep execution errors when readiness fails so the caller can act.
        try {
          await page.waitForFunction(
            () => document.documentElement.dataset.consumer !== undefined,
            undefined,
            { timeout: 5_000 },
          );
          if ((await page.getAttribute("html", "data-consumer")) !== "passed")
            throw new Error(
              (await page.getAttribute("html", "data-consumer-error")) ?? "Browser module failed",
            );
        } catch (cause) {
          throw new Error(
            `${name}: packed browser consumer did not complete: ${[...errors, cause].map(String).join("\n")}`,
            {
              cause,
            },
          );
        }
        console.log(`${name}: packed browser consumer passed (${browser.version()})`);
      } finally {
        await browser.close();
      }
    }
  } finally {
    await server.stop(true);
  }
}

if (import.meta.main) {
  const bundle = process.argv[2];
  if (!bundle) throw new Error("Usage: check-browser-consumer.ts <bundle.mjs>");
  await checkBrowserConsumer(path.resolve(bundle));
}
