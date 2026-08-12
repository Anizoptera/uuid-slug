// SPDX-License-Identifier: Apache-2.0

/**
 * The Node half of the buffer-offset contract. `test/runtime.bun.test.ts` runs the identical list
 * against Bun's adapter; `buffer-contract-probe.ts` explains why one lane cannot stand for both.
 */
import { describe, expect, it } from "vitest";

import { cases } from "./buffer-contract-probe";

describe("buffer offset contract", () => {
  it.each(cases.map((entry) => [entry.name, entry] as const))("%s", (_name, entry) => {
    expect(entry.run()).toBeUndefined();
  });
});
