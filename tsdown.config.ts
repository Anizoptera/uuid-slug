import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["esm"],
    dts: true,
    clean: true,
    outDir: "dist",
    outExtensions: () => ({ js: ".js" }),
  },
  {
    entry: { index: "src/index.ts" },
    format: ["esm"],
    dts: false,
    outDir: "dist/node",
    outExtensions: () => ({ js: ".js" }),
    platform: "node",
  },
  {
    entry: { index: "src/index.ts" },
    format: ["esm"],
    dts: false,
    outDir: "dist/web",
    outExtensions: () => ({ js: ".js" }),
    platform: "browser",
  },
]);
