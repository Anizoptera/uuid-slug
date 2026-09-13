import path from "node:path";
import { browserEngines } from "./browser-engines";

/** Run a compiled consumer in each browser engine without loading Playwright in non-browser checks. */
export async function checkBrowserConsumer(bundle: string): Promise<void> {
  const code = await Bun.file(bundle).text();
  const server = Bun.serve({
    port: 0,
    fetch: () =>
      new Response("<!doctype html><title>Consumer probe</title>", {
        headers: { "content-type": "text/html" },
      }),
  });
  try {
    for (const [name, engine] of Object.entries(browserEngines)) {
      const browser = await engine.launch({ headless: true });
      try {
        const page = await browser.newPage();
        await page.goto(server.url.href);
        await page.evaluate((source) => {
          if (typeof globalThis.process !== "undefined")
            throw new Error("Expected a real browser without process.");
          // Await module completion, including any future asynchronous consumer assertions.
          return import(URL.createObjectURL(new Blob([source], { type: "text/javascript" })));
        }, code);
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
