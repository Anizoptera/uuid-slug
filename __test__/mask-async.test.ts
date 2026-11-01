// SPDX-License-Identifier: Apache-2.0
import { sharedTest } from "./shared-test-host";
import { asyncMaskCases } from "./mask-async-probe";
for (const entry of asyncMaskCases) sharedTest(entry);
