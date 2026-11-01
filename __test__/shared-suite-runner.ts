// A passing subset cannot certify reuse: compare discovery, case results and native witnesses.
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, relative } from "node:path";
import type { JsonTestResults } from "vitest/node";
import DISCOVERY from "./shared-test-suites.json" with { type: "json" };

export function verifySharedSuites(
  expected: readonly string[],
  report: JsonTestResults,
  output: string,
  transport: string,
): string[] {
  if (!report.success || report.numFailedTests || !report.numTotalTests)
    throw new Error("Shared suites failed or ran no cases; inspect the Vitest report.");
  const observed = report.testResults.map((suite) => relative(process.cwd(), suite.name));
  if (observed.length !== expected.length || expected.some((file) => !observed.includes(file)))
    throw new Error(
      `Shared suite discovery differs: expected ${expected.join(", ")}; ran ${observed.join(", ")}. Remove test filters; every discovered suite must run.`,
    );
  const witnesses: string[] = [];
  for (const suite of report.testResults) {
    if (suite.status !== "passed" || !suite.assertionResults.length)
      throw new Error(`${suite.name}: collection failed or registered no cases. ${suite.message}`);
    let passed = 0;
    for (const test of suite.assertionResults) {
      if (test.status === "passed") passed++;
      else if (test.status !== "skipped" || test.meta.javascriptOnly !== true)
        throw new Error(
          `${suite.name}: ${test.fullName} did not run (${test.status}; metadata ${JSON.stringify(test.meta)}). Only explicitly classified JavaScript host contracts may be skipped.`,
        );
    }
    const prefix = `${transport}: shared suite ${basename(suite.name)} executed `;
    const matches = output.split("\n").filter((line) => line.startsWith(prefix));
    if (!passed && !matches.length) continue; // A fully host-specific file still registered every case.
    const [witness] = matches;
    if (
      matches.length !== 1 ||
      !witness?.endsWith(` in ${passed} cases`) ||
      !/executed [1-9]\d* Rust calls/.test(witness)
    )
      throw new Error(
        `${suite.name}: expected one ${transport} witness for ${passed} executed cases; received ${matches.join("; ")}. Repair backend routing or missing per-case execution.`,
      );
    witnesses.push(witness);
  }
  return witnesses;
}

export async function runRustSharedSuites(
  env: Readonly<Record<string, string>>,
  transport: string,
): Promise<string[]> {
  const expected = new Set<string>();
  const excluded = DISCOVERY.exclude.map((pattern) => new Bun.Glob(pattern));
  for (const pattern of DISCOVERY.include)
    for await (const file of new Bun.Glob(pattern).scan("."))
      if (!excluded.some((glob) => glob.match(file))) expected.add(file);
  const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-shared-suites-"));
  try {
    const file = join(scratch, "results.json");
    const environment: NodeJS.ProcessEnv = {
      ...process.env,
      ...env,
      UUID_SLUG_TEST_BACKEND: "rust",
    };
    if (!Object.hasOwn(env, "UUID_SLUG_RUST_TRANSPORT"))
      delete environment.UUID_SLUG_RUST_TRANSPORT;
    const child = Bun.spawn(
      [
        "bun",
        "scripts/test-vitest.ts",
        "--reporter=default",
        "--reporter=json",
        `--outputFile.json=${file}`,
      ],
      {
        env: environment,
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const [exit, output, errors] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);
    if (exit !== 0)
      throw new Error(`Shared ${transport} tests exited ${exit}.\n${output}\n${errors}`);
    const report = JSON.parse(await readFile(file, "utf8")) as JsonTestResults;
    return verifySharedSuites([...expected], report, output, transport);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}
