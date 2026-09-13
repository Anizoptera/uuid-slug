// SPDX-License-Identifier: Apache-2.0
import { test } from "bun:test";
import { runtimeBoundaryCases } from "./runtime-boundary-probe";
for (const entry of runtimeBoundaryCases) test(entry.name, entry.run);
