// SPDX-License-Identifier: Apache-2.0
import { test } from "bun:test";
import { asyncMaskCases } from "./mask-async-probe";
for (const entry of asyncMaskCases) test(entry.name, entry.run);
