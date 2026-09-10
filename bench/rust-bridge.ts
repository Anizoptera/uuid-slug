// Measure real development transport cost separately from direct Rust calls.
import { strict as assert } from "node:assert";
import { loadRustBridge } from "../scripts/rust-bridge";

const bridge = loadRustBridge();
for (const batch of [1, 64]) {
  const requests = Array.from({ length: batch }, (_, index) => ({
    op: "plain",
    input: `0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f${index.toString(16).padStart(4, "0")}`,
  }));
  const input = JSON.stringify(requests);
  const expected = bridge.evaluate(input);
  assert.equal(JSON.parse(expected).length, batch);
  const calls = Math.ceil(10_000 / batch);
  for (let round = 0; round < 5; round++) {
    let bytes = 0;
    const start = performance.now();
    for (let call = 0; call < calls; call++) bytes += bridge.evaluate(input).length;
    const elapsed = performance.now() - start;
    assert.equal(bytes, calls * expected.length);
    console.log(
      JSON.stringify({
        operation: "bridge/plain",
        batch,
        round,
        calls,
        nsPerCall: (elapsed * 1e6) / calls,
        nsPerIdentifier: (elapsed * 1e6) / (calls * batch),
      }),
    );
  }
}
console.log(JSON.stringify({ complete: true }));
