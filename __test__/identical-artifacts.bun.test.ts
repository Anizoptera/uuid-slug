// SPDX-License-Identifier: Apache-2.0

import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "bun:test";
import { identicalArtifacts } from "../bench/identical-artifacts";

async function expectIdentityFailure(
  before: string,
  after: string,
  message: string,
): Promise<void> {
  const result = await identicalArtifacts(before, after).catch((error: unknown) => error);
  expect(result).toHaveProperty("message", expect.stringContaining(message));
}

test("packed identity cannot hide changed source, output, metadata or files", async () => {
  const scratch = await mkdtemp(join(tmpdir(), "uuid-slug-identity-"));
  const before = join(scratch, "before");
  const after = join(scratch, "after");
  const roots = [before, after];
  // Copy real source, emitted code and metadata; the oracle judges file identity, not behavior.
  const files = ["src/index.ts", "dist/index.js", "package.json"];
  try {
    await Promise.all(
      roots.flatMap((root) =>
        ["src", "dist"].map((dir) => mkdir(join(root, dir), { recursive: true })),
      ),
    );
    await Promise.all(
      roots.flatMap((root) =>
        files.map((name) => copyFile(join(import.meta.dir, "..", name), join(root, name))),
      ),
    );
    expect(await identicalArtifacts(before, after)).toBe(true);
    await writeFile(join(after, "README.md"), "Documentation does not execute.");
    expect(await identicalArtifacts(before, after)).toBe(true);
    // Each mutation must settle and restore before the next can identify a different defect.
    /* eslint-disable no-await-in-loop */
    for (const name of files) {
      const filename = join(after, name);
      const original = await readFile(filename);
      await writeFile(filename, Buffer.concat([original, Buffer.from("\nchanged")]));
      expect(await identicalArtifacts(before, after)).toBe(false);
      await writeFile(filename, original);
    }
    /* eslint-enable no-await-in-loop */
    await writeFile(join(after, "payload.bin"), "new asset");
    expect(await identicalArtifacts(before, after)).toBe(false);
    await rm(join(after, "payload.bin"));
    // The README exemption must apply only to ordinary files, never symlinks.
    await rm(join(after, "README.md"));
    await symlink(join(after, "src/index.ts"), join(after, "README.md"));
    await expectIdentityFailure(before, after, "Unsupported packed file kind");
    await rm(join(after, "README.md"));
    await rm(join(after, "dist/index.js"));
    await expectIdentityFailure(before, after, "compiled files");
    await copyFile(join(before, "dist/index.js"), join(after, "dist/index.js"));
    await rm(join(after, "src/index.ts"));
    await expectIdentityFailure(before, after, "source");
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});
