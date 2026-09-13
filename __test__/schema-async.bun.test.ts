// SPDX-License-Identifier: Apache-2.0
import { test } from "bun:test";
import { asyncSchemaCases } from "./schema-async-probe";
for (const entry of asyncSchemaCases) test(entry.name, entry.run);
