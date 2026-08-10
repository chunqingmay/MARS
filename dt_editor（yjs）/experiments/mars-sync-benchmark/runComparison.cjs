const marsYjsAdapter = require("./adapters/mars-yjs-adapter.cjs");
const loroAdapter = require("./adapters/loro-adapter.cjs");
const { parseArgs, runEngine, writeResults, printSummary } = require("./benchmark.cjs");

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const marsResult = await runEngine(marsYjsAdapter, options);
  const loroResult = await runEngine(loroAdapter, options);
  const result = {
    rows: [...marsResult.rows, ...loroResult.rows],
    summaries: [...marsResult.summaries, ...loroResult.summaries],
  };

  const paths = writeResults(result, options, "mars-loro-sync-comparison");
  printSummary(result.summaries);
  console.log(paths);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
