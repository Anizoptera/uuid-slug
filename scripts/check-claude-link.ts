import { readlink } from "node:fs/promises";

let target: string;
try {
  target = await readlink("CLAUDE.md");
} catch {
  throw new Error(
    "CLAUDE.md must be a symlink to AGENTS.md. Restore it with: ln -snf AGENTS.md CLAUDE.md",
  );
}
if (target !== "AGENTS.md")
  throw new Error(
    `CLAUDE.md points to ${JSON.stringify(target)}, not AGENTS.md. Restore it with: ln -snf AGENTS.md CLAUDE.md`,
  );
