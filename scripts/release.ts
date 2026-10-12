// Scope the exact release target to versioning and its checks; ordinary commits stay in dev mode.
import { validateVersion } from "./api-evolution";

const [version, ...extra] = process.argv.slice(2);
if (!version || extra.length) throw new Error("Usage: bun run release <X.Y.Z>");
validateVersion(version, `v${version}`);

// pnpm owns the complete lifecycle, commit and annotated tag. Its hook runs before the tag
// exists, so checks need the target version, not a fabricated tag or a disabled hook.
const child = Bun.spawn(["pnpm", "version", "--allow-same-version", "--message", "%s", version], {
  cwd: process.cwd(),
  env: { ...process.env, UUID_SLUG_RELEASE_VERSION: version },
  stdout: "inherit",
  stderr: "inherit",
});
process.exitCode = await child.exited;
