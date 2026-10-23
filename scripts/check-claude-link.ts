import { readlink, stat } from "node:fs/promises";

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

// Some agents truncate root guidance at 32 KB; a valid symlink cannot prevent that loss.
const guidanceBytes = (await stat("AGENTS.md")).size;
if (guidanceBytes >= 32_768)
  throw new Error(
    `AGENTS.md is ${guidanceBytes} bytes; keep it below 32768 so agents can load every rule. Move detail to its existing owner and retain the root retrieval trigger; never delete requirements to meet the limit.`,
  );
