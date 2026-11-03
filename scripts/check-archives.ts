// Inspect the index, including force-added ignored output; leave working files untouched.
import { $ } from "bun";

const archiveExtension =
  /\.(?:7z|a|ar|br|bz2?|cab|cpio|crate|deb|dmg|ear|epub|gem|gz|gzip|iso|jar|lib|lz|lz4|lzma|lzo|nupkg|rar|rpm|tar|tbz2?|tgz|txz|tzst|war|whl|xar|xz|z|zip|zipx|zst|zstd)$/i;
const [tracked, ignoredTracked] = await Promise.all([
  $`git ls-files -z`.text(),
  $`git ls-files --cached --ignored --exclude-standard -z`.text(),
]);
const paths = tracked.split("\0").filter(Boolean);
const archives = paths.filter((path) => archiveExtension.test(path));
const ignored = ignoredTracked.split("\0").filter(Boolean);
if (ignored.length) {
  console.error(
    "Ignored files must not be committed. Keep temporary output, agent state and caches untracked.\n" +
      ignored.map((path) => `  ${path}`).join("\n") +
      "\nPreserve working files with git rm --cached -- <path>. If a source file belongs in Git, correct its ignore rule instead of force-adding it.",
  );
  process.exitCode = 1;
}
if (archives.length) {
  console.error(
    "Archives must not be committed. Keep required artifacts untracked; commit the canonical Markdown report instead.\n" +
      archives.map((path) => `  ${path}`).join("\n") +
      "\nPreserve the data, then untrack each file with git rm --cached -- <path>. Do not rename or encode archives to bypass this policy.",
  );
  process.exitCode = 1;
}
