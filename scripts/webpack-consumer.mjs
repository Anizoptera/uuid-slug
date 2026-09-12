import webpack from "webpack";

const [entry, outdir] = process.argv.slice(2);
const compiler = webpack({
  context: entry.slice(0, entry.lastIndexOf("/")),
  entry,
  mode: "production",
  target: "web",
  output: { filename: "bundle.js", path: outdir },
  optimization: { minimize: true, usedExports: true },
});

await new Promise((resolve, reject) => {
  compiler.run((error, stats) => {
    compiler.close(() => {});
    if (error) reject(error);
    else if (!stats || stats.hasErrors())
      reject(
        new Error(stats?.toString({ all: false, errors: true }) ?? "Webpack returned no stats."),
      );
    else resolve();
  });
});
