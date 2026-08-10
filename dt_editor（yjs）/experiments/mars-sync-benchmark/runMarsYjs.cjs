const marsYjsAdapter = require("./adapters/mars-yjs-adapter.cjs");
const { parseArgs, runEngine, writeResults, printSummary } = require("./benchmark.cjs");

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await runEngine(marsYjsAdapter, options);
  const paths = writeResults(result, options, "mars-yjs-sync-results");
  printSummary(result.summaries);
  console.log(paths);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
