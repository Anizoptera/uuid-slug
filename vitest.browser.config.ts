import { createRequire } from "node:module";
import { resolve } from "node:path";
import { defineConfig, mergeConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { browserEngines } from "./scripts/browser-engines";
import base from "./vitest.config";

const directory = process.env.UUID_SLUG_WASM_BROWSER;
if (!directory || process.env.UUID_SLUG_TEST_BACKEND !== "rust")
  throw new Error("Run the optimized WASM owner: bun scripts/rust-wasm.ts.");
const unavailable = resolve("__test__/browser-unavailable.ts");
const require = createRequire(import.meta.url);

export default mergeConfig(
  base,
  defineConfig({
    server: {
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      },
    },
    define: {
      "process.env": JSON.stringify({
        UUID_SLUG_TEST_BACKEND: "rust",
        UUID_SLUG_WASM_BRIDGE: "browser",
      }),
      "process.versions": "({})",
      "process.execArgv": "[]",
    },
    resolve: {
      conditions: ["browser"],
      alias: [
        { find: "#runtime", replacement: resolve("src/runtime/portable.ts") },
        { find: "node:assert/strict", replacement: resolve("__test__/browser-assert.ts") },
        { find: "node:assert", replacement: require.resolve("assert/") },
        { find: "node:timers/promises", replacement: resolve("__test__/browser-host.ts") },
        ...[
          "node:vm",
          "node:crypto",
          "node:child_process",
          "node:fs/promises",
          "node:os",
          "node:path",
          "node:url",
          "../scripts/command",
          "../scripts/archive-scratch",
          "../src/runtime/node",
        ].map((find) => ({ find, replacement: unavailable })),
        { find: "../scripts/rust-bridge", replacement: resolve("__test__/browser-wasm.ts") },
      ],
    },
    plugins: [
      {
        name: "uuid-slug-optimized-browser-wasm",
        resolveId: (id) => (id === "uuid-slug-test-wasm" ? "\0uuid-slug-test-wasm" : undefined),
        load(id) {
          if (id !== "\0uuid-slug-test-wasm") return undefined;
          return `export {default, evaluate} from ${JSON.stringify(resolve(directory, "uuid_slug_bridge.js"))}; export {default as binaryUrl} from ${JSON.stringify(resolve(directory, "optimized.wasm") + "?url")};`;
        },
      },
    ],
    test: {
      browser: {
        enabled: true,
        headless: true,
        // These cases inspect bytes and typed failures; screenshots of the runner add no evidence.
        screenshotFailures: false,
        provider: playwright(),
        instances: (Object.keys(browserEngines) as (keyof typeof browserEngines)[]).map(
          (browser) => ({ browser }),
        ),
      },
    },
  }),
);
