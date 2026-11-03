// Inspect the index, including force-added ignored output; leave working files untouched.
import { $ } from "bun";

const archiveExtension =
  /\.(?:7z|a|ar|br|bz2?|cab|cpio|crate|deb|dmg|ear|epub|gem|gz|gzip|iso|jar|lib|lz|lz4|lzma|lzo|nupkg|rar|rpm|tar|tbz2?|tgz|txz|tzst|war|whl|xar|xz|z|zip|zipx|zst|zstd)$/i;
const [tracked, ignoredTracked] = await Promise.all([
  $`git ls-files -z`.text(),
  $`git ls-files --cached --ignored --exclude-standard -z`.text(),
]);
const ignored = new Set(ignoredTracked.split("\0"));
const artifacts = tracked
  .split("\0")
  .filter((path) => path.length > 0 && (archiveExtension.test(path) || ignored.has(path)));
if (artifacts.length) {
  console.error(
    "Archives and ignored files must not be committed. Keep required artifacts untracked; commit canonical Markdown reports instead.\n" +
      artifacts.map((path) => `  ${path}`).join("\n") +
      "\nPreserve working files with git rm --cached -- <path>. Correct ignore rules for intentional source; never force-add output or rename/encode archives to bypass this policy.",
  );
  process.exitCode = 1;
}
