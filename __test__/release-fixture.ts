// Give release-process tests real annotated tags without depending on the developer's Git identity.
import { command } from "../scripts/command";

export async function tagReleaseFixture(root: string, version: string): Promise<string> {
  const git = (args: string[]) => command("git", args, root);
  await git(["init"]);
  await git(["config", "user.name", "Release test"]);
  await git(["config", "user.email", "test@example.invalid"]);
  await git(["add", "."]);
  await git(["-c", "commit.gpgsign=false", "commit", "-m", version]);
  await git(["-c", "tag.gpgsign=false", "tag", "-a", `v${version}`, "-m", version]);
  return (await git(["rev-parse", "HEAD"])).trim();
}
