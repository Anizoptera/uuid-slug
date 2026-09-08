// SPDX-License-Identifier: Apache-2.0
import { test } from "bun:test";
import { legacyMaskCases } from "./legacy-mask-probe";
for (const entry of legacyMaskCases) test(entry.name, entry.run);
