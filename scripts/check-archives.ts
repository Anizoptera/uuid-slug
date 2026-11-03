// Archive artifacts belong outside version control; inspect the index, not ignored working files.
import { $ } from "bun";

const archiveExtension =
  /\.(?:7z|a|ar|br|bz2?|cab|cpio|crate|deb|dmg|ear|epub|gem|gz|gzip|iso|jar|lib|lz|lz4|lzma|lzo|nupkg|rar|rpm|tar|tbz2?|tgz|txz|tzst|war|whl|xar|xz|z|zip|zipx|zst|zstd)$/i;
const paths = (await $`git ls-files -z`.text()).split("\0").filter(Boolean);
const archives = paths.filter((path) => archiveExtension.test(path));
// Inspect changed binary blobs too: renaming an archive must not bypass the filename check.
// One TAR header block covers these signatures without reading retained artifacts in full.
const indexed = new Set(paths);
const changes = (await $`git diff --cached --numstat --no-renames -z`.text()).split("\0");
for (const change of changes) {
  if (!change.startsWith("-\t-\t")) continue;
  const path = change.slice(4);
  if (!indexed.has(path) || archives.includes(path)) continue;
  const child = Bun.spawn(["git", "show", `:${path}`], { stdout: "pipe", stderr: "pipe" });
  const diagnostic = new Response(child.stderr).text();
  const reader = child.stdout.getReader();
  const header = new Uint8Array(512);
  let length = 0;
  try {
    while (length < header.length) {
      const { value, done } = await reader.read();
      if (done) break;
      const part = value.subarray(0, header.length - length);
      header.set(part, length);
      length += part.length;
    }
  } finally {
    await reader.cancel();
    child.kill();
    await Promise.all([child.exited, diagnostic]);
  }
  const hex = Buffer.from(header.subarray(0, length)).toString("hex");
  if (
    /^(?:1f8b08|504b(?:0304|0506|0708)|377abcaf271c|526172211a07|fd377a585a00|28b52ffd|04224d18|425a68|213c617263683e0a)/.test(
      hex,
    ) ||
    Buffer.from(header.subarray(257, 262)).toString() === "ustar"
  )
    archives.push(path);
}
if (archives.length) {
  console.error(
    "Archives must not be committed. Keep required artifacts untracked; commit the canonical Markdown report instead.\n" +
      archives.map((path) => `  ${path}`).join("\n") +
      "\nPreserve the data, then untrack each file with git rm --cached -- <path>. Do not rename or encode archives to bypass this policy.",
  );
  process.exitCode = 1;
}
