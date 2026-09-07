// Derive the CI floor from the package's support promise; reject unsupported range syntax.
const { engines } = await Bun.file(new URL("../package.json", import.meta.url)).json();
export const floor = /^>=(\d+)$/.exec(engines.node)?.[1];
if (!floor) throw new Error("engines.node must declare a supported >=major floor.");
const selected = process.env.SELECTED_NODE;
if (!selected) throw new Error("SELECTED_NODE must identify a runtime matrix member.");
console.log(`node=${selected === "floor" ? floor : selected}`);
