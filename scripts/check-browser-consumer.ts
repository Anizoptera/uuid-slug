import path from "node:path";
import { browserEngines } from "./browser-engines";

/** Run a compiled consumer in each browser engine without loading Playwright in non-browser checks. */
export async function checkBrowserConsumer(bundle: string): Promise<void> {
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
        '<!doctype html><title>Consumer probe</title><script type="module">import "/consumer.mjs"; document.documentElement.dataset.consumer = "passed";</script>',
        { headers: { "content-type": "text/html" } },
      );
    },
  });
  try {
    for (const [name, engine] of Object.entries(browserEngines)) {
      const browser = await engine.launch({ headless: true });
      try {
        const page = await browser.newPage();
        await page.goto(server.url.href);
        if ((await page.getAttribute("html", "data-consumer")) !== "passed")
          throw new Error(`${name}: packed browser consumer did not complete.`);
        console.log(`${name}: packed browser consumer passed`);
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
