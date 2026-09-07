// SPDX-License-Identifier: Apache-2.0
import { test } from "vitest";
import { asyncSchemaCases } from "./schema-async-probe";
for (const entry of asyncSchemaCases) test(entry.name, entry.run);
