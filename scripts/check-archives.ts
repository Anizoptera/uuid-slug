// Archive artifacts belong outside version control; inspect the index, not ignored working files.
import { $ } from "bun";

const archiveExtension =
  /\.(?:7z|a|ar|br|bz2?|cab|cpio|crate|deb|dmg|ear|epub|gem|gz|gzip|iso|jar|lib|lz|lz4|lzma|lzo|nupkg|rar|rpm|tar|tbz2?|tgz|txz|tzst|war|whl|xar|xz|z|zip|zipx|zst|zstd)$/i;
const paths = (await $`git ls-files -z`.text()).split("\0").filter(Boolean);
const archives = paths.filter((path) => archiveExtension.test(path));
if (archives.length) {
  console.error(
    "Archives must not be committed. Keep required artifacts untracked; commit the canonical Markdown report instead.\n" +
      archives.map((path) => `  ${path}`).join("\n") +
      "\nPreserve the data, then untrack each file with git rm --cached -- <path>. Do not rename or encode archives to bypass this policy.",
  );
  process.exitCode = 1;
}
