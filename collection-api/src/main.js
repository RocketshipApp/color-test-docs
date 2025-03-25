import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import CollectionIndexer from './CollectionIndexer.js';
import { FETCH_METRICS } from './fetchFromCache.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seedFile = 'pizza_pets_airdrop_v3.json';
const partialSeedFile = 'pizza_pets_partial_25.json';

(async function main() {
  try {
    // 1. Parse startIndex argument (e.g. --startIndex=1000)
    const arg = process.argv.find((a) => a.startsWith('--startIndex='));
    const startIndex = arg ? parseInt(arg.split('=')[1], 10) : 0;
    console.log(`Starting from index = ${startIndex}`);

    // 2. Load the seed file from ./data/pizza_pets_airdrip_v3.json
    const seedFilePath = path.join(__dirname, '../data', seedFile);
    if (!fs.existsSync(seedFilePath)) {
      console.error(`Seed file not found at: ${seedFilePath}`);
      process.exit(1);
    }

    const seedDataRaw = fs.readFileSync(seedFilePath, 'utf8');
    const seedIds = JSON.parse(seedDataRaw); // Array of inscription IDs

    // 3. Instantiate CollectionIndexer
    const indexer = new CollectionIndexer();

    // 4. Load existing cache from disk
    await indexer.loadCache(); // loads or initializes an empty cache in memory

    // 5. Main loop in batches of 100
    const BATCH_SIZE = 100;
    for (let i = startIndex; i < seedIds.length; i += BATCH_SIZE) {
      const chunk = seedIds.slice(i, i + BATCH_SIZE);
      console.log(`\n=== Processing chunk: [${i}..${i + chunk.length - 1}] ===`);

      // Process the chunk
      await indexer.processChunk(chunk, i + 1);

      // Save the cache after each batch so we don't lose progress
      await indexer.saveCache();
    }

    console.log(
      `FETCH METRICS\n-------------------------------------------------\n  => Cache Hits: ${FETCH_METRICS.localCacheHit}\n  => Requests: ${FETCH_METRICS.httpRequest}`
    );
    console.log('\nAll done!');
  } catch (err) {
    console.error('Fatal error in main:', err);
    process.exit(1);
  }
})();
