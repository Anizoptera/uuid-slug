// SPDX-License-Identifier: Apache-2.0

import { sharedTest } from "./shared-test-host";
import { codecBoundaryCases } from "./codec-boundary-probe";

for (const entry of codecBoundaryCases) sharedTest(entry);
