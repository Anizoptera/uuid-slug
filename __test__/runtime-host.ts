// Refuse a runtime lane whose test workers execute in a different engine.
const actual = process.versions.bun ? "bun" : process.versions.deno ? "deno" : "node";
const expected = process.env.UUID_SLUG_TEST_RUNTIME ?? "node";
if (actual !== expected)
  throw new Error(
    `Expected ${expected} test worker, received ${actual} (${process.execPath}). Start Vitest with the expected runtime; for Node use bun run test:node, or bun scripts/test-vitest.ts for focused tests. Set UUID_SLUG_TEST_RUNTIME=deno for Deno.`,
  );
const node = process.env.UUID_SLUG_TEST_NODE;
if (node && process.versions.node !== node)
  throw new Error(`Expected Node ${node}, received ${process.versions.node}.`);
const version = process.env.UUID_SLUG_TEST_VERSION;
if (version && process.versions[actual] !== version)
  throw new Error(
    `Expected ${actual} ${version} test worker, received ${process.versions[actual]} (${process.execPath}). Preserve the discovered runtime command in UUID_SLUG_TEST_COMMAND; a version-manager variable alone cannot select an executable found through PATH.`,
  );
console.info(`Test worker: ${actual} ${process.versions[actual]}`);
