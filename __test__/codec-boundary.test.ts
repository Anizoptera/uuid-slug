// SPDX-License-Identifier: Apache-2.0

import { test } from "vitest";
import { codecBoundaryCases } from "./codec-boundary-probe";

for (const entry of codecBoundaryCases) test(entry.name, entry.run);
