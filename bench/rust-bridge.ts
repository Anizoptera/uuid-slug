// Measure real development transport cost separately from typed Rust calls.
import { strict as assert } from "node:assert";
import { loadRustBridge } from "../scripts/rust-bridge";

const bridge = await loadRustBridge();
try {
  console.log(JSON.stringify({ transport: bridge.transport }));
  const startup = process.argv.includes("--startup");
  if (!startup) {
    for (const batch of [0, 1, 64]) {
      const requests = Array.from({ length: batch }, (_, index) => ({
        op: "plain",
        input: `0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f${index.toString(16).padStart(4, "0")}`,
      }));
      const input = JSON.stringify(requests);
      const expected = bridge.evaluate(input);
      const responses = JSON.parse(expected) as { value?: string; error?: string }[];
      assert.equal(responses.length, batch);
      // Every response must carry a slug: an unknown op returns an error per request and would
      // otherwise time the error path at the same length.
      assert.ok(responses.every((response) => typeof response.value === "string"));
      const calls = Math.ceil(10_000 / Math.max(batch, 1));
      for (let round = 0; round < 5; round++) {
        let bytes = 0;
        const start = performance.now();
        for (let call = 0; call < calls; call++) bytes += bridge.evaluate(input).length;
        const elapsed = performance.now() - start;
        assert.equal(bytes, calls * expected.length);
        console.log(
          JSON.stringify({
            operation: "bridge/dispatch",
            batch,
            round,
            calls,
            nsPerCall: (elapsed * 1e6) / calls,
            ...(batch > 0 ? { nsPerIdentifier: (elapsed * 1e6) / (calls * batch) } : {}),
          }),
        );
      }
    }
    const uuid = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f0000";
    const expected = "AZChssPUfl-KmwwdLj8AAA";
    assert.equal(bridge.plain(uuid), expected);
    for (let round = 0; round < 5; round++) {
      let bytes = 0;
      const start = performance.now();
      for (let call = 0; call < 100_000; call++) bytes += bridge.plain(uuid).length;
      const elapsed = performance.now() - start;
      assert.equal(bytes, 100_000 * expected.length);
      console.log(
        JSON.stringify({
          operation: "bridge/plain",
          round,
          calls: 100_000,
          nsPerCall: (elapsed * 1e6) / 100_000,
        }),
      );
    }
  }
  console.log(JSON.stringify({ complete: true }));
} finally {
  bridge.close();
}
