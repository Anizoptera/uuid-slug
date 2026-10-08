import { resolve } from "node:path";
import { compactReports } from "./archive-scratch";

// Keep retained measurements usable at their original paths while reclaiming their physical blocks.
const reclaimed = await compactReports(resolve(import.meta.dir, "../bench/reports"));
console.log(JSON.stringify({ reclaimedBytes: reclaimed }));
