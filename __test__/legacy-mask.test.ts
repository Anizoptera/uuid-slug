// SPDX-License-Identifier: Apache-2.0
import { sharedTest } from "./shared-test-host";
import { legacyMaskCases } from "./legacy-mask-probe";
for (const entry of legacyMaskCases) sharedTest(entry);
