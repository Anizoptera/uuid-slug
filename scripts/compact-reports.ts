import { resolve } from "node:path";
import { archiveReportBundles, compactReports } from "./archive-scratch";

// Keep retained measurements usable at their original paths while reclaiming their physical blocks.
const reports = resolve(import.meta.dir, "../bench/reports");
if (process.argv.includes("--archive-bundles"))
  console.log(JSON.stringify({ archivedBundles: await archiveReportBundles(reports) }));
else console.log(JSON.stringify({ reclaimedBytes: await compactReports(reports) }));
