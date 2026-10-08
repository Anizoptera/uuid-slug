// Refuse a runtime lane whose test workers execute in a different engine.
const actual = process.versions.bun ? "bun" : process.versions.deno ? "deno" : "node";
const expected = process.env.UUID_SLUG_TEST_RUNTIME ?? "node";
if (actual !== expected)
  throw new Error(
    `Expected ${expected} test worker, received ${actual} (${process.execPath}). Start Vitest with the expected runtime; for Node use bun run test:node, or node node_modules/vitest/vitest.mjs run for focused tests.`,
  );
const node = process.env.UUID_SLUG_TEST_NODE;
if (node && process.versions.node !== node)
  throw new Error(`Expected Node ${node}, received ${process.versions.node}.`);
console.info(`Test worker: ${actual} ${process.versions[actual]}`);
