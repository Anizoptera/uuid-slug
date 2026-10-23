import { resolve } from "node:path";
import { compactReports } from "./archive-scratch";

// Keep retained measurements usable at their original paths while reclaiming their physical blocks.
const reports = resolve(import.meta.dir, "../bench/reports");
if (process.argv.length > 2)
  throw new Error(
    "This command only compresses retained reports. Delete obsolete runs instead of archiving them.",
  );
console.log(JSON.stringify({ reclaimedBytes: await compactReports(reports) }));
