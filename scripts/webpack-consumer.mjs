import webpack from "webpack";
import path from "node:path";

const [entry, outdir] = process.argv.slice(2);
const compiler = webpack({
  context: path.dirname(entry),
  devtool: "source-map",
  entry,
  mode: "production",
  target: "web",
  output: { filename: "bundle.js", path: outdir },
  optimization: { minimize: true, usedExports: true },
});

await new Promise((resolve, reject) => {
  compiler.run((error, stats) => {
    compiler.close((closeError) => {
      if (error) reject(error);
      else if (!stats || stats.hasErrors())
        reject(
          new Error(stats?.toString({ all: false, errors: true }) ?? "Webpack returned no stats."),
        );
      else if (closeError) reject(closeError);
      else resolve();
    });
  });
});
