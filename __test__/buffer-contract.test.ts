// SPDX-License-Identifier: Apache-2.0

/**
 * The Node half of the buffer-offset contract. `__test__/runtime.bun.test.ts` runs the identical list
 * against Bun's adapter; `buffer-contract-probe.ts` explains why one lane cannot stand for both.
 */
import { describe, expect } from "vitest";
import { sharedTest } from "./shared-test-host";

import { cases } from "./buffer-contract-probe";

describe("buffer offset contract", () => {
  for (const entry of cases)
    sharedTest({
      ...entry,
      run: () => {
        expect(entry.run()).toBeUndefined();
      },
    });
});
