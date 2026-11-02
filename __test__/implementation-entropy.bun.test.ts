// A valid-looking UUID must not qualify when its generator bypasses the secure provider.
import { expect, test } from "bun:test";
import { resolve } from "node:path";
import type { EntropyEvidence } from "../bench/implementation-entropy";

test("the actual benchmark worker rejects source failure and recovers through real Web Crypto", async () => {
  const child = Bun.spawn(
    [
      process.execPath,
      "bench/implementation-cli.ts",
      JSON.stringify({
        samples: 1,
        duration: 1,
        warmup: 2,
        filter: "=plain/base32",
        batchTicks: 40,
      }),
    ],
    { cwd: resolve(import.meta.dir, ".."), stdout: "pipe", stderr: "pipe" },
  );
  const [output, diagnostic, exit] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (exit !== 0) throw new Error(`Benchmark worker failed: ${diagnostic}`);
  const result: { entropy: EntropyEvidence; rows: { name: string; resultWitness?: number }[] } =
    JSON.parse(output);
  expect(result.entropy.required).toBe(true);
  expect(result.entropy.rejectedSourceCalls).toBeGreaterThan(0);
  expect(result.entropy.secureSourceCalls).toBeGreaterThan(0);
  expect(result.entropy.sources).toContain("crypto.getRandomValues");
  expect(result.rows.map((row) => row.name)).toEqual(["plain/base32"]);
  expect(Number.isInteger(result.rows[0]?.resultWitness)).toBe(true);
});
