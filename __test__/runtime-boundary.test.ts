// SPDX-License-Identifier: Apache-2.0
import { sharedTest } from "./shared-test-host";
import { runtimeBoundaryCases } from "./runtime-boundary-probe";
for (const entry of runtimeBoundaryCases) sharedTest(entry);
