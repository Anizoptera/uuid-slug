import { join } from "node:path";
import { command } from "./command";
import { annotateRustApi, rustDeprecations } from "./rust-deprecations";
import type { Rustdoc } from "./rust-deprecations";

/** Extract signatures and deprecations from the same crate bytes for local and release checks. */
export async function extractRustApi(
  root: string,
  manifest: string,
  environment: Record<string, string>,
): Promise<{ report: string; declarations: string }> {
  const metadata = JSON.parse(
    await command(
      "cargo",
      ["metadata", "--manifest-path", manifest, "--no-deps", "--format-version", "1", "--locked"],
      root,
      environment,
    ),
  ) as { target_directory: string };
  const reports: string[] = [];
  const declarations: string[] = [];
  // Both feature selections write the same rustdoc JSON. Read each before the next compiler runs;
  // otherwise deprecation on a feature-specific item can be silently attributed to the wrong API.
  for (const [name, prefix, feature] of [
    ["All features", "all", "--all-features"],
    ["No default features", "minimal", "--no-default-features"],
  ] as const) {
    const source = await command(
      "cargo",
      [
        "public-api",
        "--manifest-path",
        manifest,
        "--color=never",
        "--simplified",
        "--include",
        "function-parameter-names",
        feature,
      ],
      root,
      environment,
    );
    const rustdoc = (await Bun.file(
      join(metadata.target_directory, "doc/uuid_slug.json"),
    ).json()) as Rustdoc;
    const annotated = annotateRustApi(source, new Set(rustDeprecations(rustdoc)));
    reports.push(`## ${name}\n\n\`\`\`rust\n${annotated}\n\`\`\``);
    declarations.push(
      source
        .trim()
        .split("\n")
        .map((line) => `${prefix}: ${line}`)
        .join("\n"),
    );
  }
  return {
    report: `# Rust packaged API\n\nThis generated baseline records packaged API signatures for compatibility checks.\n\n${reports.join("\n\n")}\n`,
    declarations: `${declarations.join("\n")}\n`,
  };
}
