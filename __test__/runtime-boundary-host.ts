// SPDX-License-Identifier: Apache-2.0

import { runtimeBoundaryCases } from "./runtime-boundary-probe";

// Fresh hosts exercise import-time capability selection without another test runner.
const selected = runtimeBoundaryCases.find(({ name }) => name === process.argv[2]);
if (!selected) throw new Error(`Unknown runtime boundary case: ${process.argv[2]}`);
await selected.run();
