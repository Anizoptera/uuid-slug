// SPDX-License-Identifier: Apache-2.0

// Run the same resource budgets in a real browser; Node polyfills must not replace Web Crypto.
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { checkBrowserConsumer } from "../scripts/check-browser-consumer";
import { RESOURCE_REGRESSION_CASES } from "../__test__/resource-regression-cases";

export async function checkChromiumResources(): Promise<void> {
  const reports = join(import.meta.dir, "reports");
  await mkdir(reports, { recursive: true });
  const directory = await mkdtemp(join(reports, "browser-resources-"));
  let passed = false;
  try {
    // Result-preserving defects separate a resource rejection from incorrect identifiers.
    // Keep the existing fixture and budgets as the oracle; only the browser build differs.
    const result = await Bun.build({
      check: true,
      entrypoints: [join(import.meta.dir, "resources.ts")],
      target: "browser",
      outdir: directory,
      naming: "resources.mjs",
      plugins: [
        {
          name: "packed-resource-api",
          setup(builder) {
            builder.onResolve({ filter: /^@anizoptera\/uuid-slug$/ }, () => ({
              path: join(import.meta.dir, "..", "dist", "index.js"),
            }));
          },
        },
      ],
      define: {
        process: "undefined",
        "process.env.UUID_SLUG_PROFILE_MODULE": JSON.stringify(
          join(import.meta.dir, "..", "__test__", "resource-regression-probe.ts"),
        ),
        "process.env.UUID_SLUG_RESOURCE_ENTROPY_BURST": "undefined",
        "process.pid": "0",
      },
    });
    if (!result.success) throw new AggregateError(result.logs, "Browser resource build failed");
    // Each fresh browser receives a different defect while sharing one compiled counter and API.
    for (const [mode, diagnostic] of RESOURCE_REGRESSION_CASES) {
      const name = mode || "control";
      let failure: unknown;
      try {
        await checkBrowserConsumer(
          join(directory, "resources.mjs"),
          "chromium",
          `resource-regression=${encodeURIComponent(mode)}`,
        );
      } catch (error) {
        failure = error;
      }
      if (
        mode
          ? !(failure instanceof Error) || !failure.message.includes(diagnostic)
          : failure !== undefined
      )
        throw new Error(`Chromium resource ${name} did not reach its expected outcome`, {
          cause: failure,
        });
      console.log(`chromium resources: ${name} ${mode ? "rejected as expected" : "passed"}`);
    }
    passed = true;
  } finally {
    if (passed) await rm(directory, { recursive: true, force: true });
    else console.error(`Browser resource proof failed; bundles remain in ${directory}.`);
  }
}

if (import.meta.main) await checkChromiumResources();
